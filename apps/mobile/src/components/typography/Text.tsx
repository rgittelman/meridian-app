import { forwardRef } from 'react';
import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
  type TextStyle,
} from 'react-native';

import { useThemeContext } from '@/theme/ThemeContext';
import { fontFamily, typography, type TypographyVariant } from '@/theme';
import type { AppColors } from '@/theme/dark';

type MeridianTextProps = RNTextProps & {
  variant?: TypographyVariant;
  /** ColorToken key from AppColors, or any raw CSS color string */
  color?: keyof AppColors | string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  align?: TextStyle['textAlign'];
};

const weightToFamily = {
  regular: fontFamily.regular,
  medium: fontFamily.medium,
  semibold: fontFamily.semibold,
  bold: fontFamily.bold,
} as const;

export const Text = forwardRef<RNText, MeridianTextProps>(function Text(
  {
    variant = 'body',
    color = 'ink',
    weight,
    align,
    style,
    maxFontSizeMultiplier = 1.35,
    ...rest
  },
  ref,
) {
  const { colors } = useThemeContext();
  const token = typography[variant];

  // Resolve: token key → active palette value; raw string → pass through
  const colorKey = color as keyof AppColors;
  const resolvedColor =
    colorKey in colors ? colors[colorKey] : (color as string);

  const family = weight ? weightToFamily[weight] : weightFromVariant(variant);

  return (
    <RNText
      ref={ref}
      accessibilityRole={variant === 'display' || variant === 'title' ? 'header' : 'text'}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        styles.base,
        {
          fontSize: token.fontSize,
          lineHeight: token.lineHeight,
          letterSpacing: token.letterSpacing,
          fontWeight: token.fontWeight,
          fontFamily: family,
          color: resolvedColor,
          textAlign: align,
        },
        style,
      ]}
      {...rest}
    />
  );
});

function weightFromVariant(variant: TypographyVariant) {
  switch (variant) {
    case 'display':
    case 'title':
      return fontFamily.bold;
    case 'heading':
    case 'subhead':
      return fontFamily.semibold;
    case 'callout':
    case 'caption':
    case 'footnote':
      return fontFamily.medium;
    default:
      return fontFamily.regular;
  }
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
