# Background Reassessment — Direction V1

**Status:** Strategic exploration. No implementation approved beyond the current repair utility.
**Date:** 2026-06-11
**Trigger:** Trust bug — calendar links corrupted by a scoring defect, repaired by `repairCorruptedCalendarLinks` in `captureStore.ts`.

---

## Core principle

> Meridian may reassess inferred understanding over time, but must avoid visible churn.

**Non-negotiable rules:**

| Rule | Rationale |
|---|---|
| Inferred relationships may be reassessed and cleared when they no longer pass confidence gates. | Inferred intelligence is provisional. Algorithms that created it can correct it. |
| Stored/manual relationships must not be touched by automated reassessment. | User decisions carry information Meridian does not have. |
| Reassessment must happen at safe moments, not continuously. | Continuous reassessment creates observable instability. |
| Quiet correction is desirable. Visible flip-flopping is trust-breaking. | Users notice when Meridian changes its mind. Trust is not recovered by being right later. |
| Trust is more important than recall. | A false negative (no link shown) is less damaging than a false positive (wrong link shown). |
| False negatives are preferable to false positives. | Corroborates the confidence-over-coverage design principle throughout Meridian V1. |
| Post-event prep cleanup is the safest identified future reassessment scope. | Time-gated, unambiguous, no score math required. |

---

## What prompted this question

The relationship scoring bug linked three unrelated captures — a school party, a no-school day, a last day of school — to Quinn's hockey game with high confidence. The fix was a corrected scorer. But the fix alone wasn't sufficient: corrupted data was already persisted on `LifeObject` records with `relationshipConfidence: "high"`, and the existing `relinkCapturesToCalendar` logic skipped high-confidence items as already settled.

A narrow repair utility (`repairCorruptedCalendarLinks`) was introduced to re-score stored `calendar_match` links against the corrected scorer and clear those that now return `low`. It runs once per rehydration, before the relink pass.

That utility is correct and narrow. But it raises a design question: should Meridian have a principled layer for background reassessment of stored intelligence — not just for bug repair, but as a designed behavior of the system?

---

## What is a Background Reassessment?

A background reassessment is a quiet re-evaluation of previously inferred intelligence against current context. It asks: "Given what we know now, does this interpretation still hold?"

It does not apply to everything Meridian stores. It applies specifically to inferred interpretations — relationships, groupings, prep connections, archive candidates — that were derived from signals that change over time: calendar events that pass, confidence thresholds that tighten, scoring logic that improves.

It does not ask: "Should we change what the user decided?" It asks: "Should we update what Meridian inferred?"

### What it is not

A reassessment is not a sync. Calendar sync refreshes raw data. Reassessment re-interprets stored inferences against that refreshed data.

A reassessment is not a correction engine. It does not retroactively score every decision Meridian has ever made. It operates on the specific classes of intelligence that are time-dependent and confidence-gated.

A reassessment is not a notification. It runs silently, changes nothing visible until the next screen render, and produces no user-facing message about what changed.

---

## The current repair utility as narrow example

`repairCorruptedCalendarLinks` does exactly one thing: it finds calendar links sourced from `calendar_match`, re-scores them against the corrected scorer, and clears any that now return `low` confidence. It runs before `relinkCapturesToCalendar`, which then gets a clean slate to re-link correctly.

This is reassessment in its simplest form:

- **Trigger:** app rehydration (app launch)
- **Scope:** inferred calendar links only
- **Operation:** re-score against current events; clear if below confidence gate
- **Safety:** stored links (`relationshipSource === 'stored'`) are explicitly skipped
- **Idempotency:** if a link is valid, it is unchanged; running multiple times produces the same result

The utility is correct, but it exists for the wrong reason — it repairs a bug rather than maintaining intelligence quality as a designed behavior. That distinction matters. If reassessment were designed, the repair utility would simply be one instantiation of a broader pattern, not a one-off exception.

---

## Why inferred intelligence ages

Captured intelligence is not static. The signals that informed an inference may no longer hold:

**Calendar events pass.** A prep link to "Quinn Hockey Game — Friday 6:00 PM" becomes meaningless after the event ends. The link was valid when created; it is noise after the fact. No one cleans it up today.

**Scoring logic improves.** The trust bug demonstrated this directly. A link scored as high confidence under a defective scorer would not have been created under the corrected one. That discrepancy persists in stored data indefinitely unless something re-evaluates it.

**New context arrives.** A capture linked to "Event A" may belong more naturally to "Event B" after a calendar sync brings in new detail. The first match was the best available at creation time; it may no longer be the best match at all.

**Events are removed or changed.** An event that was the basis for a link may be deleted, rescheduled, or retitled. The link persists against a stale or nonexistent target.

In each case, Meridian's stored interpretation diverges from current reality. Without reassessment, that divergence is invisible and permanent.

---

## What a designed reassessment layer would cover

Not all stored intelligence ages. The reassessment scope should be narrow and explicit.

**Inferred calendar links** — the class affected by the current bug. Links with `relationshipSource === 'calendar_match'` were derived by a scorer at a point in time. They should be periodically re-scored against the current event set. Links that no longer pass the confidence gate should be cleared. Links whose target event no longer exists should be cleared. This is the most time-sensitive reassessment class.

**Prep relationships.** The `CalendarCaptureIndex` builds prep connections on each calendar sync. But if a linked event passes without the prep item being acted on, the prep relationship becomes historical noise. An event that ended last week is not something a capture is "prepping for" anymore. Post-event cleanup of prep links is a form of quiet reassessment.

**Archive candidates.** Items that have not been referenced, accessed, or linked to anything active may be candidates for archiving. But archiving is consequential — it changes what the user sees. A reassessment layer should produce archive suggestions or candidates, not automatically archive. The user (or a deliberate Meridian surface) should confirm.

**Groupings and clusters.** Captures that were grouped by a shared signal (person, topic, calendar event) should not be regrouped if the signal changes. Regrouping surprises users. The conservative position: reassessment can dissolve groups that lose their basis, but should not create new groups automatically.

---

## What a designed reassessment layer would not cover

**Manually stored links.** If a user explicitly links a capture to an event — or if the system ever receives a link with `relationshipSource === 'stored'` — that decision must not be re-scored. Reassessment governs inferred intelligence, not user decisions. The current repair utility already encodes this: `if (item.relationshipSource === 'stored') return item`.

**Completed or archived items.** Items with `status === 'done'` or `'archived'` are settled. Reassessing them would be noise. The current repair utility correctly skips these.

**Capture content.** Reassessment does not re-parse or re-classify capture text. Parse fields are set at creation and enrichment; they do not change based on calendar state.

**Focus surfacing decisions.** Whether a capture surfaces on the Focus screen is derived at render time from live intelligence. It is not stored. There is nothing to reassess.

---

## Safe moments for reassessment

Reassessment has a cost: it reads events, scores links, and writes updated items. It should not run constantly.

**App launch / rehydration** — the best general trigger. The device is already loading data. A one-pass reassessment over a modest capture set (tens to low hundreds of items) is fast and happens before anything renders. The current repair utility uses this trigger.

**After calendar sync** — the most targeted trigger for link reassessment. New event data may invalidate existing links or enable better ones. Running a narrow link reassessment after each sync is appropriate and specific.

**After capture creation** — relevant only for re-scoring the immediately surrounding context. When a new capture is created, existing captures linked to the same events might need to be checked for priority or overlap. This is a narrow, scoped trigger.

**After event end** — a natural trigger for post-event cleanup: clear prep links to events that have passed, dissolve prep groupings. Currently not handled. A low-frequency pass (once daily, checking for events that ended in the past N hours) would handle this cleanly.

**Once daily** — a catch-all heartbeat for low-priority maintenance: detecting stale links to missing events, archiving candidates that have aged past a threshold. Not a substitute for the targeted triggers above.

**What to avoid:** continuous background polling, reassessment on every store mutation, reassessment on every calendar read, reassessment triggered by UI interactions.

---

## Churn as the primary risk

The risk of a reassessment layer is not complexity — it is churn.

Churn happens when inferences are rewritten repeatedly in ways the user notices. A capture that shows "Linked to Grace's volleyball" on Tuesday, shows nothing on Wednesday after a sync, and shows "Linked to Hudson's game" on Thursday has not been intelligently maintained — it has been chaotically reinterpreted. From the user's perspective, Meridian cannot make up its mind.

Churn arises from:
- **Re-scoring too eagerly.** If reassessment runs after every calendar sync and re-evaluates all links from scratch, small score fluctuations will create apparent instability.
- **No stability gate.** A link should only be cleared if it falls below the confidence threshold by a meaningful margin, not just barely. A link at 0.74 (barely high) that drops to 0.70 (barely below high) after a sync should not be cleared.
- **No staleness distinction.** Clearing a link because the target event passed is different from clearing it because the score changed. The former is always safe. The latter should apply a stability buffer.
- **Absence of hysteresis.** If a link is cleared on Tuesday and a matching event reappears on Wednesday, re-creating the link produces visible churn. The system should clear quietly and re-link only when the new match is meaningfully better than the previous one.

A well-designed reassessment layer clears links when their basis is definitively gone (event deleted, event ended, score catastrophically below threshold) and leaves borderline links alone.

---

## Trust asymmetry: inferred vs. stored

The current repair utility makes an implicit asymmetry explicit: inferred links can be cleared quietly, stored links cannot be touched.

This asymmetry should be a first-class design principle for the reassessment layer.

**Inferred intelligence is provisional.** It was created by Meridian's algorithms from available signals. It should be maintained by those same algorithms as signals change. Clearing an inferred link that no longer passes confidence gates is not an error — it is the system being honest about what it knows.

**Stored intelligence reflects user intent.** If a user links a capture to an event, or marks something as done, or archives something, those decisions represent information Meridian does not have: the user's context, judgment, and preferences. Reassessment must not override these.

The practical implementation: any reassessment pass should check `relationshipSource` before modifying. `'stored'` items are read-only to the reassessment layer. Only `'calendar_match'` and equivalent inferred sources are in scope.

---

## Recommendation

The current repair utility should be understood as the first narrow implementation of a future Background Reassessment layer.

Its current form is minimal and correct: it clears corrupted `calendar_match` links on app rehydration. It does not need to be expanded now. But it should be treated as evidence of a direction, not as a one-off fix.

A Background Reassessment layer should become a future Meridian direction.

**Before a full implementation begins, the following must be true:**

1. **The link confidence system is stable.** Reassessment only makes sense when the scoring logic is trusted. Running reassessment against a scorer that is still being refined creates churn by design. The trust bug fix must be stable and in production before reassessment is expanded.

2. **The trigger model is explicit.** Each reassessment trigger (app launch, post-sync, post-event-end, daily heartbeat) should be designed as a named, documented behavior — not emergent from multiple independent passes. Overlapping triggers with different scopes produce unpredictable combined behavior.

3. **Churn is measurable before it is shipped.** In development, a reassessment pass should log every link it clears, every link it retains, and why. That log should be reviewed before any trigger is enabled in production. Silent changes to stored data should be auditable.

4. **The stored/inferred boundary is enforced at the type level.** The current `RelationshipSource` union now includes `'stored'`. The reassessment layer should use this field as an explicit gate, not rely on convention. When the first non-repair reassessment is implemented, it should carry a type-checked guard against touching stored links.

5. **Post-event cleanup is the right second scope.** After the trust bug is resolved, the most natural next reassessment target is prep links to events that have already ended. This is low-risk (no valid prep link should survive an ended event), clearly scoped, and removes noise from the prep awareness index. It is a better second implementation than expanding link re-scoring.

The repair utility is narrow and correct. The direction it points toward is sound. The timing is after the scoring layer earns back trust.

---

*Design document only. No implementation beyond the existing repair utility. No roadmap commitment.*
