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

## Current Next Priority

Next likely systems to audit:

1. Phase E — Leave Alerts (time-based)
2. Phase F — Morning Brief Scheduling
3. Engagement / Wow Layer sprint
4. Phase G — Geolocation Intelligence