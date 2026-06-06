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
| | | | |

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

## Field Test Patch History

| Patch | Commit | Issues Fixed |
|---|---|---|
| Field Test Patch 1 | `dcdc6c5` | Calendar CTA (Focus + Settings), location button clipping, keyboard avoidance, Capture tile wrapping |
| Field Test Patch 2 | pending | Home/Work title wrapping, action buttons clipped, Current Region de-emphasized |

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
