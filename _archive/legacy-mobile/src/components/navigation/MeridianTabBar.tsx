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
import {
  colors,
  minTouchTarget,
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

  return (
    <View
      style={[styles.outer, { paddingBottom: Math.max(insets.bottom, spacing[2]) + tabBarBottomInset }]}
      pointerEvents="box-none"
    >
      <View style={styles.barShadow}>
        {isIOS ? (
          <BlurView intensity={42} tint="dark" style={styles.blur}>
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

        const color = focused
          ? isCapture
            ? colors.captureAccent
            : colors.tabActive
          : colors.tabInactive;

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
                <Icon size={22} color={focused ? colors.ink : colors.captureAccent} strokeWidth={2} />
              </View>
            ) : (
              <Icon size={22} color={color} strokeWidth={focused ? 2.25 : 1.75} />
            )}
            <Text
              variant="footnote"
              style={[
                styles.label,
                { color },
                isCapture && focused && { color: colors.tabActive },
              ]}
            >
              {TAB_LABELS[name]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: 0,
  },
  barShadow: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.tabBarBorder,
    ...(!isIOS && {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
    }),
  },
  blur: {
    minHeight: tabBarHeight,
    justifyContent: 'center',
  },
  androidBar: {
    backgroundColor: colors.tabBar,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: minTouchTarget,
    gap: spacing[1],
  },
  captureTab: {
    marginTop: -spacing[1],
  },
  captureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  captureIconWrapActive: {
    backgroundColor: colors.accentMuted,
  },
  label: {
    marginTop: 2,
  },
  pressed: {
    opacity: 0.72,
  },
});
