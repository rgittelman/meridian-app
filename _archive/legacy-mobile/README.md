# Meridian Mobile

Calm, premium React Native shell for Meridian (Focus · Plan · Life · Capture).

## Stack

- Expo SDK 56 + TypeScript
- React Navigation (bottom tabs)
- Reanimated + Gesture Handler (motion-ready)
- Expo Blur + Haptics
- Zustand
- Lucide React Native
- StyleSheet + theme tokens (no generic template UI)

## Run

```bash
cd mobile
npm install
npm run ios     # Simulator
npm run android
npm start       # Expo dev server
```

## Structure

```
src/
  components/     ScreenContainer, Text, tab bar
  screens/        Focus, Plan, Life, Capture
  navigation/     Root + tab navigators
  theme/          colors, spacing, typography
  animations/     motion tokens
  constants/      tabs, placeholder copy
  hooks/          fonts, reduced motion
  store/          Zustand app shell state
  types/          navigation types
  utils/          platform helpers
  services/       (future API layer)
```

Product law: `../.cursor/rules/meridian-master-prompt.md`
