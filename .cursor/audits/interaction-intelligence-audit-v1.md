# Meridian Interaction Intelligence Audit v1

**Date:** 2026-05-28  
**Scope:** Adaptive Focus Orchestration v1 + Focus Card Swipe Gesture System v1  
**Method:** Implementation review against product constitution, interaction specs, and inferred real-device behavior (Expo RN, iOS/Android/Web). No redesign proposed — refinement and trust gaps only.  
**App path audited:** `/apps/mobile`

---

## Executive Summary

Meridian’s interaction layer is **directionally correct**: swipe affordances are warm and restrained, snooze requires an explicit timing choice, completion has a soft undo window, and orchestration compresses the stack under pressure without exposing scores. The emotional *intent* reads clearly in code.

Under a **9PM tired parent** lens, several gaps reduce psychological safety: **visible Done/Later actions are missing**, the **undo toast likely sits under the tab bar**, **snooze does not wire into resurfacing deferrals or timed return**, **state does not survive app restart**, and **breathing-room hints never appear on cards**. Orchestration can feel mechanical because overload detection does not feed back into resurfacing scoring, and pacing logic has a known financial-signal bug.

**Verdict:** Completion trends toward **relief with recoverability**, not cliff-edge deletion — but trust is **not yet fully earned** on device until toast placement, non-gesture paths, persistence, and snooze↔resurfacing integration are tightened.

**Overall emotional safety grade:** B− (architecture B+, on-device polish C+ until validated on hardware)

---

## Audit Method

| Layer | What was evaluated |
|-------|-------------------|
| Gesture physics | `SwipeableFocusCard.tsx` — thresholds, resistance, velocity assist, haptics |
| Completion trust | `focusStore.ts`, `CompletionToast.tsx`, `FocusScreen.tsx` |
| Snooze safety | `SnoozeSheet.tsx`, snooze flow vs resurfacing cooldown |
| Orchestration | `detectOverload.ts`, `paceItems.ts`, `generateRecoveryMessage.ts`, `useOrchestration.ts` |
| Resurfacing | `useResurfacingItems.ts`, `scoreResurfacing.ts`, cooldown/defer stores |
| Momentum | `MomentumRing.tsx` + `focusStore.momentumProgress` |
| Accessibility & ergonomics | `FocusCard.tsx`, theme tokens, layout insets, reduced motion |
| Tone | Copy in sheet, toast, insights, recovery messages |

**Note:** This audit did not include a formal on-device session recording. Findings marked **VERIFY ON DEVICE** should be confirmed on iPhone + Android in low light, one-handed, with system reduced motion on/off.

---

## 1. Swipe Completion Emotional Feel

### Emotional wins

- **Right-swipe affordance** uses warm `actionCompleteBg` / `actionCompleteFg` with calm “Done” + check — relieving, not celebratory.
- **Resistance curve** (`SOFT_LIMIT` 60px + `RESISTANCE` 0.72) gives finger-following weight; partial swipes preview without committing.
- **Release-before-threshold** returns card with `cardReturn` spring — forgiving cancellation.
- **Completion is soft-delete**: item enters `completedIds` only after exit animation callback; not instant DB wipe.
- **3-second undo** with copy “Completed · Undo” — emotionally quiet, non-modal.
- **Undo reverses momentum** (+0.04 / −0.04) — ring participation without gamification.
- **No confetti, no achievement copy** — aligned with constitution.

### Interaction friction & trust issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Undo toast placement vs tab bar | **High** | `CompletionToast` uses `bottom: spacing[6]` (24px). Tab bar is `tabBarHeight` 62 + `tabBarBottomInset` 8 + safe area. Toast is likely **obscured or clipped** behind the floating tab bar. **VERIFY ON DEVICE.** Undo discoverability fails if users cannot see it. |
| Success haptic weight | **Medium** | `NotificationFeedbackType.Success` on complete may read as “achievement” on iOS vs spec’s “light impact.” Consider `ImpactFeedbackStyle.Light` only. |
| Velocity-assist accidental complete | **Medium** | `VELOCITY_ASSIST` 700 px/s can commit below visual threshold on a quick flick while scrolling. **VERIFY ON DEVICE** with distracted thumb. |
| Threshold vs spec | **Low** | Commit at 96px ≈ **27%** of ~350px card width — *more* forgiving than spec’s 35–45% (easier to commit, higher accident risk). |
| Reduced-motion complete path | **Medium** | With reduced motion, card fades opacity (min 0.6) but `onEnd` still runs full commit + exit spring on `translateX`. Visual “exhale” is weak; completion may feel abrupt. **VERIFY ON DEVICE.** |
| Card vanishes before user reads toast | **Low–Medium** | Stack reflow (`LinearTransition`) removes card immediately when store updates post-animation. Fine for relief; some users may not connect toast to the card that left. |
| Second completion replaces undo window | **High** | `completeItem` replaces `pendingUndo` without undoing prior item. Completing card B **silently commits** card A. Violates “forgiving mistakes” under rapid swiping. |

### Does completion feel like relief or irreversible action?

**Mostly relief**, architecturally — soft completion, undo path, warm affordance.  
**Risk of irreversible *feeling*** when: toast is hidden, user swipes twice quickly, or reduced-motion feedback is thin.

### Flags (per brief)

- ~~Anxiety-producing behavior~~ — partial: hidden undo, double-complete
- ~~Abrupt removal~~ — moderate; animation helps, stack reflow is fast
- ~~Overly fast dismissal~~ — exit spring is reasonable; velocity assist may shorten perceived deliberation
- ~~Loud feedback~~ — success notification haptic borderline
- **Insufficient undo clarity** — **yes**, if toast under tab bar; no item title in toast (“Completed” only)

---

## 2. Snooze Emotional Safety

### Emotional wins

- **Left swipe does not snooze immediately** — opens sheet after snap-back; strategic, not avoidant.
- **Header copy** “Hold onto this for now?” — warm, non-judgmental.
- **Three options only** — not overwhelming; labels avoid “postpone/delay.”
- **Dismiss = safe** — backdrop tap / drag dismiss returns to unchanged stack (item not in `snoozedItems` until selection).
- **Neutral snooze affordance** — `actionSnoozeBg`, “Later” + clock; no warning red.
- **Sheet theming** — `sheetBg`, `sheetOptionText` adapt light/dark.

### Interaction friction & trust issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Snooze not wired to `deferItem` | **High** | `resurfacingStore.deferItem` exists but **never called** from Focus flow. Snooze only hides via `focusStore.snoozedItems`. Cooldown/defer intelligence unused. |
| `SNOOZE_HOURS` unused | **High** | No timer or resurfacing logic to bring items back after “Later today” / etc. Snoozed = hidden until manual `unsnoozeItem` (no UI). Feels like disappearance, not “held.” |
| No post-snooze confirmation | **Medium** | Item vanishes silently after selection. User may wonder if gesture “worked.” |
| No unsnooze UI | **High** | `unsnoozeItem` in store but no surface to reverse snooze — trust gap for mistakes. |
| Left-swipe accidental sheet | **Low–Medium** | Same 96px threshold; sheet is dismissible (safer than complete). Still interrupts tired users. |
| Modal backdrop 42% black | **Low** | Acceptable; slightly heavy at night — **VERIFY ON DEVICE** in dark mode. |

### Does snoozing feel strategic and safe?

**Copy and sheet: yes.**  
**System behavior: partially** — snooze is session-local hide, not intelligent “hold and return.”

### Flags

- ~~Guilt energy~~ — copy passes
- ~~Confusing timing choices~~ — pass (3 clear options)
- ~~Overwhelming options~~ — pass
- **Abrupt deprioritization** — **yes** after select (no feedback, no scheduled return)

---

## 3. Focus Orchestration Quality

### Emotional wins

- **Overload hidden from UI** — `detectOverload` returns `LOW | MEDIUM | HIGH` only; no stress scores.
- **Compression caps** — HIGH: 3 cards, MEDIUM: 4, LOW: 5 — aligns with “not drowning.”
- **Pacing intent** — `paceItems` avoids consecutive `warm` / `now` / `overdue` stacking when a lighter item exists.
- **Recovery messages** — rare, grounded, evening-aware; good tone in `generateRecoveryMessage.ts`.
- **Resurfacing pipeline** — timing windows, cooldown suppression (30 min hard suppress), group bonus — sophisticated underneath.

### Orchestration issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Overload not fed into resurfacing | **High** | `useResurfacingItems()` called with default `overloadState: 'MEDIUM'` always. `useOrchestration` runs *after* resurfacing. Orchestration detects pressure but **does not change** what gets resurfaced or how priority scores. Feels like reorder-only. |
| `financialPressure` detection bug | **Medium** | `detectOverload` uses `visualUrgency === 'warm'` for financial pressure — same signal as emotional stacking. Financial clustering not truly detected. |
| `paceItems` interleave fragility | **Medium** | Loop + `remaining.indexOf` + `result.includes` — edge cases may still stack heavy items or skip buffers. Needs scenario tests. |
| Recovery-aware sequencing limited | **Medium** | No explicit “late night → lighter tasks first” in `paceItems`; only compression + heavy/light interleave. Hour-aware sequencing lives in resurfacing timing, not pacing. |
| Breathing room invisible on cards | **High** | `reappearanceHint` computed (“You have breathing room for this.”) but **not passed** to `FocusCard` / `FocusStack`. User cannot see breathing-room intelligence. |
| Insight hidden from a11y | **Medium** | Stack insight uses `accessibilityElementsHidden` — screen reader users miss ambient context. |
| Mock fallback with gestures on | **Medium** | Empty captures → `MOCK_FOCUS_SCENARIO` with swipe enabled. Demo-friendly; confusing if user believes mock items are theirs. |
| Resurfacing insight vs recovery | **Low** | Recovery correctly overrides resurfacing insight under HIGH overload — good. |

### Does Meridian understand pressure or rearrange mechanically?

**Understands pressure in copy and card count** — compression + recovery messages help.  
**Mechanical undertone** because: resurfacing doesn’t receive overload state, hints aren’t surfaced, snooze doesn’t affect defer cooldown, and pacing can’t fix what wasn’t scored for the moment.

### Flags

- **Emotionally heavy clustering** — possible when interleave finds no light item
- **Poor sequencing** — rare but possible in `paceItems` edge cases
- **Timing insensitivity** — partial; timing in resurfacing, not fully in pacing
- **Resurfacing repetition** — mitigated by cooldowns; defer not incremented on snooze
- **Overcompression** — possible on HIGH with only 3 cards if all are `warm`

---

## 4. Momentum Ring Integration

### Emotional wins

- Warm gradient arc, subtle atmosphere circle, `ringGlow` halo — **visually grounding**, not scoreboard-like.
- Label derives from progress (`Steady`, `Building`, etc.) — human-readable.
- Progress tied to completion (+0.04) and undo (−0.04) — meaningful coupling.

### Issues

| Issue | Severity | Detail |
|-------|----------|--------|
| No animated progress transition | **Medium** | `dashOffset` updates instantly in `useMemo` — ring jumps rather than “atmospheric” drift. |
| Delta too subtle to perceive | **Medium** | 4% per completion — ~8–9 swipes to max. Good anti-gamification; weak **felt** feedback. **VERIFY ON DEVICE.** |
| Still somewhat decorative | **Low–Medium** | Ring doesn’t explain *why* progress moved; no micro-copy on change. User may not link swipe → ring. |
| `CalmWins` mismatch | **Medium** | Shows `count={3}` when `completedIds.length === 0` — **dishonest calm** undermines trust next to honest orchestration. |

### Does the ring feel stabilizing or decorative?

**Visually stabilizing; behaviorally still mostly decorative** until progress motion and honest wins count align.

---

## 5. Interaction Comfort

### Strengths

- Horizontal pan `activeOffsetX([-8, 8])` + `failOffsetY([-12, 12])` — reasonable scroll vs swipe separation.
- Theme tokens for swipe/sheet/toast — light/dark parity in code.
- `minHeight: 52` snooze options — thumb-friendly targets.
- `GestureHandlerRootView` at app root — gestures enabled correctly.

### Physical comfort findings

| Issue | Severity | Detail |
|-------|----------|--------|
| **No visible Done / Later buttons** | **Critical** | Spec: “Gestures accelerate actions. They do not gate them.” `FocusCard` has no action row; only swipe + VoiceOver/custom accessibility actions. One-handed tired users who don’t discover swipe are **blocked**. |
| Scroll + swipe competition | **Medium** | Focus screen is scrollable; vertical scroll near card edge may fight horizontal pan. **VERIFY ON DEVICE.** |
| Toast tap target near tab bar | **High** | Undo may be hard to reach if overlapping tab/Capture FAB zone. |
| Repeated swiping fatigue | **Low** | Resistance helps; no rubber-band chaos. |
| Web / Expo Go | **Medium** | Haptics no-op on web; gestures may feel flatter. Not representative of native emotional target. |

### Flags

- **Hard-to-reach actions** — undo toast placement; no on-card buttons
- **Gesture inconsistency** — complete exits card; snooze snaps back (correct but asymmetric — learnable)
- **Accidental triggers** — velocity assist on complete
- **Overly delicate interactions** — not delicate; threshold may be *too* easy

---

## 6. Emotional Tone Consistency

### Consistent / calm

- Dark: warm espresso surfaces; light: ivory/cream — same soul, different light (tokens present for swipe/sheet/toast).
- Snooze sheet copy — low-pressure.
- Recovery + resurfacing insights — observational, not motivational dashboards.
- Toast: “Completed” not “Great job!”

### Tone risks

| Issue | Severity | Detail |
|-------|----------|--------|
| `CalmWins` fake default | **High** | “3 things already handled” when none completed — productivity-theater residue. |
| Recovery line “from the outside” | **Low** | `general_high` message can feel slightly therapeutic / third-person — monitor user reaction. |
| Insight `accessibilityElementsHidden` | **Medium** | Calm for sighted users; excludes blind users from same intelligence. |
| Evening greeting hardcoded | **Low** | `timeOfDay="evening"` always — minor tonal drift if opened morning. |

### Same calm intelligence everywhere?

**Visually yes; behaviorally uneven** (wins count, hidden hints, mock data).

---

## 7. Recovery Trust

### What works

- Undo within 3s restores card to stack + momentum.
- Snooze requires explicit timing — no swipe-only permanent snooze.
- Completion does not delete capture store entries (only local `completedIds` filter).

### Trust breaks

| Issue | Severity | Detail |
|-------|----------|--------|
| No persistence | **Critical** | `focusStore` + `resurfacingStore` are memory-only. **App restart** resets completions, snoozes, cooldowns, momentum. User cannot trust “Meridian held it.” |
| Single undo slot | **High** | Only latest completion undoable; prior completion auto-committed on next swipe. |
| Order not restored on undo | **Medium** | Re-insertion goes through `paceItems` again — card may return in different position. |
| Snooze irreversible in UI | **High** | No “bring back” for snoozed items. |
| Invisible state changes | **Medium** | No subtle confirmation after snooze; ring moves without explanation. |
| `commitCompletion` is UI-only | **Low** | Item stays in `completedIds`; capture `status` not updated to `done` — reopen Capture may still show item as active. Cross-surface trust gap. |

### Psychological trust after mistakes?

**In-session: moderate-to-good** if undo toast visible.  
**Across sessions: poor** until persistence + snooze return + capture status sync.

---

## 8. 9PM Tired Parent Test

**Persona:** Exhausted adult, distracted, one hand, low light, low bandwidth.

| Question | Assessment |
|----------|------------|
| Can I complete without thinking? | Swipe-right works if discovered; **no visible Done** is a blocker. |
| Will I panic if I swipe wrong? | Complete: undo *if* toast seen. Snooze: sheet dismissible — **safer**. |
| Does the stack feel like “what matters now”? | Yes when captures exist and compression runs; mock data otherwise. |
| Does the screen add decisions? | Snooze sheet adds 3 choices — acceptable; sheet interrupt may feel like one more thing. |
| Low light? | Dark tokens warm; toast dark-on-dark placement risk; sheet readable. |
| One-handed? | Swipe OK; undo tap may conflict with tab bar zone. |

### Final question: Does Meridian reduce mental tension or add more?

**Reduces tension when:** stack is short, swipe is known, undo is visible, copy stays quiet.  
**Adds tension when:** user doesn’t see undo, snoozed items feel “lost,” fake wins count erodes honesty, mock items appear real, or app restart erases actions.

**Net for v1:** Slight **net reduction** in ideal path; **near-neutral to slight addition** in common failure paths until polish fixes land.

---

## Cross-Cutting: Integration Gaps (Not UI Redesign)

These are wiring issues, not new systems:

```
useResurfacingItems (overloadState = MEDIUM fixed)
        ↓
useOrchestration (detectOverload → paceItems)
        ↓
FocusScreen filters completed/snoozed
        ↓
SwipeableFocusCard

Missing links:
  • snoozeItem → deferItem(cooldown)
  • snooze timing → timed unsnooze / resurfacing eligibility
  • orchestration.overloadState → useResurfacingItems({ overloadState })
  • reappearanceHint → FocusCard subtitle
  • completeItem → captureStore status + persistence
  • CompletionToast bottom inset → tabBarHeight + safeArea
  • FocusCard → visible Done / Later affordances
```

---

## Polish Recommendations (Before Deeper AI Expansion)

Prioritized **refinement only** — no new intelligence surfaces.

### P0 — Trust & safety (do first)

1. **Raise undo toast above tab bar** — `bottom: tabBarHeight + tabBarBottomInset + insets.bottom + spacing[4]`.
2. **Add visible Done / Later on `FocusCard`** (or slim action row) — same handlers as swipe; minimum 44pt targets.
3. **Wire `snoozeItem` → `deferItem`** in resurfacing store.
4. **Persist `focusStore` + resurfacing cooldowns** (AsyncStorage or equivalent) — session survival.
5. **Fix `CalmWins`** — show `0` or hide section when `completedIds.length === 0`; never fake `3`.
6. **Second-complete behavior** — queue undo or extend window; do not silently commit prior undo.

### P1 — Felt intelligence

7. **Pass `overloadState` from orchestration into resurfacing** (may require two-pass or shared memo — small architectural stitch).
8. **Surface `reappearanceHint` on card** — footnote under meta, `inkGhost`, one line max.
9. **Implement snooze return** using `SNOOZE_HOURS` + filter in `useResurfacingItems` or orchestration.
10. **Animate momentum ring** progress with `withTiming` (~400ms) on `progress` change.
11. **Toast shows item title** — “Completed · [short title] · Undo” (truncated).

### P2 — Interaction polish

12. **Soften complete haptic** to light impact only.
13. **Raise commit threshold** toward 40% card width OR reduce velocity assist — **VERIFY ON DEVICE** first.
14. **Reduced motion:** on commit, fade card out without large `translateX` exit.
15. **Snooze confirmation** — single-line calm toast: “Held for tomorrow morning.”
16. **Unsnooze entry** — long-press card in Capture or “Held items” minimal list (future slice; even one undo path helps).
17. **Fix `financialPressure` in `detectOverload`** — use `bridgeLifeObject` / `isFinancial` not `warm` urgency.

### P3 — Accessibility & tone

18. **Remove `accessibilityElementsHidden` from insight** — use `accessibilityRole="text"` calm announcement.
19. **Include completed item title in undo a11y label** (already partially there).
20. **Dynamic greeting from hour** — small hook, big tonal fit.

---

## Emotional Wins (Preserve These)

- Warm swipe affordances and token-driven light/dark parity
- Snooze = sheet + explicit timing (no swipe-only deferral)
- Soft completion + undo window concept
- Overload compression without metrics
- Recovery copy restraint
- Cooldown anti-repetition architecture (when wired to defer)
- Calm stack reflow animation
- “Hold onto this for now?” snooze framing

---

## What Not To Do Yet

- New AI orchestration surfaces or chat
- Stress scores, badges, streaks
- More snooze options or custom datetime pickers
- Full Focus screen redesign
- Gamified momentum or confetti
- Exposing resurfacing scores or “why this order” debug UI to users

---

## Device Verification Checklist

Before calling v1 “emotionally safe on device,” run:

- [ ] Complete swipe → toast fully visible above tab bar (iPhone SE + Pro Max)
- [ ] Undo within 3s restores card at sensible position
- [ ] Double-swipe two cards — confirm undo behavior acceptable
- [ ] Left swipe → dismiss sheet → card unchanged
- [ ] Left swipe → select timing → item gone + optional confirmation
- [ ] Kill app → reopen → state behavior documented (expected: reset until P0-4)
- [ ] Reduced motion on — complete/snooze still comprehensible
- [ ] Dark mode 9PM, one thumb, walking
- [ ] VoiceOver: Complete / Snooze actions without swipe
- [ ] Android gesture nav edge conflicts

---

## Sign-Off

| Criterion | Status |
|-----------|--------|
| Swipe completion → relief | **Partial pass** |
| Snooze → strategic & safe | **Copy pass / system partial** |
| Orchestration → understands pressure | **Partial pass** |
| Momentum ring → stabilizing | **Visual pass / behavioral partial** |
| Interaction comfort | **Fail** (no visible Done/Later; toast placement) |
| Tone consistency | **Partial pass** (CalmWins honesty) |
| Recovery trust | **In-session partial / cross-session fail** |
| 9PM tired parent | **Conditional pass** |

**Meridian is not yet emotionally safer the more someone interacts with it** — but it is **close**. The architecture supports the constitution; the next pass should be **trust polish and wiring**, not new intelligence.

---

*End of audit v1*
