import {
  auditRawCaptureText,
  logCaptureIntelligenceAudits,
  type CaptureIntelligenceAudit,
} from './captureIntelligenceAudit';
import {
  CAPTURE_INTELLIGENCE_FIXTURES,
  CAPTURE_QA_REFERENCE,
} from './captureIntelligenceFixtures';
import { isDevEnvironment } from '@/utils/isDev';

/**
 * Runs all Ryan daily-driver capture QA fixtures — dev console + return value.
 */
export function runCaptureIntelligenceQaAudit(
  reference = CAPTURE_QA_REFERENCE,
): CaptureIntelligenceAudit[] {
  const audits = CAPTURE_INTELLIGENCE_FIXTURES.map((fixture) =>
    auditRawCaptureText(fixture.raw, reference, fixture.id),
  );

  if (isDevEnvironment()) {
    logCaptureIntelligenceAudits(audits);
    const failed = audits.filter((a, i) => {
      const exp = CAPTURE_INTELLIGENCE_FIXTURES[i].expect;
      return (
        a.inferredDomain !== exp.inferredDomain ||
        a.promotionEligible !== exp.promotionEligible ||
        a.propagatedToPlan !== exp.propagatedToPlan
      );
    });
    if (failed.length > 0) {
      console.warn('[Meridian:capture-qa] fixture mismatches', failed);
    }
  }

  return audits;
}
