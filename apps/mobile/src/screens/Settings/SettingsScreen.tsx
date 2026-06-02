import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { ChevronRight } from 'lucide-react-native';

import { Text } from '@/components/typography/Text';
import { CalendarSelectionScreen } from '@/screens/Settings/CalendarSelectionScreen';
import { NotificationPermissionPrompt } from '@/screens/Settings/NotificationPermissionPrompt';
import {
  captureCurrentLocation,
  geocodeAddress,
  locationsTooClose,
  requestLocationPermission,
  resolveAddressSuggestion,
  resolveApproximateLocation,
  resolveCurrentRegionFromDevice,
  reverseGeocodeAddress,
} from '@/services/location/geofenceManager';
import { useCalendarStore } from '@/store/calendarStore';
import { useCalendarSelectionStore } from '@/store/calendarSelectionStore';
import { useLocationStore } from '@/store/locationStore';
import type { KnownLocation } from '@/store/locationStore';
import { useNotificationDeliveryStore } from '@/store/notificationDeliveryStore';
import { useNotificationSettingsStore } from '@/store/notificationSettingsStore';
import { makeStyles, radius, spacing } from '@/theme';
import { useTheme } from '@/hooks/useTheme';
import Constants from 'expo-constants';
import { DEFAULT_REGION_RADIUS_METERS } from '@/store/locationStore';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function SettingsScreen({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [showCalendarSelection, setShowCalendarSelection] = useState(false);

  const [settingLocation, setSettingLocation] = useState<'home' | 'work' | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentLocationLabel, setCurrentLocationLabel] = useState<string | null>(null);
  const [addressInputMode, setAddressInputMode] = useState<'home' | 'work' | null>(null);
  const [addressText, setAddressText] = useState('');
  const [geocodingLocation, setGeocodingLocation] = useState<'home' | 'work' | null>(null);

  const permissionState = useNotificationDeliveryStore((s) => s.permissionState);
  const calendarStatus = useCalendarStore((s) => s.status);
  const syncEvents = useCalendarStore((s) => s.syncEvents);
  const disconnect = useCalendarStore((s) => s.disconnect);

  // Read only what's needed for the summary row count.
  const availableCalendars = useCalendarSelectionStore((s) => s.availableCalendars);
  const disabledCalendarIds = useCalendarSelectionStore((s) => s.disabledCalendarIds);
  const enabledCalendarCount = availableCalendars.filter(
    (cal) => !disabledCalendarIds.includes(cal.sourceCalendarId),
  ).length;

  const {
    homeLocation,
    workLocation,
    currentRegion,
    smartLeaveTimingEnabled,
    setHomeLocation,
    setWorkLocation,
    setCurrentRegion,
    setLocationPermission,
    setSmartLeaveTimingEnabled,
  } = useLocationStore();

  // Refresh current region and approximate location each time the settings modal opens.
  useEffect(() => {
    if (!visible) return;
    setCurrentLocationLabel(null);
    const { homeLocation: home, workLocation: work } = useLocationStore.getState();
    void resolveCurrentRegionFromDevice(home, work).then(async ({ region, permissionState }) => {
      setCurrentRegion(region);
      setLocationPermission(permissionState);
      // Capture a fresh GPS fix for the approximate location label.
      const position = await captureCurrentLocation();
      if (position) {
        const label = await resolveApproximateLocation(position.latitude, position.longitude);
        setCurrentLocationLabel(label);
      }
    });
  }, [visible]);

  const {
    enabled,
    morningBriefEnabled,
    eveningPreviewEnabled,
    beforeEventsEnabled,
    criticalAlertsEnabled,
    setEnabled,
    setMorningBriefEnabled,
    setEveningPreviewEnabled,
    setBeforeEventsEnabled,
    setCriticalAlertsEnabled,
  } = useNotificationSettingsStore();

  const appVersion = Constants.expoConfig?.version ?? '—';

  const handleNotificationToggle = (value: boolean) => {
    if (value) {
      if (permissionState === 'granted' || permissionState === 'provisional') {
        setEnabled(true);
      } else {
        setShowPermissionPrompt(true);
      }
    } else {
      setEnabled(false);
    }
  };

  const handleDisconnectCalendar = () => {
    Alert.alert(
      'Disconnect Calendar',
      'This will remove your Google Calendar connection. You can reconnect from the Plan screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => void disconnect(),
        },
      ],
    );
  };

  const isCalendarConnected =
    calendarStatus === 'connected' || calendarStatus === 'partial_sync';

  const handleSetLocation = async (label: 'home' | 'work') => {
    setLocationError(null);
    setSettingLocation(label);

    // Option A: permission is triggered by the Set action, in context.
    const permission = await requestLocationPermission();
    setLocationPermission(permission);

    if (permission !== 'granted') {
      setSettingLocation(null);
      if (permission === 'denied') {
        setLocationError(
          `Location access is off. Open Settings to allow When In Use access for ${label === 'home' ? 'Home' : 'Work'}.`,
        );
      } else {
        setLocationError('Location is not available on this device.');
      }
      return;
    }

    const position = await captureCurrentLocation();
    setSettingLocation(null);

    if (!position) {
      setLocationError('Could not read your location. Try again in a moment.');
      return;
    }

    const resolvedAddress = await reverseGeocodeAddress(position.latitude, position.longitude);

    const loc: KnownLocation = {
      label,
      latitude: position.latitude,
      longitude: position.longitude,
      radiusMeters: DEFAULT_REGION_RADIUS_METERS,
      address: resolvedAddress ?? undefined,
    };

    if (label === 'home') setHomeLocation(loc);
    else setWorkLocation(loc);
  };

  const handleClearLocation = (label: 'home' | 'work') => {
    setLocationError(null);
    if (label === 'home') setHomeLocation(null);
    else setWorkLocation(null);
  };

  const handleEnterAddress = (label: 'home' | 'work') => {
    setLocationError(null);
    setAddressText('');
    setAddressInputMode(label);
  };

  const handleCancelAddress = () => {
    setAddressInputMode(null);
    setAddressText('');
    setLocationError(null);
  };

  const handleSubmitAddress = async (label: 'home' | 'work') => {
    if (!addressText.trim()) return;
    setLocationError(null);
    setGeocodingLocation(label);

    const coords = await geocodeAddress(addressText);
    setGeocodingLocation(null);

    if (!coords) {
      setLocationError("I couldn't find that address. Try adding city and state.");
      return;
    }

    const loc: KnownLocation = {
      label,
      latitude: coords.latitude,
      longitude: coords.longitude,
      radiusMeters: DEFAULT_REGION_RADIUS_METERS,
      address: addressText.trim(),
    };

    if (label === 'home') setHomeLocation(loc);
    else setWorkLocation(loc);

    setAddressInputMode(null);
    setAddressText('');
  };

  const locationsConflict =
    homeLocation !== null &&
    workLocation !== null &&
    locationsTooClose(homeLocation, workLocation);

  const regionLabel = (region: typeof currentRegion): string => {
    switch (region) {
      case 'home': return 'Home';
      case 'work': return 'Work';
      case 'away': return 'Away';
      default: return 'Unknown';
    }
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
            Settings
          </Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            style={({ pressed }) => pressed && styles.pressed}
          >
            <X size={22} color={colors.inkSecondary} strokeWidth={1.75} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>

        {/* Notifications section */}
        <View style={styles.section}>
          <Text variant="footnote" color="inkTertiary" style={styles.sectionLabel}>
            NOTIFICATIONS
          </Text>

          <View style={styles.card}>
            <SettingsRow
              label="Notifications"
              value={enabled}
              onToggle={handleNotificationToggle}
            />
            <Separator />
            <SettingsRow
              label="Morning Brief"
              value={morningBriefEnabled}
              onToggle={setMorningBriefEnabled}
              disabled={!enabled}
            />
            <Separator />
            <SettingsRow
              label="Evening Preview"
              value={eveningPreviewEnabled}
              onToggle={setEveningPreviewEnabled}
              disabled={!enabled}
            />
            <Separator />
            <SettingsRow
              label="Before Events"
              value={beforeEventsEnabled}
              onToggle={setBeforeEventsEnabled}
              disabled={!enabled}
            />
            <Separator />
            <SettingsRow
              label="Critical Alerts"
              value={criticalAlertsEnabled}
              onToggle={setCriticalAlertsEnabled}
              disabled={!enabled}
            />
          </View>
        </View>

        {/* Calendar section */}
        <View style={styles.section}>
          <Text variant="footnote" color="inkTertiary" style={styles.sectionLabel}>
            CALENDAR
          </Text>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text variant="body">Connected Account</Text>
              <Text variant="footnote" color="inkSecondary">
                {isCalendarConnected ? 'Google' : 'Not connected'}
              </Text>
            </View>

            {isCalendarConnected && (
              <>
                <Separator />
                <Pressable
                  onPress={() => setShowCalendarSelection(true)}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Manage synced calendars"
                >
                  <Text variant="body">Calendars</Text>
                  <View style={styles.calendarSummary}>
                    <Text variant="footnote" color="inkSecondary">
                      {availableCalendars.length > 0
                        ? `${enabledCalendarCount} enabled`
                        : 'Not synced'}
                    </Text>
                    <ChevronRight size={16} color={colors.inkSecondary} strokeWidth={1.75} />
                  </View>
                </Pressable>

                <Separator />
                <Pressable
                  onPress={handleDisconnectCalendar}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Disconnect Google Calendar"
                >
                  <Text variant="body" color="warning">
                    Disconnect Calendar
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Location Intelligence section */}
        <View style={styles.section}>
          <Text variant="footnote" color="inkTertiary" style={styles.sectionLabel}>
            LOCATION INTELLIGENCE
          </Text>

          <View style={styles.card}>
            {/* Home */}
            <LocationRow
              label="Home"
              isSet={homeLocation !== null}
              savedAddress={homeLocation?.address}
              isBusy={settingLocation === 'home' || geocodingLocation === 'home'}
              isAddressMode={addressInputMode === 'home'}
              addressText={addressText}
              onAddressChange={setAddressText}
              onUseGPS={() => void handleSetLocation('home')}
              onEnterAddress={() => handleEnterAddress('home')}
              onSubmitAddress={() => void handleSubmitAddress('home')}
              onCancelAddress={handleCancelAddress}
              onClear={() => handleClearLocation('home')}
              anyBusy={settingLocation !== null || geocodingLocation !== null || addressInputMode !== null}
              geocodingInProgress={geocodingLocation === 'home'}
            />

            <Separator />

            {/* Work */}
            <LocationRow
              label="Work"
              isSet={workLocation !== null}
              savedAddress={workLocation?.address}
              isBusy={settingLocation === 'work' || geocodingLocation === 'work'}
              isAddressMode={addressInputMode === 'work'}
              addressText={addressText}
              onAddressChange={setAddressText}
              onUseGPS={() => void handleSetLocation('work')}
              onEnterAddress={() => handleEnterAddress('work')}
              onSubmitAddress={() => void handleSubmitAddress('work')}
              onCancelAddress={handleCancelAddress}
              onClear={() => handleClearLocation('work')}
              anyBusy={settingLocation !== null || geocodingLocation !== null || addressInputMode !== null}
              geocodingInProgress={geocodingLocation === 'work'}
            />

            <Separator />

            {/* Current region */}
            <View style={styles.row}>
              <Text variant="body" color="inkSecondary">
                Current Region
              </Text>
              <View style={styles.currentRegionValue}>
                <Text variant="body" color="inkSecondary">
                  {currentLocationLabel ?? regionLabel(currentRegion)}
                </Text>
                {currentLocationLabel && (
                  <Text variant="caption" color="inkGhost">
                    {regionLabel(currentRegion)}
                  </Text>
                )}
              </View>
            </View>

            <Separator />

            {/* Smart Leave Timing */}
            <SettingsRow
              label="Smart Leave Timing"
              value={smartLeaveTimingEnabled}
              onToggle={setSmartLeaveTimingEnabled}
            />
          </View>

          {locationError && (
            <Text variant="caption" color="warning" style={styles.locationError}>
              {locationError}
            </Text>
          )}
          {!locationError && locationsConflict && (
            <Text variant="caption" color="warning" style={styles.locationError}>
              Home and Work look like the same place. Current region may not be accurate.
            </Text>
          )}
        </View>

        {/* App section */}
        <View style={styles.section}>
          <Text variant="footnote" color="inkTertiary" style={styles.sectionLabel}>
            APP
          </Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text variant="body" color="inkSecondary">
                Version
              </Text>
              <Text variant="body" color="inkSecondary">
                {appVersion}
              </Text>
            </View>
          </View>
        </View>

        </ScrollView>
      </View>

      {/* Permission prompt — presented as a second modal layer */}
      <Modal
        visible={showPermissionPrompt}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPermissionPrompt(false)}
      >
        <View style={[styles.root, { paddingTop: insets.top + spacing[4] }]}>
          <NotificationPermissionPrompt onDone={() => setShowPermissionPrompt(false)} />
        </View>
      </Modal>

      {/* Calendar selection — second modal layer */}
      <CalendarSelectionScreen
        visible={showCalendarSelection}
        onClose={() => setShowCalendarSelection(false)}
      />
    </Modal>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SettingsRow({
  label,
  value,
  onToggle,
  disabled = false,
}: {
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="body" color={disabled ? 'inkGhost' : 'ink'}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor={colors.ink}
        ios_backgroundColor={colors.surfaceElevated}
      />
    </View>
  );
}

function LocationRow({
  label,
  isSet,
  savedAddress,
  isBusy,
  isAddressMode,
  addressText,
  onAddressChange,
  onUseGPS,
  onEnterAddress,
  onSubmitAddress,
  onCancelAddress,
  onClear,
  anyBusy,
  geocodingInProgress,
}: {
  label: string;
  isSet: boolean;
  savedAddress?: string;
  isBusy: boolean;
  isAddressMode: boolean;
  addressText: string;
  onAddressChange: (text: string) => void;
  onUseGPS: () => void;
  onEnterAddress: () => void;
  onSubmitAddress: () => void;
  onCancelAddress: () => void;
  onClear: () => void;
  anyBusy: boolean;
  geocodingInProgress: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSuggestion(null);
    if (!isAddressMode || addressText.trim().length < 5) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void resolveAddressSuggestion(addressText).then(setSuggestion);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [addressText, isAddressMode]);

  return (
    <View>
      {/* Label row */}
      <View style={styles.row}>
        <View style={styles.locationLabelGroup}>
          <Text variant="body">{label}</Text>
          {isSet && (
            <Text variant="caption" color="inkSecondary" numberOfLines={1}>
              {savedAddress ?? 'Set'}
            </Text>
          )}
        </View>
        {!isAddressMode && (
          <View style={styles.locationActionGroup}>
            {isBusy ? (
              <Text variant="footnote" color="inkSecondary">
                {geocodingInProgress ? 'Looking up…' : 'Reading…'}
              </Text>
            ) : (
              <>
                <Pressable
                  onPress={onUseGPS}
                  disabled={anyBusy}
                  style={({ pressed }) => [styles.locationActionBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set ${label} from current location`}
                >
                  <Text variant="footnote" color="accent">
                    Use GPS
                  </Text>
                </Pressable>
                <Text variant="footnote" color="inkGhost">
                  {' · '}
                </Text>
                <Pressable
                  onPress={onEnterAddress}
                  disabled={anyBusy}
                  style={({ pressed }) => [styles.locationActionBtn, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Enter ${label} address`}
                >
                  <Text variant="footnote" color="accent">
                    Set Address
                  </Text>
                </Pressable>
                {isSet && (
                  <>
                    <Text variant="footnote" color="inkGhost">
                      {' · '}
                    </Text>
                    <Pressable
                      onPress={onClear}
                      disabled={anyBusy}
                      style={({ pressed }) => [styles.locationActionBtn, pressed && styles.pressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Clear ${label} location`}
                    >
                      <Text variant="footnote" color="warning">
                        Clear
                      </Text>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </View>
        )}
      </View>

      {/* Address input — shown inline when in address mode */}
      {isAddressMode && (
        <>
          <View style={styles.addressInputRow}>
            <TextInput
              style={[
                styles.addressInput,
                { color: colors.ink, borderColor: colors.border },
              ]}
              placeholder={`${label} address…`}
              placeholderTextColor={colors.inkGhost}
              value={addressText}
              onChangeText={(text) => {
                onAddressChange(text);
                setSuggestion(null);
              }}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={onSubmitAddress}
              editable={!geocodingInProgress}
            />
          </View>
          {suggestion !== null && suggestion !== addressText.trim() && (
            <Pressable
              onPress={() => {
                onAddressChange(suggestion);
                setSuggestion(null);
              }}
              style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Use suggested address: ${suggestion}`}
            >
              <Text variant="caption" color="inkSecondary">
                Matched:{' '}
              </Text>
              <Text variant="caption" color="accent" style={styles.suggestionText}>
                {suggestion}
              </Text>
            </Pressable>
          )}
          <View style={styles.addressActionsRow}>
            <Pressable
              onPress={onCancelAddress}
              disabled={geocodingInProgress}
              style={({ pressed }) => [styles.locationActionBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Cancel address entry"
            >
              <Text variant="footnote" color="inkSecondary">
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={onSubmitAddress}
              disabled={geocodingInProgress || !addressText.trim()}
              style={({ pressed }) => [styles.locationActionBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={`Save ${label} address`}
            >
              <Text
                variant="footnote"
                color={addressText.trim() && !geocodingInProgress ? 'accent' : 'inkGhost'}
              >
                {geocodingInProgress ? 'Looking up…' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function Separator() {
  const styles = useStyles();
  return <View style={styles.separator} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  section: {
    marginBottom: spacing[5],
  },
  sectionLabel: {
    marginBottom: spacing[2],
    marginLeft: spacing[1],
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: radius.lg,
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
  pressed: {
    opacity: 0.72,
  },
  calendarSummary: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing[2],
  },
  currentRegionValue: {
    alignItems: 'flex-end' as const,
    gap: spacing[1],
  },
  locationLabelGroup: {
    gap: spacing[1],
  },
  locationActionGroup: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  locationActionBtn: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1],
  },
  addressInputRow: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  addressInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    fontSize: 15,
  },
  suggestionRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  suggestionText: {
    flexShrink: 1,
  },
  addressActionsRow: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    gap: spacing[4],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  setBtn: {
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
  },
  locationError: {
    marginTop: spacing[2],
    marginLeft: spacing[1],
    lineHeight: 18,
  },
}));
