# Meridian — Focus screen specification

The default landing surface: calm prioritization that answers *what matters right now* in a people-aware way. Pair with `focus-fallback-state.md` (guided momentum when data is thin), `information-architecture.md`, `navigation-system.md`, and `design-language.md`.

---

## Meridian Focus screen philosophy

The Focus screen is **NOT:**

- a dashboard
- a productivity feed
- a task dump
- an administrative control center

The Focus screen **IS:**

A **calm prioritization surface** that restores clarity and momentum.

**Core emotional question:**

> “What actually matters right now?”

The Focus screen must answer that question in a **people-aware** way.

For Meridian’s users, time belongs to real life roles:

- self
- partner
- kids
- work
- community
- household

The screen should understand **whose commitment is whose** without requiring manual tagging every time.

---

## Emotional goal

Users should feel:

- calmer
- clearer
- less mentally fragmented
- directionally confident
- emotionally supported

The screen should **reduce pressure**, not amplify it.

---

## Focus screen structure

### 1. Adaptive greeting layer

Large calming typography.

**Examples:**

- “Good morning, Ryan.”
- “You’re in good shape today.”
- “A few things deserve your attention.”
- “Let’s make today lighter.”

**Rules:**

- emotionally intelligent
- warm
- non-robotic
- avoid repetitive phrasing
- subtle contextual awareness is allowed
- never feel invasive or creepy

---

### 2. Momentum ring — hero element

**Purpose:**  
Represent momentum and clarity, **NOT** productivity scoring.

**Visual characteristics:**

- soft partial ring
- warm gradients
- subtle motion
- elegant spacing
- emotionally grounding

**Content:**

- “Today”
- gentle completion state
- optional momentum phrase

**Examples:**

- “Steady”
- “In Motion”
- “Recovering”
- “Strong Start”

**Never use:**

- harsh percentages
- failure states
- aggressive scoring systems
- shame language

(See `focus-fallback-state.md` for initial / low-data ring behavior.)

---

### 3. Focus stack

**Maximum:**  
**3** primary items visible simultaneously.

**Purpose:**  
Protect users from overload.

**Possible item types:**

- tasks
- reminders
- schedule awareness
- family obligations
- health nudges
- financial deadlines
- work commitments
- community commitments

**Card requirements:**

- lightweight feel
- calm hierarchy
- quick actions
- soft urgency indicators
- easy thumb interaction

AI dynamically prioritizes order.

---

### 4. People-aware schedule awareness strip

This strip is **compact timeline awareness**, not a full calendar.

It should answer:

> “Who needs what, when?”

**Examples:**

- “Your board call at 3:00”
- “Emma’s soccer at 4:00”
- “Grace pickup at 5:15”
- “Crystal dinner plan at 6:30”
- “Work meeting in 45 min”
- “Free window after 7:00”

The strip must distinguish between:

- user commitments
- spouse / partner commitments
- child commitments
- household commitments
- work commitments
- community commitments

**Do NOT** require manual tagging as the default behavior.

#### People-aware intelligence rules

Meridian should infer commitment ownership from:

- event title text
- known family member names
- contact names
- calendar source
- shared calendars
- recurring event patterns
- event location
- prior user corrections
- natural language capture context

**Examples:**

- “Emma soccer practice” → infer Emma
- “Board call” → infer community role if connected to board context
- “Sales review” → infer work
- “Dentist Grace” → infer Grace
- “Dinner with Crystal” → infer partner / social context

**If ownership confidence is high:**  
Display the owner naturally.

**If confidence is medium:**  
Display the most likely owner but allow a subtle correction affordance.

**If confidence is low:**  
Use neutral language and avoid guessing.

| Confidence | Example |
|------------|---------|
| High | “Emma’s soccer at 4:00” |
| Medium | “Looks like Emma’s soccer at 4:00” |
| Low | “Soccer at 4:00” |

#### Correction interaction

Corrections must be **lightweight**.

Use a small contextual action:

> “Not Emma?”

On tap, open a compact bottom sheet:

- Me
- Partner
- Child / Family member
- Work
- Community
- Household
- Someone else

**After correction:**

- update this item
- learn pattern for future similar events
- do not make the user repeatedly correct the same type of commitment

**Never** force correction before showing the schedule.

#### Visual design for people awareness

Use subtle owner signals:

- tiny avatar initials
- soft role pill
- muted color accent
- icon only when useful

**Avoid:**

- loud color-coding
- crowded labels
- calendar-app density
- excessive metadata

The owner signal should help scanning **without** adding visual noise.

#### Schedule strip layout

The strip should show **2–4** upcoming commitments max.

Each item:

- owner or role
- event / action
- time proximity
- soft urgency state if needed

**Example card format:**

```
[initial/avatar] Emma soccer
4:00 PM
```

or:

```
Your board call
In 45 min
```

**No full calendar grid in Focus.**

#### Hidden time anxiety rule

**Purpose:**  
Reduce hidden time anxiety.

Users often feel stressed not because they’re busy, but because they lack **temporal clarity**.

The strip should make the next few commitments feel **manageable**.

---

### 5. Calm wins section

Lightweight emotional reinforcement.

**Examples:**

- “3 things already handled”
- “Health streak: 5 days”
- “You protected your evening this week”

**Tone:**

- encouraging
- grounded
- subtle

**Avoid:**

- loud gamification
- achievement overload
- pressure mechanics

---

### 6. Ambient capture entry

Persistent low-friction capture near thumb zone.

**Examples:**

- “What’s on your mind?”
- “Capture a thought…”

Capture should always feel **immediately accessible**.

(Aligns with `navigation-system.md`: Capture as primary tab; Focus may surface a lightweight entry without duplicating full Capture.)

---

### 7. End-of-screen recovery space

Do not abruptly terminate the screen.

Use breathing room and soft spacing to psychologically communicate:

> “You’re caught up enough.”

Avoid infinite-scroll emotional pressure.

---

## Dynamic modes

### Busy day mode

- reduce visible complexity
- simplify visuals
- prioritize sequence over quantity
- increase people-aware clarity

### Calm day mode

- more breathing room
- reflective insights
- softer pacing

### Recovery mode

After inactivity:

- remove guilt entirely
- gently restore momentum
- simplify restart paths

(Aligns with `design-language.md`: safe return after time away.)

---

## Interaction design

### Completion interaction

**Use:**

- subtle haptics
- elegant ring advancement
- smooth card settling
- soft motion continuity

**Avoid** loud celebratory effects.

### Gesture system

| Gesture | Action |
|---------|--------|
| Swipe right | complete |
| Swipe left | snooze / later |
| Long press | contextual actions |

Gestures must remain **discoverable and forgiving**.

---

## Platform variants

### iOS

- large title rhythm
- spring motion
- translucent layered surfaces
- native haptic feel
- native bottom sheet behavior

### Android

- Material 3 motion rhythm
- edge-to-edge layouts
- slightly denser vertical rhythm
- Android-native gesture handling
- Material bottom sheet behavior

---

## Final UX standard

If users feel **more overwhelmed** after opening Focus, the screen has failed.

If the schedule strip shows **time** but not the **people** attached to that time, it is incomplete.
