/**
 * lib/haptics.ts — Browser vibration API wrapper with graceful fallback.
 * Uses navigator.vibrate() which is supported on Android Chrome / PWA.
 * iOS Safari does not support it — calls are silently no-ops.
 */

function vibrate(pattern: number | number[]): void {
  try {
    navigator?.vibrate?.(pattern);
  } catch {
    // Silently fail on unsupported platforms
  }
}

export const haptic = {
  light:   () => vibrate(8),
  medium:  () => vibrate(15),
  success: () => vibrate([10, 30, 10]),
  warning: () => vibrate([20, 40, 20]),
} as const;
