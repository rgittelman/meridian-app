import type { PrepReadinessState } from '@/types/prep';
import type { PreparationWindow } from '@/types/prep';
import type { MeridianCalendarEvent } from '@/types/calendar';
import { safeTrim } from '@/utils/safeString';
import { stripPersonPrefixFromTitle } from '@/services/notifications/candidateHelpers';

/** Commitment-first primary line (person · event when known). */
export function prepAwarenessPrimaryLabel(
  eventTitle: string,
  peopleContext: readonly string[],
): string {
  const person = peopleContext[0];
  if (person) {
    const activity = stripPersonPrefixFromTitle(eventTitle, person);
    return `${person} · ${activity}`;
  }
  return eventTitle;
}

/** Timing and light attribution — never the prep body. */
export function prepAwarenessContextLine(event: MeridianCalendarEvent): string {
  const parts: string[] = [];

  if (event.allDay) {
    parts.push('All day');
  } else if (event.displayTime) {
    parts.push(event.displayTime);
  }

  const owner = safeTrim(event.attribution?.ownerDisplayName, '');
  if (owner) {
    parts.push(`Owner ${owner}`);
  } else if (event.planAttributionLine) {
    parts.push(event.planAttributionLine);
  } else if (event.displaySourceLabel) {
    parts.push(event.displaySourceLabel);
  }

  return parts.join(' · ');
}

export function prepConnectedSummary(activeCaptureCount: number): string | null {
  if (activeCaptureCount <= 0) return null;
  return activeCaptureCount === 1
    ? '1 connected item'
    : `${activeCaptureCount} connected items`;
}
import { PREP_UI_SURFACING_ENABLED } from './constants';
import { windowOpensInLabel } from './preparationWindow';

export function readinessDisplayLabel(state: PrepReadinessState): string {
  switch (state) {
    case 'ready':
      return 'Ready';
    case 'mostly_ready':
      return 'Mostly ready';
    case 'needs_attention':
      return 'One thing may help';
    case 'no_prep_detected':
      return 'No prep connected';
    default:
      return '';
  }
}

export function planPrepLine(
  readiness: PrepReadinessState,
  captureCount: number,
  window: PreparationWindow,
): string {
  if (!PREP_UI_SURFACING_ENABLED) return '';

  const opensLabel = windowOpensInLabel(window);

  if (!window.isActive && opensLabel) {
    return opensLabel;
  }

  switch (readiness) {
    case 'ready':
      return 'Ready';
    case 'mostly_ready':
      return captureCount === 1 ? '1 related item' : `${captureCount} related items`;
    case 'needs_attention':
      return captureCount === 1
        ? '1 prep item'
        : `${captureCount} prep items`;
    case 'no_prep_detected':
      return window.isActive ? 'Light prep window' : opensLabel ?? '';
    default:
      return '';
  }
}

export function focusPrepBody(
  readiness: PrepReadinessState,
  captureCount: number,
  event: MeridianCalendarEvent,
): string {
  switch (readiness) {
    case 'ready':
      return 'You look ready for this.';
    case 'mostly_ready':
      return captureCount === 1
        ? 'One related item remains.'
        : 'A few connected items may help you feel prepared.';
    case 'needs_attention':
      return captureCount === 1
        ? 'One thing may help you feel prepared.'
        : `${captureCount} things may help you feel prepared.`;
    case 'no_prep_detected':
      if (/\b(?:hockey|skates|gear|equipment)\b/i.test(event.displayTitle ?? '')) {
        return 'Equipment reminders can still be captured.';
      }
      return 'A light prep window is open.';
    default:
      return '';
  }
}

export function focusPrepBodyWithCaptures(
  readiness: PrepReadinessState,
  captureCount: number,
  hasBringItem: boolean,
): string {
  if (readiness === 'ready' && hasBringItem) {
    return 'Equipment reminder already captured.';
  }
  return focusPrepBody(readiness, captureCount, { displayTitle: '' } as MeridianCalendarEvent);
}

export function detailPrepLines(
  readiness: PrepReadinessState,
  captureCount: number,
): { primary: string; secondary: string | null } {
  if (!PREP_UI_SURFACING_ENABLED) {
    return { primary: '', secondary: null };
  }

  if (readiness === 'no_prep_detected') {
    return { primary: 'No prep connected yet', secondary: null };
  }

  const countLine =
    captureCount === 1
      ? '1 thing connected'
      : `${captureCount} things connected`;

  return {
    primary: countLine,
    secondary: readinessDisplayLabel(readiness),
  };
}

export function lifePrepSummaryLine(
  eventTitle: string | null,
  readiness: PrepReadinessState,
): string {
  const short = eventTitle ?? 'Upcoming';
  switch (readiness) {
    case 'ready':
      return `${short} · ready`;
    case 'mostly_ready':
      return `${short} · mostly ready`;
    case 'needs_attention':
      return `${short} · may need attention`;
    case 'no_prep_detected':
      return `${short} · prep window`;
    default:
      return short;
  }
}
