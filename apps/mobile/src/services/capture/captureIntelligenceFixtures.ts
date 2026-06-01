import type { LifeDomainId } from '@/types/life';

/** Fixed reference: Wednesday May 28, 2026 10:00 local — stable QA baseline. */
export const CAPTURE_QA_REFERENCE = new Date(2026, 4, 28, 10, 0, 0);

export type CaptureQaFixture = {
  id: string;
  group: 'work' | 'family' | 'community' | 'money' | 'health';
  raw: string;
  expect: {
    inferredDomain: LifeDomainId;
    promotionEligible: boolean;
    propagatedToPlan: boolean;
    propagatedToLife: boolean;
    planTitleIncludes?: string;
    parsedLocationIncludes?: string;
    parsedTimeIncludes?: string;
    inferredPeople?: string[];
    rejectionReason?: string | null;
  };
};

export const CAPTURE_INTELLIGENCE_FIXTURES: CaptureQaFixture[] = [
  {
    id: 'work-macys-summit',
    group: 'work',
    raw: "Macy's Home Leadership Summit Next Thursday in Long Island City ny at 10am",
    expect: {
      inferredDomain: 'work',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      planTitleIncludes: "Macy's Home Leadership Summit",
      parsedLocationIncludes: 'Long Island City',
      parsedTimeIncludes: '10:00',
      rejectionReason: null,
    },
  },
  {
    id: 'work-bloomingdales-rug',
    group: 'work',
    raw: "Bloomingdale's rug review Friday at 2pm",
    expect: {
      inferredDomain: 'work',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      planTitleIncludes: 'Bloomingdale',
      parsedTimeIncludes: '2:',
    },
  },
  {
    id: 'work-frg-budget',
    group: 'work',
    raw: 'Fine Rug Gallery budget call tomorrow morning',
    expect: {
      inferredDomain: 'work',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      planTitleIncludes: 'Fine Rug Gallery',
    },
  },
  {
    id: 'work-cherry-hill-visit',
    group: 'work',
    raw: 'Store visit at Cherry Hill Wednesday at 11',
    expect: {
      inferredDomain: 'work',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      parsedLocationIncludes: 'Cherry Hill',
      parsedTimeIncludes: '11',
    },
  },
  {
    id: 'family-grace-pickup',
    group: 'family',
    raw: 'Pick up Grace Friday at 5:15',
    expect: {
      inferredDomain: 'family',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      inferredPeople: ['Grace'],
      parsedTimeIncludes: '5:15 PM',
    },
  },
  {
    id: 'family-hudson-skates',
    group: 'family',
    raw: 'Bring Hudson skates Tuesday at 6',
    expect: {
      inferredDomain: 'family',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      inferredPeople: ['Hudson'],
    },
  },
  {
    id: 'family-quinn-hockey',
    group: 'family',
    raw: 'Quinn hockey game Wednesday at 7',
    expect: {
      inferredDomain: 'family',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      inferredPeople: ['Quinn'],
    },
  },
  {
    id: 'family-reagan-cheer',
    group: 'family',
    raw: 'Reagan cheer Thursday night',
    expect: {
      inferredDomain: 'family',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      inferredPeople: ['Reagan'],
    },
  },
  {
    id: 'community-bfsc-board',
    group: 'community',
    raw: 'BFSC board meeting Tuesday at 7pm',
    expect: {
      inferredDomain: 'community',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      parsedTimeIncludes: '7:',
    },
  },
  {
    id: 'community-swim-email',
    group: 'community',
    raw: 'Email Monica about swim club insurance tomorrow morning',
    expect: {
      inferredDomain: 'community',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
    },
  },
  {
    id: 'money-mortgage',
    group: 'money',
    raw: 'Pay mortgage Monday at noon',
    expect: {
      inferredDomain: 'personal',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      parsedTimeIncludes: '12:',
    },
  },
  {
    id: 'money-payment-due',
    group: 'money',
    raw: 'Review payment due tomorrow',
    expect: {
      inferredDomain: 'personal',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      planTitleIncludes: 'Review Payment Due',
      parsedTimeIncludes: 'Tomorrow',
    },
  },
  {
    id: 'health-dentist',
    group: 'health',
    raw: 'Dentist appointment next Tuesday at 9am',
    expect: {
      inferredDomain: 'health',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      parsedTimeIncludes: '9:',
    },
  },
  {
    id: 'health-medication-friday',
    group: 'health',
    raw: 'Take medication refill Friday',
    expect: {
      inferredDomain: 'health',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
    },
  },

  // ── Natural language hardening — v1 ───────────────────────────────────────

  {
    id: 'family-grace-volleyball',
    group: 'family',
    raw: 'Grace volleyball tournament Saturday 9am',
    expect: {
      inferredDomain: 'family',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      inferredPeople: ['Grace'],
      parsedTimeIncludes: '9:00 AM',
    },
  },
  {
    id: 'family-hudson-football',
    group: 'family',
    raw: 'Hudson football registration opens Monday',
    expect: {
      inferredDomain: 'family',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      inferredPeople: ['Hudson'],
    },
  },
  {
    id: 'work-expense-report',
    group: 'work',
    raw: 'Submit expense report before Friday',
    expect: {
      inferredDomain: 'work',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      planTitleIncludes: 'Submit Expense Report',
      parsedTimeIncludes: 'Friday',
    },
  },

  // ── Should NOT promote — no timing ────────────────────────────────────────

  {
    id: 'no-promote-hvac',
    group: 'work',
    raw: 'Remember to call the HVAC company',
    expect: {
      inferredDomain: 'personal',
      promotionEligible: false,
      propagatedToPlan: false,
      propagatedToLife: true,
      rejectionReason: 'no_timing',
    },
  },
  {
    id: 'no-promote-milk',
    group: 'family',
    raw: 'Buy milk',
    expect: {
      inferredDomain: 'personal',
      promotionEligible: false,
      propagatedToPlan: false,
      propagatedToLife: true,
      rejectionReason: 'no_timing',
    },
  },
  {
    id: 'no-promote-dentist-schedule',
    group: 'health',
    raw: 'Schedule dentist appointment',
    expect: {
      inferredDomain: 'health',
      promotionEligible: false,
      propagatedToPlan: false,
      propagatedToLife: true,
      rejectionReason: 'no_timing',
    },
  },
  {
    id: 'no-promote-pool-chemicals',
    group: 'community',
    raw: 'Order pool chemicals for BFSC',
    expect: {
      inferredDomain: 'community',
      promotionEligible: false,
      propagatedToPlan: false,
      propagatedToLife: true,
      rejectionReason: 'no_timing',
    },
  },

  // ── Fix 1: "reminder to" is a dictation prefix, not recurrence ───────────────

  {
    id: 'reminder-to-pickup',
    group: 'family',
    raw: 'Reminder to pick up Grace Friday at 5',
    expect: {
      inferredDomain: 'family',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      inferredPeople: ['Grace'],
      rejectionReason: null,
    },
  },
  {
    id: 'reminder-to-expense-report',
    group: 'work',
    raw: 'Reminder to submit expense report before Thursday',
    expect: {
      inferredDomain: 'work',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      rejectionReason: null,
    },
  },

  // ── Fix 2: "started [verb/noun]" without health co-signal is not Health ───────

  {
    id: 'work-started-planning-not-health',
    group: 'work',
    raw: 'Started planning the Q3 budget review',
    expect: {
      inferredDomain: 'work',
      promotionEligible: false,
      propagatedToPlan: false,
      propagatedToLife: true,
      rejectionReason: 'no_timing',
    },
  },
  {
    id: 'health-started-medication',
    group: 'health',
    raw: 'Started new medication Friday',
    expect: {
      inferredDomain: 'health',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      rejectionReason: null,
    },
  },

  // ── Fix 3: bare "board" without BFSC/swim/pool co-signal is Work, not Community

  {
    id: 'work-board-presentation',
    group: 'work',
    raw: 'Board presentation to leadership team next Wednesday at 9am',
    expect: {
      inferredDomain: 'work',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      rejectionReason: null,
    },
  },
  {
    id: 'community-swim-club-board',
    group: 'community',
    raw: 'Swim club board meeting Tuesday at 7pm',
    expect: {
      inferredDomain: 'community',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      rejectionReason: null,
    },
  },

  // ── Fix 4: bare "appointment" without medical co-signal is not Health ─────────

  {
    id: 'work-sales-appointment',
    group: 'work',
    raw: 'Sales appointment Monday at 2pm',
    expect: {
      inferredDomain: 'work',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      parsedTimeIncludes: '2:',
      rejectionReason: null,
    },
  },

  // ── Fix 5: weekday + time-of-day window ──────────────────────────────────────

  {
    id: 'family-reagan-cheer-afternoon',
    group: 'family',
    raw: 'Reagan cheer practice Friday afternoon',
    expect: {
      inferredDomain: 'family',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      inferredPeople: ['Reagan'],
      parsedTimeIncludes: '2:',
      rejectionReason: null,
    },
  },
  {
    id: 'family-grace-volleyball-tuesday-morning',
    group: 'family',
    raw: 'Grace volleyball Tuesday morning',
    expect: {
      inferredDomain: 'family',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      inferredPeople: ['Grace'],
      parsedTimeIncludes: '9:',
      rejectionReason: null,
    },
  },
  {
    id: 'community-bfsc-thursday-evening',
    group: 'community',
    raw: 'BFSC board meeting Thursday evening',
    expect: {
      inferredDomain: 'community',
      promotionEligible: true,
      propagatedToPlan: true,
      propagatedToLife: true,
      rejectionReason: null,
    },
  },
];
