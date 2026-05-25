"use client";

/**
 * components/today/TodayIntelligenceSurface.tsx
 * Calm intelligence surface — powered by /api/today/intelligence
 */

import { useTodayIntelligence } from "@/lib/hooks/use-today-intelligence";
import { weatherDotColor } from "@/lib/today/emotional-weather";
import type { EmotionalWeather } from "@/lib/today/emotional-weather";
import type { TodayIntelligence } from "@/lib/today/types";

// ── Shared styles (Meridian visual system) ───────────────────────────────────

const card: React.CSSProperties = {
  background:   "#FFFFFF",
  borderRadius: 18,
  border:       "1px solid rgba(0,0,0,0.06)",
  boxShadow:    "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)",
};

const sectionLabel: React.CSSProperties = {
  fontSize:      11,
  fontWeight:    600,
  color:         "#B0AEC4",
  letterSpacing: "0.09em",
  marginBottom:  10,
  paddingLeft:   2,
};

const ghostBtn: React.CSSProperties = {
  background:   "none",
  border:       "none",
  color:        "#9E9CB0",
  fontSize:     11,
  fontWeight:   500,
  cursor:       "pointer",
  padding:      "2px 6px",
};

// ── Greeting helpers ───────────────────────────────────────────────────────────

function greeting(name: string): string {
  const h = new Date().getHours();
  if (h < 5)  return `Still up, ${name}?`;
  if (h < 12) return `Good morning, ${name}.`;
  if (h < 17) return `Good afternoon, ${name}.`;
  if (h < 21) return `Good evening, ${name}.`;
  return `Winding down, ${name}.`;
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function TodaySkeleton() {
  const pulse: React.CSSProperties = {
    background:   "rgba(108,105,224,0.08)",
    borderRadius: 10,
    animation:    "pulse 1.4s ease-in-out infinite",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ ...pulse, height: 88 }} />
      <div style={{ ...pulse, height: 120 }} />
      <div style={{ ...pulse, height: 64 }} />
      <div style={{ ...pulse, height: 96 }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }`}</style>
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────────

function GreetingHeader({ data, userName }: { data: TodayIntelligence; userName: string }) {
  const openCount =
    data.focusItems.length +
    data.overdueCommitments.length;

  let sub = data.morningFocus;
  if (openCount === 0 && !data.overloadDetected) {
    sub = "Clear space ahead.";
  }

  return (
    <div style={{
      background:           "rgba(255,255,255,0.72)",
      backdropFilter:       "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      border:               "1px solid rgba(108,105,224,0.08)",
      borderRadius:         16,
      padding:              "14px 16px",
      boxShadow:            "0 1px 1px rgba(0,0,0,0.02), 0 2px 12px rgba(108,105,224,0.04)",
    }}>
      <p style={{ fontSize: 10, fontWeight: 500, color: "#C4C2D4", letterSpacing: "0.1em", marginBottom: 5 }}>
        {formatDate().toUpperCase()}
      </p>
      <p style={{ fontSize: 17, fontWeight: 600, color: "#1C1A2E", letterSpacing: "-0.02em", lineHeight: 1.3, marginBottom: 4 }}>
        {greeting(userName)}
      </p>
      {sub && <p style={{ fontSize: 13, color: "#9E9CB0", lineHeight: 1.45 }}>{sub}</p>}
    </div>
  );
}

function MorningFocusSection({
  items,
  onComplete,
}: {
  items: TodayIntelligence["morningFocusItems"];
  onComplete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div style={{
        ...card,
        padding: "14px 16px",
        background: "rgba(61,154,122,0.03)",
        border: "1px solid rgba(61,154,122,0.08)",
      }}>
        <p style={{ fontSize: 14, color: "#3D9A7A", fontWeight: 400 }}>
          Nothing pulling hard. Open space ahead.
        </p>
      </div>
    );
  }

  return (
    <section>
      <p style={sectionLabel}>MORNING FOCUS</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div
            key={item.id}
            style={{
              ...(i === 0 ? {
                background:   "linear-gradient(150deg, #FFFCF3 0%, #FFFFFF 55%)",
                border:       "1px solid rgba(212,129,10,0.13)",
                boxShadow:    "0 2px 4px rgba(0,0,0,0.04), 0 8px 24px rgba(212,129,10,0.07)",
              } : card),
              borderRadius: 16,
              padding:      "14px 16px",
              display:      "flex",
              alignItems:   "center",
              gap:          12,
            }}
          >
            <div style={{ flex: 1 }}>
              {i === 0 && (
                <p style={{ fontSize: 9, fontWeight: 700, color: "#D4810A", letterSpacing: "0.12em", marginBottom: 4 }}>
                  TOP FOCUS
                </p>
              )}
              <p style={{ fontSize: i === 0 ? 17 : 14, fontWeight: i === 0 ? 700 : 500, color: "#1C1A2E", lineHeight: 1.3 }}>
                {item.title}
              </p>
            </div>
            {item.dueLabel && (
              <span style={{ fontSize: 10, color: "#D4810A", fontWeight: 600, flexShrink: 0 }}>
                {item.dueLabel}
              </span>
            )}
            {item.source === "task" && (
              <button
                aria-label="Mark complete"
                onClick={() => onComplete(item.id)}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: "1.5px solid rgba(0,0,0,0.12)",
                  background: "transparent", cursor: "pointer", flexShrink: 0,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function GentleObservations({ observations }: { observations: string[] }) {
  if (observations.length === 0) return null;
  return (
    <section>
      <p style={sectionLabel}>NOTICED LATELY</p>
      <div style={{ ...card, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {observations.map((text, i) => (
          <p key={i} style={{ fontSize: 14, color: "#64627A", lineHeight: 1.5, margin: 0 }}>
            {text}
          </p>
        ))}
      </div>
    </section>
  );
}

function ActiveCommitments({
  data,
  onComplete,
}: {
  data: TodayIntelligence;
  onComplete: (id: string) => void;
}) {
  const hard = data.focusItems.filter((t) => !data.overdueCommitments.some((o) => o.id === t.id));
  const rows = [
    ...data.overdueCommitments.map((t) => ({ ...t, kind: "overdue" as const })),
    ...hard.slice(0, 3).map((t) => ({ id: t.id, title: t.title, due_date: t.dueLabel, kind: "hard" as const })),
    ...data.postponedTasks.map((t) => ({ id: t.id, title: t.title, due_date: `${t.postpone_count}× postponed`, kind: "postponed" as const })),
  ].slice(0, 5);

  if (rows.length === 0) return null;

  return (
    <section>
      <p style={sectionLabel}>COMMITMENTS</p>
      <div style={{ ...card, overflow: "hidden" }}>
        {rows.map((row, i) => (
          <div
            key={row.id}
            style={{
              padding:      "12px 16px",
              display:      "flex",
              alignItems:   "center",
              gap:          10,
              borderBottom: i < rows.length - 1 ? "1px solid rgba(0,0,0,0.04)" : undefined,
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: row.kind === "overdue" ? "#D4810A" : row.kind === "postponed" ? "#B0AEC4" : "#6C69E0",
              opacity: 0.7,
            }} />
            <p style={{ flex: 1, fontSize: 14, color: "#1C1A2E", lineHeight: 1.3 }}>{row.title}</p>
            {row.due_date && (
              <span style={{ fontSize: 10, color: "#C4C2D4", flexShrink: 0 }}>{row.due_date}</span>
            )}
            <button aria-label="Complete" onClick={() => onComplete(row.id)} className="tap-scale" style={{ ...ghostBtn, color: "#3D9A7A" }}>Done</button>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmotionalWeatherBar({ data }: { data: TodayIntelligence }) {
  const color = weatherDotColor(data.emotionalWeather as EmotionalWeather);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", borderRadius: 14,
      background: "rgba(255,255,255,0.6)",
      border: "1px solid rgba(0,0,0,0.04)",
    }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, opacity: 0.75, flexShrink: 0 }} />
      <p style={{ fontSize: 13, color: "#9E9CB0", lineHeight: 1.4, margin: 0 }}>
        {data.emotionalWeatherLabel}
      </p>
    </div>
  );
}

function ReminderStream({
  reminders,
  onDismiss,
  onSnooze,
  onComplete,
}: {
  reminders: TodayIntelligence["pendingReminders"];
  onDismiss: (id: string) => void;
  onSnooze: (id: string) => void;
  onComplete: (id: string, taskId?: string | null) => void;
}) {
  if (reminders.length === 0) return null;
  return (
    <section>
      <p style={sectionLabel}>GENTLE REMINDERS</p>
      <div style={{ ...card, overflow: "hidden" }}>
        {reminders.map((r, i) => (
          <div
            key={r.id}
            style={{
              padding:      "13px 16px",
              borderBottom: i < reminders.length - 1 ? "1px solid rgba(0,0,0,0.04)" : undefined,
            }}
          >
            <p style={{ fontSize: 14, color: "#1C1A2E", fontWeight: 500, lineHeight: 1.35 }}>{r.title}</p>
            {r.body && (
              <p style={{ fontSize: 12, color: "#9E9CB0", marginTop: 3, lineHeight: 1.4 }}>{r.body}</p>
            )}
            {r.why_shown && (
              <p style={{ fontSize: 10, color: "#C4C2D4", marginTop: 4 }}>{r.why_shown}</p>
            )}
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => onComplete(r.id, r.task_id)} className="tap-scale" style={{ ...ghostBtn, color: "#3D9A7A" }}>Done</button>
              <button onClick={() => onSnooze(r.id)} className="tap-scale" style={ghostBtn}>Later</button>
              <button onClick={() => onDismiss(r.id)} className="tap-scale" style={{ ...ghostBtn, opacity: 0.6 }}>Dismiss</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RecurringThemes({ themes }: { themes: TodayIntelligence["recurringThemes"] }) {
  if (themes.length === 0) return null;
  return (
    <section>
      <p style={sectionLabel}>PATTERNS</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {themes.map((t) => (
          <div
            key={t.id}
            style={{
              padding: "8px 14px", borderRadius: 12,
              background: "rgba(108,105,224,0.06)",
              border: "1px solid rgba(108,105,224,0.10)",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <div style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#6C69E0", opacity: Math.max(0.35, t.strength),
            }} />
            <p style={{ fontSize: 13, color: "#64627A", margin: 0 }}>{t.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProactiveInsights({ observations }: { observations: TodayIntelligence["proactiveObservations"] }) {
  const meaningful = observations.filter((o) => o.prompt && o.prompt.length > 15);
  if (meaningful.length === 0) return null;
  return (
    <section>
      <p style={sectionLabel}>INSIGHTS</p>
      <div style={{ ...card, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {meaningful.slice(0, 3).map((o, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 6,
              background: o.kind === "overload" ? "#D4810A" : o.kind === "stress" ? "#C4597A" : "#6C69E0",
              opacity: 0.65,
            }} />
            <p style={{ fontSize: 13, color: "#64627A", lineHeight: 1.5, margin: 0 }}>
              {o.prompt}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ActivePriorities({ priorities }: { priorities: string[] }) {
  if (priorities.length === 0) return null;
  return (
    <section>
      <p style={sectionLabel}>PRIORITIES</p>
      <div style={{ ...card, overflow: "hidden" }}>
        {priorities.map((p, i) => (
          <div
            key={i}
            style={{
              padding: "11px 16px",
              display: "flex", alignItems: "center", gap: 10,
              borderBottom: i < priorities.length - 1 ? "1px solid rgba(0,0,0,0.04)" : undefined,
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: "#6C69E0", opacity: 0.5,
            }} />
            <p style={{ fontSize: 14, color: "#1C1A2E", margin: 0 }}>{p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DomainSignals({ signals }: { signals: TodayIntelligence["domainSignals"] }) {
  const rows = [
    signals.health && { label: "Health", text: signals.health },
    signals.money  && { label: "Money",  text: signals.money },
    signals.life   && { label: "Life",   text: signals.life },
  ].filter(Boolean) as { label: string; text: string }[];

  if (rows.length === 0) return null;

  return (
    <section>
      <p style={sectionLabel}>DOMAIN SIGNALS</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((row) => (
          <div
            key={row.label}
            style={{
              padding: "10px 14px", borderRadius: 12,
              background: "rgba(108,105,224,0.04)",
              border: "1px solid rgba(108,105,224,0.07)",
              display: "flex", gap: 10, alignItems: "baseline",
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: "#6C69E0", letterSpacing: "0.08em", flexShrink: 0 }}>
              {row.label.toUpperCase()}
            </span>
            <p style={{ fontSize: 13, color: "#64627A", lineHeight: 1.4, margin: 0 }}>{row.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Main surface ───────────────────────────────────────────────────────────────

interface Props {
  userName: string;
}

export default function TodayIntelligenceSurface({ userName }: Props) {
  const {
    data, loading, error,
    dismissReminder, snoozeReminder, completeReminder, completeTask,
  } = useTodayIntelligence();

  const name = userName || "there";

  if (loading) return <TodaySkeleton />;

  if (error || !data) {
    return (
      <div style={{ ...card, padding: "20px 18px" }}>
        <p style={{ fontSize: 14, color: "#9E9CB0", lineHeight: 1.5 }}>
          {error ?? "Quiet here. Check back in a bit."}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <GreetingHeader data={data} userName={name} />
      <EmotionalWeatherBar data={data} />
      <MorningFocusSection items={data.morningFocusItems} onComplete={completeTask} />
      <ActiveCommitments data={data} onComplete={completeTask} />
      <ReminderStream
        reminders={data.pendingReminders}
        onDismiss={dismissReminder}
        onSnooze={snoozeReminder}
        onComplete={completeReminder}
      />
      <GentleObservations observations={data.gentleObservations} />
      <ActivePriorities priorities={data.activePriorities} />
      <RecurringThemes themes={data.recurringThemes} />
      <ProactiveInsights observations={data.proactiveObservations} />
      <DomainSignals signals={data.domainSignals} />
    </div>
  );
}
