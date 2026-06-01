import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isGoogleOAuthConfigured } from '@/config/google';
import {
  syncAllCalendarEvents,
  CalendarFetchError,
} from '@/services/calendar/googleCalendarApi';
import { logCalendarDebug } from '@/services/calendar/calendarDebug';
import {
  disconnectGoogle,
  exchangeCodeForTokens,
  saveAccessTokenFromImplicitGrant,
} from '@/services/auth';
import { useGoogleAuthStore } from '@/store/googleAuthStore';
import type { AuthRequest } from 'expo-auth-session';
import { rehydrateEventAttribution } from '@/services/attribution/rehydrateAttribution';
import type { CalendarConnectionStatus, MeridianCalendarEvent } from '@/types/calendar';

type SerializedEvent = Omit<MeridianCalendarEvent, 'startTime' | 'endTime'> & {
  startTime: string;
  endTime: string;
};

function serializeEvents(events: MeridianCalendarEvent[]): SerializedEvent[] {
  return events.map((e) => ({
    ...e,
    startTime: e.startTime.toISOString(),
    endTime: e.endTime.toISOString(),
  }));
}

function deserializeEvents(items: SerializedEvent[]): MeridianCalendarEvent[] {
  return items.map((e) =>
    rehydrateEventAttribution({
      ...e,
      startTime: new Date(e.startTime),
      endTime: new Date(e.endTime),
      attendees: e.attendees ?? [],
      status: e.status ?? 'confirmed',
      signalClassification: e.signalClassification ?? 'meaningful',
    } as MeridianCalendarEvent),
  );
}

function resolveSyncFailureStatus(
  err: unknown,
  hadCache: boolean,
): CalendarConnectionStatus {
  const code =
    err instanceof CalendarFetchError
      ? err.code
      : err instanceof Error
        ? err.message
        : '';

  if (code === 'CALENDAR_AUTH_EXPIRED') {
    return 'token_expired';
  }

  return hadCache ? 'partial_sync' : 'offline';
}

type CalendarState = {
  status: CalendarConnectionStatus;
  weekEvents: MeridianCalendarEvent[];
  upcomingEvents: MeridianCalendarEvent[];
  cachedAt: number | null;
  showingCached: boolean;
  error: string | null;

  setStatus: (status: CalendarConnectionStatus) => void;
  setShowingCached: (v: boolean) => void;
  clearCalendar: () => void;

  finishOAuth: (
    request: AuthRequest,
    code: string,
  ) => Promise<boolean>;

  completeAuthWithAccessToken: (
    accessToken: string,
    options?: { expiresIn?: number; scope?: string; refreshToken?: string | null },
  ) => Promise<boolean>;

  syncEvents: () => Promise<void>;
  fetchWeek: () => Promise<void>;
  fetchUpcoming: () => Promise<void>;
  disconnect: () => Promise<void>;
  hydrateFromCache: () => void;
};

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      status: 'not_connected',
      weekEvents: [],
      upcomingEvents: [],
      cachedAt: null,
      showingCached: false,
      error: null,

      setStatus: (status) => set({ status }),
      setShowingCached: (showingCached) => set({ showingCached }),

      clearCalendar: () =>
        set({
          weekEvents: [],
          upcomingEvents: [],
          cachedAt: null,
          showingCached: false,
          error: null,
        }),

      completeAuthWithAccessToken: async (accessToken, options) => {
        set({ status: 'loading', showingCached: false, error: null });
        try {
          await useGoogleAuthStore.getState().setGoogleAuthSession({
            accessToken,
            refreshToken: options?.refreshToken ?? null,
            expiresAt: options?.expiresIn
              ? Date.now() + options.expiresIn * 1000
              : null,
          });
          await get().syncEvents();
          return get().status === 'connected' || get().status === 'partial_sync';
        } catch (err) {
          logCalendarDebug('completeAuthWithAccessToken failed', {
            error: err instanceof Error ? err.message : String(err),
          });
          set({ status: 'auth_failed', error: 'auth_failed' });
          return false;
        }
      },

      finishOAuth: async (request, code) => {
        set({ status: 'loading', showingCached: false, error: null });

        try {
          const tokens = await exchangeCodeForTokens(request, code);
          await useGoogleAuthStore.getState().setGoogleAuthSession({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresAt: tokens.expiresAt,
          });
        } catch (err) {
          logCalendarDebug('finishOAuth: token exchange failed', {
            error: err instanceof Error ? err.message : String(err),
          });
          set({ status: 'auth_failed', error: 'auth_failed' });
          return false;
        }

        await get().syncEvents();

        const { status, weekEvents, upcomingEvents } = get();
        logCalendarDebug('finishOAuth complete', {
          status,
          weekCount: weekEvents.length,
          upcomingCount: upcomingEvents.length,
        });

        return status === 'connected' || status === 'partial_sync';
      },

      fetchWeek: async () => {
        const token = await useGoogleAuthStore.getState().getAccessToken();
        if (!token) {
          throw new CalendarFetchError('CALENDAR_AUTH_EXPIRED', 401, 'no token');
        }
        const { weekEvents } = await syncAllCalendarEvents(token);
        set({ weekEvents });
      },

      fetchUpcoming: async () => {
        const token = await useGoogleAuthStore.getState().getAccessToken();
        if (!token) {
          throw new CalendarFetchError('CALENDAR_AUTH_EXPIRED', 401, 'no token');
        }
        const { upcomingEvents } = await syncAllCalendarEvents(token);
        set({ upcomingEvents });
      },

      syncEvents: async () => {
        if (!isGoogleOAuthConfigured()) {
          set({ status: 'not_connected', error: null });
          return;
        }

        const isAuthenticated = useGoogleAuthStore.getState().isAuthenticated;
        if (!isAuthenticated) {
          await useGoogleAuthStore.getState().hydrateFromStorage();
        }

        set({ status: 'loading', showingCached: false, error: null });

        try {
          const token = await useGoogleAuthStore.getState().getAccessToken();
          if (!token) {
            logCalendarDebug('syncEvents: no access token', {});
            const hadCache = get().weekEvents.length > 0;
            set({
              status: get().cachedAt ? 'token_expired' : 'not_connected',
              showingCached: hadCache,
              error: 'token_expired',
            });
            return;
          }

          logCalendarDebug('syncEvents: fetching', {
            tokenLength: token.length,
          });

          const { weekEvents, upcomingEvents, partial } =
            await syncAllCalendarEvents(token);

          logCalendarDebug('syncEvents: success', {
            weekCount: weekEvents.length,
            upcomingCount: upcomingEvents.length,
            partial,
          });

          set({
            weekEvents,
            upcomingEvents,
            cachedAt: Date.now(),
            status: partial ? 'partial_sync' : 'connected',
            showingCached: false,
            error: null,
          });

          const { useCaptureStore } = await import('@/store/captureStore');
          useCaptureStore.getState().relinkCapturesToCalendar();
        } catch (err) {
          const hadCache = get().weekEvents.length > 0;
          const status = resolveSyncFailureStatus(err, hadCache);

          if (err instanceof CalendarFetchError) {
            logCalendarDebug('syncEvents: API error', {
              code: err.code,
              status: err.status,
              responseBody: err.responseBody,
              nextStatus: status,
            });
          } else {
            logCalendarDebug('syncEvents: unexpected error', {
              error: err instanceof Error ? err.message : String(err),
              nextStatus: status,
            });
          }

          set({
            status,
            showingCached: hadCache,
            error: status,
          });
        }
      },

      disconnect: async () => {
        await disconnectGoogle();
        set({
          status: 'not_connected',
          weekEvents: [],
          upcomingEvents: [],
          cachedAt: null,
          showingCached: false,
          error: null,
        });
      },

      hydrateFromCache: () => {
        const { weekEvents, cachedAt } = get();
        if (weekEvents.length > 0 && cachedAt) {
          set({ showingCached: true });
        }
      },
    }),
    {
      name: 'meridian-calendar-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        weekEvents: serializeEvents(state.weekEvents),
        upcomingEvents: serializeEvents(state.upcomingEvents),
        cachedAt: state.cachedAt,
        status:
          state.status === 'connected' || state.status === 'partial_sync'
            ? state.status
            : 'not_connected',
      }),
      merge: (persisted, current) => {
        const p = persisted as {
          events?: SerializedEvent[];
          weekEvents?: SerializedEvent[];
          upcomingEvents?: SerializedEvent[];
          cachedAt?: number | null;
          status?: CalendarConnectionStatus;
        } | undefined;

        const legacyEvents = p?.events;
        const weekEvents = p?.weekEvents
          ? deserializeEvents(p.weekEvents)
          : legacyEvents
            ? deserializeEvents(legacyEvents)
            : current.weekEvents;

        const upcomingEvents = p?.upcomingEvents
          ? deserializeEvents(p.upcomingEvents)
          : current.upcomingEvents;

        return {
          ...current,
          weekEvents,
          upcomingEvents,
          cachedAt: p?.cachedAt ?? current.cachedAt,
          status: p?.status ?? current.status,
          showingCached: false,
        };
      },
    },
  ),
);

/** @deprecated Use weekEvents — kept for gradual migration */
export function getCalendarEvents(state: CalendarState): MeridianCalendarEvent[] {
  return state.weekEvents;
}
