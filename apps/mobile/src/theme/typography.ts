import { Platform, TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  /** iOS system fallback when fonts still loading */
  system: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
} as const;

export const fontSize = {
  display: 34,
  title: 28,
  heading: 20,
  subhead: 17,
  body: 16,
  callout: 15,
  caption: 13,
  footnote: 12,
} as const;

export const lineHeight = {
  display: 40,
  title: 34,
  heading: 26,
  subhead: 24,
  body: 24,
  callout: 22,
  caption: 18,
  footnote: 16,
} as const;

export const letterSpacing = {
  tight: -0.4,
  normal: -0.15,
  wide: 0.2,
} as const;

export type TypographyVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subhead'
  | 'body'
  | 'callout'
  | 'caption'
  | 'footnote';

export const typography: Record<
  TypographyVariant,
  Pick<TextStyle, 'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontWeight'>
> = {
  display: {
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
    letterSpacing: letterSpacing.tight,
    fontWeight: '700',
  },
  title: {
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
    letterSpacing: letterSpacing.tight,
    fontWeight: '600',
  },
  heading: {
    fontSize: fontSize.heading,
    lineHeight: lineHeight.heading,
    letterSpacing: letterSpacing.normal,
    fontWeight: '600',
  },
  subhead: {
    fontSize: fontSize.subhead,
    lineHeight: lineHeight.subhead,
    letterSpacing: letterSpacing.normal,
    fontWeight: '500',
  },
  body: {
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
    letterSpacing: letterSpacing.normal,
    fontWeight: '400',
  },
  callout: {
    fontSize: fontSize.callout,
    lineHeight: lineHeight.callout,
    letterSpacing: letterSpacing.normal,
    fontWeight: '500',
  },
  caption: {
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
    letterSpacing: letterSpacing.wide,
    fontWeight: '500',
  },
  footnote: {
    fontSize: fontSize.footnote,
    lineHeight: lineHeight.footnote,
    letterSpacing: letterSpacing.wide,
    fontWeight: '500',
  },
};
