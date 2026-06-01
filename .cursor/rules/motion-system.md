# Meridian — Motion & microinteraction system

**Emotional continuity motion** — restrained, orientation-preserving, momentum-reinforcing. Implementation presets live in `lib/design/tokens.ts` (Framer Motion springs/easing). Pair with `design-language.md`, `continuity-states.md`, `focus-screen.md`, and `navigation-system.md`.

---

## Meridian motion philosophy

Meridian uses a motion philosophy called:

## EMOTIONAL CONTINUITY MOTION

Motion exists to:

- preserve orientation
- soften transitions
- reinforce momentum
- reduce emotional friction
- create calm continuity

**Motion is NOT decorative.**

---

## Core motion principles

### 1. Motion should never compete with thought

Motion should feel:

- restrained
- calm
- intentional
- emotionally stabilizing

**Avoid:**

- flashy transitions
- bounce-heavy animations
- twitchy movement
- attention-seeking motion

---

### 2. Every state change should feel explained

UI changes should **never** feel abrupt.

Use motion to:

- preserve spatial memory
- explain hierarchy shifts
- soften reordering
- reduce cognitive transition cost

---

### 3. Motion carries emotional tone

Meridian should bias toward:

- soft easing
- gentle acceleration
- warm settling
- graceful reflow

**Avoid** aggressive / snappy emotional energy.

---

## Completion interaction system

Task completion sequence:

1. Soft haptic
2. Momentum ring subtly advances
3. Card gently compresses
4. Warm fade / settle transition
5. Layout reflows smoothly

**Target emotional cadence:**  
~**180–240ms**

**Goal:**  
Quiet satisfaction and momentum.

**Never use:**

- confetti
- loud celebration
- arcade-style reward motion

---

## Swipe interaction philosophy

Swipes should feel:

- forgiving
- soft
- discoverable

### Swipe right — complete

**Visual:**

- warm progress tint
- subtle resistance
- gentle release satisfaction

### Swipe left — snooze / later

**Visual:**

- soft neutral tone
- calm delay energy
- non-punitive interaction feel

(Aligns with `focus-screen.md` gesture system.)

---

## Momentum ring animation

The momentum ring should:

- breathe subtly
- advance gently
- avoid constant motion
- feel emotionally grounding

**Avoid:**

- spinning behavior
- gamified energy
- attention-seeking animation

(See `focus-fallback-state.md` for initial “Getting Started” ring state.)

---

## Capture expansion motion

When Capture opens:

- rise fluidly from thumb zone
- integrate naturally with keyboard motion
- soften surrounding UI slightly
- instantly place cursor focus

**Goal:**  
Create psychological permission to unload thoughts.

(Aligns with `navigation-system.md`: Capture tab, 2-second capture goal.)

---

## AI suggestion motion

AI suggestions should:

- fade in contextually
- appear softly
- avoid surprise movement

AI motion should feel:

**ambient and respectful.**

(Aligns with `ai-intelligence.md` Level 1–2 surfacing and `continuity-states.md` AI loading behavior.)

---

## Recovery motion system

After inactivity:

- slightly slower transitions
- more breathing room
- softer pacing
- welcoming emotional tone

**Goal:**  
Reduce re-entry stress.

---

## Haptic philosophy

Haptics are **emotional punctuation**.

**Use:**

- subtle confirmations
- restrained completion feedback
- gentle momentum acknowledgment

**Avoid:**

- aggressive buzzing
- constant vibration
- notification-like tactile overload

---

## Motion timing system

### Micro feedback — 80–140ms

**Examples:**

- taps
- toggles
- tiny confirmations

### Standard UI motion — 180–260ms

**Examples:**

- cards
- sheets
- transitions
- reflows

### Emotional / recovery motion — 260–420ms

**Examples:**

- onboarding emotional transitions
- recovery states
- calming context shifts

---

## Reduced motion accessibility

When reduced motion is enabled:

- preserve continuity
- reduce travel distance
- prefer opacity and subtle scale
- maintain emotional calm

**Never** remove emotional feedback entirely.

---

## Platform variants

### iOS

- spring-based easing
- native sheet behavior
- fluid keyboard integration
- subtle blur continuity

### Android

- Material 3 motion curves
- edge-to-edge continuity
- restrained transform distances
- Android-native gesture rhythm

---

## Final UX standard

Motion should make Meridian feel **emotionally intelligent**, not merely animated.
