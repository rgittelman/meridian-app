# Meridian Design Language — North Star

**Established:** June 2026  
**Status:** LOCKED — standing rule for all future UI work  
**Reference image:** `Meridian_inspiration_styling_colors.png` (repo root)

> **How to use the reference image:**  
> Do not replicate screens literally. Extract and apply the visual philosophy.  
> Match the *feeling*, not the exact layout.  
> When uncertain: what would this screen feel like if it belonged in that image?

---

## Nine principles — the design application framework

When building or reviewing any screen, apply these in order:

### 1. Warm/cool state language
Every surface carries an emotional temperature. Warm (orange, amber, red) communicates
energy, urgency, time in motion. Cool (purple, violet, indigo) communicates calm intention,
active focus, deliberate action. Choose the temperature based on the emotional state
the screen should invoke — not based on brand consistency alone.

### 2. Hero → Context → Action hierarchy
Every screen has exactly one **hero element** — the thing that answers "what matters right
now." Below it sits **context** — the information that makes the hero meaningful. Below that
sits **action** — what the user can do about it.

Nothing at the hero level should compete with the hero. Context should support, not distract.
Actions should be unambiguous.

Do not build screens where everything is the same visual weight.

**This is the difference between a calendar app and a decision-making app.**
When the user opens Meridian, the first answer they get is "what matters most right now?"
— not "here is a list of events." Hero → Context → Action enforces that contract.

### 3. Screen subtitles
Every primary screen has a short, human-voice subtitle under its title.
Not a category label. Not a system description. A sentence that a person would say.

**Authoritative subtitle copy (locked):**

| Screen | Subtitle |
|---|---|
| Focus | "Stay present. Protect what matters today." |
| Plan | "See the shape of your week before it shapes you." |
| Life | "Your world at a glance. All the pieces that matter." |
| Capture | "Get it out of your head. We'll help organize it." |

These are not orientation labels — they are product voice. They tell the user not just
*what the screen is* but *why they should care*. Screen subtitles are not optional,
not decorative, and not marketing copy. They are the product talking to the person.

### 4. Rich iconography
Icons are not bullets. Domain icons (heart, briefcase, leaf, star) carry emotional meaning.
Action icons (ChevronRight, Pencil, X) communicate affordance. Status icons (bell, calendar,
check) communicate type and state. Use icons purposefully — each one should earn its place.

Quick-action grids, capture type indicators, and domain badges all use distinct, colored icons.
Monochrome icon fields read as utility apps. Meridian is not a utility app.

### 5. Layered surfaces
Depth is created by surface, not shadow. Three layers: base → surface → muted.
Cards float above the background by being slightly lighter. Inset content (notes, contained
text, secondary info) uses the muted layer, which is slightly darker than the card surface.

This is consistent in both light and dark modes. The relationship between layers
is always: background → elevated card → inset content. Never inverted.

### 6. Premium spacing
Whitespace is a design element, not wasted space. The reference image breathes.
Every section has room. Cards do not crowd each other. Touch targets are not cramped.

When in doubt, add spacing. The feeling to aim for is calm, not efficient.
Dense layouts read as anxiety. Breathing layouts read as confidence.

### 7. Strong primary actions
Every screen that requires a user decision has one obvious primary action.
It is visually heavier than everything else on screen through color, size, or both.
Secondary actions are visually quieter — ghost, muted, or simply absent.

A screen with three equally-prominent buttons has no primary button.
A screen with one clear CTA feels intentional.

### 8. Real data only
No fake metrics. No progress rings that measure nothing. No streak counters. No points.
Meridian earns the user's trust by showing what is actually true — their real calendar,
their real captured items, their real time distribution.

If a number appears on screen, it is a real number from real data.

**The inspiration image cheats.** Numbers like "67%", "87%", "Balanced", "On Track" in the
reference image are compositional props, not real outputs. Meridian must earn every number
it shows. If we cannot explain the source of a stat from real user data, we do not show it.
This is the standard that separates Meridian from the category.

### 9. Progressive disclosure
Information is revealed in layers. Never show everything at once.

Every screen has a natural depth sequence:
- **Hero** — the single most important thing on this screen right now
- **Summary** — the minimal supporting context that makes the hero meaningful
- **Details** — everything else, available on tap or scroll, never competing with the summary

This applies at every level: screens, cards, sheets, and inline rows. A card shows title +
time. A detail sheet shows the full event. A notes block is collapsed until tapped.

Progressive disclosure is why the app feels calm even when the user's week is packed.
Information density increases as the user asks for it — not by default.

---

## Core philosophy

---

## Reference apps

Apple Reminders · Apple Calendar · Apple Fitness · Things 3 · Linear Mobile · Craft

---

## Dark mode is the primary quality bar

The reference image is dark mode. Dark mode is the primary visual reference.
Light mode exists and must remain functional, but when there is tension between the two,
dark mode is the reference to protect.

---

## Surface system

Three distinct layers. Layers are distinguished by surface lightness alone — **no borders.**

| Layer | Dark approx | Light value | Usage |
|---|---|---|---|
| Base | `#0A0911` — deep indigo-black | `#EFE9E0` | Screen background |
| Surface | `#13121E` — dark indigo | `#F4EEE7` | Cards, sheets, elevated content |
| Muted | `#100F18` — deeper than surface | `#E9E3DA` | Inset blocks, notes, avatars, contained text |

**No card outlines.** `hairlineWidth` borders on content cards read as developer defaults.
Surface contrast is the separation signal.

---

## Color — emotional temperature split

This is the most important color decision in the system:

### Warm = energy state (Focus timer, urgency, momentum)
The Focus timer ring uses a **warm gradient: orange → amber → deep red.**
This is intentional. Warmth = present urgency, physical energy, time moving.
Use warm accent on anything that represents active effort, time pressure, or motivation.

### Cool = calm/action state (session active, primary actions, navigation)
The Focus Session ring (active state) uses a **cool purple → magenta gradient.**
Purple = intention, clarity, focus. The action color, not the urgency color.
Primary CTAs, active states, and the primary brand accent are cool purple/violet.

These two palettes coexist on the Focus screen and must never be confused.

### Domain accent colors — vivid jewel tones, never muted
On dark surfaces, muted accents disappear. Use full-saturation jewel tones.

| Domain | Hue |
|---|---|
| Focus / Primary | Purple-violet (`#6B4FFF` range) |
| Family / People | Warm purple / indigo |
| Work / Professional | Blue |
| Health / Energy | Teal-green |
| Personal | Gold / amber-orange |
| Capture / Voice | Yellow-gold — highest visibility CTA color |

### Provider colors (non-theme-adaptive — brand identity)
- Microsoft Teams: `#6264A7`
- Google Meet: `#1A73E8`

---

## Typography

Strong contrast between levels. Never two elements at equal visual weight on the same screen.

| Level | Usage | Style |
|---|---|---|
| Screen title | "Focus", "Plan", "Life", "Capture" | Large, heavy, `ink`, top of screen |
| Screen subtitle | Short tagline under every screen title | `body`, `inkSecondary`, soft |
| Hero number | Timer (45:00, 24:36), session count | Very large, `ink`, highest contrast on screen |
| Card title | Event name, capture title | `subhead`, medium weight, `ink` |
| Section label | "Up Next", "Today's Focus", "This Week" | `caption`, UPPERCASE, `letterSpacing: 0.8`, `inkTertiary` |
| Meta row | Duration · location · time · type | `footnote`, `inkGhost` |
| Insight text | "What's Driving Balance" body | `body`, `inkSecondary` |

**Screen subtitles are not optional.** Every main screen in the reference has a short
human-readable subtitle under the title. They are part of the brand voice.

---

## Spacing — 4px grid

| Context | Value |
|---|---|
| Between major sections | `spacing[5]` (20px) or `spacing[6]` (24px) |
| Between items in a section | `spacing[3]` (12px) |
| Inside cards | `spacing[4]` (16px) minimum |
| Screen horizontal padding | `spacing[5]` (20px) |

**Err toward more whitespace.** The reference image breathes. Dense layouts read as anxiety.

---

## Border radius

| Context | Value | Notes |
|---|---|---|
| Sheet tops | `radius['2xl']` = 32px | Apple-quality sheets |
| Primary CTA buttons | `radius.xl` = 26px | Near-pill, rounded and tactile |
| Feature cards (meeting, location, notes) | `radius.lg` = 20px | Soft, premium feel |
| Standard content cards | `radius.md` = 14px | |
| Domain grid cells, stats cards | `radius.md` = 14px | |
| Pills / badges / chips / tabs | `radius.full` = 9999 | Week strip selection, RSVP badges |
| Icon boxes | `radius.sm` = 10px | |

---

## Touch targets

- Minimum **44×44pt** for any interactive element (Apple HIG absolute minimum)
- Icon-only buttons: 44×44pt container even if icon is 18–20px
- Cards are full-tap areas — no sub-buttons inside tappable cards

---

## Icons

- Inline with text: ≥ 13px · Standalone or in rows: ≥ 16px · CTA icons: 18–20px
- `strokeWidth: 1.75` for content icons · `strokeWidth: 2.0` for action icons
- Capture type icons use domain colors: Note=purple, Task=green, Reminder=amber, Event=blue
- Brand SVG marks (Teams, Meet): primitives-only, no bezier paths at small sizes

---

## Screen-level patterns

### Every main screen
- Large title + short subtitle below — always present
- One dominant visual anchor per screen (timer ring, donut chart, capture list)
- Tab bar active icon has a glow effect in the active domain color

### Focus screen
- **Hero element:** large circular ring with warm gradient (orange/amber/red)
- "Focus Time" label + "45:00" hero number inside ring
- "▶ Start Focus" purple pill CTA below number
- Progress context: "2/3 sessions" with purple progress bar (real data, not fake gamification)
- "Up Next" section: domain-colored dot + event title + time/duration + ChevronRight
- Stats row: three numbers side-by-side (Total Focus hours, Sessions, On Track %) + sparkline

### Focus Session (active state)
- Ring changes from warm gradient to **cool purple/magenta glow** — the color shift signals transition from planning to active
- Timer number is even larger and more dominant ("24:36")
- Original goal shown smaller below ("45:00")
- Pause button: outlined circle, centered
- Session context rows below: label left, value/action right — "Deep Work · Change", "Session Goal →", "Focus Music ▶", "Distractions Blocked: N"

### Plan screen (list view)
- 5-day week strip — current day has filled purple pill/circle background
- "Today, [Date]" section header
- Time-coded event rows: time left-aligned, event title bold, duration + location as `footnote` subrow
- "＋ Add Time Block" ghost CTA (no fill, centered, `inkTertiary`)
- "Day Overview" card: donut chart with center percentage + completed/in-progress/remaining legend

### Plan screen (timeline view)
- Hour markers in left column (`inkTertiary`)
- Events as full colored blocks spanning their time range
- Each event block is domain-tinted — blue/purple, green, amber, red — not a uniform color
- Floating ＋ FAB bottom-right

### Life screen
- "What Matters Most" — 2×2 grid of domain cards (Family, Work, Health, Personal)
  - Each cell: domain icon (colored) + domain name + status line
  - Equal-weight grid, not a ranked list
- "Life Balance" multicolor donut — segments for each domain, "Balanced"/"Needs Work" in center, % legend
- "This Week" progress bars — rounded-end horizontal bars, domain-colored fill, label + time value

### Life detail
- Week/Month/Year selector as **pill tab group** (3 equally-sized pills in a row)
- Insight text under the chart ("Great balance! Keep protecting your personal time.")
- Sparkline for the selected period
- "Top Wins This Week" — icon + description rows (real wins from the data)
- "Areas to Watch" — amber warning + description

### Capture screen
- **Quick action row:** 4 equal-sized circular icon buttons in a horizontal row
  - Quick Note (purple), Task (green), Reminder (amber), Event (blue)
- Recent captures list — bold title, type+time subrow with matching type icon
- "＋ Voice Capture" — primary CTA, full-width-ish, purple/indigo filled, waveform icon

### Voice capture (active)
- "Listening…" as the dominant heading
- **Animated waveform** as the visual centerpiece — purple bars of varying heights
- Recording timer + "Speak now"
- Large purple circle stop button (square symbol inside)
- Helper text with example prompts at bottom

---

## Key component patterns

### Circular ring / timer
- The ring is the visual hero — large, ~40% screen width, centered
- Gradient fill on the ring track (not a flat color)
- Warm state (idle/ready): orange → amber → red
- Active state: purple → magenta
- Hero number inside ring: largest text on screen
- Supporting label above number (small, `inkGhost`)
- CTA below number

### Progress bars (Life / stats)
- Horizontal, full-width-ish
- Rounded ends (pill shape)
- Domain-colored fill
- Label on left, value on right
- Unfilled track: `surfaceMuted`

### Donut chart
- Multicolor segments, each domain's accent color
- Center text: assessment word ("Balanced") not a raw number
- Legend with colored dot + label + percentage, listed below or beside

### Stats row
- Three stats horizontally, equal spacing
- Large number in `ink`, small label below in `inkGhost`
- A sparkline can appear below the row

### Week strip (date selector)
- 5 days visible (Mon–Fri or rolling 5)
- Day abbreviation + date number
- Today/selected: filled purple pill background with white text
- Other days: `inkTertiary` text, no background

### Domain 2×2 grid (Life)
- Equal-height cells with `radius.md` cards
- Domain icon (colored) + domain name + status subtext
- No borders — surface contrast only

### Quick capture action row
- 4 equal circular icon buttons
- Icon label below each button
- Each button has a distinct domain/type color

### Session metadata rows
- Label: `inkSecondary` left-aligned
- Value or action: right-aligned, `ink` or `inkTertiary`
- ChevronRight for navigable rows
- Minimal height, clean

---

## Primary CTAs

- Filled · `radius.xl` (26px) · brand color or domain color background
- Icon + label · `paddingVertical: 18px` minimum · full-width or large
- One primary CTA per screen section — it should be visually unambiguous
- Color differentiates primary from secondary — not size alone
- "Voice Capture" CTA shows the value of a colored, prominent button: it draws the eye without demanding it

---

## Cards

- No top/right/bottom borders — override to `0` in overrides
- Domain accent left border: `borderLeftWidth: 2.5` in the domain's full-saturation color
- `GradientCard` is the standard base card across all screens
- Timeline event cards: domain-tinted fill background (not just a left border)

---

## Tab bar

- Icon-only, minimal
- Active icon has a **glow/highlight** in the domain accent color of that tab
- No labels visible in the active state (or very small)
- Dark background, blends with screen surface

---

## What to avoid

- `hairlineWidth` borders on content cards
- `radius.sm` (10px) on content cards — reads as a form input
- Muted/desaturated domain accents on dark surfaces — they vanish
- Dense layouts (`spacing[2]` = 8px between sections)
- Multiple equal-weight elements without a clear focal point
- Fake progress rings, streaks, or gamification metrics — real data only
- Platform-specific visual branches (one Meridian design language)
- Missing screen subtitles — they are part of the brand voice

---

## Platform policy — single design system

Android and iOS share one visual language.  
Permitted platform branches (functional only):
- Maps URL scheme: `geo:` (Android) · `maps://` (iOS)
- Future platform-specific gesture handling

No platform-specific style branches. One Meridian.
