import PageShell from "@/components/PageShell";

const TASKS = [
  { id: "1", title: "Book flight to Chicago",      category: "Travel",        done: false },
  { id: "2", title: "Finish reading Atomic Habits", category: "Growth",        done: false },
  { id: "3", title: "Call mom on Sunday",           category: "Relationships", done: true  },
  { id: "4", title: "Renew car registration",       category: "Admin",         done: false },
];

const GOALS = [
  { id: "1", title: "Read 12 books this year", progress: 4,  total: 12  },
  { id: "2", title: "Meditate 100 days",        progress: 23, total: 100 },
  { id: "3", title: "Learn Spanish basics",     progress: 10, total: 30  },
];

export default function LifePage() {
  const open = TASKS.filter((t) => !t.done);
  const done = TASKS.filter((t) => t.done);

  return (
    <PageShell>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="mb-14">
        <h1
          className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em]"
          style={{ color: "var(--ink)" }}
        >
          Life
        </h1>
        <p className="text-[14px] mt-1.5" style={{ color: "var(--ink-3)" }}>
          What you're working on.
        </p>
      </header>

      {/* ── Tasks ───────────────────────────────────────────────── */}
      {open.length > 0 && (
        <section className="mb-12">
          <Eyebrow>Open</Eyebrow>
          <ul>
            {open.map((task, i) => (
              <li
                key={task.id}
                className="flex items-center gap-4 py-4"
                style={i < open.length - 1 ? { borderBottom: "1px solid var(--border-2)" } : undefined}
              >
                <span
                  className="w-[18px] h-[18px] rounded-full flex-none shrink-0"
                  style={{ border: "1.5px solid var(--border)" }}
                />
                <span className="text-[16px] flex-1 min-w-0 leading-snug" style={{ color: "var(--ink)" }}>
                  {task.title}
                </span>
                <span
                  className="text-[11px] font-medium flex-none"
                  style={{ color: "var(--ink-3)" }}
                >
                  {task.category}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Goals ───────────────────────────────────────────────── */}
      <section className="mb-12">
        <Eyebrow>Goals</Eyebrow>
        <ul className="space-y-6">
          {GOALS.map((goal) => {
            const pct = Math.round((goal.progress / goal.total) * 100);
            return (
              <li key={goal.id}>
                <div className="flex justify-between items-baseline mb-2.5">
                  <span className="text-[15px] leading-snug" style={{ color: "var(--ink-2)" }}>
                    {goal.title}
                  </span>
                  <span className="text-[12px] tabular-nums ml-4 flex-none" style={{ color: "var(--ink-3)" }}>
                    {goal.progress} / {goal.total}
                  </span>
                </div>
                <div className="h-[2px] rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: "var(--ink-2)" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Done ────────────────────────────────────────────────── */}
      {done.length > 0 && (
        <section>
          <Eyebrow>Done</Eyebrow>
          <ul>
            {done.map((task, i) => (
              <li
                key={task.id}
                className="flex items-center gap-4 py-4 opacity-35"
                style={i < done.length - 1 ? { borderBottom: "1px solid var(--border-2)" } : undefined}
              >
                <span
                  className="w-[18px] h-[18px] rounded-full flex-none shrink-0"
                  style={{ background: "var(--ink-3)" }}
                />
                <span
                  className="text-[15px] line-through leading-snug"
                  style={{ color: "var(--ink-2)" }}
                >
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
