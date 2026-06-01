import { Text } from '@/components/typography/Text';
import { makeStyles, spacing } from '@/theme';

type CalendarContinuityBannerProps = {
  message: string;
};

/** Soft footnote for loading, offline, partial sync, etc. */
export function CalendarContinuityBanner({ message }: CalendarContinuityBannerProps) {
  const styles = useStyles();

  return (
    <Text
      variant="footnote"
      style={styles.text}
      maxFontSizeMultiplier={1.1}
      accessibilityLiveRegion="polite"
    >
      {message}
    </Text>
  );
}

const useStyles = makeStyles((c) => ({
  text: {
    color: c.calendarContinuityText,
    letterSpacing: 0.1,
    paddingHorizontal: spacing[1],
  },
}));
