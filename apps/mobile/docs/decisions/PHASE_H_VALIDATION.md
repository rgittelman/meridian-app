# Phase H Validation Record

## Scope

Phase H (H0, H.1, H.2) adds traffic-aware leave alert timing to Meridian.
This document records the validation findings from Phase H.3.

---

## Architecture Checks (Static — Verified in Code)

### API Key Handling

- `getGoogleMapsApiKey()` reads from `Constants.expoConfig.extra` or
  `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`. Returns `null` when absent.
- Key is passed to `GoogleDistanceMatrixProvider` at construction time only.
- Key is never logged at any level, in any file.
- Dev logs in `mapsApi.ts` confirm provider type only: `"google"` or `"null"`.
- `etaProvider.ts` passes the key inside a URLSearchParams object to `fetch`.
  It does not appear in any console output, error message, or stored record.

### Console Output

All `console.log` / `console.warn` calls in H-phase files are wrapped in
`isDevEnvironment()` guards. Zero unguarded output in production paths.

Files confirmed: `venueGeocoder.ts`, `venueEnrichment.ts`, `trafficEnrichment.ts`,
`mapsApi.ts`, `calendarStore.ts` (H additions).

### Persistence

- `trafficCacheStore` — no `persist` wrapper, no `AsyncStorage`. Session-only.
  Clears on app restart. Traffic estimates are time-bound and not worth persisting.
- `venueCacheStore` — persisted as intended (venue addresses don't move).
- `calendarStore.trafficEstimates` — excluded from `partialize`. Not written to disk.
- `calendarStore.trafficVersion` — excluded from `partialize`. Session counter only.

### Polling / Background Work

- No `setInterval`, `TaskManager`, `BackgroundFetch`, or `defineTask` in any H file.
- `trafficVersion` increments only when `setTrafficEstimates` is called, which is
  only called from the post-sync enrichment chain. No self-triggering loops.
- `useNotificationDelivery` Trigger 4 watches `trafficVersion` reactively —
  fires once per enrichment completion, zero polling.

### Live GPS

- Traffic enrichment reads `homeLocation` from `locationStore` (stored coordinates).
- Zero calls to `getCurrentPositionAsync` or `watchPositionAsync` in the traffic path.
- Origin is always the stored home coordinates, not a fresh GPS fix.

### Notification Pipeline Boundaries

- `constitutionalCheck.ts` — unchanged.
- `suppressionEngine.ts` — unchanged.
- `bundlingEngine.ts` — unchanged.
- `dailyCaps.ts` — unchanged.
- `interruptionScore.ts` — unchanged.
- `notificationDeliveryStore` schema — unchanged.
- `MeridianCalendarEvent` type — unchanged.

---

## Notification Scenario Verification (Code + Test Coverage)

### Scenario 1: Traffic key absent → G.2 behavior

**Code path:**
`getGoogleMapsApiKey()` returns `null`
→ `buildEtaProvider()` returns `NullEtaProvider`
→ `enrichEventsWithTrafficEstimates` calls `provider.fetchTravelTime()` → `null`
→ event not added to `trafficEstimates`
→ `generateLeaveAlertCandidates` receives `trafficContext[eventId] = undefined`
→ `computeAlertFireMs(startMs, undefined)` returns `startMs - 30 * 60 * 1000`
→ secondary line = `LEAVE_ALERT_LOCATION_AWARE_SECONDARY` (G.2 constant)

**Test coverage:** `generateLeaveAlertCandidates — Phase H.2 / traffic context absent`
**Result:** ✅ Verified

### Scenario 2: Traffic key present → estimates populate

**Code path:**
`buildEtaProvider()` returns `GoogleDistanceMatrixProvider`
→ `enrichEventsWithTrafficEstimates` calls Distance Matrix API
→ `baselineMinutes` + `trafficMinutes` stored in `trafficCacheStore` and `trafficEstimates`
→ `trafficVersion` increments → `useNotificationDelivery` fires reconciliation
→ `generateLeaveAlertCandidates` reads `trafficContext[eventId]`
→ `computeAlertFireMs` returns `startMs - (trafficMinutes + 10) * 60_000`

**Test coverage:** `computeAlertFireMs` suite; `traffic heavier than usual` candidate test
**Result:** ✅ Verified in code; requires device for live API call

### Scenario 3: Traffic disappears → alert returns to T-30

**Code path:**
New sync → `trafficEstimates` populated with empty map (no eligible events or all null)
→ `setTrafficEstimates({})` called with `hadPriorEstimates = true`
→ `trafficVersion` increments (stale-clearing rule)
→ reconciler runs with `trafficContext[eventId] = undefined`
→ `computeAlertFireMs` returns T-30
→ `targetWindowStart` shifts back → `hasAlertTimingDrift` detects drift > 5 min
→ `reschedule_changed` → cancel old + schedule new at T-30

**Test coverage:** `traffic context absent → falls back to T-30`; `trafficVersion stale-clear rule`
**Result:** ✅ Verified; relies on `setTrafficEstimates` version-increment logic

### Scenario 4: Timing drift > 5 min → reschedules

**Code path:**
Traffic estimate changes between syncs (e.g., T-38 → T-43)
→ new candidate has different `targetWindowStart`
→ `hasAlertTimingDrift(record, bundle)`: `|newMs - existingMs| > 5 * 60_000`
→ reconciler emits `reschedule_changed`
→ scheduler cancels OS notification + schedules replacement

**Test coverage:** `Phase H.2: timing drift reschedule in planNotificationReconciliation`
**Result:** ✅ Verified

### Scenario 5: Timing drift ≤ 5 min → does not reschedule

**Code path:**
Minor API fluctuation (e.g., 1-minute change in estimate)
→ `hasAlertTimingDrift`: `|newMs - existingMs| ≤ TIMING_DRIFT_THRESHOLD_MS`
→ reconciler emits `keep_existing`
→ existing OS notification unchanged

**Test coverage:** `emits keep_existing when timing drift is within threshold`
**Result:** ✅ Verified

---

## Device Validation (Requires Physical Device)

The following scenarios require a running device with calendar data and
network access. They cannot be verified by static analysis or unit tests.

| Scenario | Expected | Status |
|---|---|---|
| Cold launch without Maps key | App behaves as G.2; no crash on launch | Not yet run |
| Cold launch with Maps key | Dev log shows `[Traffic] ETA provider: google` | Not yet run |
| Sync with eligible event + home set | Traffic estimate in dev log; `trafficEstimates` populated | Not yet run |
| Leave alert fires earlier than T-30 | OS notification scheduled at traffic-adjusted time | Not yet run |
| Toggle Maps key off and re-sync | Alert returns to T-30; timing drift triggers reschedule | Not yet run |
| Confirm no Maps key in console | Dev log shows only `google` or `null`, never the key string | Not yet run |

These should be run before Phase I begins.

---

## Test Suite Status

| Suite | Tests | Failures |
|---|---|---|
| Traffic Intelligence (pure) | 21 | 0 |
| Venue Intelligence (pure) | 30 | 0 |
| Geofence helpers | 23 | 0 |
| Leave Alert (includes H.2 scenarios) | 34 | 0 |
| Reconciliation Plan (includes H.2 drift) | 18 | 0 |
| All other notification suites | 103 | 0 |
| Capture V1 | — | 0 |
| Calendar V1 | — | 0 |
| Focus V1 | — | 0 |
| Plan V1 | — | 0 |
| **Total** | **229** | **0** |

TypeScript: clean.
