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

## Current Next Priority

Next likely systems to audit:

1. Plan Intelligence / Plan Screen UX
2. Notification Intelligence delivery
3. Daily Briefing
4. Settings / onboarding
5. Real-world device testing