import type { LifeObject } from '@/types/capture';
import type { ParsedField } from '@/types/capture';
import { memberByName } from '@/services/relevance/householdContext';
import {
  formatTimingPillLabel,
  isAllowedPersonPill,
  isAllowedTimingPill,
  logPillDecision,
} from './pillRules';

export function personFieldForDisplay(
  people: ParsedField<string>[],
): ParsedField<string> | null {
  const ranked = [...people].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.confidence] - order[b.confidence];
  });

  for (const field of ranked) {
    if (field.confidence === 'low') continue;
    if (isAllowedPersonPill(field.value)) {
      logPillDecision('person', field.value, 'household_or_known');
      return field;
    }
    logPillDecision('skipped', field.value, 'not_allowed_person');
  }
  return null;
}

export function personLabelForCapture(item: LifeObject): string | null {
  return personFieldForDisplay(item.parse.people)?.value ?? null;
}

export function timingLabelForCapture(item: LifeObject): string | null {
  const timing = item.parse.timing;
  if (!timing || timing.confidence !== 'high') return null;

  const label = timing.value.label;
  if (!isAllowedTimingPill(label)) {
    logPillDecision('skipped', label, 'not_allowed_timing');
    return null;
  }

  logPillDecision('timing', label, 'high_confidence');
  return formatTimingPillLabel(label);
}
