import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Pressable } from 'react-native';

import { Text } from '@/components/typography/Text';
import { springConfig } from '@/animations/motionTokens';
import type { LifeObject } from '@/types/capture';
import {
  personLabelForCapture,
  timingLabelForCapture,
} from '@/utils/parsing/personForDisplay';
import { CaptureIntelligenceDiagnostics } from '@/components/capture/CaptureIntelligenceDiagnostics';
import { logCapturePreviewTruncation } from '@/services/quality/qualityDebug';
import { isDevEnvironment } from '@/utils/isDev';
import { makeStyles, radius, spacing } from '@/theme';

type CaptureCardProps = {
  item: LifeObject;
  index: number;
  onPress?: (item: LifeObject) => void;
};

function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Context pills: known person names and high-confidence timing only. */
function buildContextParts(item: LifeObject): {
  person: string | null;
  timing: string | null;
} {
  return {
    person: personLabelForCapture(item),
    timing: timingLabelForCapture(item),
  };
}

export function CaptureCard({ item, index, onPress }: CaptureCardProps) {
  const styles = useStyles();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const { person, timing } = buildContextParts(item);
  const hasContext = Boolean(person || timing);

  if (isDevEnvironment() && item.title.length < item.raw.length) {
    logCapturePreviewTruncation(item.raw.length, item.title.length, item.title);
  }

  const contextSegments: Array<{ text: string; style: 'person' | 'timing' }> = [];
  if (person) contextSegments.push({ text: person, style: 'person' });
  if (timing) contextSegments.push({ text: timing, style: 'timing' });

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).duration(280).springify()}>
      <AnimatedPressable
        onPressIn={() => { scale.value = withSpring(0.982, springConfig.gentle); }}
        onPressOut={() => { scale.value = withSpring(1, springConfig.gentle); }}
        onPress={() => onPress?.(item)}
        style={[styles.card, animStyle]}
        accessibilityRole="button"
        accessibilityLabel={item.title || item.raw}
      >
        <View style={staticStyles.mainRow}>
          <Text
            variant="callout"
            color="inkSecondary"
            style={staticStyles.titleText}
            maxFontSizeMultiplier={1.2}
          >
            {item.title}
          </Text>
          <Text
            variant="footnote"
            color="inkGhost"
            style={staticStyles.time}
            maxFontSizeMultiplier={1.0}
          >
            {formatRelativeTime(item.createdAt)}
          </Text>
        </View>

        {isDevEnvironment() ? (
          <CaptureIntelligenceDiagnostics item={item} compact />
        ) : null}

        {hasContext && (
          <View style={staticStyles.contextRow}>
            {contextSegments.map((seg, i) => (
              <View key={`${seg.style}-${seg.text}`} style={staticStyles.contextSegmentWrap}>
                {i > 0 && (
                  <Text
                    variant="caption"
                    color="inkGhost"
                    style={staticStyles.separator}
                    maxFontSizeMultiplier={1.0}
                  >
                    {' · '}
                  </Text>
                )}
                <Text
                  variant="caption"
                  style={
                    seg.style === 'person' ? styles.contextPerson : styles.contextTiming
                  }
                  maxFontSizeMultiplier={1.0}
                >
                  {seg.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3] + 2,
    gap: spacing[2],
  },
  contextPerson: {
    color: c.peoplePillText,
    fontWeight: '500' as const,
  },
  contextTiming: {
    color: c.inkTertiary,
  },
}));

const staticStyles = StyleSheet.create({
  mainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3] },
  titleText: { flex: 1 },
  time: { flexShrink: 0, paddingTop: 1 },
  contextRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  contextSegmentWrap: { flexDirection: 'row', alignItems: 'center' },
  separator: { opacity: 0.5 },
});
