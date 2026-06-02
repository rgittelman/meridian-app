# Meridian Project Status

## Project Lead Roles

ChatGPT = Codemaster
- Product owner
- QA lead
- Architecture reviewer
- Release manager
- Decides phase order
- Validates before code is merged

Claude Code = Builder
- Reads docs first
- Implements approved changes
- Does not redesign architecture
- Does not bypass locked systems

## Locked Systems

- Capture Intelligence
- Focus Intelligence
- Calendar Intelligence
- Notification Intelligence
- Suppression Engine
- Constitutional Check
- Bundling Engine
- Interruption Scoring

## Current Phase

Meridian Intelligence Audit V1 (pause before Phase G)

## Completed

### Phase A — Delivery Adapter
Status: PASSED

### Phase B — Lifecycle Wiring
Status: PASSED

Validation completed:
- Foreground reconciliation
- Calendar sync reconciliation
- Approved bundle scheduling
- Duplicate prevention
- Event rescheduling
- Event cancellation

### Phase C — Settings + Permission Flow
Status: PASSED
Locked: Yes

Completed:
- Settings modal launched from Life header gear
- Notification master toggle
- Permission prompt flow
- Category toggles
- Calendar disconnect entry
- App version display
- Quiet hours hidden until enforcement exists

Validation:
- Category toggles enforced before delivery
- Master off cancels scheduled Meridian notifications
- Permission request is user-initiated only

### Other
- Duplicate prevention fix
- Focus completion count daily reset
- Clear state implementation

### Phase D — Notification Tap Handling
Status: PASSED
Locked: Yes

Validation:
- Focus notification routes to Focus ✓
- Plan notification routes to Plan ✓
- Capture notification routes to Capture ✓
- Non-Meridian notification ignored ✓
- Cold-launch notification tap routes correctly ✓
- Foreground notification handling is safe ✓

Deferred:
- Event detail deep links
- Capture detail deep links
- In-app foreground banners

### Phase E — Leave Alerts
Status: PASSED
Locked: Yes

Completed:
- leave_alert notification type added to pipeline
- Generator fires 30 minutes before household-relevant events
- Commitment-specific copy: "Grace's volleyball practice starts in 30 minutes."
- Before Events setting respected (beforeEventsEnabled)
- Daily cap: 5 (supports multi-child household days)
- Cancel/reschedule handled via existing reconciliation lifecycle
- Tap routes to Plan tab

Deferred:
- Geolocation-based leave timing (Phase G)
- Traffic-aware departure times (Phase H)

### Phase F — Morning Briefs & Evening Preview
Status: PASSED
Locked: Yes

Completed:
- Morning Brief generator: synthesises day shape from today's calendar events
- Evening Preview generator: forward-looking, tomorrow's commitments only
- Brief card in Focus screen: between greeting and Momentum Ring
- Forward-scheduled at 7:15 AM (Morning) and 7:00 PM (Evening)
- Settings toggles respected: master, morningBrief, eveningPreview
- Calendar hydration race fixed: scheduler retriggers when store first has data
- Dev diagnostic panel: Diagnose, Inspect Records, fast-fire test buttons

Validation:
- Morning Brief fires and routes to Focus ✓
- Evening Preview fires and routes to Focus ✓
- Brief card visible in Focus when content exists ✓
- No card when no content ✓
- Production settings gate verified ✓
- Delivery record inspection verified ✓
- No guilt language, no task counts, no backward-looking copy ✓

Post-lock corrections:
- Fixed calendar store hydration race (mount-timing bug):
  scheduler now retriggers on first false→true transition of hasCalendarData

Deferred:
- Quiet hours enforcement for briefs
- Stale content when calendar changes while app is closed (Phase I)

### Phase H0 — Venue Intelligence Foundation
Status: PASSED
Locked: Yes

Completed:
- Venue location normalization
- Venue geocoding eligibility classification (blank, vague, virtual, too_short)
- Venue coordinate cache with 24-hour failure suppression
- Non-blocking calendar post-sync enrichment (fire-and-forget, no UX impact)
- Dev diagnostics: logVenueDiagnostics shows resolved/skipped/failed per event
- 30 pure tests covering classification, normalization, and cache-decision logic

Deferred:
- Traffic-aware routing
- ETA calculations
- Distance Matrix API
- Dynamic leave alert timing

### Phase H.2 — Traffic-Aware Leave Alerts
Status: PASSED
Locked: Yes

Behavior:
- Fire time: event start - (trafficMinutes + 10 min buffer) when estimate present
- Fire time: T-30 fallback when no traffic estimate
- Traffic timing applies regardless of whether traffic is heavier than baseline
- Secondary copy when heavier: "Traffic is heavier than usual today."
- Secondary copy otherwise: "Leaving in the next 15 minutes gives you breathing room."
- Traffic copy gate: home region + smart timing enabled (same as G.2 copy gate)

Reconciliation:
- Timing drift > 5 minutes → reschedule_changed (cancel + reschedule)
- Timing drift ≤ 5 minutes → keep_existing
- Reuses existing reschedule_changed path; identity preserved

System remains:
- Not a navigation app, not a traffic monitor, not a route planner
- No turn-by-turn, no ETA promises, no maps

Validation:
- TypeScript: passing
- Full test suite: 229/229
- Constitutional traffic copy tests: passing

### Phase H.1 — Traffic Intelligence Data Plumbing
Status: PASSED
Locked: Yes

Completed:
- ETA provider abstraction (EtaProvider interface, NullEtaProvider, GoogleDistanceMatrixProvider)
- Pure traffic intelligence helpers: baselineMinutes/trafficMinutes types, isHeavierTraffic,
  isTrafficEstimateStale, buildTrafficCacheKey, formatEventDate
- Non-persisted session-only traffic cache store (trafficCacheStore)
- Traffic enrichment layer: 4-hour window guard, household-relevant filter, cache-first,
  deduplication, degrades cleanly when venue coordinates absent or provider returns null
- calendarStore: trafficEstimates + trafficVersion (non-persisted); version increments
  on new data AND on stale-data clear
- useNotificationDelivery: Trigger 4 watches trafficVersion — event-driven, zero polling
- mapsApi.ts: reads EXPO_PUBLIC_GOOGLE_MAPS_API_KEY; NullEtaProvider fallback when absent
- 21 pure tests: formatEventDate, buildTrafficCacheKey, isTrafficEstimateStale,
  isHeavierTraffic, NullEtaProvider

Guardrails:
- Distance Matrix API only; no map/route/navigation behavior
- 4-hour enrichment window — no API calls for distant events
- 30-minute TTL cache — session-only, not persisted
- No live GPS reads; origin is stored homeLocation only
- No background tasks, no polling

Not activated:
- No leave alert timing changes
- No leave alert copy changes
- No dedupe key changes
- H.2 blocked until dedupe/reschedule behavior is designed and approved

## Next: Meridian Intelligence Audit V1

Before Phase G, evaluate:
- Does Meridian feel smarter every week?
- Does it surface insights users didn't already know?
- Is it anticipating or reminding?
- Is there at least one "how did it know that?" moment per week?
- Would a user show this to their spouse?

If the answer is no, build more intelligence — not more infrastructure.

## Future Roadmap

Phase G — Geolocation Intelligence
Phase H — Traffic-Aware Routing
Phase I — Background Fetch