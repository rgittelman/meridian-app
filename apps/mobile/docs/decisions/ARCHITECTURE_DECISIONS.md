# Meridian Architecture Decisions

## Status

This file records locked V1 decisions and deferred V2 items.

Future audits should read this file before reviewing or changing code.

---

## Locked V1 Systems

### Capture Intelligence V1

Status: Locked

Capture Intelligence decides how raw user text becomes structured life information.

Locked principles:
- Natural language should work.
- Important captures should not silently disappear.
- Clear day/date plus meaningful life signal should promote appropriately.
- Family, work, community, health, and money signals are all meaningful.
- No timing usually means no Plan promotion.

### Calendar Intelligence V1

Status: Locked

Calendar Intelligence decides how calendar events are understood, normalized, attributed, and surfaced.

Locked principles:
- Google Calendar all-day events follow exclusive end dates.
- BFSC/community events are first-class.
- TeamSnap/sports events should not default to hockey.
- Bare appointment does not automatically mean health.
- Calendar pagination must be observable.
- Work travel can receive travel prep awareness.

### Focus Intelligence V1

Status: Locked

Focus Intelligence decides what should appear first when Ryan opens Meridian.

Locked principles:
- Focus is limited and calm.
- Same-day commitments must surface as same-day.
- Family commitments are protected.
- All four children are included in family/sports priority.
- Financial-consequence items deserve protection.
- Monthly recurring items should not surface every day.
- Stress-prevention items receive timing support.

---

## Product Principles

Meridian is not a task manager.

Meridian is a calm life coordination system.

It should:
- reduce mental load
- protect family commitments
- prevent missed obligations
- avoid guilt language
- avoid productivity pressure
- surface only what matters now
- stay quiet when silence is better

---

## V1 Accepted Tradeoffs

These are accepted and should not be treated as blockers unless they create a real user-visible defect.

### Overload Feedback Loop

Overload scoring is not fully wired into pre-selection.

Deferred to V2.

### Priority Score Recalibration

PRIORITY_SCORE_MAX remains unchanged.

Deferred until scoring and cooldowns are recalibrated together.

### Anti-Guilt Suppression Threshold

The current snooze/defer threshold remains unchanged.

Deferred until a clear product policy is defined.

### Emotional Pacing

FOCUS_MAX remains 3.

Do not increase Focus size without a product decision.

### Child Sports Attribution

Generic sports events may miss child attribution if the child is not in the title or calendar name.

This is preferable to wrong attribution.

### Conference Travel Prep

Conference keywords may sometimes trigger travel prep.

Accepted for V1 because household relevance filtering reduces practical false positives.

### Financial Pressure

Financial pressure is not inferred from visual urgency.

Proper financial pressure detection is deferred until domain/financial signals flow through resurfacing.

---

## Future Audit Rules

Future audits should:

1. Read this file first.
2. Respect locked V1 decisions.
3. Avoid reopening accepted V1 tradeoffs.
4. Only recommend changes to locked systems if there is:
   - a regression
   - a user-visible defect
   - a contradiction with this document
5. Prefer small correction passes over redesigns.
6. Separate:
   - proven defects
   - likely defects
   - architecture observations
   - accepted tradeoffs

---

## ADR: Settings Entry Point

Status: Accepted

Decision:
Settings is presented as a modal launched from a gear icon in the Life screen header.

Rationale:
- Settings is a low-frequency destination.
- Preserves the 4-tab navigation model.
- Keeps Focus, Plan, Life, and Capture as primary destinations.
- Allows Settings to grow independently without affecting tab structure.

Implementation:
Root Navigator owns a Settings modal route.
Life screen header contains the gear entry point.

---

---

## V1 Gap: No Capture-Triggered Notifications

Status: Documented, deferred

Observed scenario:
User captured "Set a notification to call Matt in 2 minutes."
No notification fired. The capture was saved and may have promoted to Focus,
but no OS notification was scheduled.

Current V1 behavior:
The notification pipeline is calendar-anchored. Generators read calendar events
and time-of-day patterns. No generator reads captures for reminder intent.
A capture saying "remind me to X" has no path to an OS notification.

Why this matters:
Users naturally expect natural-language captures like "remind me to call Matt
at 3pm" to behave like Reminders or Siri. Meridian currently cannot fulfill
this expectation.

What would be needed:
A new generator — capture_reminder — that:
  - Scans active captures for explicit reminder intent
    ("remind me to", "call X at", "set a notification for", "alert me when")
  - Resolves relative time expressions to absolute OS trigger times
    ("in 2 minutes", "at 3pm", "before I leave")
  - Schedules via the existing delivery scheduler

This is more complex than calendar-based generators because it requires
intent detection and time resolution from unstructured text, not just reading
event.startTime. It belongs to Capture Semantic Intent V2 (Phase J).

Distinction from calendar notifications:
  Calendar notification: event exists → generate alert before it
  Capture reminder: user asked for one → detect intent → create alert

These are different trust models. Calendar notifications can be cancelled when
events change. Capture reminders need their own lifecycle (fired, snoozed,
expired, cancelled by user).

Future phase placement: Phase J (Capture Semantic Intent V2), alongside
correction/clarification detection.

---

## Strategic Principle: Anticipation Over Reminders

Status: Accepted

Meridian's differentiation is anticipation, not reminders. Any notification,
insight, or surface should be evaluated against this standard.

Reminders say what. Meridian says what, why now, and what it means.

Examples of the distinction:

  Reminder: Grace volleyball at 5pm.
  Meridian: Grace volleyball at 5pm. Traffic is usually heavy by 4:15.
            Leaving around 4:00 gives you breathing room.

  Reminder: BFSC board meeting tonight.
  Meridian: BFSC board meeting tonight. Insurance renewal was mentioned
            earlier this week and hasn't resurfaced yet.

  Reminder: Expense report due Friday.
  Meridian: Friday is getting tight. You have a clean window tomorrow
            morning for the expense report.

Phase roadmap in terms of this principle:

  Phase E — Meridian reminds (time-based leave alerts)
  Phase F — Meridian summarizes (morning brief scheduling)
  Phase G — Meridian understands where you are (geolocation)
  Phase H — Meridian understands how long things take (traffic-aware routing)
  Phase I — Meridian stays current when closed (background fetch)

After Phase F, before diving into location intelligence:
  Engagement / Wow Layer sprint — observations that make users say
  "How did it know that?" Examples: "This is the third Grace event this
  week." "Your family schedule is unusually heavy Thursday." These are not
  reminders. They are observations. Observations are what users share.

Rule for future audits:
  Before adding any notification or surface, ask: is this a reminder or an
  anticipation? Prefer anticipation. If it cannot anticipate yet, make it
  as calm and contextual as possible.

---

---

## ADR: Phase Lock Order and Expansion Constraints

Status: Accepted

Do not expand scope of any phase beyond its definition.
Do not pull in geolocation, traffic, or background fetch early.
Do not add location permissions before the user has experienced value.

Rationale:
Location permissions are one of the biggest trust asks on mobile. A user
who has already received helpful leave alerts, morning briefs, and smart
event protection is far more likely to grant location access than a new
user with no prior context. Meridian must earn the right to ask.

Lock order:

  Phase E — Leave Alerts
    First feature users actually feel. A notification that protects a
    specific family commitment. Success criteria: fires, cancels, reschedules,
    honors settings, survives restarts. Ship this before touching anything else.

  Phase F — Morning Briefs and Evening Preview
    First daily engagement loop. Not "Good morning." Something like:
    "You have 2 family commitments before noon and one work item that may
    get tight by Friday." Creates habit.

  Pause — Meridian Intelligence Audit V1
    Before Phase G: does Meridian feel smarter every week? Does it surface
    insights users didn't already know? Is it anticipating or reminding?
    Is there at least one "how did it know that?" moment per week?
    If the answer is no, build more intelligence — not more infrastructure.

  Phase G — Geolocation Intelligence
  Phase H — Traffic-Aware Routing
  Phase I — Background Fetch

Rule for future sessions:
  The shortest path from "interesting app" to "I rely on this" runs through
  Phase E and Phase F, not through Phase G. Do not skip ahead.

---

---

## V1 Gap: No In-App Event Dismissal

Status: Documented, deferred

Observed scenario:
User sold concert tickets. Event still appears in Coming Up and BEFORE YOU GO.
No way to dismiss or hide the event from within Meridian without deleting it from
Google Calendar.

Current V1 behavior:
Meridian reads calendar events but does not write back to them.
The only path to remove an event from Meridian is to delete or decline it in
Google Calendar and wait for the next sync.

Why this matters:
Users have legitimate reasons to dismiss an event from Meridian's surfaces
without deleting it from their calendar — sold tickets, declined attendance,
cancelled plans, or simply "I know about this, stop surfacing it."

Future design options:

  Option A — Per-event local dismiss
    A dismiss/archive action on schedule strip items and BEFORE YOU GO cards.
    Event is hidden in Meridian for the session or permanently via a local
    suppression list. Google Calendar is not touched.

  Option B — Decline-and-suppress
    Tapping dismiss offers to decline the Google Calendar event (requires write
    scope) and suppress it from Meridian surfaces simultaneously.

  Option C — Snooze until event passes
    Dismiss hides the event from surfaces until its start time, then expires
    automatically. Useful for events the user is attending but doesn't need
    Meridian to prep for.

Recommended phase: after Capture Semantic Intent V2 (Phase J) or alongside
the Engagement / Wow Layer sprint — whichever comes first.

Prerequisite for Option B: Google Calendar write scope (not currently held).

---

## Current Next Priority

Phase F — Morning Briefs & Evening Preview (in progress)