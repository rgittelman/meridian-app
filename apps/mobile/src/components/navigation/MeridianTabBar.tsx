import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import {
  Compass,
  LayoutList,
  Plus,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { Text } from '@/components/typography/Text';
import { TAB_ORDER, type TabRouteName } from '@/constants/tabs';
import { isIOS } from '@/utils/platform';
import { useTheme } from '@/hooks/useTheme';
import {
  makeStyles,
  radius,
  spacing,
  tabBarBottomInset,
  tabBarHeight,
} from '@/theme';

const TAB_ICONS: Record<TabRouteName, LucideIcon> = {
  Focus: Sparkles,
  Plan: LayoutList,
  Life: Compass,
  Capture: Plus,
};

const TAB_LABELS: Record<TabRouteName, string> = {
  Focus: 'Focus',
  Plan: 'Plan',
  Life: 'Life',
  Capture: 'Capture',
};

export function MeridianTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  return (
    <View
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, spacing[2]) + tabBarBottomInset }]}
      pointerEvents="box-none"
    >
      <View style={styles.barShadow}>
        {isIOS ? (
          <BlurView intensity={42} tint="systemMaterial" style={styles.blur}>
            <TabRow state={state} descriptors={descriptors} navigation={navigation} />
          </BlurView>
        ) : (
          <View style={[styles.blur, styles.androidBar]}>
            <TabRow state={state} descriptors={descriptors} navigation={navigation} />
          </View>
        )}
      </View>
    </View>
  );
}

function TabRow({
  state,
  descriptors,
  navigation,
}: Pick<BottomTabBarProps, 'state' | 'descriptors' | 'navigation'>) {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.row}>
      {state.routes.map((route, index) => {
        const name = route.name as TabRouteName;
        const focused = state.index === index;
        const { options } = descriptors[route.key];
        const Icon = TAB_ICONS[name];
        const isCapture = name === 'Capture';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!focused && !event.defaultPrevented) {
            if (isCapture) {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const iconColor = focused ? colors.tabActive : colors.tabInactive;
        const captureIconColor = focused ? colors.ink : colors.captureAccent;
        const labelColor = focused ? colors.tabActive : colors.tabInactive;

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel ?? TAB_LABELS[name]}
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => [
              styles.tab,
              isCapture && styles.captureTab,
              pressed && styles.pressed,
            ]}
          >
            {isCapture ? (
              <View style={[styles.captureIconWrap, focused && styles.captureIconWrapActive]}>
                <Icon size={22} color={captureIconColor} strokeWidth={2} />
              </View>
            ) : (
              <Icon size={22} color={iconColor} strokeWidth={focused ? 2.25 : 1.75} />
            )}
            <Text
              variant="footnote"
              style={[styles.label, { color: labelColor }]}
            >
              {TAB_LABELS[name]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  outer: {
    position: 'absolute' as const,
    left: spacing[4],
    right: spacing[4],
    bottom: 0,
  },
  barShadow: {
    borderRadius: radius.xl,
    overflow: 'hidden' as const,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.tabBarBorder,
    ...(!isIOS && {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.14,
      shadowRadius: 12,
    }),
  },
  blur: {
    minHeight: tabBarHeight,
    justifyContent: 'center' as const,
  },
  androidBar: {
    backgroundColor: c.tabBar,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-around' as const,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 44,
    gap: spacing[1],
  },
  captureTab: {
    marginTop: -spacing[1],
  },
  captureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: c.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  captureIconWrapActive: {
    backgroundColor: c.accentMuted,
    borderColor: c.accent,
  },
  label: {
    marginTop: 2,
  },
  pressed: {
    opacity: 0.72,
  },
}));
