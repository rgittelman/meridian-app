import { usePrepIntelligence } from '@/hooks/usePrepIntelligence';
import type { PlanPrepContext } from '@/types/prep';

/**
 * Plan event id → calm prep context line (Ready, prep items, window opens, etc.).
 */
export function usePlanPrepContext(): ReadonlyMap<string, PlanPrepContext> {
  const snapshot = usePrepIntelligence();
  return snapshot.planContextByEventId;
}
