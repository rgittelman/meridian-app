# Meridian — Core feature system

How work enters and moves through Meridian. Pair with `meridian-master-prompt.md`, `information-architecture.md`, and `ai-intelligence.md`.

---

## Life Objects

Everything the user captures becomes a **Life Object** — a single mental model for:

- tasks
- reminders
- notes
- events
- goals
- routines

Users do **not** choose types at capture time. Meridian derives type, timing, ownership, and relationships via **Quiet Life Intelligence**.

---

## Three behaviors (every Life Object)

| Phase | User-facing goal | System behavior |
|-------|------------------|-----------------|
| **Capture** | Get it out of my head fast | Frictionless input (voice, text, quick add); no required fields |
| **Clarify** | I don’t have to organize it | Infer dates, people, urgency, domain; ask only when ambiguity blocks action |
| **Advance** | Something actually moves forward | Surface on Focus (max 3), Plan, or timely nudge; completion feels calm, not gamified |

---

## Where behaviors live in IA

| Behavior | Primary home |
|----------|----------------|
| Capture | Capture tab / sheet (see `navigation-system.md`) |
| Clarify | Background + rare inline prompts |
| Advance | Focus, Plan, notifications (interruption-worthy only) |

---

## People-aware ownership

Infer **who** a commitment belongs to (self, partner, child, household, work) when signals exist. Time belongs to people, not just schedules.

---

## Prep Intelligence

### Preparation Awareness Philosophy

Preparation awareness is event-centric, not task-centric.

The primary object is always the upcoming commitment.
Prep context exists to support the commitment.
Prep context should never be elevated above the event itself.

Display order:

1. The event — always primary
2. Prep context — always subordinate

The user should feel:

"I know what I'm preparing for."

not:

"I have another list of things to do."

If prep context makes the screen feel heavier than the event itself — simplify, reduce, or remove it.

---

## Anti-patterns

- Forcing categories, projects, or GTD workflows at capture
- Backlog dumps on Focus
- Shame for un-clarified items
- Chat as the only path to capture or clarify

---

## Audit

Every new object type or flow must support Capture → Clarify → Advance and pass `product-audit-framework.md`.
