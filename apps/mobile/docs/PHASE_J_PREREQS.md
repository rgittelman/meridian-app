# Phase J Prerequisites — Product Architecture Review

Before any Phase J implementation begins, the following questions must be answered
and recorded as decisions. A single auth line should not be written until this
document has Codemaster approval.

_Recorded: 2026-06-03_

---

## The Questions

### 1. Device-First or Account-First?

- Does Meridian work fully without an account?
- Is account optional, or required to use the app?
- **Codemaster instinct:** device-first. Account optional initially.

### 2. What Syncs?

Which data moves to the cloud when an account exists?

| Data | Sync candidate? |
|---|---|
| Settings (notification toggles, smart timing) | TBD |
| Captures | TBD |
| Focus state (completedIds, snoozes) | TBD |
| Life intelligence output | TBD |
| Calendar selections (enabled/disabled calendars) | TBD |
| Home / work locations | TBD |

- **Codemaster instinct:** local-first. Cloud backup later, not cloud-first.

### 3. Source of Truth?

- Local-first with cloud backup?
- Cloud-first with local cache?
- Hybrid (some local, some cloud)?
- **Codemaster instinct:** local-first with cloud backup later.

### 4. Family Model?

- Individual user only?
- Couple (two accounts, shared household)?
- Household (multiple adults, multiple children)?
- Parent/child relationships as first-class concept?
- **Note:** Meridian intelligence already models a household (Crystal, Grace, Hudson, Quinn, Reagan as known anchors). The account model must not break or ignore this.

### 5. Avatar Ownership?

- Google OAuth avatar only?
- Apple Sign In avatar?
- Meridian-native avatar upload?
- Initials fallback (required regardless)?
- **Codemaster instinct:** Google / Apple sign-in → their avatar when available. Initials fallback always present.

### 6. Onboarding Order?

Which sequence produces the best first-run experience?

| Option | Flow |
|---|---|
| A | Account → Calendar → Location |
| B | Calendar → Location → Account (earn trust before asking for account) |
| C | Fully usable before any sign-in; account offered later |

- **Codemaster instinct:** fully usable before sign-in. Account earned, not required.

---

## Codemaster's Instinct Summary (Pre-Decision)

These are directional preferences, not locked decisions. Must be confirmed
before Phase J planning begins.

| Question | Codemaster instinct |
|---|---|
| Approach | Device-first |
| Account | Optional initially |
| Data model | Local-first, cloud backup later |
| Auth providers | Google Sign-In + Apple Sign-In |
| Avatar | Provider avatar when available; initials fallback always |
| Profile location | New Account/Profile screen replaces Settings modal |
| Onboarding | Fully usable before sign-in; account offered, not required |
| Phase J size | Smaller and safer if device-first/optional — avoids backend-driven account system from day one |

---

## Architecture Impact Summary

These decisions will determine the scope of Phase J significantly:

**If device-first + account optional:**
- No backend required at launch
- Auth = store Google/Apple token locally, pull avatar/name
- Profile screen = Settings modal replacement with avatar header
- Sync = deferred to Phase K or later
- Phase J is: auth UI + profile screen + navigation restructure

**If account-first + cloud sync from day one:**
- Backend required before shipping Phase J
- All stores need cloud sync layer
- Conflict resolution needed (local vs cloud)
- Phase J becomes a multi-month initiative
- Much higher risk

**Recommended path:** device-first, account optional, local-first. Phase J stays scoped and shippable.

---

## Rule

Do not open a Phase J implementation session without answers to:
1. Device-first or account-first? (confirmed)
2. What syncs in V1 of Phase J? (list approved)
3. Onboarding order? (sequence approved)
4. Family model in scope for Phase J? (yes/no)

Once those four are answered, Phase J planning can produce an implementation plan.
