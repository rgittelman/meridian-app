# Meridian Session Bootstrap

Start every new session by reading these files in order:

1. `docs/MERIDIAN_STATUS.md` — current branch, active work, roadmap, open decisions
2. `docs/decisions/PROJECT_STATUS.md` — locked phases, completed validations
3. `docs/decisions/ARCHITECTURE_DECISIONS.md` — ADRs, product principles, V1 gaps
4. `docs/decisions/MERIDIAN_INTELLIGENCE_V1.md` — intelligence lock status, post-lock corrections
5. `docs/CODEMASTER_DECISIONS.md` — permanent architectural rulings (do not re-litigate)
6. `docs/VISUAL_DIRECTION_V1.md` — design system, colors, components, screen priorities
7. `docs/PHASE_J_PREREQS.md` — read this if Phase J work is in scope for the session

Then confirm current state in 10 bullets:

1. **Active branch** — `mobile-only-cleanup`; V1.1–V1.7 complete and committed; not yet merged to main
2. **Last completed work** — V1.7 Settings visual polish; all five primary screens done
3. **Test status** — 309 tests passing; TypeScript clean
4. **Next phase** — Codemaster decides: Phase J (Account & Onboarding) vs. Phase I (Confidence & Diagnostics) vs. V2 polish backlog
5. **Phase J gate** — Do not begin Phase J until PHASE_J_PREREQS.md questions are answered and approved
6. **Settings status** — Intentionally temporary local modal; do not expand until Phase J
7. **Intelligence lock status** — All V1 systems locked; no behavior changes without documented regression
8. **Deferred decisions** — 4 Focus Intelligence policy items; Phase H.3 device smoke test pending
9. **Role** — Builder only; no architecture redesigns; no locked system changes; no scope expansion
10. **Primary working directory** — `apps/mobile` only; web app and `_archive/legacy-mobile` are out of scope

---

## Key Rules

- **Never touch locked systems** without a documented regression or Codemaster approval
- **Builder role only** — implement approved changes; do not redesign
- **Run tests before claiming done** — `npm run test:shared`, `npm run test:life`, all intelligence suites
- **No scope expansion** — do not pull in future phases early
- **No Phase J code** until PHASE_J_PREREQS.md is resolved and Codemaster has approved the plan
- **No account/auth/avatar UI** in current Settings — belongs to Phase J only
- **apps/mobile only** — web app and `_archive/legacy-mobile` are out of scope
