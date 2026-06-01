import type { MeridianCalendarEvent } from '@/types/calendar';
import type { EventRelevance } from '@/types/relevance';

export function logRelevanceDiagnostics(
  event: MeridianCalendarEvent,
  relevance: EventRelevance,
): void {
  if (!__DEV__) return;

  const action = relevance.isRelevant ? 'Retained' : 'Suppressed';
  console.log(`[Relevance] ${action}: ${event.title}`);
  console.log('  score:', relevance.relevanceScore);
  console.log('  reason:', relevance.relevanceReason);
  console.log('  householdImpact:', relevance.householdImpact);
  console.log('  matched:', relevance.matchedHouseholdMembers);
  if (relevance.diagnostics?.suppressionReason) {
    console.log('  suppression:', relevance.diagnostics.suppressionReason);
  }
  if (relevance.diagnostics?.teamsnapDetected) {
    console.log('  teamsnap: yes', relevance.diagnostics.sportsChildInference);
  }
  if (event.displayTitle && event.rawTitle && event.displayTitle !== event.rawTitle) {
    console.log('  humanized:', event.displayTitle);
  }
}
