import type { LifeIntelligenceSnapshot, LifeDomainId } from '@/types/life';
import type { LifeObject } from '@/types/capture';
import { assignDomainFromCapture } from '@/services/life/assignDomain';
import type { OverloadAssessment } from './detectOverload';
import { safeLower } from '@/utils/safeString';

const MAX_DOMAIN_BOOST = 0.12;
const WORK_SUPPRESS_THRESHOLD = 0.6;

/**
 * Subtle resurfacing boost when a capture's domain is under attention pressure.
 */
export function computeDomainResurfacingBoost(
  obj: LifeObject,
  snapshot: LifeIntelligenceSnapshot | null,
): number {
  if (!snapshot) return 0;

  const { domainId } = assignDomainFromCapture(obj);
  const attention = snapshot.attentionByDomain[domainId];
  if (!attention || attention.level === 'quiet') return 0;

  let boost = attention.pressure * 0.1;
  if (attention.level === 'active') boost += 0.04;

  if (domainId === 'family' && attention.level === 'active') {
    boost += 0.03;
  }

  if (domainId === 'community' && obj.relationshipType === 'prep_for_event') {
    boost += 0.04;
  }

  const workPressure = snapshot.attentionByDomain.work?.pressure ?? 0;
  if (workPressure >= WORK_SUPPRESS_THRESHOLD && domainId === 'personal') {
    boost *= 0.35;
  }

  return Math.min(MAX_DOMAIN_BOOST, boost);
}

export function enrichOverloadWithDomainPressure(
  assessment: OverloadAssessment,
  snapshot: LifeIntelligenceSnapshot | null,
): OverloadAssessment {
  if (!snapshot) return assessment;

  let score = assessment._score;
  const factors = { ...assessment.factors };

  const family = snapshot.attentionByDomain.family;
  const work = snapshot.attentionByDomain.work;
  const community = snapshot.attentionByDomain.community;

  if (family?.level === 'active') {
    score += 1;
    factors.peopleStacking = true;
  }

  if (work?.level === 'active' && work.pressure >= 0.55) {
    score += 0.75;
    factors.timingCollision = true;
  }

  if (community?.level === 'active' || community?.level === 'present') {
    score += 0.5;
    factors.prepChainUnresolved = true;
  }

  const state =
    score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW';

  return { state, factors, _score: score };
}

export function domainIdForCapture(obj: LifeObject): LifeDomainId {
  return assignDomainFromCapture(obj).domainId;
}

export function isLowValueUnderWorkLoad(
  obj: LifeObject,
  snapshot: LifeIntelligenceSnapshot | null,
): boolean {
  if (!snapshot) return false;
  const work = snapshot.attentionByDomain.work;
  if (!work || work.pressure < WORK_SUPPRESS_THRESHOLD) return false;

  const domain = assignDomainFromCapture(obj).domainId;
  if (domain !== 'personal') return false;

  const text = safeLower(obj.title);
  return !text.includes('urgent') && !text.includes('important');
}
