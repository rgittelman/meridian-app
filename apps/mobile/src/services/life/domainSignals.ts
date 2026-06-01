// Fix 3: 'board' removed from COMMUNITY_TEXT — bare 'board' is work-context neutral.
// It now only signals Community when a community co-signal is present.
const COMMUNITY_TEXT = [
  'bfsc',
  'swim club',
  'volunteer',
  'nonprofit',
  'community',
  'pta',
];

// 'board' requires one of these to mean Community rather than a work board context.
const BOARD_COMMUNITY_CO_SIGNALS = ['bfsc', 'swim', 'pool', 'nonprofit', 'volunteer', 'pta'];

// Fix 4: 'appointment' removed from HEALTH_TEXT — too broad, fires for work/client appointments.
// Medical appointments are caught by the co-signal check in textSignalsHealth.
const HEALTH_TEXT = [
  'dentist',
  'doctor',
  'pediatrician',
  'wellness',
  'therapy',
  'pharmacy',
  'prescription',
  'medication',
  'injection',
  'refill',
  'dosage',
  'dose',
];

// Fix 4: 'appointment' + one of these → health signal.
const MEDICAL_APPOINTMENT_CO_SIGNALS = [
  'doctor', 'dentist', 'pediatrician', 'therapy', 'therapist',
  'medical', 'health', 'checkup', 'check-up', 'specialist',
  'prescription', 'pharmacy', 'lab', 'bloodwork', 'blood work',
  'physical', 'immunization', 'vaccine', 'vaccination',
];

// 'started' and 'stopped' are generic verbs — they must not appear here.
// The regex in textSignalsHealth already requires started/stopped/refill/dose/mg;
// this list provides the drug/treatment-specific tokens for the co-signal check.
const PERSONAL_TREATMENT_TEXT = [
  'reta',
  'rybelsus',
  'ozempic',
  'wegovy',
  'mounjaro',
];

// Fix 2: 'started' alone is not a health signal — it must be accompanied by medical vocabulary.
const STARTED_HEALTH_CO_TERMS = [
  'medication', 'medicine', 'therapy', 'treatment', 'supplement',
  'vitamin', 'dose', 'dosage', 'mg', 'injection', 'chemo',
  'rehab', 'recovery', 'symptoms', 'pain', 'physical therapy',
];

export function textSignalsCommunity(text: string): boolean {
  const lower = text.toLowerCase();
  if (COMMUNITY_TEXT.some((s) => lower.includes(s))) return true;
  // Fix 3: 'board' only signals Community when a community co-signal is present.
  if (lower.includes('board') && BOARD_COMMUNITY_CO_SIGNALS.some((s) => lower.includes(s))) {
    return true;
  }
  return false;
}

export function textSignalsHealth(text: string): boolean {
  const lower = text.toLowerCase();
  if (HEALTH_TEXT.some((s) => lower.includes(s))) return true;
  // Fix 4: 'appointment' requires a medical co-signal.
  if (
    lower.includes('appointment') &&
    MEDICAL_APPOINTMENT_CO_SIGNALS.some((s) => lower.includes(s))
  ) {
    return true;
  }
  if (
    PERSONAL_TREATMENT_TEXT.some((s) => lower.includes(s)) &&
    /\b(?:started|stopped|refill|dose|mg)\b/i.test(lower)
  ) {
    return true;
  }
  // Fix 2: 'started [word]' only signals health when medical vocabulary co-occurs.
  if (/\bstarted\b/i.test(lower) && STARTED_HEALTH_CO_TERMS.some((t) => lower.includes(t))) {
    return true;
  }
  return false;
}

export function textSignalsPersonalMedical(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\bstarted\s+[a-z]{3,12}(?:\s+\d{1,2}\/\d{1,2})?\b/i.test(lower) ||
    (lower.includes('reta') && /\b(?:started|dose|mg)\b/i.test(lower))
  );
}
