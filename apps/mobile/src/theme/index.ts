// Color palettes + type
export { darkColors, type AppColors } from './dark';
export { lightColors } from './light';
// Backward-compat static export (dark palette) + ColorToken type alias
export { colors, type ColorToken } from './colors';

// Theme infrastructure
export { ThemeProvider } from './ThemeContext';
export { makeStyles } from './makeStyles';

// Spacing, typography, layout tokens
export { spacing } from './spacing';
export { typography, fontFamily, fontSize, lineHeight, type TypographyVariant } from './typography';
export { radius } from './radius';
export {
  screenPaddingHorizontal,
  screenPaddingTop,
  minTouchTarget,
  tabBarHeight,
  tabBarBottomInset,
} from './layout';

// Visual upgrade — V1.1
export { tabAccents, type TabName, type TabAccentSet } from './tabAccents';
export { gradients, type GradientDef } from './gradients';
