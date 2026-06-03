# Meridian Codemaster Decisions

Permanent architectural rulings. No discussion history. Final decisions only.
Do not re-litigate any entry here without a documented regression or user-visible defect.

---

### Decision: Anticipation Over Reminders
**Date:** Pre-Phase E
**Status:** Accepted
**Rationale:** Meridian's differentiation is anticipation, not reminders. Every notification and surface must be evaluated against this standard. Reminders say *what*. Meridian says *what, why now, and what it means*. Phase roadmap flows from this: E reminds → F summarizes → G understands location → H understands travel time → I stays current when closed.

---

### Decision: Phase Lock Order — No Scope Creep
**Date:** Pre-Phase E
**Status:** Accepted
**Rationale:** Location permissions are one of the biggest trust asks on mobile. Meridian must earn the right to ask. Do not add location before Phase E+F value is demonstrated. Do not expand any phase scope beyond its definition. No traffic, geolocation, or background fetch pulled in early.

---

### Decision: Notification Pipeline Systems Are Locked
**Date:** Phase A–F
**Status:** Locked
**Rationale:** Constitutional check, suppression engine, bundling engine, interruption scoring, and daily caps are tested, stable, and must not be modified outside a documented corrective pass. Any change to these systems requires Codemaster approval.

---

### Decision: Settings Entry Point — Modal from Life Header
**Date:** Phase C
**Status:** Accepted
**Rationale:** Settings is a low-frequency destination. Preserves the 4-tab model. Life screen header gear icon launches Settings as a root navigator modal. Keeps Focus/Plan/Life/Capture as the only primary destinations.

---

### Decision: Phase H.2 Timing Drift Threshold = 5 Minutes
**Date:** Phase H.2
**Status:** Locked
**Rationale:** Minor API fluctuations (≤5 min) should not trigger OS notification reschedules — that would cause notification churn for meaningless adjustments. Drift >5 min → `reschedule_changed`. Drift ≤5 min → `keep_existing`. Threshold stored as `TIMING_DRIFT_THRESHOLD_MS`.

---

### Decision: Traffic Fallback — T-30 When No Estimate
**Date:** Phase H.2
**Status:** Locked
**Rationale:** When Google Maps API key is absent or estimate unavailable, leave alert fires at T-30 (same as Phase E/G.2 behavior). System degrades cleanly. Not a navigation app; no ETA promises.

---

### Decision: Traffic Buffer = +10 Minutes
**Date:** Phase H.2
**Status:** Locked
**Rationale:** Leave alert fires at `event start - (trafficMinutes + 10 min buffer)`. The 10-minute pad accounts for getting-ready time and edge cases in the estimate.

---

### Decision: Traffic Copy Gate — Home Region + Smart Timing Required
**Date:** Phase H.2
**Status:** Locked
**Rationale:** Traffic-specific copy ("Traffic is heavier than usual today" / "Leaving in the next 15 minutes gives you breathing room") only appears when home region is set AND smart timing is enabled. Same gate as G.2 copy. No copy change when gate is not satisfied.

---

### Decision: Day-Scoped Bundle Key Retained
**Date:** Phase H.2
**Status:** Locked
**Rationale:** Leave alert deduplication key is day-scoped. This ensures one alert per event per day, surviving reconciliation across multiple syncs with different traffic estimates.

---

### Decision: Traffic Cache — Session-Only, Not Persisted
**Date:** Phase H.1
**Status:** Locked
**Rationale:** Traffic estimates are time-bound (30-min TTL) and not worth persisting across app restarts. `trafficCacheStore` has no `persist` wrapper. `calendarStore.trafficEstimates` excluded from `partialize`. Venue geocode cache *is* persisted (venues don't move).

---

### Decision: No Live GPS in Traffic Path
**Date:** Phase H.1
**Status:** Locked
**Rationale:** Origin for travel time calculations is stored `homeLocation` only. Zero calls to `getCurrentPositionAsync` or `watchPositionAsync` in the traffic enrichment path.

---

### Decision: No Polling — Traffic Version is Event-Driven
**Date:** Phase H.1
**Status:** Locked
**Rationale:** `trafficVersion` counter increments only when `setTrafficEstimates` is called (post-sync enrichment). `useNotificationDelivery` Trigger 4 reacts to version changes — zero `setInterval`, zero `TaskManager`, zero `BackgroundFetch` in the traffic path.

---

### Decision: 4-Hour Traffic Enrichment Window
**Date:** Phase H.1
**Status:** Locked
**Rationale:** Only events starting within the next 4 hours receive Distance Matrix API calls. Prevents excessive API usage for distant events.

---

### Decision: Intelligence V1 Systems Are Locked
**Date:** Focus Intelligence correction pass, 2026-06-01
**Status:** Locked
**Rationale:** Capture, Calendar, Focus, and Plan Intelligence V1 are tested (229 tests) and locked. No behavior changes without a documented V2 proposal. Post-lock corrections are allowed for proven regressions only — see MERIDIAN_INTELLIGENCE_V1.md.

---

### Decision: FOCUS_MAX = 3
**Date:** Focus Intelligence V1
**Status:** Locked
**Rationale:** Focus is a calm, limited surface. Three items preserve emotional pacing and prevent overload pressure. Do not increase without a product decision.

---

### Decision: Focus Deferred Items — Policy Required Before Implementing
**Date:** Focus Intelligence correction pass, 2026-06-01
**Status:** Deferred
**Rationale:** Four defects explicitly deferred: (1) overload feedback loop, (2) PRIORITY_SCORE_MAX recalibration, (3) anti-guilt snooze threshold, (4) paceItems pool size. All require policy decisions, not just code changes.

---

### Decision: Google Calendar All-Day Events Use Exclusive End Date
**Date:** Calendar Intelligence V1
**Status:** Locked
**Rationale:** Google Calendar all-day events have exclusive end dates (end day = day after the last day). Normalization must subtract 1 day. Deviating causes single-day events to appear as two-day events.

---

### Decision: Board Keyword Removed From Community Classification
**Date:** Calendar Intelligence V1
**Status:** Locked
**Rationale:** Bare "board" keyword caused work board meetings to be misclassified as community events. Removed. BFSC/community boards still classify correctly through community signals.

---

### Decision: TeamSnap Events Default to "Game" Not "Hockey"
**Date:** Calendar Intelligence V1
**Status:** Locked
**Rationale:** Default sport fallback was incorrectly hockey. Removed. Supported sports: football, volleyball, cheer, basketball, baseball. Unknown sports display as "Game."

---

### Decision: Bare "Appointment" Is Not Health
**Date:** Calendar Intelligence V1
**Status:** Locked
**Rationale:** Medical co-signal required before health classification. "Sales appointment" and "vendor appointment" are not health events. "Dentist appointment" and "Doctor appointment" are.

---

### Decision: Calendar Pagination — 250/page, 10 Pages Max
**Date:** Calendar Intelligence V1
**Status:** Locked
**Rationale:** Large calendars silently truncated at 80 events. Now: maxResults=250, nextPageToken support, MAX_PAGES=10 guard (2,500 event ceiling). Truncation events generate diagnostics and mark sync as partial.

---

### Decision: Capture-Triggered Notifications Deferred to Phase J
**Date:** Architecture review
**Status:** Documented, deferred
**Rationale:** Current notification pipeline is calendar-anchored. "Remind me to call Matt at 3pm" has no path to an OS notification in V1. Requires new `capture_reminder` generator with intent detection and time resolution. Different trust model from calendar notifications (no cancel-on-event-change). Phase J.

---

### Decision: No In-App Event Dismissal in V1
**Date:** Architecture review
**Status:** Documented, deferred
**Rationale:** Meridian reads calendar but does not write back. Users cannot dismiss events from Meridian surfaces without modifying Google Calendar. Option A (local suppress list) or Option C (snooze-until-event-passes) preferred when implemented. Option B requires Google Calendar write scope not currently held.

---

### Decision: Visual Execution Order — One Great Screen Before Four Mediocre Screens
**Date:** 2026-06-03
**Status:** Accepted
**Rationale:** V1.1 tokens are a 3/10 — good foundation, still flat. The correct path is: V1.2 shared components first (GradientCard, MetricCard, DomainBadge, LifeBalanceChart, WeeklyActivityBar, CaptureActionGrid, StatusPill), then Life screen to a 9/10 (V1.3), then use those components for Focus → Plan → Capture → Settings. Do not attempt all four screens simultaneously — that produces four mediocre screens instead of one great screen that establishes the visual language.

---

### Decision: Life Screen Is First Full Redesign Target
**Date:** 2026-06-03
**Status:** Accepted
**Rationale:** Life currently shows domain names inside dark rectangles with no visual identity. It has the most opportunity and will be the showcase screen. Domain cards must feel alive — colored by domain (Family=purple, Work=blue, Health=green, Personal=amber). Add LifeBalanceChart and WeeklyActivityBar. Multiple layers of importance must be visible at a glance.

---

### Decision: V1.2 Components Must Exist Before Any Screen Redesign Begins
**Date:** 2026-06-03
**Status:** Accepted
**Rationale:** Screen redesigns (V1.3+) must consume shared components, not reinvent them per-screen. No screen implementation work begins until V1.2 component library is built and available.

---

### Decision: Settings Is a Temporary Modal — Do Not Add Account UI
**Date:** 2026-06-03
**Status:** Accepted
**Rationale:** V1.7 delivered visual polish to Settings (GradientCard sections, Calendar StatusPill, Location subline, version footer). This is correct and sufficient. Settings currently lives as a modal launched from the Life screen header gear. This is intentionally temporary. The final home for user settings is under the Account & Onboarding Foundation (Phase J), which will include auth, profile, avatar, and navigation restructuring. Do not add account UI, profile rows, avatar display, or sign-in options inside the current Settings modal. Do not restructure Settings navigation until Phase J is scoped and approved.

---

### Decision: Account, Auth, Avatar, and Onboarding Belong to Phase J — Not Before
**Date:** 2026-06-03
**Status:** Accepted
**Rationale:** The account model (email / Google / Apple sign-in, profile, avatar fallback to initials) is a major architectural phase that touches auth, navigation, data sync, and settings restructure simultaneously. It must be scoped as a coordinated plan before any implementation begins. Do not build any part of this incrementally or as a side effect of other work. Future sessions that see a Settings screen should not add auth/profile rows without explicit Phase J approval.

---

### Decision: Phase J.1 Locked — Local Profile Foundation
**Date:** 2026-06-03
**Status:** Locked
**Rationale:** Phase J.1 establishes a local-only profile layer: `profileStore` (displayName, avatarUrl reserved, initials), `ProfileAvatar` (image → initials → "M" fallback), and `ProfileModal` (avatar + name + connection status + Settings entry). No backend, no sync, no new Google scopes, no People API. Settings is now accessed through Profile → Settings row; the Life header gear icon is replaced by the avatar. Avatar fallback chain is locked as: avatarUrl → initials → "M" (never "?" or User icon). Household model untouched. 325 tests passing.

Locked constraints:
- Profile is local-first permanently unless Phase J.2+ explicitly changes this
- Avatar fallback = initials → "M"; do not change fallback without Codemaster approval
- `householdContext.ts` is not an account model; do not conflate it with profile
- Phase J.2 (avatar URL population, name editing, Apple Sign-In) requires separate planning and approval
- Settings modal remains a separate sheet until Phase J.2+ explicitly migrates it

---

### Decision: Phase J Architectural Direction — Device-First, Account Optional
**Date:** 2026-06-03
**Status:** Codemaster instinct (not yet confirmed — requires full Phase J prereq review)
**Rationale:** Device-first + account optional keeps Phase J scoped and shippable without requiring a backend at launch. Account-first + cloud sync from day one makes Phase J a multi-month initiative with conflict resolution, backend infrastructure, and high risk. The correct approach for Meridian's current stage is: app is fully usable without an account; account is offered and earns trust, not required. See PHASE_J_PREREQS.md for the full set of questions that must be answered before any Phase J implementation begins.

Key instincts (pending confirmation):
- Device-first, local-first data model
- Account optional — cloud backup deferred
- Google Sign-In + Apple Sign-In as auth providers
- Avatar from provider when available; initials fallback always present
- Onboarding: fully usable before sign-in; account earned, not required
- Profile screen replaces Settings modal as the final home for user settings
- Four questions must be confirmed before Phase J planning: (1) device-first confirmed?, (2) what syncs in Phase J V1?, (3) onboarding order?, (4) family model in scope?

---

### Decision: Builder/Auditor Role Separation
**Date:** Project inception
**Status:** Permanent
**Rationale:** ChatGPT (Codemaster) = product owner, QA lead, architecture reviewer, release manager, decides phase order. Claude Code (Builder) = reads docs first, implements approved changes, does not redesign architecture, does not bypass locked systems.
