# Meridian Status — Current Snapshot

_Last updated: 2026-06-03_

---

## Current Branch

`mobile-only-cleanup`

Theme system rewrite (dark.ts, typography, radius, spacing, gradients.ts, tabAccents.ts) and all V1.1–V1.7 visual work landed on this branch. Not yet merged to main.

---

## Current Development Focus

**Visual redesign pass V1.1–V1.7 is complete.** All five primary screens have received a visual pass. The shared component library (V1.2) is in place and proven across all screens.

**Settings is intentionally left as a temporary local modal.** Do not expand it further until Phase J (Account & Onboarding Foundation) is scoped and approved.

**Phase J.1 — Local Profile Foundation: LOCKED.**

Profile is local-first. No backend, no sync, no new auth. Settings accessed through Profile modal. 325/325 tests passing.

**Next priorities — Codemaster to decide order:**
- Phase J.2 — avatar URL population, name editing (requires separate approval)
- V2 visual polish backlog (CaptureActionGrid visual weight, diagnostic copy humanization)
- Phase I — Confidence & Diagnostics (internal visibility into leave alert pipeline)
- Phase H.3 device smoke test (6 scenarios in PHASE_H_VALIDATION.md not yet run)

---

## Locked Phases (Do Not Touch)

| Phase | Name | Status |
|---|---|---|
| A | Delivery Adapter | LOCKED |
| B | Lifecycle Wiring | LOCKED |
| C | Settings + Permission Flow | LOCKED |
| D | Notification Tap Handling | LOCKED |
| E | Leave Alerts | LOCKED |
| F | Morning Briefs & Evening Preview | LOCKED |
| H0 | Venue Intelligence Foundation | LOCKED |
| H.1 | Traffic Intelligence Data Plumbing | LOCKED |
| H.2 | Traffic-Aware Leave Alerts | LOCKED |

**Locked Intelligence Systems:** Capture Intelligence V1, Calendar Intelligence V1, Focus Intelligence V1, Plan Intelligence V1, Notification Pipeline (constitutional check, suppression engine, bundling engine, interruption scoring, daily caps).

---

## Roadmap

```
Intelligence / Notification:
[DONE]     Phase E — Leave Alerts
[DONE]     Phase F — Morning Briefs & Evening Preview
[DONE]     Phase G.1 — Location Foundation
[DONE]     Phase H0/H.1/H.2 — Traffic-Aware Leave Alerts
[DONE]     Phase J.1 — Local Profile Foundation (profileStore, ProfileAvatar, ProfileModal)
           Note: Phase J.1 (capture reminders) was renamed; capture reminders landed earlier as part of notification work
[PARTIAL]  Phase H.3 — Real-World Validation (static ✅, device smoke test pending)
[PLANNED]  Phase I — Confidence & Diagnostics
[PLANNED]  Phase J.2 — Profile iteration (avatar URL, name editing) — requires approval
[PLANNED]  Engagement / Wow Layer — "How did it know that?" observations
[PLANNED]  Phase J (full) — Account, auth, sync — deferred

Visual:
[DONE]     V1.0 — Light/beige palette (deprecated)
[DONE]     V1.1 — Deep navy dark palette, per-tab accents, gradient tokens
[DONE]     V1.2 — Shared component library (GradientCard, MetricCard, DomainBadge,
                   StatusPill, GradientIcon, LifeBalanceChart, WeeklyActivityBar, CaptureActionGrid)
[DONE]     V1.3 — Life screen (domain colors, LifeBalanceChart, WeeklyActivityBar, smart headline)
[DONE]     V1.4 — Focus screen (StatusPill on greeting, GradientCard on brief/prep/focus cards)
[DONE]     V1.5 — Plan screen (domain-colored event/capture cards, Today label, date context)
[DONE]     V1.6 — Capture screen (CaptureActionGrid wired, dev tools collapsed, stronger cards)
[DONE]     V1.7 — Settings screen (visual polish only — intentionally temporary modal)
                   ⚠ Final settings/account home deferred to Phase J

V2 polish backlog (not started):
[ ]  Reduce CaptureActionGrid visual weight (~10–15%)
[ ]  Humanize CaptureCard diagnostic strings ("no_timing" → "No timing detected")
[ ]  GradientBackground + expo-linear-gradient (deferred from V1.2)
[ ]  Plan screen week hero / selector (noted by Codemaster, not scoped)
```

---

## Active Work

None. Branch is stable. All V1.1–V1.7 changes are implemented and passing.

---

## Open Decisions

1. **Phase H.3 device smoke test** — 6 device scenarios in PHASE_H_VALIDATION.md not yet run. Required before Phase I begins.
2. **Phase J scope** — Account & Onboarding Foundation needs full planning pass before any implementation. Touches auth, navigation, account model, and settings restructure simultaneously.
3. **Next phase order** — Codemaster decides: Phase J vs. Phase I vs. V2 visual polish backlog.
4. **Focus Intelligence deferred items** — 4 defects explicitly deferred (overload feedback loop, priority score max, anti-guilt threshold, paceItems). Require policy decisions before implementing.
5. **Engagement / Wow Layer** — No implementation; deferred after intelligence audit.

---

## Recently Completed

- V1.7 Settings visual polish (2026-06-03) — GradientCard sections, Calendar StatusPill, Location subline, version footer
- V1.6 Capture screen (2026-06-03) — CaptureActionGrid wired, dev tools collapsed
- V1.5 Plan screen (2026-06-03) — domain-colored cards, date context on day headers
- V1.4 Focus screen (2026-06-03) — StatusPill, GradientCard on brief/prep/focus
- V1.3 Life screen (2026-06-03) — full redesign, smart headline, charts
- V1.2 Shared component library (2026-06-03) — 9 components, 24 tests
- Focus Intelligence V1 correction pass — 6 fixes, 38 tests, all 309 passing

---

## Known Risks

| Risk | Severity | Notes |
|---|---|---|
| Phase H.3 device validation not run | Medium | Traffic path untested on real device with live Maps API key |
| Settings is a temporary modal | Low | Intentional — will be restructured under Phase J account model |
| `boardOrCommunitySoon` fires on "board" keyword | Low | Work board meetings may surface as community (FP-1, accepted) |
| Overload weights don't influence pre-selection | Low | AC-1, deferred to V2 |
| No in-app event dismissal | Low | User must delete from Google Calendar; Phase J+ |

---

## Next Recommended Actions

1. Codemaster decides next phase order (Phase J vs. Phase I vs. V2 polish)
2. If Phase J: full planning pass before any code — auth, navigation, account model, settings restructure
3. If Phase I: plan confidence/diagnostics visibility layer for leave alert pipeline
4. Run Phase H.3 device smoke test before Phase I begins
