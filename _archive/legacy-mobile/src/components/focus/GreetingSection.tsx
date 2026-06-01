import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import { spacing } from '@/theme';

type GreetingSectionProps = {
  name?: string;
  /**
   * "morning" | "afternoon" | "evening" | "night"
   * Future: pass in from a useGreeting hook driven by time-of-day.
   */
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  supporting?: string;
};

const GREETINGS: Record<NonNullable<GreetingSectionProps['timeOfDay']>, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
  night: 'Hey',
};

const SUPPORTING_DEFAULTS: Record<
  NonNullable<GreetingSectionProps['timeOfDay']>,
  string
> = {
  morning: 'Let\'s make today lighter.',
  afternoon: 'Still plenty of time.',
  evening: 'What still matters tonight?',
  night: 'You can rest soon.',
};

export function GreetingSection({
  name = 'Ryan',
  timeOfDay = 'evening',
  supporting,
}: GreetingSectionProps) {
  const greeting = `${GREETINGS[timeOfDay]}, ${name}.`;
  const supportingLine = supporting ?? SUPPORTING_DEFAULTS[timeOfDay];

  return (
    <View style={styles.wrap} accessibilityRole="header">
      <Text
        variant="display"
        color="ink"
        style={styles.greeting}
        maxFontSizeMultiplier={1.2}
      >
        {greeting}
      </Text>
      <Text
        variant="subhead"
        color="inkSecondary"
        style={styles.supporting}
        maxFontSizeMultiplier={1.3}
      >
        {supportingLine}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing[2],
  },
  greeting: {
    // letterSpacing already tight via token — no override needed
  },
  supporting: {
    // matches body weight intentionally — calm, not urgent
  },
});
