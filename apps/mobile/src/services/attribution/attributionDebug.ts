import type { EventAttribution } from '@/types/attribution';

/** Dev-only — never log OAuth or tokens. */
export function logAttributionDiagnostics(
  title: string,
  attribution: EventAttribution,
): void {
  if (!__DEV__ || !attribution.diagnostics) return;

  console.log('[Attribution]', title);
  console.log('  source:', attribution.sourceCalendarDisplayLabel);
  console.log('  owner:', {
    type: attribution.ownerType,
    name: attribution.ownerDisplayName,
    confidence: attribution.ownerConfidence,
  });
  console.log('  affected:', attribution.affectedPeople);
  console.log('  domain:', attribution.inferredDomain, attribution.domainConfidence);
  console.log('  candidates:', attribution.diagnostics.ownerCandidates);
  console.log('  log:', attribution.diagnostics.decisionLog);
}
