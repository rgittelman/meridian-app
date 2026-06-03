import { TouchableOpacity, View } from 'react-native';
import { BookOpen, Bell, Calendar, CheckSquare } from 'lucide-react-native';

import { GradientIcon } from '@/components/shared/primitives/GradientIcon';
import { Text } from '@/components/typography/Text';
import { makeStyles, radius, spacing } from '@/theme';

type CaptureActionGridProps = {
  onNote: () => void;
  onTask: () => void;
  onReminder: () => void;
  onEvent: () => void;
};

type ActionItem = {
  label: string;
  Icon: typeof BookOpen;
  gradient: readonly [string, string];
  onPress: () => void;
};

export function CaptureActionGrid({ onNote, onTask, onReminder, onEvent }: CaptureActionGridProps) {
  const styles = useStyles();

  const actions: ActionItem[] = [
    { label: 'Note',     Icon: BookOpen,    gradient: ['#A07AE8', '#7B6FE8'], onPress: onNote },
    { label: 'Task',     Icon: CheckSquare, gradient: ['#10B981', '#34D399'], onPress: onTask },
    { label: 'Reminder', Icon: Bell,        gradient: ['#F97316', '#F59E0B'], onPress: onReminder },
    { label: 'Event',    Icon: Calendar,    gradient: ['#3B82F6', '#7B6FE8'], onPress: onEvent },
  ];

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.label}
          style={styles.tile}
          onPress={action.onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <View style={[styles.iconWrap, { backgroundColor: `${action.gradient[0]}18` }]}>
            <GradientIcon Icon={action.Icon} size={22} gradient={action.gradient} strokeWidth={1.75} />
          </View>
          <Text variant="caption" color="inkSecondary" weight="medium" align="center">
            {action.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  grid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  tile: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: c.surfaceElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
