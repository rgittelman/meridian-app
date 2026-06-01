import type { MeridianCalendarEvent } from '@/types/calendar';
import { classifyEventSignal } from '@/services/calendar/eventFilters';
import { formatSourceCalendarDisplayLabel } from '@/services/calendar/sourceCalendarLabel';
import { applyEventDisplayToEvent } from './humanizeEventDisplay';
import { evaluateEventRelevance } from './evaluateRelevance';

/** Apply relevance to cached events missing the relevance layer. */
export function rehydrateEventRelevance(event: MeridianCalendarEvent): MeridianCalendarEvent {
  const displaySourceLabel =
    event.displaySourceLabel ??
    event.sourceCalendarDisplayLabel ??
    formatSourceCalendarDisplayLabel(event.sourceCalendarName);

  const withLabel: MeridianCalendarEvent = {
    ...event,
    displaySourceLabel,
    sourceCalendarDisplayLabel: displaySourceLabel,
  };

  const relevance = evaluateEventRelevance(withLabel);
  const signalClassification = classifyEventSignal({ ...withLabel, relevance });

  const withRelevance: MeridianCalendarEvent = {
    ...withLabel,
    rawTitle: withLabel.rawTitle ?? withLabel.title,
    relevance,
    signalClassification,
  };

  const displayed = applyEventDisplayToEvent(withRelevance);
  if (displayed.relevance?.diagnostics) {
    displayed.relevance.diagnostics.humanizedDisplayTitle =
      displayed.displayTitle !== displayed.rawTitle
        ? displayed.displayTitle
        : undefined;
  }
  return displayed;
}
