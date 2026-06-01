import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/typography/Text';
import type { PlanPromotedCapture } from '@/types/plan';
import { formatPlanPeopleLine } from '@/services/plan/humanizePlanTitle';
import { usePlanPromotionStore } from '@/store/planPromotionStore';
import { makeStyles, radius, spacing } from '@/theme';

type PromotedCaptureDetailSheetProps = {
  visible: boolean;
  capture: PlanPromotedCapture | null;
  onClose: () => void;
};

export function PromotedCaptureDetailSheet({
  visible,
  capture,
  onClose,
}: PromotedCaptureDetailSheetProps) {
  const styles = useStyles();
  const markHandled = usePlanPromotionStore((s) => s.markHandled);
  const markHeld = usePlanPromotionStore((s) => s.markHeld);
  const dismissFromPlan = usePlanPromotionStore((s) => s.dismissFromPlan);

  if (!capture) return null;

  const peopleLine =
    formatPlanPeopleLine(capture.inferredPeople) ?? capture.personLabel;

  const runAndClose = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text variant="heading" color="ink" maxFontSizeMultiplier={1.2}>
          {capture.title}
        </Text>
        {peopleLine ? (
          <Text variant="callout" style={styles.people} maxFontSizeMultiplier={1.1}>
            {peopleLine}
          </Text>
        ) : null}
        <Text variant="footnote" style={styles.time} maxFontSizeMultiplier={1.05}>
          {capture.displayTime}
          {capture.isApproximate ? ' · approximate' : ''}
        </Text>
        {capture.location ? (
          <Text variant="footnote" color="inkSecondary" maxFontSizeMultiplier={1.05}>
            {capture.location}
          </Text>
        ) : null}
        <Text variant="caption" style={styles.attribution} maxFontSizeMultiplier={1.05}>
          From your captures — not on your calendar
        </Text>
        <Text variant="footnote" color="inkGhost" style={styles.original} maxFontSizeMultiplier={1.05}>
          Captured as: {capture.originalText}
        </Text>

        <View style={styles.actions}>
          <Pressable
            onPress={() => runAndClose(() => markHeld(capture.sourceCaptureId))}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Hold ${capture.title}`}
          >
            <Text variant="callout" style={styles.actionHold}>
              Hold
            </Text>
          </Pressable>
          <Pressable
            onPress={() => runAndClose(() => markHandled(capture.sourceCaptureId))}
            style={({ pressed }) => [styles.actionBtn, styles.actionPrimary, pressed && styles.actionPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${capture.title} handled`}
          >
            <Text variant="callout" style={styles.actionHandled}>
              Handled
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => runAndClose(() => dismissFromPlan(capture.sourceCaptureId))}
          style={({ pressed }) => [styles.dismiss, pressed && styles.actionPressed]}
          accessibilityRole="button"
          accessibilityLabel="Remove from plan"
        >
          <Text variant="footnote" color="inkGhost">
            Remove from plan
          </Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  backdrop: {
    flex: 1,
    backgroundColor: c.overlay,
  },
  sheet: {
    backgroundColor: c.surfaceElevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
    paddingBottom: spacing[8],
    gap: spacing[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
  },
  handle: {
    alignSelf: 'center' as const,
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: c.border,
    marginBottom: spacing[2],
  },
  people: {
    color: c.peoplePillText,
    fontWeight: '500' as const,
  },
  time: {
    color: c.planCaptureTime,
  },
  attribution: {
    color: c.planCaptureSource,
    fontStyle: 'italic' as const,
  },
  original: {
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row' as const,
    gap: spacing[3],
    marginTop: spacing[2],
  },
  actionBtn: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.borderSubtle,
    alignItems: 'center' as const,
  },
  actionPrimary: {
    backgroundColor: c.focusActionStripBg,
    borderColor: c.focusActionHoldBorder,
  },
  actionPressed: {
    opacity: 0.7,
  },
  actionHold: {
    color: c.focusActionHoldText,
  },
  actionHandled: {
    color: c.focusActionHandledText,
    fontWeight: '500' as const,
  },
  dismiss: {
    alignSelf: 'center' as const,
    paddingVertical: spacing[2],
  },
}));
