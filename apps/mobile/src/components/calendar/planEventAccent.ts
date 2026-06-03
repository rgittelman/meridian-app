import type { AppColors } from '@/theme/colors';
import type { ItemCategory } from '@/services/priority/types';
import type { LifeDomainId } from '@/types/life';

/**
 * Maps a LifeDomainId to its canonical domain accent color.
 * Single source of truth for domain color identity across all screens.
 */
export function domainColorFor(colors: AppColors, domain: LifeDomainId): string {
  switch (domain) {
    case 'family':    return colors.domainFamily;
    case 'work':      return colors.domainWork;
    case 'health':    return colors.domainHealth;
    case 'personal':  return colors.domainPersonal;
    case 'community': return colors.domainCommunity;
  }
}

/**
 * Accent color for calendar event cards.
 *
 * Priority: named-person owner (family accent) → explicit category → ownerLabel fallback.
 * community is an explicit case — BFSC board meeting should read community, not neutral.
 * personal does NOT map to community by default.
 */
export function planAccentForCategory(
  colors: AppColors,
  category: ItemCategory | null,
  ownerLabel: string | null,
): string {
  // Named household-member owner → family accent (e.g. "Grace · Family Calendar")
  if (ownerLabel && ownerLabel !== 'You' && ownerLabel !== 'Work') {
    return colors.planAccentFamily;
  }

  switch (category) {
    case 'family':
    case 'household':
      return colors.planAccentFamily;
    case 'work':
    case 'financial':
      return colors.planAccentWork;
    case 'health':
      return colors.planAccentHealth;
    case 'personal':
      // personal events owned by "Work" → work accent; otherwise neutral
      if (ownerLabel === 'Work') return colors.planAccentWork;
      return colors.planAccentNeutral;
    default:
      if (ownerLabel === 'Work') return colors.planAccentWork;
      return colors.planAccentNeutral;
  }
}

/**
 * Accent color for promoted capture marker dots.
 *
 * Uses LifeDomainId (the domain assigned during capture promotion) rather than
 * ItemCategory, because captures are classified against life domains, not event categories.
 * Intentionally subtler than calendar event accents — captures are not calendar events.
 */
export function planAccentForDomain(
  colors: AppColors,
  domain: LifeDomainId,
): string {
  switch (domain) {
    case 'family':
      return colors.planAccentFamily;
    case 'work':
      return colors.planAccentWork;
    case 'community':
      return colors.planAccentCommunity;
    case 'health':
      return colors.planAccentHealth;
    case 'personal':
    default:
      return colors.planAccentNeutral;
  }
}

/**
 * Accent color for calendar events whose inferred domain is known.
 * Used when a community-classified event (e.g. BFSC board meeting) needs
 * community accent rather than falling through to the ownerLabel path.
 */
export function planAccentForEventDomain(
  colors: AppColors,
  inferredDomain: string | null,
  category: ItemCategory | null,
  ownerLabel: string | null,
): string {
  if (inferredDomain === 'community') return colors.planAccentCommunity;
  return planAccentForCategory(colors, category, ownerLabel);
}
