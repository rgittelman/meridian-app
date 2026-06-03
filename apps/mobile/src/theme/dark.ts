/**
 * Meridian dark palette — deep navy-black with vibrant per-domain accents.
 * Premium, warm, family-first. Dark without being cold.
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
  // Domain accent colors — consistent across Plan, Life, Focus, Capture
  domainFamily: string;
  domainWork: string;
  domainHealth: string;
  domainPersonal: string;
  domainCommunity: string;
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
  // ── Surfaces ──────────────────────────────────────────────────────────────
  background:     '#0D0B1A',
  backgroundDeep: '#080710',

  surface:         '#13121E',
  surfaceElevated: '#1A1928',
  surfaceMuted:    '#100F18',

  // ── Typography ────────────────────────────────────────────────────────────
  ink:          '#F0EDF8',
  inkSecondary: '#9B96B8',
  inkTertiary:  '#6B6485',
  inkGhost:     '#4E4A65',

  // ── Primary accent — periwinkle purple (global CTA) ──────────────────────
  accent:      '#7B6FE8',
  accentSoft:  'rgba(123, 111, 232, 0.14)',
  accentMuted: 'rgba(123, 111, 232, 0.26)',

  // ── Borders ───────────────────────────────────────────────────────────────
  border:       'rgba(255, 255, 255, 0.08)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabBar:       'rgba(13, 11, 26, 0.92)',
  tabBarBorder: 'rgba(255, 255, 255, 0.06)',
  tabActive:    '#F0EDF8',
  tabInactive:  '#4E4A65',
  captureAccent: '#A07AE8',

  overlay: 'rgba(0, 0, 0, 0.52)',

  // ── Status ────────────────────────────────────────────────────────────────
  success:     '#10B981',
  successSoft: 'rgba(16, 185, 129, 0.10)',
  warning:     '#F59E0B',
  warningSoft: 'rgba(245, 158, 11, 0.12)',

  // ── Momentum Ring — orange/amber gradient ─────────────────────────────────
  ringTrack:         'rgba(249, 115, 22, 0.12)',
  ringProgress:      '#F97316',
  ringGlow:          'rgba(249, 115, 22, 0.22)',
  ringGradientStart: '#FB923C',
  ringGradientEnd:   '#F59E0B',

  // ── Focus cards ───────────────────────────────────────────────────────────
  focusCardDefault: '#13121E',
  focusCardPeople:  'rgba(16, 185, 129, 0.07)',
  focusCardUrgent:  'rgba(249, 115, 22, 0.09)',

  // ── People ────────────────────────────────────────────────────────────────
  peoplePill:     'rgba(123, 111, 232, 0.16)',
  peoplePillText: '#9B96B8',

  // ── Schedule strip ────────────────────────────────────────────────────────
  scheduleCard: 'rgba(255, 255, 255, 0.04)',

  // ── Wins ──────────────────────────────────────────────────────────────────
  winsAccent: '#10B981',

  // ── Ambient capture entry (Focus screen pill) ─────────────────────────────
  captureEntry:       'rgba(255, 255, 255, 0.04)',
  captureEntryBorder: 'rgba(255, 255, 255, 0.08)',

  // ── Capture input ─────────────────────────────────────────────────────────
  captureInputBg:          '#141321',
  captureInputBorder:      'rgba(255, 255, 255, 0.08)',
  captureInputFocusBorder: 'rgba(160, 122, 232, 0.50)',
  captureInputPlaceholder: '#6B6485',

  // ── Suggestion chips ──────────────────────────────────────────────────────
  exampleChip:       'rgba(255, 255, 255, 0.05)',
  exampleChipBorder: 'rgba(255, 255, 255, 0.07)',
  exampleChipText:   '#9B96B8',

  // ── Capture cards ─────────────────────────────────────────────────────────
  captureCardBg:     'rgba(255, 255, 255, 0.03)',
  captureCardBorder: 'rgba(255, 255, 255, 0.06)',

  // ── Confirmation toast ────────────────────────────────────────────────────
  confirmationBg:     'rgba(16, 185, 129, 0.13)',
  confirmationBorder: 'rgba(16, 185, 129, 0.26)',
  confirmationText:   '#10B981',

  // ── Category pills ────────────────────────────────────────────────────────
  categoryPill:     'rgba(123, 111, 232, 0.14)',
  categoryPillText: '#9B96B8',

  // ── Domain accent colors ──────────────────────────────────────────────────
  domainFamily:    '#8B5CF6',
  domainWork:      '#3B82F6',
  domainHealth:    '#10B981',
  domainPersonal:  '#F59E0B',
  domainCommunity: '#06B6D4',

  // ── Plan screen ───────────────────────────────────────────────────────────
  planSlot:       'rgba(255, 255, 255, 0.04)',
  planSlotBorder: 'rgba(255, 255, 255, 0.06)',

  // ── Life screen ───────────────────────────────────────────────────────────
  lifeCategoryBg:         'rgba(255, 255, 255, 0.04)',
  lifeCategoryBorder:     'rgba(255, 255, 255, 0.07)',
  lifeDomainBorderActive: 'rgba(123, 111, 232, 0.40)',
  lifeDomainPreview:      '#6B6485',
  lifeDomainPerson:       '#9B96B8',
  lifeDomainActiveBar:    '#7B6FE8',
  insightSoft:            'rgba(123, 111, 232, 0.18)',

  // ── Swipe affordances ─────────────────────────────────────────────────────
  actionCompleteBg: 'rgba(16, 185, 129, 0.20)',
  actionCompleteFg: '#10B981',
  actionSnoozeBg:   'rgba(123, 111, 232, 0.16)',
  actionSnoozeFg:   '#9B96B8',

  // ── Focus card action strip ───────────────────────────────────────────────
  focusActionStripBg:        'rgba(255, 255, 255, 0.025)',
  focusActionHoldBg:         'transparent',
  focusActionHoldBorder:     'rgba(255, 255, 255, 0.07)',
  focusActionHoldText:       '#6B6485',
  focusActionHoldPressed:    'rgba(123, 111, 232, 0.12)',
  focusActionHandledBg:      'rgba(16, 185, 129, 0.14)',
  focusActionHandledBorder:  'rgba(16, 185, 129, 0.30)',
  focusActionHandledText:    '#10B981',
  focusActionHandledPressed: 'rgba(16, 185, 129, 0.22)',

  // ── Undo toast ────────────────────────────────────────────────────────────
  toastBg:     '#1A1928',
  toastText:   '#F0EDF8',
  toastAction: '#7B6FE8',

  // ── Snooze bottom sheet ───────────────────────────────────────────────────
  sheetBg:         '#1A1928',
  sheetBorder:     'rgba(255, 255, 255, 0.08)',
  sheetHandle:     'rgba(255, 255, 255, 0.20)',
  sheetOptionText: '#9B96B8',

  // ── Orchestration states ──────────────────────────────────────────────────
  orchestrationBreathing: 'rgba(16, 185, 129, 0.09)',
  orchestrationRecovery:  '#4E4A65',

  // ── Calendar / Plan ───────────────────────────────────────────────────────
  calendarConnectBg:     'rgba(255, 255, 255, 0.04)',
  calendarConnectBorder: 'rgba(255, 255, 255, 0.08)',
  calendarContinuityText: '#6B6485',
  planEventRow:    'rgba(255, 255, 255, 0.035)',
  planEventTime:   '#6B6485',
  planEventSource: '#4E4A65',
  planCaptureRow:      'rgba(123, 111, 232, 0.07)',
  planCaptureBorder:   'rgba(123, 111, 232, 0.32)',
  planCaptureMarker:   '#7B6FE8',
  planCaptureTime:     '#9B96B8',
  planCaptureSource:   '#6B6485',
  planAccentFamily:    '#8B5CF6',
  planAccentWork:      '#3B82F6',
  planAccentCommunity: '#06B6D4',
  planAccentHealth:    '#10B981',
  planAccentNeutral:   '#6B7280',
};
