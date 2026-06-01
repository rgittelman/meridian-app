# Meridian — Full product audit framework

Permanent review lens: **The 9pm Tired Parent Audit**. Use before shipping features, at reconciliation checkpoints, and when evaluating PRs. Grounded in `core-problem-alignment.md`, `user-story-definition.md`, `design-language.md`, `ai-intelligence.md`, and related specs in `.cursor/rules/`.

---

## Meridian audit philosophy

Meridian uses a permanent review framework called:

## THE 9PM TIRED PARENT AUDIT

This framework evaluates every:

- feature
- screen
- workflow
- AI behavior
- notification
- interaction
- motion system
- continuity state
- onboarding step

**Core user state:**  
A mentally overloaded adult using the app while **tired, distracted, emotionally depleted**, and managing multiple life responsibilities.

If Meridian **increases tension** in that state, the feature **fails**.

---

## Core audit questions

### 1. Immediate understandability

Can users understand:

- what this is
- what matters
- what to do next

**within seconds?**

If not: **simplify.**

---

### 2. Cognitive load reduction

Does this feature reduce:

- remembering
- organizing
- mental holding
- decision fatigue
- life fragmentation

Or does it create **more management work**?

If it increases organizational labor: **it fails.**

---

### 3. Emotional regulation

Does the experience feel:

- grounding
- calm
- supportive
- momentum-oriented

**Or:**

- urgent
- overwhelming
- guilt-inducing
- administratively heavy

If it creates pressure: **it fails.**

---

### 4. Interruption resilience

Can the user:

- pause
- recover
- resume
- undo

**without** losing orientation?

If interruption breaks usability: **it fails.**

(Aligns with `gesture-system.md` recovery principle and `continuity-states.md`.)

---

### 5. AI trustworthiness

Does intelligence feel:

- assistive
- ambient
- respectful
- humble

**Avoid:**

- AI showmanship
- overconfidence
- invasive assumptions
- creepy personalization

If the AI feels performative: **it fails.**

(Aligns with `ai-intelligence.md` trust boundary and invisibility principle.)

---

### 6. Visual breathing room

Does the UI:

- preserve whitespace
- reduce visual competition
- guide attention calmly
- support fast scanning

If visually exhausting: **it fails.**

(Aligns with `design-language.md` and `accessibility-human-comfort.md`.)

---

### 7. Recovery safety

When users:

- fall behind
- miss reminders
- stop using the app temporarily
- make mistakes

Does Meridian respond with:

- softness
- recovery
- simplification
- reduced pressure

**Avoid:**

- guilt
- backlog panic
- punishment mechanics

(Aligns with `focus-screen.md` Recovery mode, `secondary-screens.md`, `continuity-states.md`.)

---

### 8. Interruption worthiness

Especially for notifications and AI nudges:

> Is this truly worth interrupting the user for?

If interruption value is weak: **suppress it.**

(Aligns with `notification-intelligence.md` interruption-worthiness test.)

---

### 9. Long-term trust

Would a busy adult **emotionally trust** this system long-term during stressful life periods?

**Trust is the real KPI.**

---

## Audit categories

Every release should audit:

| Category | Primary reference |
|----------|-------------------|
| Cognitive load | `core-problem-alignment.md` |
| Emotional tone | `design-language.md`, `user-story-definition.md` |
| AI trust | `ai-intelligence.md` |
| Interruption cost | `notification-intelligence.md` |
| Accessibility comfort | `accessibility-human-comfort.md` |
| Physical ergonomics | `gesture-system.md`, `core-problem-alignment.md` |
| Recovery safety | `continuity-states.md`, `focus-fallback-state.md` |
| Family / people clarity | `focus-screen.md` |
| Momentum psychology | `design-language.md` (Ambient Motivation) |
| Visual calmness | `design-language.md`, `motion-system.md` |

---

## Product drift detection

Actively detect:

- feature creep
- enterprise drift
- dashboard overload
- AI showmanship
- over-gamification
- settings bloat
- emotional pressure accumulation

(Aligns with `product-reconciliation.md`: evaluate against cognitive burden gate.)

---

## Strategic product principle

Meridian should always feel **lighter** than the life it is helping manage.

---

## Final product standard

If a feature impresses stakeholders but **increases user tension**, **remove it**.

---

## Quick audit checklist (ship gate)

Use before merge or deploy at meaningful checkpoints:

- [ ] Understandable in **&lt; 5 seconds** at 9pm, one-handed, partial attention
- [ ] Reduces mental holding (not more admin)
- [ ] Calm, not pressuring
- [ ] Pause / undo / resume safe
- [ ] AI humble when uncertain; no “AI did this” theater
- [ ] Breathable layout; not visually noisy
- [ ] Safe after absence or mistakes
- [ ] Notifications / nudges pass interruption-worthiness
- [ ] Would I trust this during a hard week?
- [ ] Maps to Focus / Plan / Life / Capture OR justified merge (see `information-architecture.md`)
- [ ] Passes **Calm Intelligence + Ambient Motivation** (`design-language.md`)
