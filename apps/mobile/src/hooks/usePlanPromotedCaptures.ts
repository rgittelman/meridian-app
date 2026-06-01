import { useEffect, useMemo } from 'react';

import { promoteCapturesToPlan } from '@/services/plan';
import { useCaptureStore } from '@/store/captureStore';
import { usePlanPromotionStore } from '@/store/planPromotionStore';

/** Capture-backed commitments eligible for Plan timeline surfacing. */
export function usePlanPromotedCaptures() {
  const items = useCaptureStore((s) => s.items);
  const statusByCaptureId = usePlanPromotionStore((s) => s.statusByCaptureId);
  const pruneMissingCaptures = usePlanPromotionStore((s) => s.pruneMissingCaptures);

  useEffect(() => {
    pruneMissingCaptures(items.map((i) => i.id));
  }, [items, pruneMissingCaptures]);

  return useMemo(
    () => promoteCapturesToPlan(items, new Date(), statusByCaptureId),
    [items, statusByCaptureId],
  );
}
