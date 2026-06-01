# MERIDIAN — Master product constitution

**Authority:** This document is the master constitution. It overrides default assumptions, generic SaaS patterns, and feature-first thinking. Before building any feature, screen, or component, load and respect the reference documents listed below. When this constitution and a detail spec conflict, **this constitution wins** unless the detail spec is stricter on user safety.

---

## Reference documents (load before building)

Read and apply all applicable files in `.cursor/rules/`:

| Document | Domain |
|----------|--------|
| `core-problem-alignment.md` | Problem, category, cognitive burden |
| `user-story-definition.md` | User story, 15-second clarity, notification tone |
| `information-architecture.md` | Focus / Plan / Life / Capture |
| `navigation-system.md` | 4-tab nav, Capture as primary, sheets |
| `design-language.md` | Calm Intelligence + Ambient Motivation |
| `onboarding-flow.md` | Value before effort, 6-screen flow |
| `focus-fallback-state.md` | Guided momentum state (not empty) |
| `focus-screen.md` | Focus surface, people-aware schedule |
| `core-feature-system.md` | Life Objects, Capture / Clarify / Advance |
| `ai-intelligence.md` | Quiet Life Intelligence |
| `secondary-screens.md` | Settings, progressive depth |
| `continuity-states.md` | Loading, error, offline, uncertainty |
| `motion-system.md` | Emotional continuity motion |
| `gesture-system.md` | Forgiving thumb-first interaction |
| `notification-intelligence.md` | Interruption worthiness, adaptive timing |
| `accessibility-human-comfort.md` | Compassionate accessibility |
| `product-audit-framework.md` | 9pm Tired Parent Audit |
| `product-reconciliation.md` | Unify without restarting |
| `dev-workflow.md` | Local iteration, meaningful checkpoints |

Legacy companion: `ux-direction.md` (superseded where it conflicts with `design-language.md`).

**Implementation tokens:** `lib/design/tokens.ts`, `app/globals.css`.

---

## Meridian identity

Meridian is a **calm, intelligent life operating system** for busy adults managing work, family, health, finances, and mental overload.

Meridian exists to **reduce cognitive fragmentation and emotional pressure**.

The product should always feel:

- calm
- intelligent
- emotionally supportive
- trustworthy
- lightweight
- quietly premium

Meridian should **never** feel:

- noisy
- corporate
- administratively heavy
- manipulative
- guilt-inducing
- overstimulating
- enterprise-like
- performatively AI-driven

---

## Core product problem

Busy adults are drowning in disconnected systems:

- calendars
- tasks
- reminders
- family coordination
- finances
- routines
- mental load

Meridian unifies life into **one calm intelligence layer**.

---

## Core product promise

Meridian should help users feel:

- clearer
- lighter
- calmer
- more in control
- less mentally fragmented

The product succeeds when users feel:

> “This app helps carry the mental weight of life with me.”

---

## Product philosophy

**Meridian is NOT:**

- a productivity hustle app
- a task manager
- a dashboard
- a chatbot wrapper
- a gamified life simulator
- a family enterprise platform

**Meridian IS:**

- a calm prioritization system
- an ambient intelligence layer
- a life coordination surface
- a momentum-support system
- an emotional decompression tool

---

## Emotional design philosophy

Meridian uses:

## CALM INTELLIGENCE + AMBIENT MOTIVATION

The product should create:

- momentum without pressure
- progress without guilt
- clarity without complexity
- intelligence without creepiness

---

## Ambient motivation system

Meridian rewards:

- momentum
- consistency
- recovery
- emotional progress

**Avoid:**

- shame mechanics
- streak panic
- dopamine exploitation
- loud gamification
- productivity anxiety

Completion should feel:

- tactile
- calming
- emotionally satisfying
- quietly rewarding

---

## Quiet Life Intelligence (AI layer)

Meridian AI is called:

## QUIET LIFE INTELLIGENCE

The AI should:

- learn patterns over time
- reduce organizational labor
- anticipate helpfully
- adapt to real human life
- remain emotionally safe
- stay humble when uncertain

The AI should **never:**

- feel invasive
- overexplain itself
- behave like surveillance
- emotionally manipulate users
- force chatbot interaction

---

## Unified Life Objects

Everything captured becomes a:

## LIFE OBJECT

Users should **not** need to manually classify:

- tasks
- reminders
- notes
- events
- goals
- routines

Meridian intelligently derives meaning and relationships automatically.

---

## Core product behaviors

Every Life Object supports:

1. **Capture**
2. **Clarify**
3. **Advance**

---

## Focus screen philosophy

The Focus screen is **not** a dashboard.

It is a calm prioritization surface answering:

> “What actually matters right now?”

**Rules:**

- maximum **3** primary items visible
- preserve breathing room
- prioritize emotional clarity
- reduce overwhelm aggressively

---

## People-aware intelligence

Meridian understands:

- family members
- spouses / partners
- work commitments
- household obligations
- community roles

The system should infer ownership naturally whenever possible.

**Time belongs to people, not just schedules.**

---

## Notification philosophy

Notifications are **emotional interruptions**.

Meridian notifications should:

- reduce stress
- prevent future problems
- support momentum
- respect mental bandwidth

**Never** optimize for:

- addiction
- engagement volume
- guilt
- urgency theater

---

## Motion philosophy

Meridian uses:

## EMOTIONAL CONTINUITY MOTION

Motion exists to:

- preserve orientation
- soften transitions
- reinforce calmness
- support emotional regulation

**Avoid:**

- flashy motion
- attention-seeking animation
- overstimulation

---

## Gesture philosophy

Meridian uses:

## FORGIVING THUMB-FIRST INTERACTION

The app must support:

- one-handed use
- distracted use
- interruption recovery
- low precision interaction
- emotional safety

---

## Accessibility philosophy

Meridian uses:

## COMPASSIONATE ACCESSIBILITY

The product should remain comfortable during:

- exhaustion
- stress
- overload
- neurodivergent overwhelm
- low attention states

Accessibility is **emotional respect**.

---

## Continuity states philosophy

Meridian **never** uses emotionally dead empty states.

The product should always feel:

- alive
- supportive
- calmly intelligent
- emotionally continuous

**Never** communicate:

> “There is nothing here.”

---

## Recovery philosophy

Users will:

- fall behind
- stop using the app temporarily
- become overwhelmed

Meridian should respond with:

- softness
- simplified restart
- reduced pressure
- emotional safety

**Never:**

- punish absence
- create backlog panic
- induce guilt

---

## Notification intelligence

Meridian notifications should pass an:

## INTERRUPTION WORTHINESS TEST

Notifications should consider:

- emotional timing
- overload state
- usefulness
- family impact
- recovery needs

**Premium intelligence means knowing when NOT to interrupt.**

---

## Product trust boundary

Meridian must always feel like it is working **for** the user, never **watching** the user.

AI should feel:

- ambient
- respectful
- invited
- humble

**Never:**

- creepy
- invasive
- overconfident
- emotionally presumptuous

---

## Design language

**Visual tone:**

- spacious
- breathable
- warm
- restrained
- premium
- emotionally calming

**Use:**

- strong hierarchy
- generous spacing
- soft gradients
- subtle motion
- low visual competition

**Avoid:**

- clutter
- dense dashboards
- noisy badges
- excessive color
- aggressive urgency

---

## Anti-patterns

**Never** allow Meridian to drift into:

- enterprise software
- productivity hustle culture
- AI theater
- dashboard overload
- feature creep
- settings bloat
- notification spam
- manipulative retention systems
- shame-driven motivation

---

## The 9pm Tired Parent standard

Every feature must pass this test:

> Can an exhausted, distracted, emotionally overloaded adult use this calmly and confidently with one hand at 9pm?

If not: **the feature fails.**

(Full rubric: `product-audit-framework.md`.)

---

## Final product standard

Meridian should always feel **lighter** than the life it is helping manage.
