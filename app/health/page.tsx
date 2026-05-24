import PageShell from "@/components/PageShell";

const STATS = [
  { label: "Sleep",  value: "7h 20m", sub: "last night",   icon: "🌙" },
  { label: "Steps",  value: "8,240",  sub: "today",        icon: "🚶" },
  { label: "Mood",   value: "Good",   sub: "this morning", icon: "☀️" },
  { label: "Weight", value: "174 lb", sub: "2 days ago",   icon: "⚖️" },
];

const LOGS = [
  { id: "1", date: "Today",     type: "Sleep",    value: "7h 20m",   note: "Felt rested" },
  { id: "2", date: "Today",     type: "Exercise", value: "30 min run", note: "" },
  { id: "3", date: "Yesterday", type: "Sleep",    value: "6h 45m",   note: "Up late" },
  { id: "4", date: "Yesterday", type: "Mood",     value: "Okay",     note: "Stressful day" },
  { id: "5", date: "May 22",    type: "Weight",   value: "174 lb",   note: "" },
];

export default function HealthPage() {
  return (
    <PageShell>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="mb-14">
        <h1
          className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em]"
          style={{ color: "var(--ink)" }}
        >
          Health
        </h1>
        <p className="text-[14px] mt-1.5" style={{ color: "var(--ink-3)" }}>
          Your wellbeing at a glance.
        </p>
      </header>

      {/* ── Snapshot — keep cards; they're quantitative, not list items ── */}
      <section className="mb-12">
        <Eyebrow>Snapshot</Eyebrow>
        <div className="grid grid-cols-2 gap-3">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl px-4 py-4"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-2)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <span className="text-[22px] leading-none block mb-3">{stat.icon}</span>
              <p
                className="text-[19px] font-semibold leading-none tracking-[-0.01em]"
                style={{ color: "var(--ink)" }}
              >
                {stat.value}
              </p>
              <p className="text-[12px] mt-1" style={{ color: "var(--ink-3)" }}>
                {stat.label} · {stat.sub}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Log ─────────────────────────────────────────────────── */}
      <section>
        <Eyebrow>Log</Eyebrow>
        <ul>
          {LOGS.map((log, i) => (
            <li
              key={log.id}
              className="flex items-start gap-5 py-4"
              style={i < LOGS.length - 1 ? { borderBottom: "1px solid var(--border-2)" } : undefined}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="text-[15px] font-medium" style={{ color: "var(--ink)" }}>
                    {log.value}
                  </span>
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {log.type}
                  </span>
                </div>
                {log.note && (
                  <p className="text-[13px] mt-0.5" style={{ color: "var(--ink-3)" }}>
                    {log.note}
                  </p>
                )}
              </div>
              <span
                className="text-[12px] flex-none tabular-nums pt-0.5"
                style={{ color: "var(--ink-3)" }}
              >
                {log.date}
              </span>
            </li>
          ))}
        </ul>
      </section>

    </PageShell>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-semibold tracking-[0.08em] mb-1"
      style={{ color: "var(--ink-3)" }}
    >
      {String(children).toUpperCase()}
    </p>
  );
}
