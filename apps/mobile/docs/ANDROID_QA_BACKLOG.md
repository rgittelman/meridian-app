# Android QA Backlog

Live findings from Android field testing. Updated as issues are discovered, fixed, or deferred.

**Format:** Each issue has a status tag:
- `open` — not yet fixed
- `fixed` — committed fix, awaiting validation
- `validated` — confirmed working on device/emulator
- `deferred` — known, accepted, not blocking

---

## Focus

| Status | Area | Issue | Notes |
|---|---|---|---|
| `fixed` | Calendar CTA | No connect button when calendar not configured — dead-end text only | Field Test Patch 1 |
| `open` | Calendar CTA | Tapping Connect does nothing if OAuth client ID missing from build | OAuth config issue, not UI |

---

## Plan

| Status | Area | Issue | Notes |
|---|---|---|---|
| | | | |

---

## Life

| Status | Area | Issue | Notes |
|---|---|---|---|
| | | | |

---

## Capture

| Status | Area | Issue | Notes |
|---|---|---|---|
| `fixed` | Action grid | "Reminder" wraps to two lines on narrow Android screens | Field Test Patch 1 — adjustsFontSizeToFit |

---

## Profile

| Status | Area | Issue | Notes |
|---|---|---|---|
| | | | |

---

## Settings

| Status | Area | Issue | Notes |
|---|---|---|---|
| `fixed` | Calendar | No connect path when disconnected — section only showed Disconnect | Field Test Patch 1 |
| `fixed` | Location | Home/Work title wraps ("Ho/me", "Wor/k") and actions clipped | Field Test Patch 2 — vertical layout |
| `fixed` | Location | Keyboard covers address input while typing | Field Test Patch 1 — KeyboardAvoidingView |

---

## Calendar

| Status | Area | Issue | Notes |
|---|---|---|---|
| `validated` | Auth | Google Calendar OAuth via browser (Chrome Custom Tabs) blocked by Google — Error 400 | Android-type OAuth clients require native SDK SHA-1 attestation; replaced with `@react-native-google-signin` — `d0f4020` |
| `deferred` | Auth | Android native sign-in stores access token only — no refresh token | Token expires ~1 hour; on expiry auth clears and user must reconnect. Follow-up: silent refresh via `GoogleSignin.getTokens()`. See known limitation below. |

---

## Notifications

| Status | Area | Issue | Notes |
|---|---|---|---|
| | | | |

---

## Location

| Status | Area | Issue | Notes |
|---|---|---|---|
| | | | |

---

## Cross-cutting / Android-specific

| Status | Area | Issue | Notes |
|---|---|---|---|
| `validated` | Build | Standalone APK crashes on launch — pika IR transformer / expo-modules-core 56.x mismatch | Fixed via patch-package shims. Revisit on next Expo SDK upgrade. |

---

## Known Limitations

### Android: Calendar auth token expiry (no silent refresh)

**Added:** 2026-06-08
**Status:** Deferred — accepted, not blocking

Android native Google Sign-In (`@react-native-google-signin/google-signin`) returns an access token only. No refresh token is issued.

- Access token expires after approximately 1 hour.
- When the token expires, `getAccessToken()` will fail and the store clears auth state.
- The user will see the "Connect Google Calendar" button again and must re-tap to reconnect.
- Re-authentication is one tap (account already on device) — not a full sign-in flow.

**Behavior is graceful:** auth clears cleanly, no crash, no misleading state.

**Follow-up required:** Implement silent token refresh for Android.

```typescript
// Proposed fix: before making Calendar API calls, attempt silent refresh
// Android: silent token refresh path
if (Platform.OS === 'android') {
  try {
    const { accessToken } = await GoogleSignin.getTokens();
    // update stored token with refreshed value
  } catch {
    // token refresh failed — clear auth and prompt reconnect
  }
}
```

File to update: `src/store/calendarStore.ts` — `syncEvents()` or `getAccessToken()` path.

---

## Field Test Patch History

| Patch | Commit | Issues Fixed |
|---|---|---|
| Field Test Patch 1 | `dcdc6c5` | Calendar CTA (Focus + Settings), location button clipping, keyboard avoidance, Capture tile wrapping |
| Field Test Patch 2 | `bcfcf6f` | Home/Work title wrapping, action buttons clipped, Current Region de-emphasized |
| Android Auth: native Sign-In | `d0f4020` | Replace browser OAuth with native Google Sign-In SDK; calendar connect validated on Pixel 8 API 35 |

---

## Testing Setup

**Emulator (fast iteration):**
```bash
~/Library/Android/sdk/emulator/emulator -avd Pixel_8
npx expo run:android
```

**Physical device via scrcpy:**
```bash
brew install scrcpy
scrcpy
```

**Physical device APK build:**
```bash
npx eas-cli build --platform android --profile preview --local
~/Library/Android/sdk/platform-tools/adb install -r <apk-path>
```

**Logcat:**
```bash
~/Library/Android/sdk/platform-tools/adb logcat | grep -E "FATAL|com\.meridian|expo\."
```
