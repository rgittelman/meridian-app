import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { MeridianTabBar } from '@/components/navigation/MeridianTabBar';
import { TAB_ROUTES } from '@/constants/tabs';
import { CaptureScreen } from '@/screens/Capture/CaptureScreen';
import { FocusScreen } from '@/screens/Focus/FocusScreen';
import { LifeScreen } from '@/screens/Life/LifeScreen';
import { PlanScreen } from '@/screens/Plan/PlanScreen';
import type { RootTabParamList } from '@/types/navigation';

const Tab = createBottomTabNavigator<RootTabParamList>();

export function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName={TAB_ROUTES.Focus}
      tabBar={(props) => <MeridianTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: true,
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Tab.Screen name={TAB_ROUTES.Focus} component={FocusScreen} />
      <Tab.Screen name={TAB_ROUTES.Plan} component={PlanScreen} />
      <Tab.Screen name={TAB_ROUTES.Life} component={LifeScreen} />
      <Tab.Screen name={TAB_ROUTES.Capture} component={CaptureScreen} />
    </Tab.Navigator>
  );
}
