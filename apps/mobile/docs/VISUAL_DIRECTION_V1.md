# Meridian Visual Direction V1

Compressed design system memory. Source of truth for visual intent.
Do not redesign from scratch — extend from this direction.

---

## Current Status

| Version | Status |
|---|---|
| V1.0 | Deprecated (warm beige/light palette — wrong direction) |
| V1.1 | Complete — deep navy dark palette, per-tab accents, gradient tokens. |
| V1.2 | Complete — shared component library (GradientCard, MetricCard, DomainBadge, StatusPill, GradientIcon, LifeBalanceChart, WeeklyActivityBar, CaptureActionGrid). |
| V1.3 | **Complete** — Life screen redesigned. Domain colors, LifeBalanceChart, WeeklyActivityBar, DomainBadge, StatusPill per card. |
| V1.4 | Next — Focus screen redesign. |
| V1.4–V1.7 | Focus, Plan, Capture, Settings — after Life is complete. |

**Codemaster ruling (2026-06-03):** Do not improve all four screens simultaneously. Get Life to a 9/10 first. One great screen establishes the visual language. Then replicate.

---

## Design Goals

Meridian is a **cinematic personal operating system**, not a productivity app.

**Intended feeling:**
- A well-designed room at night
- A calm cockpit
- An intelligent late-night companion
- Premium restraint with intentional atmosphere

**Emotional keywords:** Focused depth. Quiet authority. Warm intelligence. Immersive calm. Emotional presence.

**Not:**
- Wellness app minimalism
- Beige startup design
- Productivity pressure
- Generic dashboard aesthetics

**Approved inspirations:** Raycast, Linear, Superhuman, Vercel dashboard. Films: *Arrival*, *Her*, *Blade Runner 2049*.

---

## Color System

**Philosophy:** Deep neutral background — not pure black, a very dark warm navy. One global accent. Reserve glow for one element only (chat composer). Three surface levels.

### Surfaces
```
background:      #0D0B1A  (deep navy-black)
backgroundDeep:  #080710  (deepest — behind everything)
surface:         #13121E  (cards, panels)
surfaceElevated: #1A1928  (elevated cards, modals)
surfaceMuted:    #100F18  (recessed areas)
```

### Typography Tones
```
ink:          #F0EDF8  (near-white, primary text)
inkSecondary: #9B96B8  (secondary/supporting)
inkTertiary:  #6B6485  (labels, timestamps, metadata)
inkGhost:     #4E4A65  (ultra-dim chrome — nearly invisible)
```

### Global Accent
```
accent:      #7B6FE8  (periwinkle purple — CTA, primary actions)
accentSoft:  rgba(123, 111, 232, 0.14)
accentMuted: rgba(123, 111, 232, 0.08)
```

---

## Domain Colors (Consistent Across All Screens)

```
domainFamily:    #F97316  (warm orange)
domainWork:      #3B82F6  (steel blue)
domainHealth:    #10B981  (emerald)
domainPersonal:  #A78BFA  (soft violet)
domainCommunity: #F59E0B  (amber)
```

---

## Tab Accent Colors (Per-Tab Identity)

Each tab has a primary, secondary, glow, and two-stop gradient. Used for rings, active icons, and future gradient wrappers.

| Tab | Primary | Secondary | Gradient |
|---|---|---|---|
| **Focus** | `#F97316` (orange) | `#C97ECC` (mauve) | `#FB923C → #F59E0B` |
| **Plan** | `#7B6FE8` (periwinkle) | `#3B82F6` (blue) | `#7B6FE8 → #3B82F6` |
| **Life** | `#10B981` (emerald) | `#3B82F6` (blue) | `#10B981 → #34D399` |
| **Capture** | `#A07AE8` (purple) | `#F97316` (orange) | `#A07AE8 → #F97316` |

---

## Screen Background Gradients

Very subtle — dark base with tab-tinted bottom edge. Top-to-bottom.

```
Focus:   #0D0B1A → #170F1E
Plan:    #0D0B1A → #0F0D20
Life:    #0D0B1A → #0C1419
Capture: #0D0B1A → #15101F
```

---

## Typography Direction

- **One family:** System/SF Pro (or Inter/DM Sans substitute)
- **Greeting/hero:** Largest, softest — noticeably dominant
- **Section labels:** Small-caps, dim (`inkTertiary`), tight tracked
- **Data (times, numbers):** Tabular, slightly brighter than body text
- **Body:** Editorial rhythm — generous inside cards, tight between related items, clear air between sections
- **Rule:** Typography does 60% of hierarchy work. Not everything the same size/weight.

---

## Card Styling

- Three Z-axis levels: background → surface → surfaceElevated
- Cards sit *above* the canvas (subtle box-shadow, not borders)
- No border-heavy design — borders should nearly disappear
- Glass overlay gradient for elevated cards: `rgba(255,255,255,0.07) → rgba(255,255,255,0.025)`

---

## Progress Visuals

- **MomentumRing:** Ring fill uses per-tab gradient (Focus: orange→amber). SVG `LinearGradient` inline. Ring track `#1E1D2E`, ring glow at low opacity.
- **Engagement counts:** Day-scoped (reset on new local day). CalmWins shows today's handled items only.
- **No habit rings, no momentum percentages, no completion scores** — these are productivity pressure. Replaced by AI-written day summary sentence.

---

## Approved Visual References

- **Glow rule:** One glow only — the chat composer/capture input when active. Soft ambient bloom. No other elements glow. Restraint makes that one moment special.
- **Animation rule:** One subtle entrance — greeting card settles in on open (gentle land, not bounce). Not a glow show.
- **Today page hero:** Greeting card = undisputed anchor. Larger, warmer, slightly lit from within. Date + AI read of day + #1 focus. Nothing competes.
- **Chat:** AI messages = open, left-aligned, slightly dimmer (reading from a calm voice). User messages = contained pill, warm, right-aligned, slightly elevated. No chat bubbles on AI side.

---

## Screen Priorities

1. **Life screen** — First full redesign target (V1.3). Currently generic.
2. **Focus screen** — Greeting card hero established; ring present; brief card exists.
3. **Capture screen** — Glowing border on active input (the one glow moment).
4. **Plan screen** — Calendar/capture row styling updated.

---

## Components Planned

Build all V1.2 components before starting any screen redesign (V1.3+).

| Component | Phase | Status | Purpose |
|---|---|---|---|
| `GradientCard` | V1.2 | Not built | Base card with gradient border/fill — used across all screens |
| `MetricCard` | V1.2 | Not built | Colored metric with label, value, optional sparkline |
| `DomainBadge` | V1.2 | Not built | Colored pill/dot for family/work/health/personal/community |
| `LifeBalanceChart` | V1.2 | Not built | Donut chart showing domain balance — Life screen hero metric |
| `WeeklyActivityBar` | V1.2 | Not built | Bar chart showing weekly activity — Life screen supporting metric |
| `CaptureActionGrid` | V1.2 | Not built | 2×2 grid of colored quick-action buttons (Note/Task/Reminder/Event) |
| `StatusPill` | V1.2 | Not built | Small status indicator with color + label (e.g. "Strong", "Heavy") |
| `GradientBackground` | V1.2 | Not built | Screen-level subtle gradient — awaiting `expo-linear-gradient` |
| `GradientIcon` | V1.2 | Not built | Tab icon with per-tab gradient fill |
| `MomentumRing` | Done | SVG ring with per-tab gradient fill |  |
| `BriefCard` | Done | Focus screen; between greeting and ring |  |

---

## Per-Screen Visual Direction (Approved)

### Life (V1.3 — first target)
- Domain cards with full domain color identity: Family=purple, Work=blue, Health=green, Personal=amber
- Life balance donut (`LifeBalanceChart`)
- Weekly activity bars (`WeeklyActivityBar`)
- Status indicators, domain badges
- Goal: Meridian's showcase screen. Multiple layers of importance visible at a glance.

### Focus (V1.4)
- Soft ambient gradient behind ring
- "Today Status" card with icon and AI-written sentence (e.g. "Strong — 8 things handled today")
- Today's top commitment card with domain icon
- Ring remains; surround it with context, not emptiness.

### Plan (V1.5)
- Domain color coding on every event row: Family=purple dot, Work=blue, Health=green, Personal=amber
- Currently all events are visually identical — this is a high-ROI, low-effort change.

### Capture (V1.6)
- Remove debug cards from visible surface (production gate)
- Quick action grid as primary entry (`CaptureActionGrid`): Note / Task / Reminder / Event
- Colored circular icons per action type
- Goal: intentional, not a developer tool.

### Settings (V1.7)
- Information architecture cleanup
- Visual consistency with rest of app
