import type { AppColors } from '@/theme/colors';
import type { ItemCategory } from '@/services/priority/types';

export function planAccentForCategory(
  colors: AppColors,
  category: ItemCategory | null,
  ownerLabel: string | null,
): string {
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
      if (ownerLabel === 'You') return colors.planAccentCommunity;
      return colors.planAccentNeutral;
    default:
      if (ownerLabel === 'Work') return colors.planAccentWork;
      if (ownerLabel === 'You') return colors.planAccentCommunity;
      return colors.planAccentNeutral;
  }
}
