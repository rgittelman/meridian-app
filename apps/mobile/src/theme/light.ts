/**
 * Meridian light palette — warm ivory and cream.
 * Daytime feels crisp, calm, warm, breathable, and premium.
 * Not clinical white. Not cold gray. Warm ivory.
 */

import type { AppColors } from './dark';

export const lightColors: AppColors = {
  // Warm ivory backgrounds
  background: '#F6F2EB',
  backgroundDeep: '#EDE8DF',

  // Soft cream surfaces — not stark white
  surface: '#EFE9E0',
  surfaceElevated: '#F4EEE7',
  surfaceMuted: '#E9E3DA',

  // Deep charcoal to warm graphite typography
  ink: '#1E1B16',
  inkSecondary: '#4A4540',
  inkTertiary: '#7A726A',
  inkGhost: '#A09890',

  // Warm stone accent — same emotional family as dark, adapted for light
  accent: '#8E7E6A',
  accentSoft: 'rgba(142, 126, 106, 0.12)',
  accentMuted: 'rgba(142, 126, 106, 0.22)',

  // Warm-tinted borders on light surfaces
  border: 'rgba(30, 27, 22, 0.10)',
  borderSubtle: 'rgba(30, 27, 22, 0.06)',

  tabBar: 'rgba(238, 233, 224, 0.92)',
  tabBarBorder: 'rgba(30, 27, 22, 0.08)',
  tabActive: '#1E1B16',
  tabInactive: '#A09890',
  captureAccent: '#8E7E6A',

  overlay: 'rgba(30, 27, 22, 0.30)',

  // Muted sage and warm amber — same intent, lighter values
  success: '#5A8E78',
  successSoft: 'rgba(90, 142, 120, 0.10)',
  warning: '#A87A3C',
  warningSoft: 'rgba(168, 122, 60, 0.12)',

  // Ring — warm amber arc, visible but restrained on light
  ringTrack: 'rgba(142, 126, 106, 0.15)',
  ringProgress: '#B8904A',
  ringGlow: 'rgba(184, 144, 74, 0.08)',
  ringGradientStart: '#C8A060',
  ringGradientEnd: '#B08038',

  // Focus cards — cream base, tinted overlays
  focusCardDefault: '#EFE9E0',
  focusCardPeople: 'rgba(90, 142, 120, 0.09)',
  focusCardUrgent: 'rgba(168, 122, 60, 0.10)',

  peoplePill: 'rgba(142, 126, 106, 0.16)',
  peoplePillText: '#7A6A5A',

  // Warm stone alpha on ivory reads clearly; dark alpha at 3–5% does not.
  scheduleCard: 'rgba(142, 126, 106, 0.10)',

  winsAccent: '#5A8E78',

  // Ambient capture entry — warm stone tint so it reads as a distinct surface
  captureEntry: 'rgba(142, 126, 106, 0.09)',
  captureEntryBorder: 'rgba(30, 27, 22, 0.09)',

  // Capture input — noticeably recessed but warm, not flat gray
  captureInputBg: '#E2DDD4',
  captureInputBorder: 'rgba(30, 27, 22, 0.13)',
  captureInputFocusBorder: 'rgba(142, 126, 106, 0.40)',
  captureInputPlaceholder: '#9A9288',

  // Example chips — warm stone pill so they register on the ivory background
  exampleChip: 'rgba(142, 126, 106, 0.10)',
  exampleChipBorder: 'rgba(30, 27, 22, 0.09)',
  exampleChipText: '#7A726A',

  // Capture cards — warm cream surface, same visual weight as focus cards
  captureCardBg: 'rgba(142, 126, 106, 0.09)',
  captureCardBorder: 'rgba(30, 27, 22, 0.09)',

  confirmationBg: 'rgba(90, 142, 120, 0.12)',
  confirmationBorder: 'rgba(90, 142, 120, 0.22)',
  confirmationText: '#5A8E78',

  categoryPill: 'rgba(142, 126, 106, 0.12)',
  categoryPillText: '#7A6A5A',

  // Plan + Life — warm stone so tiles render visibly on ivory
  planSlot: 'rgba(142, 126, 106, 0.07)',
  planSlotBorder: 'rgba(30, 27, 22, 0.09)',

  lifeCategoryBg: 'rgba(142, 126, 106, 0.08)',
  lifeCategoryBorder: 'rgba(30, 27, 22, 0.09)',
  lifeDomainBorderActive: 'rgba(142, 126, 106, 0.32)',
  lifeDomainPreview: '#7A726A',
  lifeDomainPerson: '#4A4540',
  lifeDomainActiveBar: '#8E7E6A',
  insightSoft: 'rgba(142, 126, 106, 0.22)',

  // Swipe affordances
  actionCompleteBg: 'rgba(184, 144, 74, 0.16)',
  actionCompleteFg: '#8E6A28',
  actionSnoozeBg:   'rgba(142, 126, 106, 0.14)',
  actionSnoozeFg:   '#7A726A',

  focusActionStripBg: 'rgba(142, 126, 106, 0.06)',
  focusActionHoldBg: 'transparent',
  focusActionHoldBorder: 'rgba(30, 27, 22, 0.08)',
  focusActionHoldText: '#7A726A',
  focusActionHoldPressed: 'rgba(142, 126, 106, 0.12)',
  focusActionHandledBg: 'rgba(184, 144, 74, 0.12)',
  focusActionHandledBorder: 'rgba(142, 108, 40, 0.22)',
  focusActionHandledText: '#8E6A28',
  focusActionHandledPressed: 'rgba(184, 144, 74, 0.20)',

  // Toast — stays dark regardless of mode for contrast
  toastBg:     '#28231E',
  toastText:   '#F2EDE5',
  toastAction: '#C8A87A',

  // Snooze sheet — warm cream elevated surface
  sheetBg:         '#F4EEE7',
  sheetBorder:     'rgba(30, 27, 22, 0.10)',
  sheetHandle:     'rgba(30, 27, 22, 0.22)',
  sheetOptionText: '#4A4540',

  // Orchestration visual states
  orchestrationBreathing: 'rgba(90, 142, 120, 0.09)',
  orchestrationRecovery:  '#8C8480',

  calendarConnectBg: 'rgba(142, 126, 106, 0.10)',
  calendarConnectBorder: 'rgba(30, 27, 22, 0.10)',
  calendarContinuityText: '#7A726A',
  planEventRow: 'rgba(142, 126, 106, 0.08)',
  planEventTime: '#7A726A',
  planEventSource: '#A09890',
  planCaptureRow: 'rgba(142, 126, 106, 0.05)',
  planCaptureBorder: 'rgba(142, 126, 106, 0.32)',
  planCaptureMarker: '#A89888',
  planCaptureTime: '#8A8278',
  planCaptureSource: '#9A9088',
  planAccentFamily: '#6B8F66',
  planAccentWork: '#8E7A62',
  planAccentCommunity: '#9A8468',
  planAccentHealth: '#5E8A80',
  planAccentNeutral: '#9A948C',
};
