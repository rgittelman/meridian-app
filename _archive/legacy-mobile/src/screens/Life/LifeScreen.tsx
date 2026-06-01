import { ScreenContainer } from '@/components/ScreenContainer';
import { PlaceholderState } from '@/components/PlaceholderState';
import { SCREEN_PLACEHOLDERS } from '@/constants/screens';

export function LifeScreen() {
  const copy = SCREEN_PLACEHOLDERS.Life;

  return (
    <ScreenContainer testID="life-screen">
      <PlaceholderState {...copy} />
    </ScreenContainer>
  );
}
