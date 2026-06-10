import { TouchableOpacity, View, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, radius, spacing } from '@/theme';

type GradientCardProps = {
  children: React.ReactNode;
  accentColor?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityRole?: AccessibilityRole;
};

/**
 * Base card shell with optional colored left border accent.
 * When accentColor is provided, a 2.5px left border in that color is applied.
 * V1.2: solid accent border. Gradient border upgrade deferred to V1.2b.
 */
export function GradientCard({ children, accentColor, style, onPress, accessibilityRole }: GradientCardProps) {
  const styles = useStyles();

  const accentBorder: StyleProp<ViewStyle> = accentColor
    ? { borderLeftWidth: 2.5, borderLeftColor: accentColor }
    : {};

  const inner = (
    <View style={[styles.card, accentBorder, style]} accessibilityRole={accessibilityRole}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surfaceElevated,
    borderRadius: radius.md,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: c.border,
    // Subtle elevation — lifts cards off the background without overpowering
    // domain-tinted cards (LifeDomainCard overrides these via style prop)
    shadowColor: '#1E1B16',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
}));
