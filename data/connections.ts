/**
 * Meridian Connections — data/connections.ts
 *
 * Single source of truth for all integration connection cards.
 *
 * Status guide:
 *   available    — can be activated now (Meridian-native feature)
 *   connected    — user has connected this integration
 *   disconnected — wired and ready, but user hasn't connected yet
 *   ready_soon   — infrastructure in place, launching soon
 *   coming_soon  — planned, not yet available
 *
 * Phase 2: replace status with a live Supabase query per user.
 */

export type ConnectionStatus =
  | "available"
  | "connected"
  | "disconnected"
  | "ready_soon"
  | "coming_soon";

export type ConnectionCategory = "calendar" | "health" | "finance" | "ai";

export interface Connection {
  id:          string;
  name:        string;
  /** One-line emotional benefit — what does this unlock for the user? */
  benefit:     string;
  status:      ConnectionStatus;
  category:    ConnectionCategory;
  chipBg:      string;
  chipColor:   string;
}

export const CONNECTIONS: Connection[] = [
  {
    id:       "google-calendar",
    name:     "Google Calendar",
    benefit:  "Meridian sees your day, finds focus windows, and notices overload.",
    status:   "ready_soon",
    category: "calendar",
    chipBg:   "#E8F0FE",
    chipColor:"#4285F4",
  },
  {
    id:       "health-connect",
    name:     "Health Connect",
    benefit:  "Energy and recovery signals from Google Fit and Android health apps.",
    status:   "coming_soon",
    category: "health",
    chipBg:   "#E6F4EA",
    chipColor:"#34A853",
  },
  {
    id:       "apple-calendar",
    name:     "Apple Calendar",
    benefit:  "Your iCloud calendar, synced for a complete picture of your day.",
    status:   "coming_soon",
    category: "calendar",
    chipBg:   "#FFE8E8",
    chipColor:"#FF3B30",
  },
  {
    id:       "apple-health",
    name:     "Apple Health",
    benefit:  "Sleep, HRV, and vitals for cognitive readiness awareness.",
    status:   "coming_soon",
    category: "health",
    chipBg:   "#FFE8F3",
    chipColor:"#FF2D55",
  },
  {
    id:       "plaid",
    name:     "Plaid",
    benefit:  "Financial clarity — spending patterns and cash flow, without the anxiety.",
    status:   "coming_soon",
    category: "finance",
    chipBg:   "#E6F5EE",
    chipColor:"#00A67E",
  },
  {
    id:       "meridian-continuity",
    name:     "Meridian Continuity",
    benefit:  "Meridian remembers your goals, patterns, and context across every session.",
    status:   "available",
    category: "ai",
    chipBg:   "#EEEDFB",
    chipColor:"#6C69E0",
  },
];

export const CONNECTION_CATEGORIES: Record<ConnectionCategory, string> = {
  calendar: "Calendar",
  health:   "Health",
  finance:  "Finance",
  ai:       "Intelligence",
};
