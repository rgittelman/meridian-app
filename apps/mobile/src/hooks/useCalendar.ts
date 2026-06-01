import { useCallback, useEffect, useMemo, useState } from 'react';
import * as AuthSession from 'expo-auth-session';
import { isGoogleOAuthConfigured } from '@/config/google';
import {
  buildGoogleAuthRequest,
  logGoogleOAuthDebug,
  promptGoogleOAuth,
} from '@/services/auth/googleOAuth';
import { logCalendarDebug } from '@/services/calendar/calendarDebug';
import { logFocusUpcomingSelection } from '@/services/calendar/calendarIntelligenceDebug';
import { selectUpcomingForFocus } from '@/services/calendar/selectUpcomingForFocus';
import { applyCaptureLinksToEvents } from '@/services/relationships/calendarCaptureIndex';
import { useCalendarCaptureIndex } from '@/hooks/useCalendarCaptureIndex';
import { useCalendarStore } from '@/store/calendarStore';
import { useGoogleAuthStore } from '@/store/googleAuthStore';
import type { MeridianCalendarEvent } from '@/types/calendar';
import type { ScheduleItem } from '@/components/focus/ScheduleStrip';
import { safeLower } from '@/utils/safeString';

function toScheduleItem(event: MeridianCalendarEvent): ScheduleItem {
  const person =
    event.displayPersonLabel ??
    event.attribution?.ownerDisplayName ??
    event.inferredPeople?.[0]?.name;
  const personKey = safeLower(person);
  return {
    id: event.id,
    label: event.displayTitle ?? event.displayLabel ?? event.title ?? 'Event',
    time: event.displayTime ?? '',
    person: personKey && personKey !== 'ryan' ? person : undefined,
  };
}

/** Continuity copy — calm, human, no OAuth jargon */
export function getCalendarContinuityMessage(
  status: ReturnType<typeof useCalendarStore.getState>['status'],
  showingCached: boolean,
  hasEvents: boolean,
): string | null {
  if (showingCached) return 'Showing last synced schedule.';
  switch (status) {
    case 'not_connected':
      return null;
    case 'loading':
      return null;
    case 'connected':
      return hasEvents ? null : 'Your week looks open so far.';
    case 'auth_failed':
      return "Couldn't connect calendar right now.";
    case 'token_expired':
      return 'Calendar needs to reconnect.';
    case 'offline':
      return hasEvents ? 'Showing last synced schedule.' : "Couldn't refresh calendar right now.";
    case 'partial_sync':
      return 'Still showing your last synced schedule.';
    default:
      return null;
  }
}

export function useCalendar() {
  const {
    status,
    weekEvents,
    upcomingEvents,
    showingCached,
    cachedAt,
    syncEvents,
    disconnect,
    finishOAuth,
    completeAuthWithAccessToken,
    setStatus,
    hydrateFromCache,
  } = useCalendarStore();

  const hydrateAuth = useGoogleAuthStore((s) => s.hydrateFromStorage);
  const captureIndex = useCalendarCaptureIndex();

  const [authRequest, setAuthRequest] = useState<AuthSession.AuthRequest | null>(null);
  const configured = isGoogleOAuthConfigured();

  const enrichedWeekEvents = useMemo(
    () => applyCaptureLinksToEvents(weekEvents, captureIndex),
    [weekEvents, captureIndex],
  );
  const enrichedUpcomingEvents = useMemo(
    () => applyCaptureLinksToEvents(upcomingEvents, captureIndex),
    [upcomingEvents, captureIndex],
  );

  useEffect(() => {
    setAuthRequest(buildGoogleAuthRequest());
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!configured) {
        if (!cancelled) setStatus('not_connected');
        return;
      }

      await hydrateAuth();

      if (useGoogleAuthStore.getState().isAuthenticated) {
        await syncEvents();
      } else if (weekEvents.length > 0 && cachedAt) {
        hydrateFromCache();
        if (!cancelled) setStatus('offline');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  const connect = useCallback(async () => {
    if (!configured || !authRequest) {
      setStatus('auth_failed');
      return;
    }

    setStatus('loading');

    try {
      await logGoogleOAuthDebug(authRequest);
      const oauth = await promptGoogleOAuth(authRequest);

      if (oauth.outcome === 'success' && 'code' in oauth) {
        const ok = await finishOAuth(authRequest, oauth.code);
        if (!ok && __DEV__) {
          logCalendarDebug('connect: finishOAuth returned false', {
            status: useCalendarStore.getState().status,
          });
        }
        return;
      }

      if (oauth.outcome === 'success' && 'accessToken' in oauth) {
        await completeAuthWithAccessToken(oauth.accessToken, {
          expiresIn: oauth.expiresIn,
          scope: oauth.scope,
        });
        return;
      }

      if (oauth.outcome === 'cancel' || oauth.outcome === 'dismiss') {
        const authed = useGoogleAuthStore.getState().isAuthenticated;
        setStatus(authed ? 'connected' : 'not_connected');
        return;
      }

      logCalendarDebug('connect: OAuth failed', { oauth });
      setStatus('auth_failed');
    } catch (err) {
      logCalendarDebug('connect: unexpected error', {
        error: err instanceof Error ? err.message : String(err),
      });
      setStatus('auth_failed');
    }
  }, [
    authRequest,
    completeAuthWithAccessToken,
    configured,
    finishOAuth,
    setStatus,
  ]);

  const refresh = useCallback(async () => {
    await syncEvents();
  }, [syncEvents]);

  const focusSchedulePool = useMemo(() => {
    const seen = new Set<string>();
    const merged: MeridianCalendarEvent[] = [];
    for (const e of [...enrichedUpcomingEvents, ...enrichedWeekEvents]) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      merged.push(e);
    }
    return merged;
  }, [enrichedUpcomingEvents, enrichedWeekEvents]);

  const focusUpcoming = useMemo(
    () => selectUpcomingForFocus(focusSchedulePool),
    [focusSchedulePool],
  );

  useEffect(() => {
    if (__DEV__ && focusUpcoming.length > 0) {
      logFocusUpcomingSelection(focusUpcoming);
    }
  }, [focusUpcoming]);

  const upcomingSchedule = useMemo(
    () => focusUpcoming.map(toScheduleItem),
    [focusUpcoming],
  );

  const continuityHint = getCalendarContinuityMessage(
    status,
    showingCached,
    enrichedWeekEvents.length > 0 || enrichedUpcomingEvents.length > 0,
  );

  return {
    status,
    events: enrichedWeekEvents,
    upcomingEvents: enrichedUpcomingEvents,
    focusUpcoming,
    weekEvents: enrichedWeekEvents,
    configured,
    upcomingSchedule,
    continuityHint,
    showingCached,
    connect,
    refresh,
    disconnect,
  };
}
