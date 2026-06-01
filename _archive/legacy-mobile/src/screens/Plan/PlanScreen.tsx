import { ScreenContainer } from '@/components/ScreenContainer';
import { PlaceholderState } from '@/components/PlaceholderState';
import { SCREEN_PLACEHOLDERS } from '@/constants/screens';

export function PlanScreen() {
  const copy = SCREEN_PLACEHOLDERS.Plan;

  return (
    <ScreenContainer testID="plan-screen">
      <PlaceholderState {...copy} />
    </ScreenContainer>
  );
}
