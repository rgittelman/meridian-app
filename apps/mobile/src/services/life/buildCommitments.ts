import type { MeridianCalendarEvent } from '@/types/calendar';
import type { LifeObject } from '@/types/capture';
import type { LifeCommitment, LifeDomainId } from '@/types/life';
import { assignDomainFromCapture, assignDomainFromEvent } from './assignDomain';
import { buildEventPrimaryDomainMap } from './resolvePrimaryEventDomain';
import { relativeTimingLabel } from './commitmentTiming';
import { formatLifePreviewLine } from './formatPreviewLine';
import { isKnownPersonName } from '@/services/people/knownPeople';
import { personFieldForDisplay } from '@/utils/parsing/personForDisplay';
import { isEventInPlanWindow } from '@/services/calendar/planBounds';
import { humanizePlanTitle } from '@/services/plan/humanizePlanTitle';
import { resolveCapturePlanTime } from '@/services/plan/resolveCapturePlanTime';
import { isHouseholdRelevant } from '@/services/relevance';
import { safeLower, safeTrim } from '@/utils/safeString';

export type CommitmentBuildResult = {
  commitments: LifeCommitment[];
  assignments: Array<{ sourceId: string; domainId: LifeDomainId; reason: string }>;
  /** One canonical domain per calendar event id. */
  eventPrimaryDomain: Map<string, LifeDomainId>;
};

function personFromEvent(event: MeridianCalendarEvent): string | null {
  const attr = event.attribution;
  if (
    attr?.ownerType === 'person' &&
    attr.ownerConfidence === 'high' &&
    attr.ownerDisplayName
  ) {
    return attr.ownerDisplayName;
  }
  if (event.inferredOwnerLabel && isKnownPersonName(event.inferredOwnerLabel)) {
    return event.inferredOwnerLabel;
  }
  const high = event.inferredPeople.find((p) => p.confidence === 'high');
  return high?.name ?? null;
}

function personFromCapture(obj: LifeObject): string | null {
  return personFieldForDisplay(obj.parse.people)?.value ?? null;
}

function eventToCommitment(
  event: MeridianCalendarEvent,
  domainId: LifeDomainId,
): LifeCommitment {
  const timingLabel =
    relativeTimingLabel(event.startTime) ??
    (event.displayTime ? safeTrim(event.displayTime).toLowerCase() : null);

  return {
    id: `event-${event.id}`,
    title: event.displayTitle ?? event.title,
    kind: 'event',
    domainId,
    personAnchor: personFromEvent(event),
    startTime: event.startTime,
    timingLabel,
    peopleImpact: event.peopleImpact,
    timingSensitivity: event.timingSensitivity,
    emotionalWeight: event.emotionalWeight,
    isRecurring: Boolean(event.recurringEventId || event.recurrence?.length),
    linkedEventId: event.id,
  };
}

function captureToCommitment(
  obj: LifeObject,
  domainId: LifeDomainId,
  now: Date,
): LifeCommitment {
  const isPrep =
    obj.relationshipType === 'prep_for_event' ||
    obj.relationshipType === 'bring_to_event';

  const planned = resolveCapturePlanTime(obj, now);

  return {
    id: `capture-${obj.id}`,
    title: planned ? humanizePlanTitle(obj) : obj.title,
    kind: isPrep ? 'prep' : 'capture',
    domainId,
    personAnchor: personFromCapture(obj),
    startTime: planned?.startTime ?? null,
    timingLabel: obj.parse.timing?.value?.label?.toLowerCase() ?? null,
    peopleImpact: 'NONE',
    timingSensitivity: 'medium',
    emotionalWeight: obj.parse.emotionalWeight?.value ?? 'LOW',
    linkedEventId: obj.linkedCalendarEventId ?? null,
    isRecurring: obj.parse.isRoutine,
  };
}

export function buildCommitmentsFromData(
  events: MeridianCalendarEvent[],
  captures: LifeObject[],
  now = new Date(),
): CommitmentBuildResult {
  const assignments: CommitmentBuildResult['assignments'] = [];
  const commitments: LifeCommitment[] = [];

  const planEvents = events.filter(
    (e) => isEventInPlanWindow(e, now) && isHouseholdRelevant(e),
  );
  const eventPrimaryDomain = buildEventPrimaryDomainMap(planEvents);
  const activeCaptures = captures.filter(
    (c) => c.status !== 'done' && c.status !== 'archived',
  );

  for (const event of planEvents) {
    const domainId = eventPrimaryDomain.get(event.id) ?? assignDomainFromEvent(event).domainId;
    eventPrimaryDomain.set(event.id, domainId);
    assignments.push({
      sourceId: event.id,
      domainId,
      reason: 'event_primary_domain',
    });
    commitments.push(eventToCommitment(event, domainId));
  }

  for (const obj of activeCaptures) {
    const assigned = assignDomainFromCapture(obj, eventPrimaryDomain);
    assignments.push({
      sourceId: obj.id,
      domainId: assigned.domainId,
      reason: assigned.reason,
    });
    commitments.push(captureToCommitment(obj, assigned.domainId, now));
  }

  return { commitments, assignments, eventPrimaryDomain };
}

export function previewLineForCommitment(c: LifeCommitment): string {
  const title = safeTrim(c.title, 'Item');
  const person =
    c.personAnchor && isKnownPersonName(c.personAnchor) ? c.personAnchor : null;
  const line = person ? `${person} · ${title}` : title;
  return formatLifePreviewLine(line);
}
