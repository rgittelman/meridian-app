/**
 * Meridian dark palette — warm espresso-charcoal.
 * Grounded, human, safe at night.
 *
 * Also defines the AppColors contract that light.ts must satisfy.
 */

export type AppColors = {
  // Surfaces
  background: string;
  backgroundDeep: string;
  surface: string;
  surfaceElevated: string;
  surfaceMuted: string;
  // Typography
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  inkGhost: string;
  // Primary accent — warm stone
  accent: string;
  accentSoft: string;
  accentMuted: string;
  // Borders
  border: string;
  borderSubtle: string;
  // Tab bar
  tabBar: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;
  captureAccent: string;
  // Overlays
  overlay: string;
  // Status
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  // Momentum Ring
  ringTrack: string;
  ringProgress: string;
  ringGlow: string;
  ringGradientStart: string;
  ringGradientEnd: string;
  // Focus cards
  focusCardDefault: string;
  focusCardPeople: string;
  focusCardUrgent: string;
  // People
  peoplePill: string;
  peoplePillText: string;
  // Schedule strip
  scheduleCard: string;
  // Wins
  winsAccent: string;
  // Ambient capture (Focus screen entry pill)
  captureEntry: string;
  captureEntryBorder: string;
  // Capture screen input surface
  captureInputBg: string;
  captureInputBorder: string;
  captureInputFocusBorder: string;
  captureInputPlaceholder: string;
  // Suggestion chips
  exampleChip: string;
  exampleChipBorder: string;
  exampleChipText: string;
  // Capture cards
  captureCardBg: string;
  captureCardBorder: string;
  // Confirmation toast
  confirmationBg: string;
  confirmationBorder: string;
  confirmationText: string;
  // Category pills
  categoryPill: string;
  categoryPillText: string;
  // Plan screen
  planSlot: string;
  planSlotBorder: string;
  // Life screen
  lifeCategoryBg: string;
  lifeCategoryBorder: string;
  lifeDomainBorderActive: string;
  lifeDomainPreview: string;
  lifeDomainPerson: string;
  lifeDomainActiveBar: string;
  insightSoft: string;
  // Swipe action affordances
  actionCompleteBg: string;
  actionCompleteFg: string;
  actionSnoozeBg: string;
  actionSnoozeFg: string;
  // Focus card action strip (tap targets — aligned with swipe affordances)
  focusActionStripBg: string;
  focusActionHoldBg: string;
  focusActionHoldBorder: string;
  focusActionHoldText: string;
  focusActionHoldPressed: string;
  focusActionHandledBg: string;
  focusActionHandledBorder: string;
  focusActionHandledText: string;
  focusActionHandledPressed: string;
  // Feedback (completion undo toast)
  toastBg: string;
  toastText: string;
  toastAction: string;
  // Bottom sheet (snooze)
  sheetBg: string;
  sheetBorder: string;
  sheetHandle: string;
  sheetOptionText: string;
  // Orchestration states
  orchestrationBreathing: string;
  orchestrationRecovery: string;
  // Calendar connect + plan week
  calendarConnectBg: string;
  calendarConnectBorder: string;
  calendarContinuityText: string;
  planEventRow: string;
  planEventTime: string;
  planEventSource: string;
  planCaptureRow: string;
  planCaptureBorder: string;
  planCaptureMarker: string;
  planCaptureTime: string;
  planCaptureSource: string;
  planAccentFamily: string;
  planAccentWork: string;
  planAccentCommunity: string;
  planAccentHealth: string;
  planAccentNeutral: string;
};

export const darkColors: AppColors = {
  background: '#1D1A17',
  backgroundDeep: '#141210',

  surface: '#262119',
  surfaceElevated: '#2F2B26',
  surfaceMuted: '#221E1B',

  ink: '#F2EDE5',
  inkSecondary: '#B8B2A7',
  inkTertiary: '#8C867C',
  inkGhost: '#6E6860',

  accent: '#A8A090',
  accentSoft: 'rgba(168, 160, 144, 0.13)',
  accentMuted: 'rgba(168, 160, 144, 0.24)',

  border: 'rgba(255, 245, 230, 0.07)',
  borderSubtle: 'rgba(255, 245, 230, 0.04)',

  tabBar: 'rgba(30, 27, 22, 0.80)',
  tabBarBorder: 'rgba(255, 245, 230, 0.055)',
  tabActive: '#F2EDE5',
  tabInactive: '#7A7570',
  captureAccent: '#BFB09A',

  overlay: 'rgba(0, 0, 0, 0.38)',

  success: '#7FA892',
  successSoft: 'rgba(127, 168, 146, 0.08)',
  warning: '#C4A06A',
  warningSoft: 'rgba(196, 160, 106, 0.10)',

  ringTrack: 'rgba(168, 160, 144, 0.11)',
  ringProgress: '#C8A87A',
  ringGlow: 'rgba(200, 168, 120, 0.06)',
  ringGradientStart: '#D4BA8A',
  ringGradientEnd: '#C0A06A',

  focusCardDefault: '#262119',
  focusCardPeople: 'rgba(138, 168, 130, 0.06)',
  focusCardUrgent: 'rgba(196, 160, 106, 0.09)',

  peoplePill: 'rgba(168, 160, 144, 0.14)',
  peoplePillText: '#B8B2A6',

  scheduleCard: 'rgba(255, 245, 230, 0.036)',

  winsAccent: '#7FA892',

  captureEntry: 'rgba(255, 245, 230, 0.036)',
  captureEntryBorder: 'rgba(255, 245, 230, 0.065)',

  captureInputBg: '#242018',
  captureInputBorder: 'rgba(255, 245, 230, 0.08)',
  captureInputFocusBorder: 'rgba(168, 160, 144, 0.34)',
  captureInputPlaceholder: '#7E7870',

  exampleChip: 'rgba(255, 245, 230, 0.046)',
  exampleChipBorder: 'rgba(255, 245, 230, 0.055)',
  exampleChipText: '#A4A08A',

  captureCardBg: 'rgba(255, 245, 230, 0.026)',
  captureCardBorder: 'rgba(255, 245, 230, 0.05)',

  confirmationBg: 'rgba(127, 168, 146, 0.13)',
  confirmationBorder: 'rgba(127, 168, 146, 0.22)',
  confirmationText: '#7FA892',

  categoryPill: 'rgba(168, 160, 144, 0.11)',
  categoryPillText: '#A8A496',

  planSlot: 'rgba(255, 245, 230, 0.030)',
  planSlotBorder: 'rgba(255, 245, 230, 0.046)',

  lifeCategoryBg: 'rgba(255, 245, 230, 0.028)',
  lifeCategoryBorder: 'rgba(255, 245, 230, 0.044)',
  lifeDomainBorderActive: 'rgba(168, 160, 144, 0.28)',
  lifeDomainPreview: '#8C867C',
  lifeDomainPerson: '#B8B2A7',
  lifeDomainActiveBar: '#A8A090',
  insightSoft: 'rgba(168, 160, 144, 0.22)',

  // Swipe affordances — warm amber for complete, neutral for snooze
  actionCompleteBg: 'rgba(200, 168, 120, 0.20)',
  actionCompleteFg: '#C8A87A',
  actionSnoozeBg:   'rgba(168, 160, 144, 0.14)',
  actionSnoozeFg:   '#B8B2A7',

  focusActionStripBg: 'rgba(255, 245, 230, 0.02)',
  focusActionHoldBg: 'transparent',
  focusActionHoldBorder: 'rgba(255, 245, 230, 0.06)',
  focusActionHoldText: '#8C867C',
  focusActionHoldPressed: 'rgba(168, 160, 144, 0.10)',
  focusActionHandledBg: 'rgba(200, 168, 120, 0.14)',
  focusActionHandledBorder: 'rgba(200, 168, 120, 0.28)',
  focusActionHandledText: '#C8A87A',
  focusActionHandledPressed: 'rgba(200, 168, 120, 0.22)',

  // Undo toast — dark elevated surface, always high contrast
  toastBg:     '#2E2921',
  toastText:   '#F2EDE5',
  toastAction: '#C8A87A',

  // Snooze bottom sheet
  sheetBg:         '#2A2520',
  sheetBorder:     'rgba(255, 245, 230, 0.07)',
  sheetHandle:     'rgba(255, 245, 230, 0.18)',
  sheetOptionText: '#B8B2A7',

  // Orchestration visual states
  orchestrationBreathing: 'rgba(127, 168, 146, 0.09)',
  orchestrationRecovery:  '#7A7470',

  calendarConnectBg: 'rgba(255, 245, 230, 0.04)',
  calendarConnectBorder: 'rgba(255, 245, 230, 0.08)',
  calendarContinuityText: '#8C867C',
  planEventRow: 'rgba(255, 245, 230, 0.028)',
  planEventTime: '#8C867C',
  planEventSource: '#6E6860',
  planCaptureRow: 'rgba(168, 160, 144, 0.06)',
  planCaptureBorder: 'rgba(168, 160, 144, 0.28)',
  planCaptureMarker: '#A8A090',
  planCaptureTime: '#9A948C',
  planCaptureSource: '#7A746C',
  planAccentFamily: '#8FA888',
  planAccentWork: '#A89888',
  planAccentCommunity: '#B0A080',
  planAccentHealth: '#88A8A0',
  planAccentNeutral: '#8C867C',
};
