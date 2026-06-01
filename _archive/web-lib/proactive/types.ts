/**
 * lib/proactive/types.ts — Proactive intelligence types.
 */

import type { LifeDomain } from "@/lib/domains/types";

export type ProactiveSignalKind =
  | "overload"
  | "stress_cycle"
  | "neglected_goal"
  | "emotional_spiral"
  | "habit_inconsistency"
  | "money_pressure"
  | "health_drift";

export interface ProactiveSignal {
  kind:        ProactiveSignalKind;
  label:       string;
  observation: string;
  /** Gentle prompt — never pushy */
  prompt:      string;
  strength:    number;
  domains:     LifeDomain[];
}

export interface ProactiveIntelligence {
  signals:          ProactiveSignal[];
  overloadDetected: boolean;
  generatedAt:      string;
}
