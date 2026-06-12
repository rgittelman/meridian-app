# Household Discovery Direction V1

**Status:** Strategic design exercise — not approved for implementation  
**Created:** 2026-06-11  
**Type:** Philosophy, trust model, and discovery architecture exploration

---

## Purpose

This document explores how Meridian should **learn a household over time** — without long setup forms, without assuming relationships Meridian has not earned, and without becoming something Meridian is not.

**Core principles:**

> Meridian should discover more than it asks.

> **Discover first, confirm second.**

This is a **Meridian design principle** — not onboarding guidance alone. It governs how Meridian learns anything about a household: calendar patterns, people, activities, relationships, and financial rhythms. Meridian observes and forms candidates first; it asks before claiming; it acts only on what the user has confirmed.

The ideal onboarding experience is not *"Tell Meridian everything."*  
The ideal onboarding experience is *"Meridian gradually understands your household."*

**Companion documents:**

| Document | Relationship |
|---|---|
| `CURRENT_STATE_2026_06_11.md` | Today's household model is developer-seeded (`householdContext.ts`) — not user-discovered |
| `ENGAGEMENT_OBSERVATIONS_V1.md` | Observations require household understanding to feel magical |
| `VISUAL_LANGUAGE_EXTRACTION_V1.md` | Trust and interpretation must feel earned, not assumed |
| `ARCHITECTURE_DECISIONS.md` | Earn-the-right-to-ask; anticipation over reminders |

**Explicit exclusions from this document:**

- No code
- No onboarding screen designs
- No schemas or database structures
- No implementation plans
- No roadmap commitments
- No feature promises

---

## The Problem Today

Meridian's intelligence works for the founding household because critical context is **pre-loaded**:

- Named household members (parents and four children)
- Child sports profiles and league tokens
- School grade mappings
- Home location (when user sets it)
- Calendar, venue, traffic, and prep pipelines

A new user arrives with **none of this**. Meridian can still:

- Read calendar events
- Parse captures
- Generate leave alerts for household-relevant events (by title heuristics)
- Show domain-colored Plan rows

But Meridian cannot reliably:

- Attribute "Grace's volleyball" to Grace
- Match 6th-grade school events to the right child
- Distinguish sibling sports on the same day
- Connect captures to the right family commitment
- Deliver Tier A observations (`ENGAGEMENT_OBSERVATIONS_V1.md`)

**The strategic question:** How does Meridian become intelligent **without** a long setup process — and **without** guessing relationships it does not know?

---

## 1. Household Discovery Philosophy

### Guiding maxim

**Discover first. Confirm second. Act only on what is earned.**

Meridian is a witness that builds a model through repeated evidence — not an interviewer that demands a household census on day one.

### What Meridian should infer

Inference is appropriate when evidence is **repeated, low-stakes, and reversible**:

| Signal type | Example inference | Confidence threshold |
|---|---|---|
| **Name frequency** | "Grace" appears in 8+ events over 3 weeks | Medium — candidate household member |
| **Calendar source** | TeamSnap calendar titled "Quinn Rangers" | Medium — sports context for a name token |
| **Recurrence** | Same title every Tuesday 5pm for 6 weeks | High — recurring activity pattern |
| **Grade tokens** | "6th Grade Concert" on school-sourced calendar | Medium — grade signal, not child assignment |
| **Co-occurrence** | Two names always on same family-domain events | Low–medium — possible sibling or co-parent |
| **Location repetition** | Same rink address weekly | High — activity venue pattern |
| **Capture + event overlap** | Capture mentions "volleyball" near Grace event | Medium — relationship candidate (existing pipeline) |
| **Time-of-day rhythm** | Work events cluster 8am–5pm weekdays | High — work pattern (user's own schedule) |

Inference produces **candidates** with confidence levels — never final household truth.

### What Meridian should ask

Ask when inference would **change behavior** or **surface copy with a name attached**:

| Trigger | Ask pattern | Timing |
|---|---|---|
| Name crosses frequency threshold | "Grace appears often on your calendar. Is Grace part of your household?" | After 2–3 weeks of evidence, or before first named observation |
| Before child attribution in observation | Confirm person → child role before "Grace's practice" copy | Before Tier A/B observation uses possessive |
| Home location needed for traffic | "Set home to get smarter leave timing" | When leave alert value is demonstrable — not day one |
| Calendar source ambiguous | "Is this calendar for school, sports, or work?" | When source classification affects relevance |
| Two adults on family events | "Is Crystal usually part of family logistics?" | Low frequency — only if coordination copy would benefit |
| Financial rhythm detected (if in scope) | See Section 5 — always ask, never assume | Rare, explicit opt-in only |

**Ask style:** One question, plain language, easy deferral ("Not now" / "Not part of household"). Never a form.

### What Meridian should never assume

| Never assume | Why |
|---|---|
| **Family relationship** | "Grace is your daughter" — relationship type is unknown |
| **Parent vs caregiver vs grandparent** | Role affects copy tone and relevance, not just name |
| **Which child owns a generic sports event** | Prefer miss over wrong attribution (locked V1 tradeoff) |
| **Marital status or household structure** | Not required for coordination |
| **Financial obligation or ability to pay** | Outside coordination scope unless explicitly opted in |
| **Health conditions, diagnoses, therapy** | Sensitive; calendar title is insufficient evidence |
| **Work seniority, employer hierarchy** | Work travel prep is keyword-based; don't infer org chart |
| **User intent from a single capture** | One mention is not a pattern |
| **That silence means consent** | No inference → no action |

### What should always require confirmation

| Category | Rule |
|---|---|
| **Household membership** | A person becomes a *confirmed member* only after user affirms or repeatedly acts as if affirmed (e.g., never dismisses, uses name in captures) |
| **Child vs adult** | Role assignment requires confirmation before child-specific sports/school logic |
| **Child ↔ activity ownership** | Before possessive copy ("Grace's volleyball") in observations or notifications |
| **Child ↔ grade** | Before "likely Reagan's" grade attribution (`O09`) |
| **Home address** | User enters or confirms — never inferred from event locations |
| **Notification-worthy commitments** | Leave alerts for named children require sufficient confidence or generic copy |
| **Financial awareness** | Any financial rhythm — explicit opt-in only (Section 5) |
| **Sharing with another adult** | Spouse/partner visibility — never assumed |

### Discover first, confirm second — in practice

```
Week 1:  Calendar connected → generic relevance, no possessive names
Week 2:  "Grace" frequency rises → internal candidate, no UI claim
Week 3:  Calm prompt → "Grace appears often. Part of your household?"
         User confirms → Grace becomes confirmed member (child role still optional)
Week 4:  School calendar + grade event → candidate grade signal
Week 5:  User confirms or Meridian uses softer copy ("6th grade event this week")
Week 6+: Observations O06, O04, O09 become reliable
```

**Silence between steps is a feature.** Rushing confirmation erodes trust.

---

## 2. Progressive Understanding

### The arc: Day 1 → Month 3

Meridian's household model should mature through **evidence accumulation**, not **setup completion**.

#### Day 1 — Calendar connected

**Meridian knows:**
- Event titles, times, locations, sources (which Google calendar)
- All-day vs timed patterns
- Work vs personal domain hints (keyword + calendar name heuristics)
- That a household exists — but not who is in it

**Meridian offers:**
- Plan view, generic leave alerts (T-30), morning/evening briefs with shape copy
- Capture with local parse
- Calm Focus stack from user's captures

**Meridian does not:**
- Use possessive child names in notifications
- Fire Tier A/B household observations
- Claim school or sports attribution

**User provides (minimum):** Google Calendar connection. Optional: notification permission when value is shown.

---

#### Week 1–2 — Observation without claims

**Meridian learns (internal candidates):**
- Recurring event clusters
- Frequently appearing name tokens in titles
- Calendar source taxonomy (school, sports league, work)
- Venue repetition
- User's own work rhythm

**Meridian offers:**
- Slightly richer briefs ("2 commitments before noon")
- Domain-colored Plan
- Shape-level observations only (Tier C — if any)

**Meridian may ask (at most one prompt per week):**
- Enable notifications (after first useful moment)
- Select which calendars matter (already exists via `CalendarSelectionScreen`)

---

#### Week 3–4 — First confirmations

**Meridian learns:**
- Confirmed household members (names only — role optional)
- Recurring activities tied to names or sources
- Home location if user sets it (Settings)

**Meridian offers:**
- Named events in Plan when confidence is high
- Prep awareness with softer connection copy
- Setup completion nudge (Calendar ✓ Home ○ Notifications ○) — not a form

**Meridian may ask:**
- "Is [Name] part of your household?" (one name at a time)
- "Is this calendar for [child]'s activities?" when source is ambiguous

---

#### Month 2 — Coordination intelligence

**Meridian learns:**
- Child roles for confirmed members
- Sports activity tokens per child (from confirmed attribution + calendar patterns)
- School grade signals matched to children (confirmed)
- Capture ↔ event relationships (existing relationship graph)
- Traffic-adjusted leave timing (if home set + H.3 validated)

**Meridian offers:**
- Tier B observations (O03, O04, O05)
- Stronger prep awareness
- Leave alerts with household-specific copy when gated

---

#### Month 3 — Household operating layer

**Meridian knows:**
- Confirmed household composition
- Activity rhythms per person
- School and sports patterns
- Work travel cadence (keyword-based, not employer modeling)
- Venue familiarity
- Prep and capture connection habits

**Meridian offers:**
- Tier A observations (O06, O09)
- Weekly reflection (future — coordination wins, not task scores)
- Spouse-shareable moments

**Meridian still does not:**
- Assume relationships it has not confirmed
- Expand into financial, health, or habit-tracking domains without opt-in

### Progress without forms

| Traditional signal | Meridian equivalent |
|---|---|
| "Add your children" form | Name frequency + confirmation prompts |
| "What sports do they play?" | Infer from calendar sources + confirm on first possessive use |
| "What school?" | School calendar selection + grade token matching |
| "Where do you live?" | User sets home when leave-timing value is clear |
| "Family structure" survey | Never |

---

## 3. Candidate Discovery Layers

### Layer 1 — Calendar Understanding

**What calendars alone can teach (high confidence):**

| Learning | Source | Confidence |
|---|---|---|
| Event schedule and density | All synced events | High |
| Recurring activities | RRULE + title normalization | High |
| Work block patterns | Weekday 8–6 cluster on work calendar | High |
| School event patterns | School-named calendar + grade keywords | Medium |
| Sports event patterns | TeamSnap/GameChanger-style titles, league tokens | Medium |
| Community commitments | BFSC, board, PTA keywords | Medium |
| Travel / conference signals | Keyword + duration heuristics | Medium |
| Location strings | Raw venue text (geocoding is separate) | High for text, low for meaning |

**What calendars can suggest (low–medium confidence):**

| Learning | Requires |
|---|---|
| Person names in titles | Repeated token extraction — not unique name resolution |
| Which calendar belongs to whom | Calendar display name + event content correlation |
| Household size | Count of distinct child-like name tokens — fragile |

**What calendars cannot teach:**

- Relationship type (daughter vs niece vs student)
- Whether a named person lives in the household
- Financial meaning of any event
- User's priorities — only schedule shape

**Layer 1 powers:** Plan, briefs, leave alerts (generic), domain attribution, recurring pattern detection — **without** confirmed household members.

---

### Layer 2 — Household Understanding

**Discovery paths for people:**

| Path | Mechanism | Confirmation need |
|---|---|---|
| **Title names** | "Grace volleyball" → token "Grace" | Membership confirm before child logic |
| **Calendar ownership** | "Grace's Calendar" subcalendar | Stronger signal — still confirm role |
| **Co-attendance** | Same names on family-domain events | Suggests household, not relationship |
| **Capture mentions** | User writes "pick up Grace" | Medium — user-authored, still not role |
| **Sports profiles** | League token → child (after child sports context exists per user) | Confirm before possessive notifications |
| **School grades** | Grade in title + confirmed child grade | Confirm grade ↔ child mapping |

**Adults (spouse, co-parent, caregiver):**

- Appear less often in possessive child-event titles
- May appear on family-domain events or shared captures
- **Discovery:** co-occurrence + user confirmation
- **Never infer:** spouse vs ex-spouse vs grandparent

**What requires confirmation before acting:**

| Action | Gate |
|---|---|
| Possessive notification copy | Confirmed member + role |
| Child sports attribution | Confirmed child + activity |
| Grade → child observation (O09) | Confirmed grade mapping |
| Multi-child day observation (O03) | ≥3 confirmed children |
| Sibling same-activity (O04) | Two confirmed children + shared activity |

**What can remain heuristic without confirmation:**

- Generic "family commitment" leave alert
- Domain color on Plan
- "Household-relevant" filter (existing `isHouseholdRelevant` heuristics)
- Shape observations without names

---

### Layer 3 — Lifestyle Understanding

**Safely learnable patterns (behavioral, not identity):**

| Pattern | Use | Risk |
|---|---|---|
| Weekly activity rhythm | "Volleyball practice is part of the weekly rhythm" | Low — no role claim |
| Evening compression | O05-style logistics | Low |
| Commute window | Work events + home location → leave timing | Low — user's own schedule |
| Venue repetition | Same rink twice this week (O16) | Low |
| Morning vs evening household density | Brief shape | Low |
| Capture timing habits | When user captures, not what they capture means morally | Low |

**Should remain out of scope:**

| Pattern | Why |
|---|---|
| Sleep, exercise, health readiness | Health app territory — inspiration image Health tab rejected |
| Spending habits from calendar titles | Weak signal, high privacy risk |
| Social graph beyond household | CRM territory |
| Parenting quality inference | Judgment, guilt risk |
| "You should do more X" patterns | Productivity pressure |
| Habit streaks or consistency scoring | Habit tracker territory |
| Location tracking beyond stored home/work | Trust ask not earned |
| Real-time GPS commute learning | Deferred; home-only origin locked |

---

## 4. Trust Model

### Three modes of knowing

| Mode | Definition | User experience |
|---|---|---|
| **Observed** | Meridian saw it in calendar/capture | Internal only |
| **Inferred** | Meridian formed a candidate from patterns | May prompt confirmation |
| **Confirmed** | User affirmed or repeatedly acted consistently | Powers observations and named copy |

**Meridian acts on Confirmed.**  
**Meridian suggests from Inferred.**  
**Meridian stores Observed silently.**

### When inference is acceptable

| Acceptable | Condition |
|---|---|
| Domain color on Plan | Low stakes — reversible |
| Brief shape without names | "2 family commitments today" |
| Recurring pattern label (internal) | No user-facing claim |
| Prompt to confirm name | Question, not statement |
| Generic leave alert | No possessive, no child name |
| Softer observation copy | "6th grade event" without "Reagan's" |

### When Meridian must ask

| Must ask | Condition |
|---|---|
| Before possessive child copy | Any notification or observation with "'s" |
| Before household member list is shown to user | Profile or Life people surfaces |
| Before grade ↔ child mapping | O09-class observations |
| Before home location used for traffic copy | Smart timing gate (already exists) |
| Before expanding calendar write scope | Not held today — future |

### When Meridian must stay silent

| Stay silent | Condition |
|---|---|
| Confidence below threshold | Default |
| User dismissed confirmation | Cooldown — weeks, not hours |
| Single occurrence | One event is not a pattern |
| Ambiguous relationship | Two plausible children for same sport |
| Cached / partial calendar sync | `showingCached` — existing rule |
| User has not connected calendar | No fake intelligence |
| Inference would sound creepy | "We noticed you..." without value |

### Good vs bad copy (locked examples)

| Good | Bad |
|---|---|
| "Grace appears frequently on your calendar. Is Grace part of your household?" | "Grace is your daughter." |
| "This looks like a school calendar. Is it for one of your kids?" | "We assigned this to Reagan." |
| "Something for 6th grade is on the calendar this week." | "Reagan has a concert Thursday" (before grade confirmed) |
| "Two family commitments are close together tonight." | "You're going to be late." |
| Silence | "We inferred you have 4 children." |

**Meridian never claims relationships it does not know.** It offers hypotheses the user can confirm, defer, or reject.

### Trust erosion events (avoid at all costs)

- Wrong child on wrong event in a notification
- Possessive copy for a person who is a student, niece, or client child
- Asking for home location before demonstrating leave-alert value
- Re-asking after "Not part of household" within cooldown
- Surfacing financial inference without opt-in

---

## 5. Financial Awareness

### Awareness vs management

**Financial awareness may fit Meridian. Financial management does not.**

Meridian may understand recurring household financial rhythms — bill due dates on calendar, pay-schedule shape, renewal deadlines in captures — as coordination context. Meridian should **not** evolve into budgeting software, debt management software, investment tracking, or personal finance management.

### Do not assume it belongs

Financial awareness is **not** part of Meridian's locked V1 scope. This section explores whether awareness **could** fit — under strict constraints — without recommending it for near-term work. Financial **management** is out of scope regardless.

### Potential value (if done right)

| Signal | Coordination value |
|---|---|
| Recurring bill reminders on calendar | Cash-flow timing awareness — "tight week" shape |
| Pay schedule events | Explains work-domain rhythm |
| Tax deadline on calendar | Legitimate prep pressure — already calendar-anchored |
| "Insurance renewal" capture + calendar | Connection observation — aligns with anticipation principle |
| Subscription renewal emails as calendar events | Low-value noise risk |

Meridian's money domain in Life intelligence today is **capture and calendar-attributed** — not bank-linked.

### Risks

| Risk | Severity |
|---|---|
| **Privacy** | Financial data is more sensitive than volleyball schedules |
| **Scope creep** | Budgeting apps, net worth, spending guilt — inspiration Money tab explicitly rejected |
| **False inference** | Calendar title "Mortgage" does not mean user wants Meridian involved |
| **Guilt language** | "You're over budget" violates constitution |
| **Partner conflict** | Financial visibility between spouses is not Meridian's to broker |
| **Regulatory perception** | Feels like fintech even if read-only |
| **Distraction from family coordination** | Money tab in deprecated mockups expanded scope away from household logistics |

### Philosophy fit test

| Question | Answer |
|---|---|
| Does it reduce mental load for family coordination? | **Sometimes** — knowing a tight financial week shapes prep |
| Does it protect family commitments? | **Indirectly** — rarely the primary lever |
| Is it anticipation, not reminder? | **Only if** framed as shape ("Thursday is tight") not obligation |
| Can it work local-first without bank linking? | **Partially** — calendar + capture only; incomplete by design |
| Does it risk becoming a budgeting app? | **High** if not bounded |

### Directional conclusion

**Financial awareness may fit Meridian at the margins — as calendar- and capture-anchored coordination context. Financial management does not fit — no budgeting, debt tracking, investments, or personal finance tooling.**

Awareness stays calendar- and capture-anchored; it never becomes a Money domain product surface.

**If ever explored (not a commitment):**

| Allowed | Forbidden |
|---|---|
| Money-domain captures promoted to Focus/Plan | Bank account linking |
| Calendar events tagged money-domain (existing) | Net worth, balances, budgets |
| Shape copy: "A few money-related items this week" (O18-class) | Payment reminders Meridian invents |
| User-authored capture reminders for bills | Inferring income or debt |
| Explicit opt-in: "Include financial calendar events in briefs" | Spouse-visible financial summaries |

**Default for new users:** Financial events on calendar are **classified** but not **emphasized** until user demonstrates money-domain captures or opts in.

**Recommendation for V1 and near-term:** **Do not expand financial awareness beyond existing money-domain capture/calendar attribution.** Revisit only if users repeatedly capture financial deadlines and ask for coordination — not because inspiration images included a Money tab.

---

## 6. Discovery vs Setup

### Traditional onboarding

| Characteristic | Effect |
|---|---|
| Forms and questionnaires | High friction — abandonment before value |
| Profile completeness scores | Gamification pressure — rejected philosophy |
| "Add your family" upfront | Users don't know what Meridian needs yet |
| Permission bundling | Trust loss — location + notifications + contacts day one |
| Explicit relationship labels | Error-prone — wrong daughter, wrong ex-spouse |

**When forms win:** Regulated identity verification, multi-user accounts, shared family login — **not Meridian V1 local-first model**.

### Meridian discovery onboarding

| Characteristic | Effect |
|---|---|
| Calendar connect = day one | Immediate value — Plan, briefs, captures |
| Observation before question | Meridian demonstrates listening |
| Confirmation prompts | Small, deferrable, earned |
| Progressive enablement | Notifications after first felt moment; home after leave-alert demo |
| Silence as default | No inference without evidence |

### Tradeoffs

| Dimension | Traditional setup | Meridian discovery |
|---|---|---|
| Time to first value | Slow (complete profile first) | Fast (calendar only) |
| Time to full intelligence | Fast if user completes form | Slow (weeks) — but honest |
| Wrong-data risk | High (user mislabels) | Lower (confirmed over time) |
| Early observation quality | High if form accurate | Low week 1 — improves with evidence |
| User trust | "They want data from me" | "They're paying attention" |
| Engineering complexity | Simple storage | Candidate + confirm + cooldown model |
| Spouse onboarding | Shared account assumption | Each adult may have own device — household model is per-installation local |

**Meridian chooses:** Slower path to **earned** intelligence over faster path to **claimed** intelligence.

---

## 7. Household Model Boundaries

### What Meridian should understand

| Entity | Purpose | Discovery source |
|---|---|---|
| **People** | Attribution, observations, copy | Calendar names, captures, confirmation |
| **Roles** | Child vs adult gates | User confirmation only |
| **Places** | Home, work, venues | User-set home/work; geocoded venues |
| **Activities** | Sports, school, community | Calendar sources + recurrence |
| **Calendars** | Signal taxonomy | Google calendar metadata + selection |
| **Routines** | Rhythm, not habits | Recurrence detection |
| **Relationships (capture ↔ event)** | O06-class moments | Relationship graph — existing |
| **Coordination patterns** | Multi-child days, logistics density | Event math on confirmed members |

**Household model is for coordination — not contact management, not social graph, not CRM.**

### What Meridian should intentionally avoid becoming

| Anti-pattern | Why |
|---|---|
| **Budgeting / personal finance app** | Money tab rejected; guilt and scope |
| **Task manager** | Locked product principle |
| **Habit tracker / streaks** | Productivity pressure |
| **CRM / address book** | People are relevance anchors, not leads |
| **Project manager** | Work tasks belong in work tools |
| **Family social network** | No sharing, no feeds, no posts |
| **Parenting coach** | Judgment risk |
| **Health / fitness tracker** | Health tab rejected |
| **AI chat companion** | Chat-first rejected — anticipation surfaces |
| **School portal replacement** | Read calendar, don't manage grades |
| **Sports team manager** | Read schedule, don't roster |

**Boundary test:** If a feature would still make sense for a single adult with no children, it is probably in scope. If it requires treating Meridian as the system of record for a domain, it is probably out of scope.

---

## 8. Recommendation

### Smallest day-one input

A new user should provide **only**:

1. **Google Calendar connection** (one or more calendars)

That is sufficient for:

- Plan view
- Generic shape briefs
- Capture
- Focus stack from captures
- T-30 leave alerts for household-relevant events (heuristic)
- Domain-colored events

**Not required day one:**

- Household member names
- Children count
- Home address
- Notification permission
- Work location
- Financial opt-in
- Profile name (nice — seeded from Google auth when available)

### Ideal path: calendar connected → household understood

```
Day 1     Connect calendar
          → Meridian shows Plan + Focus. Generic copy. No claims.

Week 1    Meridian observes recurrence, names, calendar sources (internal)
          → Briefs improve. Optional: calendar picker refinement.

Week 2    First value moment (leave alert, brief, or capture promotion)
          → Optional: notification permission prompt

Week 3    First confirmation prompt (one name, if threshold met)
          → "Grace appears often. Part of your household?"
          → User confirms / defers / rejects

Week 4    Home location nudge (contextual, in Prep or Settings)
          → Only if household-relevant events with venues exist

Week 5–6  Second confirmations as needed (role, activity calendar)
          → Child role, sports source, grade mapping — one at a time

Month 2   Tier B observations become reliable (O03, O04, O05)
          → Multi-child, sibling activity, logistics

Month 3   Tier A observations (O06, O09)
          → Capture ↔ event, grade → child
          → Meridian feels indispensable for coordination — not because user filled a form,
            because Meridian paid attention and asked small questions well.
```

### Principles for any future household discovery work

1. **No census on day one** — calendar is enough to start
2. **Candidates are not members** — confirmation is the only promotion path
3. **One prompt per week maximum** — discovery respects attention
4. **Deferral is permanent until evidence renews** — "Not now" is not nag tomorrow
5. **Wrong attribution is worse than missed attribution** — silence wins ties
6. **Local-first** — household model stays on device; no sync required for V1 discovery vision
7. **Observations are the reward** — confirmed understanding surfaces as witness lines, not profile badges
8. **Financial stays marginal** — calendar/capture classification only unless explicit opt-in
9. **Discover more than ask** — every prompt must be preceded by evidence the user can recognize
10. **Gradual understanding is the product** — the household model is a story Meridian learns, not a file the user uploads

### What this document does not decide

- Storage format for confirmed members vs today's hardcoded `HOUSEHOLD_MEMBERS`
- UI pattern for confirmation prompts (sheet, inline, Settings)
- Whether household model syncs across devices or spouses
- Phase letter or timeline for any discovery work
- Replacement timeline for developer-seeded household context

Those are implementation questions — intentionally out of scope.

---

## Relationship to Other Strategy Documents

| Document | Link |
|---|---|
| `ENGAGEMENT_OBSERVATIONS_V1.md` | Observations are the **payoff** of household discovery — do not ship Tier A/B widely before confirmation model exists for new users |
| `VISUAL_LANGUAGE_EXTRACTION_V1.md` | Confirmation prompts must match calm visual language — not modal wizards |
| `CURRENT_STATE_2026_06_11.md` | Today all household context is pre-seeded — new-user discovery is an open product gap |
| `ARCHITECTURE_DECISIONS.md` | Earn-the-right-to-ask governs permission and setup nudge timing |
| `PHASE_J_PREREQS.md` | Full account/onboarding foundation is deferred — discovery model may inform J.2+ but does not require Phase J |

---

## Summary

Meridian should learn the household the way a thoughtful co-parent would: by showing up to the calendar, noticing patterns, asking one small question when it matters, and never pretending to know what it has only guessed.

**Discover first. Confirm second. Act only on what is earned.**

That is how Meridian becomes intelligent without onboarding that feels like homework — and how it stays a family coordination system instead of becoming everything the inspiration images once suggested.

---

*Strategic design exercise only. No code. No implementation. No feature promises.*
