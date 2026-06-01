/**
 * Post-processes resurfaced items through orchestration + optional calendar awareness.
 */

import { useMemo, useRef } from 'react';
import {
  detectOverload,
  enrichOverloadWithCalendar,
  enrichOverloadWithDomainPressure,
  generateRecoveryMessage,
  paceItems,
} from '@/services/orchestration';
import type { LifeIntelligenceSnapshot } from '@/types/life';
import type { OverloadState } from '@/services/priority/types';
import type { ResurfacedItem } from '@/services/resurfacing/types';
import type { MeridianCalendarEvent } from '@/types/calendar';

type OrchestrationResult = {
  orchestratedItems: ResurfacedItem[];
  overloadState: OverloadState;
  recoveryMessage: string | null;
};

export function useOrchestration(
  resurfacedItems: ResurfacedItem[],
  calendarEvents: MeridianCalendarEvent[] = [],
  lifeSnapshot: LifeIntelligenceSnapshot | null = null,
): OrchestrationResult {
  const currentHour = new Date().getHours();
  const lastMessageRef = useRef<string | null>(null);

  return useMemo<OrchestrationResult>(() => {
    const baseAssessment = detectOverload(resurfacedItems, currentHour);
    let assessment = enrichOverloadWithCalendar(baseAssessment, calendarEvents);
    assessment = enrichOverloadWithDomainPressure(assessment, lifeSnapshot);
    const { state: overloadState, factors } = assessment;

    const orchestratedItems = paceItems(resurfacedItems, overloadState);

    const recoveryMessage = generateRecoveryMessage({
      overloadState,
      factors,
      currentHour,
      lastMessage: lastMessageRef.current,
    });

    if (recoveryMessage && recoveryMessage !== lastMessageRef.current) {
      lastMessageRef.current = recoveryMessage;
    }

    return { orchestratedItems, overloadState, recoveryMessage };
  }, [resurfacedItems, calendarEvents, lifeSnapshot, currentHour]);
}
