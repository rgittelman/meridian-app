# Meridian — Mobile runtime boundary

**Authority:** This rule enforces the platform separation established in `.cursor/audits/mobile-repo-recovery-plan.md` and the product intent in `meridian-master-prompt.md`.

---

## Primary build target

All Meridian app implementation work targets:

```
/apps/mobile
```

Unless the request explicitly references:
- "web"
- "Next.js"
- a specific `/app/` route
- a specific `/components/` or `/lib/` web file

---

## Canonical file locations for mobile builds

| What you're building | Where it goes |
|---------------------|---------------|
| New screen | `/apps/mobile/src/screens/` |
| New UI component | `/apps/mobile/src/components/` |
| New service | `/apps/mobile/src/services/` |
| New store slice | `/apps/mobile/src/store/` |
| New hook | `/apps/mobile/src/hooks/` |
| New type | `/apps/mobile/src/types/` |
| New theme token | `/apps/mobile/src/theme/colors.ts` |
| New constant | `/apps/mobile/src/constants/` |
| New animation token | `/apps/mobile/src/animations/motionTokens.ts` |
| New utility | `/apps/mobile/src/utils/` |

---

## Permitted in mobile

- React Native core APIs (`View`, `Text`, `Pressable`, `ScrollView`, `StyleSheet`, etc.)
- Expo SDK (`expo-blur`, `expo-haptics`, `expo-font`, `expo-status-bar`, etc.)
- `react-native-reanimated` for animation
- `react-native-gesture-handler` for gestures
- `react-native-safe-area-context` for insets
- `react-native-screens` for navigation
- `react-native-svg` for SVG graphics
- `@react-navigation/native` and `@react-navigation/bottom-tabs` for routing
- `zustand` for state
- `lucide-react-native` for icons
- `nanoid/non-secure` for IDs
- Pure TypeScript utilities with no DOM dependencies
- `@supabase/supabase-js` (not `@supabase/ssr`) with AsyncStorage auth

---

## Prohibited in mobile

Do NOT import or use any of the following in `/apps/mobile/`:

| Prohibited | Reason |
|-----------|--------|
| `next/*` | Next.js server/client runtime |
| `next/navigation` | Web router — incompatible with React Navigation |
| `framer-motion` | DOM-only animation library |
| `@supabase/ssr` | Uses Next.js `cookies()` — server-only |
| `react-dom` | DOM renderer — not React Native |
| CSS modules (`.module.css`) | No stylesheet support in RN |
| `app/globals.css` | Tailwind CSS — web only |
| `window.*`, `document.*` | Browser DOM APIs |
| `localStorage`, `sessionStorage` | Browser storage — use `AsyncStorage` |
| Any component from root `/components/` | Next.js React DOM components |
| Any hook from root `/lib/hooks/` | Next.js server hooks |
| Any Supabase client from root `/lib/supabase/` | SSR clients, not RN-compatible |

---

## Theme rules

- All colors must reference `@/theme/colors.ts` tokens
- No inline hex values in component or screen files
- No rgba strings outside the theme
- No one-off color objects
- The full visual tone is adjustable from `/apps/mobile/src/theme/`

---

## Platform enforcement

The `/apps/mobile/` and root `/` workspaces have separate:
- `package.json` (separate dependencies)
- `tsconfig.json` (separate compiler targets)
- `node_modules/` (separate installs)

The root `tsconfig.json` explicitly excludes `apps/` and `mobile/` so the Next.js compiler never sees React Native files.

Never run `npm install` from the repo root to add mobile packages. Always:

```bash
cd apps/mobile
npm install <package>
```

---

## The 9pm Tired Parent standard applies to every mobile build

Before shipping any feature, screen, or component, apply the test from `product-audit-framework.md`:

> Can an exhausted, distracted, emotionally overloaded adult use this calmly and confidently with one hand at 9pm?

If not: the feature fails.
