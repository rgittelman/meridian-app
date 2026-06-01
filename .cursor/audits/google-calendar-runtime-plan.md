# Google Calendar Integration — Runtime Plan

**Date:** 2026-05-28  
**Product decision:** Google Calendar OAuth must be **development-build ready**.

---

## Is Expo Go sufficient?

**No.** Expo Go is not the correct long-term or reliable runtime for Meridian Google Calendar OAuth.

| Runtime | OAuth redirect | Custom scheme `meridian://` | Verdict |
|---------|----------------|----------------------------|---------|
| **Expo Go** | Uses Expo’s shared redirect (`exp://…`) | Not your app’s bundle identity | **Unreliable for production-like Google OAuth** |
| **Custom development build** | App-owned scheme + bundle ID / package | `meridian://` registered to your app | **Required** |

### Exact reason

1. **Redirect URI ownership** — Google OAuth clients are bound to bundle identifier (iOS), package + SHA-1 (Android), and authorized redirect URIs. Expo Go does not run as `com.meridian.app` with your custom scheme in a stable, Google-console-mappable way.

2. **Custom app scheme** — `expo-auth-session` completes OAuth via `makeRedirectUri({ scheme: 'meridian' })`. That URI must open **your** app, not the generic Expo Go container.

3. **Secure token storage** — `expo-secure-store` is intended for native builds; web/Expo Go fall back to less ideal storage.

4. **Calendar API access** — After OAuth, the app calls Google Calendar REST with the access token. That path is independent of Expo Go but **depends on a successful OAuth redirect**, which dev builds handle correctly.

---

## Current app inspection (pre-implementation)

| Check | Before | After implementation |
|-------|--------|----------------------|
| App scheme | **Missing** in `app.json` | `scheme: "meridian"` in `app.config.js` |
| Bundle ID (iOS) | `com.meridian.app` | unchanged |
| Package (Android) | `com.meridian.app` | unchanged |
| OAuth client env vars | Documented on web (`NEXT_PUBLIC_GOOGLE_*`); mobile uses `EXPO_PUBLIC_*` | `apps/mobile/.env.example` |
| AuthSession deps | **Not installed** | `expo-auth-session`, `expo-web-browser`, `expo-crypto`, `expo-secure-store` |
| Secure storage | AsyncStorage only (Zustand persist) | SecureStore for OAuth tokens + AsyncStorage calendar cache |
| Dev client | Not configured | `expo-dev-client` recommended |

---

## Required app scheme

```
meridian
```

Example redirect URI (iOS/Android dev build):

```
meridian://oauth/google
```

Register in **Google Cloud Console → Credentials → OAuth 2.0 Client** (iOS / Android / Web as applicable). For Expo AuthSession, the **Web client ID** is often used as `webClientId` even on native.

---

## Environment variables (mobile — do not commit values)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS OAuth client |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Android OAuth client |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Web client (AuthSession / token exchange) |

**Fallbacks read in code (if your project uses web names):**

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ← also checks `NEXT_PUBLIC_GOOGLE_CLIENT_ID` at build time only in `app.config.js` if mirrored locally (mobile should use `EXPO_PUBLIC_*`).

If all are missing → calm **“Connect Google Calendar”** setup state (no crash).

---

## Required dependencies

```bash
cd apps/mobile
npx expo install expo-auth-session expo-web-browser expo-crypto expo-secure-store expo-dev-client expo-constants
```

Already present: `@react-native-async-storage/async-storage`, `zustand`.

---

## Google Cloud Console (use existing credentials — do not invent)

1. **iOS client** — Bundle ID: `com.meridian.app`
2. **Android client** — Package: `com.meridian.app` + SHA-1 from dev/release keystore
3. **Web client** — Authorized redirect URIs for AuthSession proxy if used; native redirect uses custom scheme
4. **OAuth consent screen** — Scopes: `https://www.googleapis.com/auth/calendar.readonly`
5. Enable **Google Calendar API** on the project

---

## Commands to run (dev build — not Expo Go)

```bash
cd apps/mobile

# 1. Install dependencies (if not already)
npx expo install expo-auth-session expo-web-browser expo-crypto expo-secure-store expo-dev-client expo-constants

# 2. Copy env template and fill client IDs locally
cp .env.example .env
# Edit .env — never commit

# 3. Create native development build (first time)
npx expo prebuild
npx expo run:ios
# or
npx expo run:android

# Alternative: EAS dev build
# npx eas build --profile development --platform ios

# 4. Start Metro for dev client (after build installed on device/simulator)
npx expo start --dev-client
```

**Do not use plain `npx expo start` + Expo Go** as the primary OAuth test target.

---

## Implementation map (v1)

| Layer | Path |
|-------|------|
| Config | `app.config.js`, `src/config/google.ts` |
| Auth | `src/services/auth/googleOAuth.ts`, `tokenStorage.ts` |
| Calendar API | `src/services/calendar/googleCalendarApi.ts`, `normalizeEvent.ts`, `inferCalendarContext.ts` |
| Life mapping | `src/services/lifeObjects/fromCalendarEvent.ts` |
| People | `src/services/people/inferFromEvent.ts` |
| Store | `src/store/calendarStore.ts` |
| Hook | `src/hooks/useCalendar.ts` |
| UI | `src/components/calendar/*` |
| Focus | `ScheduleStrip` + `FocusScreen` |
| Plan | `PlanScreen` + `PlanWeekView` |

---

## Implementation status (v1 complete)

| Item | Status |
|------|--------|
| `scheme: meridian` | `app.config.js` |
| OAuth services | `src/services/auth/` |
| Calendar fetch + normalize | `src/services/calendar/` |
| People inference | `src/services/people/inferFromEvent.ts` |
| Life object bridge | `src/services/lifeObjects/fromCalendarEvent.ts` |
| Store + cache | `src/store/calendarStore.ts` |
| Focus ScheduleStrip | real upcoming events |
| Plan week view | `PlanWeekView.tsx` |
| Theme tokens | `calendarConnect*`, `planEvent*` |

---

## Final note

Meridian v1 calendar integration is **implemented development-build ready**. Validate OAuth only on a **custom dev build** with real client IDs in `apps/mobile/.env` (from `.env.example`).
