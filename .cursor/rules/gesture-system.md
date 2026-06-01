# Meridian — Gesture system specification

**Forgiving thumb-first interaction** — one-handed, interrupted attention, emotionally safe. Pair with `motion-system.md` (swipe visuals, timing), `focus-screen.md` (swipe right/left, long press), `navigation-system.md` (sheets, Capture tab), and `core-problem-alignment.md` (one-handed design standard).

---

## Meridian gesture philosophy

Meridian uses a gesture philosophy called:

## FORGIVING THUMB-FIRST INTERACTION

The gesture system is optimized for:

- one-handed use
- interrupted attention
- physical comfort
- emotional safety
- low cognitive strain

Users should feel:

> “This app physically cooperates with me.”

---

## Core gesture principles

### 1. No critical hidden gestures

Essential functionality must **never** depend exclusively on:

- hidden gestures
- long-press discovery
- precision interactions

Gestures should **accelerate** workflows, not **gate** them.

---

### 2. Gestures must be forgiving

Interactions should tolerate:

- shaky thumbs
- rushed usage
- partial attention
- interruptions

**Avoid:**

- tiny targets
- precision-heavy movement
- gesture overload

---

### 3. Thumb-zone priority

Most repeated interactions should live within:

- lower screen reach zones
- natural thumb arcs
- comfortable one-handed positions

**Avoid** excessive hand repositioning.

---

## Primary gesture system

### Swipe right → complete

**Purpose:**  
Create satisfying forward momentum.

**Behavior:**

- soft resistance
- warm visual progression
- partial swipe previews action
- full swipe gently commits

Undo must remain **immediate and easy**.

Completion should **never** feel stressful.

(See `motion-system.md` for completion visual tone and cadence.)

---

### Swipe left → later / snooze

**Purpose:**  
Reduce pressure without guilt.

**Visual tone:**

- soft neutral gradients
- calm retreat motion
- emotionally safe delay behavior

Snoozing should feel **strategic**, not avoidant.

---

### Pull down → context reset

**In Focus**, a soft downward pull should:

- subtly refresh context
- re-center orientation
- reinforce calmness

**Avoid:**

- hard refresh energy
- aggressive loading indicators

---

## Bottom sheet behavior

Bottom sheets are **core navigation surfaces**.

**Requirements:**

- predictable drag physics
- forgiving dismissal thresholds
- anchored feel
- clear hierarchy layering

Sheets should feel **grounded**, not floating.

(Aligns with `navigation-system.md`: swipe down dismisses sheets; max one stacked modal.)

---

## Capture gesture system

Capture must feel **instantaneous**.

**Rules:**

- thumb reachable
- rapid open
- native keyboard integration
- minimal interaction travel

**Optional enhancement:**  
Double-tap Capture tab opens voice input directly.

Voice capture must remain **optional**.

---

## Long press philosophy

Long press exists for:

- acceleration
- contextual shortcuts
- secondary power features

**Never** require long press for core workflows.

---

## Gesture recovery principle

All gestures must support **graceful recovery**.

Users should feel:

- safe experimenting
- safe undoing
- safe correcting mistakes

(Aligns with `continuity-states.md` and UndoToast patterns in the app.)

---

## One-handed interaction standard

Critical flows must support:

- thumb-only usage
- standing use
- distracted use
- partial attention

**Core flows include:**

- completing items
- snoozing items
- capturing thoughts
- reviewing Focus
- adjusting timing
- dismissing suggestions

---

## Edge gesture compatibility

### iOS

**Respect:**

- native back swipe
- native sheet pull behavior
- safe edge zones

### Android

**Respect:**

- Material back gestures
- edge navigation expectations
- Android gesture hierarchy

**Never** fight OS muscle memory.

---

## AI gesture restraint

AI must **never:**

- remap gestures dynamically
- introduce surprise interactions
- create hidden intelligence gestures

Consistency builds **physical trust**.

(Aligns with `ai-intelligence.md` invisibility and trust boundaries.)

---

## Accessibility & motor comfort

**Support:**

- reduced dexterity
- fatigue
- larger fingers
- motion sensitivity

**Requirements:**

- generous touch targets
- forgiving gesture thresholds
- clear fallback buttons
- low precision dependency

---

## Final UX standard

Gesture systems should **reduce** physical cognitive load, not increase it.
