# Household State — Direction V1

**Status:** Strategic exploration. No implementation approved.
**Date:** 2026-06-11
**Scope:** Design philosophy, lifecycle boundaries, trust constraints.

---

## 1. What Is a Household State?

A household state is a derived condition that describes what is currently happening
in the life of the household — not what needs to happen, not what happened, but what
is true right now.

States are not features. They are a lens. Meridian already holds enough signal to
know that a family is thirty minutes from leaving for a school event, that the drive
will take fifteen minutes, and that two captured items are connected to that event.
A state is what it looks like when that signal is composed into a single present-tense
description of reality.

### How a State Differs From Other Meridian Constructs

**Tasks** are owned, assigned, and completed. They create obligation. A household
state has no owner, creates no obligation, and cannot be completed. It expires.

**Reminders** are pull-to-attention. They arrive, demand acknowledgement, and then
disappear only because you acted. A household state never asks for acknowledgement.
It disappears because the world changed.

**Notifications** are discrete events. They fire once and are gone. A household state
is continuous — it holds for a duration and dissolves naturally when its conditions
no longer hold. A notification delivers a fact. A state describes a condition.

**Observations** are snapshots. An observation says: here is something interesting
about this moment. "Something you captured is connected to Grace's volleyball tonight"
describes a relationship that exists between two data points. It is a moment of
pattern recognition, not a claim about what is currently happening.

A state is continuity. "Preparing for Grace's volleyball" is not a fact about a
captured item — it is a claim about what the household is doing right now. It holds
across minutes or hours. It transitions. It resolves.

The difference is time. Observations are punctual. States are durational.

---

## 2. Candidate States

### Preparing

**Description:** The household is in the run-up window before a meaningful event.
Logistics, capture, and time-sensitivity have converged to a point where the
household is, functionally, getting ready — whether or not anyone has said so.

**Entry conditions:**
- A high-relevance event exists within a forward time window (approximately 2–4 hours).
- At least one of the following is true:
  - Prep items are surfaced in the capture index (stored links with confidence ≥ high).
  - A traffic-adjusted leave time has been computed.
  - A child attribution signal is active for the event.
- The event is not a low-signal informational calendar entry.

**Exit conditions:**
- The leave window opens (state transitions to Leaving).
- The event start time passes without a transition through Leaving or En Route
  (state collapses — no lingering stale "Preparing" for an event that is already
  in progress).
- The event is cancelled or removed from the calendar.

**Existing intelligence required:**
- Calendar intelligence (event relevance, time proximity)
- Prep awareness index (CalendarCaptureIndex, resolvedLinks)
- Traffic intelligence (leave time computation)
- Child attribution (household relevance signal)

**Risks:**
- Activates too early for long-horizon events. A volleyball game on the calendar
  for tonight does not mean the household is "preparing" at 9 AM. The entry window
  must be narrow enough to be true.
- Activates for events that lack household relevance. A dentist appointment for one
  person is not a household state. Relevance threshold matters.
- Conflicts with other active events. If two events are happening within the same
  window, which one drives the state? "Preparing" for multiple things simultaneously
  has no coherent meaning.

---

### Leaving

**Description:** The traffic-adjusted departure window is now open. The household
is at the threshold between preparation and movement.

**Entry conditions:**
- The computed leave time (event start minus traffic estimate minus buffer) has
  been reached or passed.
- The household location signal is consistent with a home origin (not already
  en route, not already at destination).

**Exit conditions:**
- Location signal transitions away from home origin (state transitions to En Route).
- Event start time is reached without location transition (state expires — no
  escalation, no pressure, no record).

**Existing intelligence required:**
- Traffic intelligence (leave time computation, `computeAlertFireMs`)
- Location intelligence (current region — home/away/venue)

**Risks:**
- This state is the one most likely to feel like accountability. "Leaving" displayed
  after the leave window has opened, while the family has not left, can read as
  a rebuke. The label and the surface must be calibrated so it reads as information,
  not judgment.
- Location dependency. If location is unavailable or stale, this state cannot
  transition correctly. The system must handle the absence gracefully — silent
  expiry, not stuck display.

---

### En Route

**Description:** The household or a household member is traveling to a known
destination associated with an active event.

**Entry conditions:**
- Location signal has moved away from home origin.
- An active event with a known venue or expected destination is within a relevant
  time window.
- The direction of movement is consistent with travel toward the event destination
  (or the transition is inferred from a departure signal alone, without route
  verification).

**Exit conditions:**
- Location signal arrives at or near the expected destination (state transitions
  to Arrived).
- The event start time passes without arrival (state expires quietly).
- The app is backgrounded and location access is unavailable (state pauses or
  expires — never frozen mid-route).

**Existing intelligence required:**
- Location intelligence (real-time region and movement)
- Traffic intelligence (ETA, route estimate)
- Venue intelligence (expected destination, geofence)
- Calendar intelligence (event identity, start time)

**Risks:**
- Venue intelligence is the least developed current system. En Route requires
  knowing where "there" is. Without a reliable destination geofence, arrival
  cannot be detected.
- Multi-person households add complexity. "En route" may be true for one member
  and not another. The state must be household-level, not individual-tracking.
  Meridian is not a surveillance system.
- Battery and privacy costs. Continuous location for route monitoring is expensive.
  This state has the highest infrastructure cost of any candidate.

---

### Arrived

**Description:** The household has reached the destination associated with an
active event.

**Entry conditions:**
- Location signal has entered or approximated the expected destination region.
- An active event is within its start window or recently started.

**Exit conditions:**
- The event end time is reached (state transitions to In Progress or expires,
  depending on surface design).
- Location signal departs the destination region before the event ends (state
  transitions back or expires — no inference about why they left).
- A maximum persistence window expires (Arrived should not linger indefinitely
  for long events — see Boundary Conditions, section 3).

**Existing intelligence required:**
- Location intelligence (destination geofence arrival)
- Calendar intelligence (event window, end time)
- Venue intelligence (destination match)

**Risks:**
- Arrived is a satisfying state but also a dangerous one. If it persists too
  long, it loses meaning. If the destination is a school and the event is a
  three-hour recital, "Arrived" is stale after five minutes.
- False positives from proximity. Arriving near a venue but not at it
  (nearby parking, adjacent building) may trigger premature arrival detection.

---

### In Progress

**Description:** An event is currently underway. The household is in it.

**Entry conditions:**
- Event start time has passed.
- Event is within its scheduled duration.
- Event has meaningful household relevance (not a background calendar entry).

**Exit conditions:**
- Event end time is reached.
- A maximum duration cap prevents perpetual "in progress" for open-ended events.

**Existing intelligence required:**
- Calendar intelligence (start time, end time, duration)
- Household relevance scoring (is this event worth surfacing as a state?)

**Risks:**
- This is the simplest state but potentially the least interesting. "In progress"
  adds nothing if the household already knows the event is happening.
- Risk of surfacing too many events as In Progress simultaneously. A busy family
  calendar can have multiple overlapping events. Only the highest-signal event
  should hold the state at any time.

---

### Household Clear

**Description:** No active preparation, travel, or event state is in effect.
The household is in an unstructured window.

**Entry conditions:**
- No candidate state conditions are currently met.
- No high-relevance event exists within the active window.

**Exit conditions:**
- Any candidate state entry condition is met.

**Notes:**
Household Clear is not a state to surface. It is the baseline — the absence of
any active state. It exists as a concept to define what the system looks like when
nothing is happening. No UI representation is needed or appropriate. The household
does not need to be told it has nothing to prepare for.

---

## 3. Boundary Conditions

### When does Preparing begin?

This is the most consequential boundary decision. Too early, and Preparing is
meaningless background noise. Too late, and it never emerges before the state
transitions to Leaving.

A reasonable prior: Preparing activates when the traffic-adjusted leave time is
within approximately 90 minutes. At that point, the preparation window is real —
there is still time to gather things, check prep items, and be aware. Before that
window, the event is in the future, not in the present.

The entry threshold should also be gated by relevance signal strength. A low-signal
event (no prep captures, no child attribution, no traffic estimate) should not
activate Preparing regardless of time proximity. The state should emerge because
Meridian has something to say, not just because the clock is running.

### When does Preparing end?

Preparing ends at the leave window opening. It does not linger into Leaving. The
two states are not overlapping — they are sequential. Preparing → Leaving is a
clean transition, not a fade.

If the leave window opens and no transition into Leaving occurs (because location
is unavailable, or the transition architecture does not yet exist), Preparing should
expire rather than freeze. A state that cannot transition must dissolve.

### How long should Arrived persist?

Arrived should persist for a bounded window tied to the event, not to time alone.
A reasonable prior: Arrived holds from arrival detection through the first 15–20
minutes of the event, then transitions to In Progress. The arrival moment has passed;
the event is now the reality.

For short events (< 30 minutes), Arrived and In Progress may be collapsed — the
distinction adds no value.

### When should a state disappear?

States disappear under three conditions:

1. **Natural transition** — the next state's entry conditions are met.
2. **Expiry** — the event window closes without a transition completing.
3. **Staleness guard** — a maximum age cap forces expiry even if conditions are
   ambiguous. No state should persist beyond the event's scheduled end time.
   No state should persist if the signal that created it is no longer fresh.

The staleness guard is not a fallback. It is a first-class design constraint.
A stale state is worse than no state. "Preparing" displayed four hours after
an event has started is a system failure, not an edge case.

---

## 4. Existing Meridian Systems

Household states are not a new capability. They are a composition of existing signals.

### Calendar Intelligence

Already resolves event relevance, start time, end time, household people assignment,
and child attribution. Provides the temporal skeleton of every candidate state.
The question of "which event is active" is already answerable from existing
intelligence. What is missing is the composition layer that selects which event
drives the current state.

### Traffic Intelligence

Already computes leave times, traffic-adjusted fire times, and ETA estimates.
The `computeAlertFireMs` function is, conceptually, the entry condition for the
Leaving state. The traffic system already answers the question "when should the
household be moving?" — it currently surfaces that answer as a notification,
not a state.

### Prep Awareness Index

Already maintains `CalendarCaptureIndex` with `resolvedLinks` connecting captured
items to events. The presence of high-confidence links is a direct signal for
Preparing state relevance. The prep system already knows whether the household
has capture relationships with a near-future event.

### Capture Relationships

The O06 observation ("Something you captured is connected to Grace's volleyball
tonight") is the observation-form of a Preparing-state signal. The same underlying
data — stored and high-confidence inferred links — would feed the state. The
observation surfaces a single moment of recognition. The state holds that recognition
continuously.

### Child Attribution

The O09 observation ("Something for 6th grade is on the calendar this week")
resolves school events to specific children. The same attribution logic applies
to state relevance: a volleyball game attributed to Grace is a household state
candidate; a generic calendar entry with no person signal is not.

### Location Intelligence

Already provides a `currentRegion` signal (home / away / venue). The home region
is the origin condition for Leaving and En Route. The venue region is the arrival
condition for Arrived. The existing location system is a necessary but not sufficient
input — it provides presence, not movement trajectory.

### Venue Intelligence

Currently underdeveloped. En Route and Arrived require destination geofencing —
knowing where a specific event is located, and being able to detect arrival within
a meaningful radius. This is the largest gap between current capability and state
readiness.

---

## 5. Awareness vs. Accountability

This section exists because the risk is real.

Meridian is not a productivity system. It does not measure whether you are doing
the right things at the right times. It does not track compliance. It does not
infer failure.

Household states live adjacent to accountability by design — they describe what
is happening, which means they can implicitly describe what should be happening,
which means they can accidentally describe what has not happened yet. That is
the failure mode.

### Healthy Awareness

A state is healthy when it adds peripheral information without implying a
response is required.

> "Preparing for Grace's volleyball."

This is true. It is observable. It does not ask anything. The household member
reading it can decide what, if anything, to do with it. They may already know.
They may be in the middle of it. They may not care. The state does not know which
of those is true, and it does not try to find out.

> "Grace's volleyball starts in 20 minutes. 5 minute drive from home."

This is information about the world. Time. Distance. Nothing more. The reader
draws their own conclusion.

> "En route."

This is a statement of current reality. It is neither celebratory nor urgent.
It holds until it changes.

### Unhealthy Accountability

A state becomes unhealthy when it implies an expected response, measures performance
against a standard, or treats the absence of an action as meaningful.

> "You haven't left yet."

This is a judgment. It assumes leaving was expected and has not happened.
It assigns responsibility. It implies failure.

> "You're running late."

Running late relative to what? Whose standard? This is performance measurement
dressed as information.

> "You should leave now."

Instruction. Not awareness. Meridian does not issue directives.

> "Missed departure window."

A record of non-compliance. The state has become a ledger.

The boundary between these categories is the presence of implied obligation.
Healthy states describe reality without referencing a standard. Unhealthy states
describe deviation from a standard, even when that standard is never made explicit.

**A useful test:** does the state make sense if the household is already doing
exactly the right thing? "En route" is fine whether the family left on time or
ten minutes late. "You're running late" only makes sense in the context of failure.
If a state only surfaces when something has gone wrong, it is accountability,
not awareness.

---

## 6. Future Architecture Considerations

This section describes structural thinking only. Nothing here is a specification
or an implementation plan.

### Derived State Model

The core principle is that states are computed, not stored. A state is the output
of a function that takes current intelligence as input and returns a present-tense
description of reality. It has no persistence of its own. Every time the relevant
inputs change, the state is re-derived.

This mirrors how the existing engagement observations work: `observePrepConnection`
takes a snapshot of the capture index and the event calendar and returns a text
observation or null. A state evaluator would work the same way — take intelligence
inputs, return a state or null.

States are not saved. They do not accumulate history. There is no "you were in
Preparing at 6:43 PM" record. When a state dissolves, it is gone.

### State Transitions

State transitions are not triggered — they are derived. At any given moment,
the current state is whichever candidate state's conditions are most fully met.
Transitions happen because the world changed, not because a timer fired.

The priority ordering of candidate states roughly follows temporal proximity to
the event: In Progress > Arrived > En Route > Leaving > Preparing. A higher state's
conditions being met always supersede a lower state, regardless of sequence.

### Automatic Lifecycle

Entry and exit are symmetric. A state that appeared without user action disappears
without user action. There is no "dismiss." There is no "mark as done." The state
is true until it is not true.

The staleness guard (see Boundary Conditions) is the backstop: regardless of
signal availability, a state cannot outlive the event that created it. After the
event end time, the state evaluator returns null for that event unconditionally.

### Surface Opportunities

States are not notifications. They are ambient information that could appear
contextually — on the Focus screen during the active window, as a header or
subtitle on the relevant screen, or as a presence indicator visible when the
household is in an active state.

The surface must be quiet. A state should feel like glancing at a clock, not
like receiving a message. It is information in peripheral vision, not information
demanding attention.

### Risks

**Complexity concentration.** Composing multiple intelligence signals into a
coherent state evaluator is architecturally more complex than any single observation.
The failure modes compound: if the calendar is stale, if location is unavailable,
if the event changes, the state evaluator must handle every combination gracefully.
Returning null is always the safe default.

**Scope creep.** States are philosophically close to "smart notifications" and
"live activities" — Apple and Android surface patterns that invite expansion.
The temptation to make states richer, more actionable, and more visible will be
constant. The constraint is the philosophy: awareness only.

**Trust calibration.** A wrong state is worse than no state. If Meridian says
"Preparing for Grace's volleyball" and the family cancelled the event two hours ago,
the state is not just incorrect — it is jarring. Every state surfaces the intelligence
quality behind it. Inaccurate states erode the trust that accurate observations
have built.

**Venue dependency.** The En Route and Arrived states require venue intelligence
that does not exist at current fidelity. Building states on top of an underdeveloped
foundation would require that foundation to be hardened first. Premature surface
exposure before venue intelligence is reliable would surface wrong states.

---

## 7. Recommendation

Household State should become a future Meridian direction.

The philosophical fit is strong. States are the natural evolution of what observations
are already doing — they extend from moment recognition to present-tense continuity.
The underlying intelligence is largely present. The architecture is compatible.
The household-weather metaphor holds: states are weather, not a weather report.
They describe conditions, not events.

However, the conditions for implementation are not yet met.

**Before implementation begins, the following must be true:**

1. **Venue intelligence reaches production fidelity.** En Route and Arrived are
   the most meaningful states and both require reliable destination geofencing.
   Implementing states without venue intelligence means excluding the most valuable
   half of the state lifecycle.

2. **Location intelligence is stable and permissioned.** The current `currentRegion`
   signal is available but has not been battle-tested against real household usage
   at the resolution required for state transitions. The home/away distinction is
   present; arrival detection at a specific venue is not.

3. **The accountability boundary is designed before any copy is written.** Copy
   comes last, after the state evaluator logic is verified to be awareness-only.
   The first draft of every state label should be reviewed against the accountability
   test before anything renders.

4. **Staleness handling is specified first.** The staleness guard is not a feature
   to add later — it is a precondition for surface trust. Before any state appears
   on screen, the expiry behavior must be correct for every edge case: event
   cancelled, calendar stale, location unavailable, event past end time.

5. **A single state is implemented first, validated, and locked before adding
   others.** The candidate most likely to validate correctly on existing intelligence
   is Preparing — it does not require location or venue, only the calendar and
   prep index. Preparing is the right first state. The others follow only after
   Preparing is stable and trusted.

The direction is right. The timing is a function of infrastructure readiness,
not philosophy.

---

*Design document only. No implementation. No roadmap commitment. No feature promise.*
