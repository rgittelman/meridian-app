# Meridian Session Bootstrap

Start every new session by reading these files in order:

1. `docs/MERIDIAN_STATUS.md` — current branch, active work, roadmap, open decisions
2. `docs/decisions/PROJECT_STATUS.md` — locked phases, completed validations
3. `docs/decisions/ARCHITECTURE_DECISIONS.md` — ADRs, product principles, V1 gaps
4. `docs/decisions/MERIDIAN_INTELLIGENCE_V1.md` — intelligence lock status, post-lock corrections
5. `docs/CODEMASTER_DECISIONS.md` — permanent architectural rulings (do not re-litigate)
6. `docs/VISUAL_DIRECTION_V1.md` — design system, colors, components, screen priorities

Then confirm current state in 10 bullets:

1. **Active branch** — what's in progress and uncommitted
2. **Next unlocked phase** — what Codemaster has approved to build next
3. **Last completed phase** — what just locked
4. **Open device validation** — Phase H.3 smoke test status
5. **Intelligence lock status** — all V1 systems locked; 229 tests passing
6. **Theme status** — V1.1 in progress on branch; V1.2/V1.3 not started
7. **Deferred decisions** — list the 4 Focus Intelligence policy items
8. **Role** — Builder only; no architecture redesigns; no locked system changes
9. **Test command** — `npm run test:focus` (Focus); full suite via `npm test`
10. **Primary working directory** — `apps/mobile` only; do not touch web or legacy mobile

---

## Key Rules

- **Never touch locked systems** without a documented regression or Codemaster approval
- **Builder role only** — implement approved changes; do not redesign
- **Run tests before claiming done** — `npm test` must be green
- **No scope expansion** — do not pull in future phases early
- **apps/mobile only** — web app and `_archive/legacy-mobile` are out of scope
