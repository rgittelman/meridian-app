# Meridian Phase Glossary

Single source of truth for phase names, statuses, and descriptions.
Do not rename or renumber phases. Do not invent new phase letters without Codemaster approval.

---

## Intelligence Roadmap

| Phase | Name | Status | Description |
|---|---|---|---|
| A | Delivery Adapter | Locked | Notification delivery abstraction layer |
| B | Lifecycle Wiring | Locked | Notification lifecycle reconciliation |
| C | Settings & Permissions | Locked | User settings and permission handling |
| D | Notification Tap Handling | Locked | Notification interaction routing |
| E | Leave Alerts | Locked | Event-based departure reminders |
| F | Morning Briefs & Evening Preview | Locked | Daily intelligence summaries |
| G.1 | Location Foundation | Locked | Home/work/location awareness |
| G.2 | Geofenced Leave Intelligence | Locked | Location-aware leave recommendations |
| H.1 | Traffic Intelligence Data Plumbing | Locked | Traffic enrichment pipeline |
| H.2 | Traffic-Aware Leave Alerts | Locked | Traffic-adjusted leave timing |
| H.3 | Traffic Validation | Locked | Validation and hardening pass |
| I | Confidence & Diagnostics | Not Started | Internal visibility: why alerts fired/didn't, traffic path traceability |
| J.1 | Local Profile Foundation | **Locked** | profileStore, ProfileAvatar (initials → M fallback), ProfileModal; local-first, no backend |
| J.2 | Profile Iteration | Planned | Avatar URL population, name editing; requires separate approval |
| J (full) | Account & Onboarding Foundation | Future | Auth, sync, onboarding flow — deferred |

---

## Visual Roadmap

| Phase | Name | Status | Description |
|---|---|---|---|
| V1.1 | Design Tokens | Complete | Theme, colors, accents, typography |
| V1.2 | Shared Components | Planned | Reusable visual component library (`GradientBackground`, `GradientIcon`) |
| V1.3 | Life Screen Refresh | In Review | Domain colors, donut, weekly bars, smart headline, summary card |
| V1.4 | Focus Screen Refresh | Planned | Focus visual overhaul |
| V1.5 | Plan Screen Refresh | Planned | Calendar and planning overhaul |
| V1.6 | Capture Screen Refresh | Complete | Action grid, dev tools collapsed, stronger card surface |
| V1.7 | Settings Refresh | Complete | Visual polish only — intentionally temporary modal; account architecture deferred to Phase J |

---

## Phase Ordering Principle

Meridian earns the right to ask for trust before requesting it.

> A–D (infrastructure) → E (first felt value) → F (daily habit) → Intelligence Audit → G (understands location) → H (understands travel time) → I (confidence layer) → J (account foundation)

Do not pull phases forward. Do not expand phase scope beyond its definition.
