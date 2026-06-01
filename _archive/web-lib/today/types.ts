/**
 * lib/today/types.ts — Today screen data contracts.
 *
 * Intelligence not implemented yet — these types define the
 * architecture for future dynamic Today content.
 */

export interface MorningSummaryData {
  greeting:    string;
  dateLabel:   string;
  insight?:    string;
  energyLevel?: number;
}

export interface PriorityItem {
  id:       string;
  title:    string;
  done:     boolean;
  progress?: number;
}

export interface ReflectionData {
  summary:       string;
  emotionalTone?: string;
  date:          string;
}

export interface ThemeItem {
  id:          string;
  label:       string;
  description: string;
  strength:    number;
}

export interface FollowUpItem {
  id:      string;
  title:   string;
  context?: string;
  dueLabel?: string;
}

/** Dynamic Today intelligence — assembled by lib/today/intelligence.ts */
export interface TodayIntelligence {
  date:                   string;
  morningFocus:           string;
  morningFocusItems:      { id: string; title: string; source: "task" | "priority" | "theme"; dueLabel?: string }[];
  emotionalTrend:         string;
  emotionalWeather:       string;
  emotionalWeatherLabel:  string;
  focusItems:             { id: string; title: string; dueLabel?: string; domain: string }[];
  activePriorities:       string[];
  healthPatterns:         string[];
  moneyIndicators:        string[];
  lifeSignals:            string[];
  domainSignals:          { health: string | null; money: string | null; life: string | null };
  overdueCommitments:     { id: string; title: string; due_date: string }[];
  postponedTasks:         { id: string; title: string; postpone_count: number }[];
  recurringThemes:        { id: string; label: string; strength: number }[];
  pendingReminders:       {
    id: string; title: string; body: string | null;
    why_shown: string | null; gentle: boolean; task_id?: string | null;
  }[];
  gentleObservations:     string[];
  proactiveObservations:  { kind: string; observation: string; prompt: string }[];
  suggestedStructure:     string;
  overloadDetected:       boolean;
  generatedAt:            string;
}

export interface TodayScreenData {
  summary:    MorningSummaryData;
  priorities: PriorityItem[];
  reflection: ReflectionData | null;
  themes:     ThemeItem[];
  followUps:  FollowUpItem[];
}
