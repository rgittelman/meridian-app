import type { TabRouteName } from './tabs';

export type ScreenPlaceholder = {
  title: string;
  headline: string;
  supporting: string;
};

export const SCREEN_PLACEHOLDERS: Record<TabRouteName, ScreenPlaceholder> = {
  Focus: {
    title: 'Focus',
    headline: "Let's make today lighter.",
    supporting:
      'What matters right now will live here — calm, clear, and never overwhelming.',
  },
  Plan: {
    title: 'Plan',
    headline: "See the shape of what's ahead.",
    supporting:
      'Forward visibility without the weight of a full calendar dump.',
  },
  Life: {
    title: 'Life',
    headline: 'Patterns become clearer over time.',
    supporting:
      'Momentum, health, finances, and reflection — woven together gently.',
  },
  Capture: {
    title: 'Capture',
    headline: "What's taking up space?",
    supporting:
      'Get it out of your head. Meridian will help clarify the rest.',
  },
};
