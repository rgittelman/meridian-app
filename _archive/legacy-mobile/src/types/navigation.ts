import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

import type { TabRouteName } from '@/constants/tabs';

export type RootTabParamList = {
  Focus: undefined;
  Plan: undefined;
  Life: undefined;
  Capture: undefined;
};

export type TabScreenProps<T extends TabRouteName> = BottomTabScreenProps<
  RootTabParamList,
  T
>;
