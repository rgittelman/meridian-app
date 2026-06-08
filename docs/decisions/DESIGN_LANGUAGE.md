# Meridian Design Language — North Star

**Established:** June 2026  
**Status:** LOCKED — standing rule for all future UI work  
**Reference image:** `Meridian_inspiration_styling_colors.png` (repo root)

---

## Core philosophy

Meridian is a premium consumer app. It should feel calm, clear, and capable — not like a
developer tool or an enterprise product. Every visual decision should serve emotional clarity.

**No fake metrics. No artificial gamification. Real data only.**

When design decisions are ambiguous, prefer the direction shown in the reference image.

---

## Reference apps

Apple Reminders · Apple Calendar · Things 3 · Linear Mobile · Craft

---

## Dark mode is the primary quality bar

The reference image is dark mode. Dark mode is the primary visual reference.
Light mode exists and must remain functional, but when there is tension, protect dark first.

---

## Surface system — no borders between layers

Three layers, distinguished by lightness alone:

| Layer | Dark value | Light value | Usage |
|---|---|---|---|
| Base | `#0A0A12` range | `#EFE9E0` | Screen background |
| Surface | `#13121E` | `#F4EEE7` | Cards, sheets |
| Muted | `#100F18` | `#E9E3DA` | Inset blocks, notes, avatars |

**No card borders.** Surface contrast is the separation signal. `hairlineWidth` borders
on cards read as developer defaults, not product polish.

---

## Color palette

### Text — four levels
| Token | Usage |
|---|---|
| `ink` | Primary — titles, values, active labels |
| `inkSecondary` | Supporting — descriptions, subtitles |
| `inkTertiary` | Structural — section headers, timestamps |
| `inkGhost` | De-emphasized — metadata, placeholders |

### Domain accents — vivid jewel tones on dark, not muted
Saturated accent colors are required on dark surfaces. Muted/desaturated accents disappear.

| Domain | Hue reference |
|---|---|
| Focus / Primary | Purple-violet |
| Health / Energy | Teal-green |
| Finance / Work | Blue |
| People / Relationships | Warm amber |
| Capture / Voice | Yellow-gold (high-visibility CTA) |

### Provider colors (non-adaptive — brand identity)
- Microsoft Teams: `#6264A7`
- Google Meet: `#1A73E8`

---

## Typography

Strong contrast between levels. Never two elements at equal weight on the same screen.

| Level | Token | Style |
|---|---|---|
| Hero | Display | Large, heavy, `ink` — timers, screen headings |
| Title | Subhead/Title | Medium weight — card titles, sheet titles |
| Section | Caption | UPPERCASE · `letterSpacing: 0.8` · `inkTertiary` |
| Body | Body | `inkSecondary` |
| Meta | Footnote | `inkGhost` |

---

## Spacing — 4px grid

- Between sections: `spacing[5]` (20px) or `spacing[6]` (24px)
- Within sections: `spacing[3]` (12px)  
- Inside cards: `spacing[4]` (16px) minimum padding

**Err toward more whitespace.** The reference image breathes. Dense layouts betray the calm.

---

## Border radius

| Context | Value |
|---|---|
| Sheet tops | `radius['2xl']` = 32px |
| Feature cards (meeting, location, notes) | `radius.lg` = 20px |
| Standard cards | `radius.md` = 14px |
| Primary CTAs | `radius.xl` = 26px |
| Pills / badges / chips | `radius.full` = 9999 |
| Icon boxes | `radius.sm` = 10px |

---

## Touch targets

- Minimum **44×44pt** for any interactive element (Apple HIG)
- Icon-only buttons must hit 44×44 even if the visible icon is smaller
- Cards are full-tap areas — no sub-buttons inside tappable cards

---

## Icons

- Inline with text: ≥ 13px · Standalone: ≥ 16px · Inside action buttons: 18–20px
- Content icons: `strokeWidth: 1.75` · Action/CTA icons: `strokeWidth: 2.0`
- Brand SVG components (Teams, Meet): use primitives only at small sizes — no bezier paths

---

## Primary CTAs

- Filled · `radius.xl` · brand color background
- Icon + label + trailing `ChevronRight`
- `paddingVertical: 18px` minimum
- Color differentiates primary from secondary — not just size alone

---

## Cards

- No top/right/bottom borders — override to `0` in card style overrides
- Domain accent: `borderLeftWidth: 2.5` in the domain's full-saturation accent color
- `GradientCard` is the standard base card across all screens

---

## What to avoid

- `hairlineWidth` borders on cards
- `radius.sm` (10px) on content cards — reads as a form input
- Desaturated domain accent colors on dark surfaces
- Dense layouts (`spacing[2]` between sections)
- Fake metrics, streaks, gamification
- Multiple equal-weight elements without a clear focal point
- Platform-specific visual branches

---

## Platform policy — single design system

Android and iOS share one visual language.  
Permitted platform branches (functional only):
- Maps URL: `geo:` (Android) · `maps://` (iOS)
- Future platform-specific gesture handling

No platform-specific style branches. One Meridian.
