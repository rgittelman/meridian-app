# Meridian Intelligence V1

## Status
Locked

## Components
- Capture Intelligence V1
- Calendar Intelligence V1
- Focus Intelligence V1
- Plan Intelligence V1

## Test Status
- Capture: 46 passing
- Calendar: 51 passing
- Focus: 38 passing
- Plan: 29 passing

Total: 164 passing tests

## Lock Date
<today>

## Deferred Risks

### Capture
- Absolute date parsing (6/4, June 15, etc.)

### Calendar
- Conference keyword travel-profile edge case

### Focus
- Overload feedback loop redesign
- Priority normalization recalibration
- Anti-guilt suppression policy
- PaceItems architecture

### Plan
- Chronological merge model
- Deadline visual urgency
- Read-only calendar edit affordance
- Approximate display cleanup

## Rule
No V1 intelligence behavior changes without a documented V2 proposal.

## Post-Lock Corrections

### Concrete Deadline Promotion

Fixed an issue where vague timing language in the raw capture text could incorrectly block promotion of a concrete deadline.

Example:

"Work on repricing Kaleen Luxe with the 7% tariff costs this week. Due Thursday 6/4"

Before:
- rejected as vague_timing

After:
- promoted using the resolved timing label "Thursday"

Implementation:
- vague-week guard now evaluates the resolved timing label instead of the full raw capture text
- added promotion path for financial-deadline captures with concrete day-level timing
- protected by VAGUE_ONLY_PATTERN so vague financial intentions remain blocked

Status:
Locked and covered by automated tests.

## Engagement Quick Win v1.1

Daily completion counts are now day-scoped.

- completedIds reset on new local day
- CalmWins reflects today's completions only
- Focus clear state count reflects today's handled items only
- Existing stale persisted counts are cleared on first hydration