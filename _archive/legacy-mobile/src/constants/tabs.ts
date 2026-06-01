export const TAB_ROUTES = {
  Focus: 'Focus',
  Plan: 'Plan',
  Life: 'Life',
  Capture: 'Capture',
} as const;

export type TabRouteName = keyof typeof TAB_ROUTES;

export const TAB_ORDER: TabRouteName[] = ['Focus', 'Plan', 'Life', 'Capture'];
