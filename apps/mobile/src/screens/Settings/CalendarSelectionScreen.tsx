import { Modal, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/typography/Text';
import { useCalendarStore } from '@/store/calendarStore';
import { useCalendarSelectionStore } from '@/store/calendarSelectionStore';
import { makeStyles, spacing } from '@/theme';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function CalendarSelectionScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();

  const syncEvents = useCalendarStore((s) => s.syncEvents);
  const availableCalendars = useCalendarSelectionStore((s) => s.availableCalendars);
  const disabledCalendarIds = useCalendarSelectionStore((s) => s.disabledCalendarIds);
  const setCalendarEnabled = useCalendarSelectionStore((s) => s.setCalendarEnabled);

  const isEnabled = (id: string) => !disabledCalendarIds.includes(id);

  const handleToggle = (calendarId: string, enabled: boolean) => {
    setCalendarEnabled(calendarId, enabled);
    void syncEvents();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: insets.top + spacing[4] }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="heading" weight="semibold">
            Calendars
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Done"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text variant="body" color="accent">
              Done
            </Text>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {availableCalendars.length === 0 ? (
              <View style={styles.row}>
                <Text variant="body" color="inkSecondary">
                  Sync your calendar to see available calendars.
                </Text>
              </View>
            ) : (
              availableCalendars.map((cal, index) => {
                const isPrimary = cal.sourceCalendarPrimary;
                const enabled = isEnabled(cal.sourceCalendarId);
                return (
                  <View key={cal.sourceCalendarId}>
                    <View style={styles.row}>
                      <View style={styles.calendarLabelGroup}>
                        <Text variant="body" color={enabled ? 'ink' : 'inkSecondary'}>
                          {cal.sourceCalendarName}
                        </Text>
                        {isPrimary && (
                          <Text variant="caption" color="inkGhost">
                            Primary
                          </Text>
                        )}
                      </View>
                      <Switch
                        value={enabled}
                        onValueChange={(v) => handleToggle(cal.sourceCalendarId, v)}
                        disabled={isPrimary}
                        trackColor={{ false: colors.border, true: colors.accent }}
                        thumbColor={colors.ink}
                        ios_backgroundColor={colors.surfaceElevated}
                        accessibilityLabel={`${enabled ? 'Disable' : 'Enable'} ${cal.sourceCalendarName}`}
                      />
                    </View>
                    {index < availableCalendars.length - 1 && (
                      <View style={styles.separator} />
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.background,
    paddingHorizontal: spacing[4],
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing[6],
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden' as const,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 48,
  },
  separator: {
    height: 1,
    backgroundColor: c.borderSubtle,
    marginLeft: spacing[4],
  },
  calendarLabelGroup: {
    flex: 1,
    gap: spacing[1],
    marginRight: spacing[3],
  },
  pressed: {
    opacity: 0.72,
  },
}));
