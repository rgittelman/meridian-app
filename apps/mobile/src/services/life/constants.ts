import type { LifeDomainId } from '@/types/life';
import {
  Activity,
  Briefcase,
  Compass,
  Heart,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

export type LifeDomainDefinition = {
  id: LifeDomainId;
  label: string;
  Icon: LucideIcon;
};

export const LIFE_DOMAIN_ORDER: LifeDomainId[] = [
  'family',
  'work',
  'community',
  'health',
  'personal',
];

export const LIFE_DOMAIN_DEFINITIONS: LifeDomainDefinition[] = [
  { id: 'family', label: 'Family', Icon: Heart },
  { id: 'work', label: 'Work', Icon: Briefcase },
  { id: 'community', label: 'Community', Icon: Users },
  { id: 'health', label: 'Health', Icon: Activity },
  { id: 'personal', label: 'Personal', Icon: Compass },
];

/** Family domain people anchors (relationship anchors, not contacts). */
export const FAMILY_PERSON_ANCHORS = [
  'Crystal',
  'Grace',
  'Hudson',
  'Quinn',
  'Reagan',
] as const;

export {
  textSignalsCommunity,
  textSignalsHealth,
  textSignalsPersonalMedical,
} from './domainSignals';
