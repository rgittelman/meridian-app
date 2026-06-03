/**
 * Per-tab accent color sets.
 *
 * Each tab has a primary accent, a secondary accent, a glow value,
 * and a two-stop gradient tuple used by GradientIcon, progress rings,
 * and future gradient wrappers.
 *
 * These are static constants — no React, no Expo, no context.
 * Components access them via: tabAccents[routeName]
 */

export type TabAccentSet = {
  /** Primary CTA color — ring fill, active icon, highlight */
  primary: string;
  /** Secondary color — paired with primary in gradients or two-tone visuals */
  secondary: string;
  /** Glow / shadow color for the primary at low opacity */
  glow: string;
  /** Two-stop gradient [start, end] — used by GradientIcon and ring gradients */
  gradient: readonly [string, string];
};

export type TabName = 'Focus' | 'Plan' | 'Life' | 'Capture';

export const tabAccents: Record<TabName, TabAccentSet> = {
  Focus: {
    primary:   '#F97316',
    secondary: '#C97ECC',
    glow:      'rgba(249, 115, 22, 0.22)',
    gradient:  ['#FB923C', '#F59E0B'],
  },
  Plan: {
    primary:   '#7B6FE8',
    secondary: '#3B82F6',
    glow:      'rgba(123, 111, 232, 0.22)',
    gradient:  ['#7B6FE8', '#3B82F6'],
  },
  Life: {
    primary:   '#10B981',
    secondary: '#3B82F6',
    glow:      'rgba(16, 185, 129, 0.22)',
    gradient:  ['#10B981', '#34D399'],
  },
  Capture: {
    primary:   '#A07AE8',
    secondary: '#F97316',
    glow:      'rgba(160, 122, 232, 0.22)',
    gradient:  ['#A07AE8', '#F97316'],
  },
} as const;
