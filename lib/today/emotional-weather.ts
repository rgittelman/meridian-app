/**
 * lib/today/emotional-weather.ts — Subtle emotional trend labels.
 * No clinical or mental-health language.
 */

export type EmotionalWeather =
  | "steady"
  | "overloaded"
  | "scattered"
  | "focused"
  | "low_energy";

const WEATHER_COPY: Record<EmotionalWeather, string> = {
  steady:     "Steady — nothing urgent pulling hard.",
  overloaded: "A lot in motion — pace may need protecting.",
  scattered:  "Attention spread thin — one thread at a time.",
  focused:    "Clear enough to protect a focus block.",
  low_energy: "Quieter day — rest counts as progress.",
};

export function deriveEmotionalWeather(input: {
  emotionalTrend:   string;
  overloadDetected: boolean;
  openTaskCount:    number;
  overdueCount:     number;
  memories:         { emotional_valence?: string | null; category: string }[];
}): { weather: EmotionalWeather; label: string } {
  const recentNegative = input.memories.filter(
    (m) => m.emotional_valence === "negative",
  ).length;
  const stressMemories = input.memories.filter(
    (m) => m.category === "recurring_stressors",
  ).length;

  let weather: EmotionalWeather = "steady";

  if (input.overloadDetected || input.overdueCount >= 2 || input.openTaskCount >= 8) {
    weather = "overloaded";
  } else if (/elevated stress|mental load|overwhelm/i.test(input.emotionalTrend)) {
    weather = "overloaded";
  } else if (recentNegative >= 2 && stressMemories >= 1) {
    weather = "scattered";
  } else if (/positive momentum|generally positive/i.test(input.emotionalTrend)) {
    weather = "focused";
  } else if (/low energy|tired|sleep|rest/i.test(input.emotionalTrend)) {
    weather = "low_energy";
  }

  return { weather, label: WEATHER_COPY[weather] };
}

export function weatherDotColor(weather: EmotionalWeather): string {
  const map: Record<EmotionalWeather, string> = {
    steady:     "#9E9CB0",
    overloaded: "#D4810A",
    scattered:  "#B088C6",
    focused:    "#6C69E0",
    low_energy: "#7BAFD4",
  };
  return map[weather];
}
