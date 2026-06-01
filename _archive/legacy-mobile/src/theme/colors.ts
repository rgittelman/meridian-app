/**
 * Meridian mobile — restrained premium palette.
 * Warm charcoal surfaces; readable day and night; no pure black/white.
 */
export const colors = {
  background: '#1C1B19',
  backgroundDeep: '#161514',

  surface: '#262422',
  surfaceElevated: '#2E2C29',
  surfaceMuted: '#222120',

  ink: '#F3F1EC',
  inkSecondary: '#B8B4AB',
  inkTertiary: '#8A8680',
  inkGhost: '#6E6A64',

  accent: '#8A9BB0',
  accentSoft: 'rgba(138, 155, 176, 0.14)',
  accentMuted: 'rgba(138, 155, 176, 0.28)',

  border: 'rgba(255, 255, 255, 0.07)',
  borderSubtle: 'rgba(255, 255, 255, 0.04)',

  tabBar: 'rgba(28, 27, 25, 0.72)',
  tabBarBorder: 'rgba(255, 255, 255, 0.06)',
  tabActive: '#F3F1EC',
  tabInactive: '#7A7770',
  captureAccent: '#A8B5C4',

  overlay: 'rgba(0, 0, 0, 0.35)',

  success: '#7FA892',
  successSoft: 'rgba(127, 168, 146, 0.08)',
  warning: '#C4A06A',
  warningSoft: 'rgba(196, 160, 106, 0.10)',

  // Momentum Ring
  ringTrack: 'rgba(138, 155, 176, 0.11)',
  ringProgress: '#A0B0C4',
  ringGlow: 'rgba(138, 155, 176, 0.05)',

  // Focus cards
  focusCardDefault: '#262422',
  focusCardPeople: 'rgba(138, 155, 176, 0.06)',
  focusCardUrgent: 'rgba(196, 160, 106, 0.08)',

  // People
  peoplePill: 'rgba(138, 155, 176, 0.13)',
  peoplePillText: '#A8B5C4',

  // Schedule strip
  scheduleCard: 'rgba(255, 255, 255, 0.040)',

  // Wins
  winsAccent: '#7FA892',

  // Ambient capture (Focus screen entry pill)
  captureEntry: 'rgba(255, 255, 255, 0.038)',
  captureEntryBorder: 'rgba(255, 255, 255, 0.07)',

  // Capture screen input surface
  captureInputBg: '#242220',
  captureInputBorder: 'rgba(255, 255, 255, 0.09)',
  captureInputFocusBorder: 'rgba(138, 155, 176, 0.35)',

  // Suggestion chips
  exampleChip: 'rgba(255, 255, 255, 0.05)',
  exampleChipBorder: 'rgba(255, 255, 255, 0.06)',
  exampleChipText: '#A0A89A',

  // Capture cards (recent items)
  captureCardBg: 'rgba(255, 255, 255, 0.028)',
  captureCardBorder: 'rgba(255, 255, 255, 0.055)',

  // Confirmation toast
  confirmationBg: 'rgba(127, 168, 146, 0.14)',
  confirmationBorder: 'rgba(127, 168, 146, 0.22)',
  confirmationText: '#7FA892',

  // Category pills on captured items
  categoryPill: 'rgba(138, 155, 176, 0.11)',
  categoryPillText: '#9BAABB',
} as const;

export type ColorToken = keyof typeof colors;
