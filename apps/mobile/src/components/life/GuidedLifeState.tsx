import {
  Activity,
  Briefcase,
  Compass,
  Home,
  type LucideIcon,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { useTheme } from '@/hooks/useTheme';
import { makeStyles, radius, spacing } from '@/theme';

type Category = { id: string; label: string; Icon: LucideIcon };

const CATEGORIES: Category[] = [
  { id: 'work', label: 'Work', Icon: Briefcase },
  { id: 'family', label: 'Family', Icon: Home },
  { id: 'health', label: 'Health', Icon: Activity },
  { id: 'personal', label: 'Personal', Icon: Compass },
];

function CategoryAnchor({ label, Icon }: Pick<Category, 'label' | 'Icon'>) {
  const { colors } = useTheme();
  const styles = useCategoryStyles();
  return (
    <View style={styles.category} accessibilityLabel={label} accessibilityRole="text">
      <Icon size={18} color={colors.inkTertiary} strokeWidth={1.75} />
      <Text variant="callout" color="inkSecondary" style={styles.categoryLabel}>
        {label}
      </Text>
      <View
        style={styles.categoryBar}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </View>
  );
}

export function GuidedLifeState() {
  const styles = useStyles();
  return (
    <View style={styles.wrap} accessibilityLabel="Life. Patterns become clearer over time.">
      <Text variant="caption" color="inkGhost" style={styles.eyebrow}>
        Your life
      </Text>

      <Text variant="display" color="ink" style={styles.headline}>
        Patterns become clearer over time.
      </Text>

      <Text variant="body" color="inkSecondary" style={styles.subline}>
        Your life isn't as scattered as it feels.
      </Text>

      <View style={styles.grid} accessibilityLabel="Life areas">
        {CATEGORIES.map(({ id, label, Icon }) => (
          <CategoryAnchor key={id} label={label} Icon={Icon} />
        ))}
      </View>

      <View
        style={styles.divider}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />

      <Text variant="callout" color="inkGhost" style={styles.footer}>
        Small consistency matters more than big plans.
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flex: 1,
    justifyContent: 'center' as const,
    paddingBottom: spacing[10],
    gap: spacing[4],
  },
  eyebrow: { letterSpacing: 0.4, marginBottom: -spacing[1] },
  headline: { maxWidth: 300 },
  subline: { maxWidth: 280, marginTop: -spacing[1] },
  grid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing[2] + 2,
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  footer: { maxWidth: 264 },
}));

const useCategoryStyles = makeStyles((c) => ({
  category: {
    width: '47.5%' as unknown as number,
    backgroundColor: c.lifeCategoryBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.lifeCategoryBorder,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  categoryLabel: { marginTop: spacing[1] },
  categoryBar: {
    width: 28,
    height: 2,
    borderRadius: radius.full,
    backgroundColor: c.insightSoft,
    marginTop: spacing[1],
  },
}));
