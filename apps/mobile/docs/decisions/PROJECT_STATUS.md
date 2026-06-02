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

Phase F — Morning Briefs & Evening Preview

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

## Future Roadmap

Phase F — Morning Briefs & Evening Preview
Phase G — Geolocation Intelligence
Phase H — Traffic-Aware Routing
Phase I — Background Fetch