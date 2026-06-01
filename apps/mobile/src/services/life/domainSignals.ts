const COMMUNITY_TEXT = [
  'bfsc',
  'board',
  'swim club',
  'volunteer',
  'nonprofit',
  'community',
  'pta',
];

const HEALTH_TEXT = [
  'dentist',
  'doctor',
  'pediatrician',
  'appointment',
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

const PERSONAL_TREATMENT_TEXT = [
  'started',
  'stopped',
  'reta',
  'rybelsus',
  'ozempic',
  'wegovy',
  'mounjaro',
];

export function textSignalsCommunity(text: string): boolean {
  const lower = text.toLowerCase();
  return COMMUNITY_TEXT.some((s) => lower.includes(s));
}

export function textSignalsHealth(text: string): boolean {
  const lower = text.toLowerCase();
  if (HEALTH_TEXT.some((s) => lower.includes(s))) return true;
  if (
    PERSONAL_TREATMENT_TEXT.some((s) => lower.includes(s)) &&
    /\b(?:started|stopped|refill|dose|mg)\b/i.test(lower)
  ) {
    return true;
  }
  if (/\bstarted\s+[a-z]{3,12}\b/i.test(lower)) return true;
  return false;
}

export function textSignalsPersonalMedical(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    /\bstarted\s+[a-z]{3,12}(?:\s+\d{1,2}\/\d{1,2})?\b/i.test(lower) ||
    (lower.includes('reta') && /\b(?:started|dose|mg)\b/i.test(lower))
  );
}
