# Meridian — Mobile Repo Recovery Plan

**Date:** 2026-05-27  
**Status:** Analysis complete. No code changes made.  
**Next step:** [See Section 7 — Exact Next Build Step]

---

## 1. Current Structure Findings

### Root-level layout

```
/Meridian                         ← git root
  /app                            ← Next.js App Router (42 files)
  /components                     ← Next.js React components (26 files)
  /lib                            ← Next.js server/client utility library (73 files)
  /types                          ← Web-only TypeScript types (1 file)
  /supabase                       ← Database schema + 7 migrations
  /services                       ← (root-level, appears empty or minimal)
  /data                           ← JSON mock data
  /docs                           ← Deploy checklist
  /public                         ← PWA manifest, icons, service worker
  /scripts                        ← QA scripts
  /mobile                         ← Expo React Native app (59 src files)
  /.cursor/rules                  ← 21 product constitution documents
  /.cursor/audits                 ← THIS FOLDER (new)
  package.json                    ← Next.js 16 dependencies
  tsconfig.json                   ← Next.js TypeScript config
  next.config.ts                  ← Next.js config
  middleware.ts                   ← Supabase auth middleware
  postcss.config.mjs              ← Tailwind CSS
  app/globals.css                 ← Tailwind global styles
```

### Framework summary

| Layer | Framework | Location | Status |
|-------|-----------|----------|--------|
| Web app | Next.js 16, React 19, Tailwind 4 | `/` (root) | Deployed/running |
| Mobile app | Expo SDK 56, React Native 0.85, TypeScript 6 | `/mobile/` | Built, not yet run |
| Database | Supabase (PostgreSQL, RLS, auth) | `/supabase/` | Applied + active |

### The `/mobile/` app — what exists

59 files in `/mobile/src/`, all TypeScript, zero Next.js imports:

```
src/
  animations/       motionTokens.ts
  components/       AppProviders, ScreenContainer, Text, PlaceholderState
                    /focus  — 7 components (Focus screen full build)
                    /capture — 6 components (Capture screen full build)
                    /navigation — MeridianTabBar
                    /typography — Text
  constants/        tabs.ts, screens.ts
  hooks/            useAppFonts, useCaptureInput, useReducedMotion, useRotatingPlaceholder
  navigation/       RootNavigator, TabNavigator
  screens/          Focus (full), Capture (full), Plan (placeholder), Life (placeholder)
  services/         /priority — 8 files (scoring engine, mock scenarios, debug)
                    /capture — captureService, index
                    /ai — aiCaptureParser (stub + interface)
  store/            appStore.ts, captureStore.ts
  theme/            colors.ts (70+ tokens), spacing, typography, radius, layout, index
  types/            capture.ts, navigation.ts
  utils/            platform.ts
                    /parsing — 6 files (5 parsers + index)
```

### Active `.cursor/rules` product constitution

21 documents exist — all authoritative:

```
meridian-master-prompt.md       ← Master constitution (overrides all)
core-problem-alignment.md
user-story-definition.md
information-architecture.md
navigation-system.md
design-language.md
onboarding-flow.md
focus-fallback-state.md
focus-screen.md
core-feature-system.md
ai-intelligence.md
secondary-screens.md
continuity-states.md
motion-system.md
gesture-system.md
notification-intelligence.md
accessibility-human-comfort.md
product-audit-framework.md
product-reconciliation.md
dev-workflow.md
ux-direction.md
```

---

## 2. Identified Risk: Root tsconfig Conflict

**CRITICAL — affects both apps.**

The root `tsconfig.json` has:

```json
"include": ["**/*.ts", "**/*.tsx"],
"exclude": ["node_modules"]
```

This means the root Next.js TypeScript compiler **currently traverses into `/mobile/src/`** and attempts to type-check React Native files against DOM/browser types. This will cause build failures and incorrect error reporting.

**Root Next.js deps include:** `dom`, `dom.iterable` lib targets.  
**Mobile deps include:** `react-native`, `expo`, `react-native-reanimated`, etc. — none in root `node_modules`.

**Fix (one line):** Add `"mobile"` to the root `tsconfig.json` exclude array.  
This is the single most important structural fix. Should be applied before any Next.js build.

---

## 3. Preserve List

### Must never be deleted or overwritten

| Location | What it is | Why |
|----------|-----------|-----|
| `/.cursor/rules/*.md` | 21 product constitution documents | Product law — referenced by all future builds |
| `/mobile/src/` | Full Expo app (59 files) | All screens, services, priority engine, capture architecture |
| `/mobile/App.tsx`, `/mobile/index.ts` | Expo entry points | App boots from here |
| `/mobile/babel.config.js` | Reanimated plugin config | Required for Reanimated to work |
| `/mobile/app.json` | Expo app config | Bundle IDs, splash, orientation |
| `/mobile/package.json` | Mobile dependency manifest | All RN deps with compatible versions |
| `/supabase/schema.sql` | Database schema | Source of truth for all tables |
| `/supabase/migrations/*.sql` | All 7 migrations | Applied to production DB |
| `/lib/design/tokens.ts` | Web design tokens | Reference for mobile theme alignment |

### Worth referencing when building mobile features

These web files contain pure TypeScript logic with no Next.js/DOM dependencies — suitable to adapt (not copy wholesale) for mobile:

| Web file | Relevant for mobile |
|----------|-------------------|
| `lib/domains/types.ts` | `LifeDomain`, `DomainTag` — maps to `ItemCategory` in mobile |
| `lib/today/types.ts` | `PriorityItem`, `MorningSummaryData` — reference for Focus screen data shape |
| `lib/reminders/types.ts` | Reminder types — future notification layer |
| `lib/reminders/extract.ts` | NLP reminder extraction — can adapt for mobile parsing |
| `lib/chat-actions/extract.ts` | Intent detection patterns — valuable for Capture parser enrichment |
| `lib/cognition/types.ts` | Cognition scoring types — align with priority engine |
| `types/index.ts` | `ChatMessage`, `Item`, `Reminder` — consider adopting as mobile shared types |
| `lib/ai/types.ts` | AI response types — will need mobile API client version |

---

## 4. Archive List (web-only, do not migrate to mobile)

These files are Next.js/browser/DOM-specific and must **never** be imported into the Expo app:

| Category | Files / Folders |
|----------|----------------|
| Next.js pages + API | All of `/app/` (42 files) |
| React DOM components | All of `/components/` (26 files) |
| Next.js server utilities | `lib/supabase/server.ts`, `lib/api/`, `lib/auth/` |
| Browser auth | `lib/auth.ts`, `middleware.ts` |
| Tailwind CSS | `app/globals.css`, `postcss.config.mjs` |
| Next.js config | `next.config.ts`, `next-env.d.ts` |
| PWA files | `public/sw.js`, `public/manifest.json` |
| Framer Motion | `lib/design/primitives.tsx` — uses `framer-motion`, not Reanimated |
| Server DB clients | `lib/supabase/admin.ts`, `lib/supabase/client.ts` (uses `@supabase/ssr`) |
| Memory/cognition DB | All `lib/memory/db.ts`, `lib/conversations/db.ts`, etc. — server-side only |

---

## 5. Web vs Mobile Separation Recommendation

### Recommended: Keep current structure (do NOT move to `/apps/`)

The repo already has a clean, working separation:

```
/Meridian
  /          ← Next.js web app (root)
  /mobile/   ← Expo React Native app
```

**Reasons NOT to restructure into `/apps/mobile` + `/apps/web`:**

1. The Next.js web app would need to be moved in its entirety — 42 pages, 26 components, 73 lib files, all Vercel config, all env vars, supabase references — extremely high breakage risk.
2. The mobile app at `/mobile/` is already 59 files deep with clean `@/*` path aliases and working TypeScript.
3. Monorepo tooling (Turborepo, Nx) adds complexity without a current shared package requirement.
4. Vercel deployment likely points at root; moving would require deployment reconfiguration.

**What the current structure needs (and only this):**

- Add `"mobile"` to root `tsconfig.json` exclude list (one-line fix)
- Ensure root `.gitignore` excludes `/mobile/node_modules` (check; probably fine already)
- Add a clear comment at the top of root `package.json` marking it as the **web** app

That's it. The boundary is already clean. The apps share git history and supabase infrastructure, but have zero code cross-dependency.

---

## 6. Expo Mobile App — Current State

The `/mobile/` app is **already a proper Expo TypeScript app**. No initialization is needed.

### What's installed

```
expo ~56.0.5
react-native 0.85.3
@react-navigation/native + @react-navigation/bottom-tabs
react-native-reanimated 4.3.1
react-native-gesture-handler ~2.31.1
react-native-safe-area-context
react-native-screens
react-native-svg
expo-blur
expo-haptics
expo-font
@expo-google-fonts/inter
zustand ^5.0.13
lucide-react-native
nanoid
typescript ~6.0.3
```

### What's built

| Screen | Status |
|--------|--------|
| Focus | Full — greeting, momentum ring, 3-card priority stack, schedule strip, calm wins, ambient capture |
| Capture | Full — multiline input, rotating placeholder, suggested examples, recent captures, confirmation animation |
| Plan | Placeholder (emotionally complete copy) |
| Life | Placeholder (emotionally complete copy) |

### What's running

- Tab navigation: Focus → Plan → Life → Capture
- Custom floating tab bar with Expo Blur (iOS) / translucent surface (Android)
- Priority engine: people-aware scoring, overload state, visual urgency derivation
- Capture architecture: local parsing pipeline, Zustand store, AI enrichment stub

### How to run

```bash
cd mobile
npm start        # Expo dev server
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run typecheck  # npx tsc --noEmit (currently passing clean)
```

---

## 7. Exact Next Build Step

The mobile app foundation is complete. The recommended next build sequence follows the product constitution at `.cursor/rules/meridian-master-prompt.md`.

**Priority order:**

1. **Fix root tsconfig** — add `"mobile"` to exclude. Prevents spurious type errors in Next.js CI.  
2. **Add `@/` path alias validation** — confirm `babel.config.js` module-resolver plugin or `tsconfig` paths are wired correctly for Expo (currently using `tsconfig.json` `paths`, which works with `expo/tsconfig.base`).  
3. **Wire Supabase mobile client** — create `mobile/src/services/supabase/client.ts` using `@supabase/supabase-js` (not `@supabase/ssr`). Mobile auth uses `AsyncStorage`-backed sessions, not HTTP cookies.  
4. **Build Plan screen** — forward timeline, commitments, weekly overview. No dashboard energy.  
5. **Build Life screen** — reflection, patterns, momentum tracking.  
6. **Replace mock priority data with real Supabase queries** — wire `FocusStack` to live priorities table (already has RLS enabled).  
7. **Voice capture** — wire mic button in `CaptureInput` to Expo Speech/Audio APIs.  
8. **Push notifications** — implement `NotificationIntelligence` per `.cursor/rules/notification-intelligence.md`.

---

## 8. Cursor Operating Rule

**Create the following rule in `.cursor/rules/dev-target.md` (or add to existing `dev-workflow.md`):**

> All future Meridian app build work must target the Expo React Native mobile app inside `/mobile/` unless the request explicitly says "web" or "Next.js" or references a specific `/app/` route.
>
> Rules:
> - All new screens → `/mobile/src/screens/`
> - All new components → `/mobile/src/components/`
> - All new services → `/mobile/src/services/`
> - All new theme tokens → `/mobile/src/theme/colors.ts`
> - All new types → `/mobile/src/types/`
> - Never import from `/components/`, `/lib/`, `/app/` (root Next.js paths) inside the mobile app
> - Never use DOM APIs, CSS modules, Next.js routing, or Framer Motion in the mobile app
> - Check `.cursor/rules/meridian-master-prompt.md` before every build session

---

## 9. Risks to Avoid

| Risk | Why it matters | Mitigation |
|------|---------------|-----------|
| Root tsconfig picks up mobile files | Will fail Next.js `tsc` / CI | Add `"mobile"` to exclude immediately |
| Importing web Supabase client in mobile | `@supabase/ssr` uses `cookies()` (Next.js-only) | Create separate `mobile/src/services/supabase/client.ts` using `createClient` + `AsyncStorage` |
| Copying Next.js components to mobile | DOM APIs, Framer Motion, Tailwind will break native build | Never. Rebuild from scratch using RN primitives |
| Mixing navigation paradigms | `next/navigation` vs React Navigation are incompatible | Mobile uses React Navigation exclusively |
| Confusing the two `tsconfig.json` files | Root is web, `/mobile/tsconfig.json` is RN. Run typecheck from correct directory | Always `cd mobile && npm run typecheck` for mobile |
| Double-numbering migrations | `006_events_and_manual_reminders.sql` and `006_rls_priorities_fix.sql` share prefix | Rename one to `006b_rls_priorities_fix.sql` before next migration run |
| Feature drift between web and mobile | Two apps with different capability sets | Product constitution applies to mobile first; web is legacy until mobile is primary |

---

## 10. Proposed Final Structure (minimal change)

```
/Meridian                              ← git root (stays as-is)
  /                                    ← Next.js web app (legacy/companion)
    app/                               ← Next.js App Router
    components/                        ← Next.js components
    lib/                               ← Next.js lib
    supabase/                          ← Shared DB layer
    tsconfig.json                      ← + "mobile" in exclude ← ONE CHANGE
    package.json                       ← Web dependencies (add comment)

  /mobile/                             ← ★ PRIMARY: Expo React Native app
    App.tsx                            ← Entry point
    index.ts                           ← registerRootComponent
    app.json                           ← Expo config
    babel.config.js                    ← Reanimated plugin
    tsconfig.json                      ← Mobile TypeScript config
    package.json                       ← Mobile dependencies
    /src/
      /animations/
      /components/
      /constants/
      /hooks/
      /navigation/
      /screens/
      /services/
      /store/
      /theme/
      /types/
      /utils/

  /.cursor/
    /rules/                            ← 21 product constitution docs (law)
    /audits/                           ← THIS FILE + future audit docs
```

No files need to be moved. No files need to be deleted. The structure is already correct. The mobile app just needs to be recognized as the primary build target.
