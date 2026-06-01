import { useMemo } from 'react';

import { HOUSEHOLD_MEMBERS } from '@/services/relevance/householdContext';
import { useGoogleAuthStore } from '@/store/googleAuthStore';

export type GreetingTimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type GreetingContext = {
  name: string;
  timeOfDay: GreetingTimeOfDay;
};

function deriveTimeOfDay(hour: number): GreetingTimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

function householdGreetingName(): string {
  const primary = HOUSEHOLD_MEMBERS.find(
    (m) => m.role === 'parent' && m.personId === 'ryan',
  );
  return primary?.name ?? 'Ryan';
}

/**
 * Focus greeting — device time-of-day + user name from auth (when set) or household.
 */
export function useGreeting(): GreetingContext {
  const authDisplayName = useGoogleAuthStore((s) => s.userDisplayName);

  return useMemo(() => {
    const hour = new Date().getHours();
    const trimmed = authDisplayName?.trim();
    const name = trimmed && trimmed.length > 0 ? trimmed : householdGreetingName();

    return {
      name,
      timeOfDay: deriveTimeOfDay(hour),
    };
  }, [authDisplayName]);
}
