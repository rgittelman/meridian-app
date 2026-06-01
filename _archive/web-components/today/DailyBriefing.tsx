"use client";

/**
 * DailyBriefing — The emotional + contextual anchor of the Today screen.
 *
 * Replaces the standalone "Meridian Insights" card with an integrated
 * header system: date, adaptive greeting, AI briefing summary,
 * momentum ring, and context chips.
 *
 * Emotionally intelligent, calm, premium, motivating.
 * Inspired by Apple Fitness + Things 3 + Tiimo.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { space, color, radius, shadow, motion as m, textStyle } from "@/lib/design/tokens";
import { Text } from "@/lib/design/primitives";
import type { Task } from "@/lib/tasks/types";
import type { Reminder } from "@/lib/reminders/types";
import type { TodayIntelligence } from "@/lib/today/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface BriefingData {
  tasks:     Task[];
  events:    Task[];
  reminders: Reminder[];
  completed: Task[];
  intelligence: TodayIntelligence | null;
}

interface MomentumState {
  label: string;
  ratio: number;
  total: number;
  done:  number;
}

interface ContextChip {
  emoji: string;
  label: string;
  tint:  string;
}

// ── Greeting engine ──────────────────────────────────────────────────────────

function adaptiveGreeting(name: string, momentum: MomentumState, hour: number): string {
  const { ratio, total } = momentum;

  if (hour < 5) return `Still up, ${name}?`;

  if (hour < 12) {
    if (total === 0) return `Good morning, ${name}.`;
    if (total <= 2) return `Easy morning, ${name}.`;
    if (total >= 6) return `Busy day ahead.`;
    return `Good morning, ${name}.`;
  }

  if (hour < 17) {
    if (ratio >= 0.75) return `You're moving well today.`;
    if (ratio >= 0.5) return `Good afternoon, ${name}.`;
    if (total >= 5 && ratio < 0.3) return `Focus first, then coast.`;
    return `Good afternoon, ${name}.`;
  }

  if (hour < 21) {
    if (ratio >= 0.9 && total >= 3) return `Strong day, ${name}.`;
    if (total - momentum.done <= 1) return `Lighter evening tonight.`;
    return `Good evening, ${name}.`;
  }

  if (ratio >= 0.8 && total >= 3) return `Solid day, ${name}.`;
  return `Winding down, ${name}.`;
}

// ── Briefing summary engine ──────────────────────────────────────────────────

function generateBriefing(
  data: BriefingData,
  momentum: MomentumState,
  hour: number,
): string | null {
  const { tasks, events, reminders, completed, intelligence } = data;
  const total = tasks.length + events.length + reminders.length;

  if (total === 0 && completed.length === 0) return null;
  if (total === 0 && completed.length > 0) {
    return `Everything handled. ${completed.length} ${completed.length === 1 ? "item" : "items"} cleared today.`;
  }

  if (intelligence?.morningFocus) {
    return intelligence.morningFocus;
  }

  const todayItems = [...tasks, ...events].filter((t) => {
    const meta = (t.metadata ?? {}) as Record<string, unknown>;
    const dateStr = (typeof meta.display_date === "string" ? meta.display_date : null) || t.due_date;
    if (!dateStr) return false;
    const today = new Date();
    const due = new Date(dateStr + "T00:00:00");
    return due.toDateString() === today.toDateString();
  });

  const timedItems = todayItems.filter((t) => {
    const meta = (t.metadata ?? {}) as Record<string, unknown>;
    return typeof meta.display_time === "string" || t.due_at;
  });

  const todayReminders = reminders.filter((r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    const dateStr = (typeof meta.display_date === "string" ? meta.display_date : null) || r.scheduled_date;
    if (!dateStr) return true;
    const today = new Date();
    const due = new Date(dateStr + "T00:00:00");
    return due.toDateString() === today.toDateString();
  });

  const importantCount = timedItems.length + todayReminders.length;

  if (hour < 12) {
    if (importantCount >= 3) return `${importantCount} things before end of day. Start with what's time-sensitive.`;
    if (events.length > 0) return `${events.length} ${events.length === 1 ? "event" : "events"} on the calendar. Build around ${events.length === 1 ? "it" : "them"}.`;
    if (total <= 2) return "Light agenda today. Room to breathe.";
    return `${total} things on your mind. Take them one at a time.`;
  }

  if (hour < 17) {
    if (momentum.ratio >= 0.6) return "Momentum is strong. Keep the rhythm going.";
    const remaining = total - momentum.done;
    if (remaining <= 2 && remaining > 0) return `Almost there. ${remaining} ${remaining === 1 ? "thing" : "things"} left.`;
    if (remaining > 4) return `${remaining} items remaining. Focus on what moves the needle.`;
    return `${remaining} things left for today.`;
  }

  if (momentum.ratio >= 0.8 && momentum.total >= 3) return "Strong day. Wrap up anything lingering.";
  const eveningLeft = total;
  if (eveningLeft <= 1) return "Light evening. Rest counts as progress.";
  return "Wind down when you're ready.";
}

// ── Momentum state ───────────────────────────────────────────────────────────

function computeMomentum(data: BriefingData): MomentumState {
  const total = data.tasks.length + data.events.length + data.reminders.length + data.completed.length;
  const done = data.completed.length;
  const ratio = total > 0 ? done / total : 0;

  let label = "Balanced";
  if (total === 0) label = "Clear";
  else if (ratio >= 0.8 && total >= 3) label = "Locked In";
  else if (ratio >= 0.5) label = "Rising";
  else if (ratio >= 0.2) label = "Building";
  else if (total >= 6) label = "Heavy Day";
  else label = "Starting";

  return { label, ratio, total, done };
}

// ── Context chip derivation ──────────────────────────────────────────────────

function deriveChips(data: BriefingData, momentum: MomentumState): ContextChip[] {
  const chips: ContextChip[] = [];
  const titles = [
    ...data.tasks.map((t) => t.title.toLowerCase()),
    ...data.events.map((t) => t.title.toLowerCase()),
    ...data.reminders.map((r) => r.title.toLowerCase()),
  ];
  const allText = titles.join(" ");

  if (data.events.length > 0) {
    const eventTitle = data.events[0].title;
    const shortTitle = eventTitle.length > 18 ? eventTitle.slice(0, 18) + "…" : eventTitle;
    chips.push({ emoji: "📅", label: shortTitle, tint: "rgba(91,168,138,0.08)" });
  }

  if (momentum.total >= 6)
    chips.push({ emoji: "⚡", label: "Heavy day", tint: "rgba(212,154,58,0.08)" });
  else if (momentum.total <= 2 && momentum.total > 0)
    chips.push({ emoji: "🌿", label: "Light agenda", tint: "rgba(91,168,138,0.08)" });

  if (momentum.ratio >= 0.6 && momentum.total >= 3)
    chips.push({ emoji: "🔥", label: "Strong momentum", tint: "rgba(108,105,224,0.08)" });

  if (/hockey|practice|game|gym|workout|run\b|exercise/i.test(allText))
    chips.push({ emoji: "🏒", label: "Active tonight", tint: "rgba(91,168,138,0.08)" });

  if (/call|phone|wife|husband|mom|dad|family|dinner/i.test(allText))
    chips.push({ emoji: "❤️", label: "Family time", tint: "rgba(201,115,108,0.06)" });

  if (/doctor|dentist|appointment|medical/i.test(allText))
    chips.push({ emoji: "🩺", label: "Appointment", tint: "rgba(108,105,224,0.06)" });

  if (/grocery|shopping|store|pickup|errand/i.test(allText))
    chips.push({ emoji: "🛒", label: "Errands", tint: "rgba(212,154,58,0.06)" });

  if (data.intelligence?.overloadDetected)
    chips.push({ emoji: "🛡️", label: "Protect your pace", tint: "rgba(201,115,108,0.06)" });

  return chips.slice(0, 5);
}

// ── Momentum Ring (SVG) ──────────────────────────────────────────────────────

function MomentumRing({ ratio, size = 40 }: { ratio: number; size?: number }) {
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const progress = Math.min(1, Math.max(0, ratio));

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color.calm} strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color.accent} strokeWidth={stroke}
        strokeLinecap="round"
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - progress) }}
        transition={{ type: "spring", stiffness: 100, damping: 20, mass: 0.8 }}
        strokeDasharray={c}
      />
    </svg>
  );
}

// ── Context Chips ────────────────────────────────────────────────────────────

function ContextChips({ chips }: { chips: ContextChip[] }) {
  if (chips.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ ...m.ease.default, delay: 0.2 }}
      style={{
        display: "flex",
        gap: space[2],
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
        paddingBottom: space[1],
        maskImage: "linear-gradient(to right, black 90%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, black 90%, transparent 100%)",
      }}
    >
      {chips.map((chip, i) => (
        <motion.div
          key={chip.label}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...m.ease.default, delay: 0.25 + i * 0.04 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: `${space[1] + 1}px ${space[3]}px`,
            borderRadius: radius.full,
            background: chip.tint,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, lineHeight: 1 }}>{chip.emoji}</span>
          <span style={{
            ...textStyle("micro"),
            color: color.secondary,
            fontWeight: 500,
          }}>
            {chip.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Contextual icon for item titles ──────────────────────────────────────────

const TITLE_ICONS: [RegExp, string][] = [
  [/hockey|practice|game|sports/i, "🏒"],
  [/gym|workout|exercise|run\b|yoga|swim/i, "💪"],
  [/call|phone/i, "📞"],
  [/email|mail\b/i, "✉️"],
  [/doctor|dentist|medical|appointment/i, "🩺"],
  [/grocery|store|shopping|errand/i, "🛒"],
  [/meeting|standup|sync/i, "💼"],
  [/cook|dinner|lunch|breakfast|eat/i, "🍽️"],
  [/pick\s?up|drop\s?off/i, "🚗"],
  [/school|class|study|homework/i, "📚"],
  [/pay|bill|bank|budget|money/i, "💰"],
  [/clean|laundry|dishes|chore/i, "🧹"],
  [/sleep|rest|nap/i, "💤"],
  [/birthday|anniversary|celebrate/i, "🎂"],
  [/flight|travel|trip|airport/i, "✈️"],
  [/wife|husband|partner|spouse/i, "❤️"],
  [/kid|son|daughter|child/i, "👧"],
  [/walk|dog|pet/i, "🐕"],
];

export function getItemIcon(title: string): string | null {
  for (const [re, icon] of TITLE_ICONS) {
    if (re.test(title)) return icon;
  }
  return null;
}

// ── Main component ───────────────────────────────────────────────────────────

interface DailyBriefingProps {
  userName: string;
  tasks:     Task[];
  events:    Task[];
  reminders: Reminder[];
  completed: Task[];
  intelligence: TodayIntelligence | null;
}

export default function DailyBriefing({
  userName,
  tasks,
  events,
  reminders,
  completed,
  intelligence,
}: DailyBriefingProps) {
  const name = userName || "there";
  const hour = new Date().getHours();

  const data: BriefingData = useMemo(
    () => ({ tasks, events, reminders, completed, intelligence }),
    [tasks, events, reminders, completed, intelligence],
  );

  const momentum = useMemo(() => computeMomentum(data), [data]);
  const greeting = useMemo(() => adaptiveGreeting(name, momentum, hour), [name, momentum, hour]);
  const briefing = useMemo(() => generateBriefing(data, momentum, hour), [data, momentum, hour]);
  const chips = useMemo(() => deriveChips(data, momentum), [data, momentum]);

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={m.ease.default}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: space[4],
      }}
    >
      {/* Date + Greeting + Briefing */}
      <div style={{ padding: `${space[1]}px 0` }}>
        <Text as="p" style="caption" color={color.placeholder} css={{ marginBottom: space[1] }}>
          {dateStr}
        </Text>

        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...m.ease.default, delay: 0.05 }}
        >
          <Text as="h1" style="display" color={color.ink} css={{ marginBottom: space[2] }}>
            {greeting}
          </Text>
        </motion.div>

        {briefing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ ...m.ease.default, delay: 0.12 }}
          >
            <Text as="p" style="body" color={color.secondary} css={{ lineHeight: 1.55, maxWidth: 360 }}>
              {briefing}
            </Text>
          </motion.div>
        )}
      </div>

      {/* Momentum row */}
      {momentum.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...m.ease.default, delay: 0.15 }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: space[3],
            padding: `${space[3]}px ${space[4]}px`,
            background: color.surface,
            borderRadius: radius.lg,
            border: `1px solid ${color.borderSubtle}`,
            boxShadow: shadow.subtle,
          }}
        >
          <MomentumRing ratio={momentum.ratio} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <Text as="p" style="callout" color={color.ink} css={{ fontWeight: 600 }}>
              {momentum.done} of {momentum.total} complete
            </Text>
            <Text style="footnote" color={color.tertiary}>
              {momentum.label}
            </Text>
          </div>

          {momentum.ratio > 0 && momentum.ratio < 1 && (
            <Text style="micro" color={color.accent} css={{ opacity: 0.8 }}>
              {Math.round(momentum.ratio * 100)}%
            </Text>
          )}
        </motion.div>
      )}

      {/* Context chips */}
      <ContextChips chips={chips} />
    </motion.div>
  );
}
