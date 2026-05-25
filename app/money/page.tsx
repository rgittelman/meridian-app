import PageShell from "@/components/PageShell";
import PageHeader, { MoneyPageIcon } from "@/components/PageHeader";
import { requireOnboarding } from "@/lib/auth";
import { assembleDomainContext } from "@/lib/domains/retrieve";
import { getTasksForUser } from "@/lib/tasks/db";
import { getRemindersForUser } from "@/lib/reminders/db";

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#FFFFFF", borderRadius: 18,
      border: "1px solid rgba(0,0,0,0.06)",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Eyebrow({ children, noMargin = false }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: "#9E9CB0", letterSpacing: "0.08em", marginBottom: noMargin ? 0 : 10 }}>
      {String(children).toUpperCase()}
    </p>
  );
}

export default async function MoneyPage() {
  const profile = await requireOnboarding();

  let memories: { id: string; title: string; summary: string | null; category: string }[] = [];
  let themes: string[] = [];
  let tasks: { id: string; title: string; due_date: string | null }[] = [];
  let reminders: { id: string; title: string; body: string | null }[] = [];

  try {
    const [ctx, t, r] = await Promise.all([
      assembleDomainContext(profile.id, "money"),
      getTasksForUser(profile.id, { status: ["open", "snoozed"], limit: 5 }),
      getRemindersForUser(profile.id, { status: "pending", limit: 3 }),
    ]);
    memories = ctx.memories.map((m) => ({ id: m.id, title: m.title, summary: m.summary, category: m.category }));
    themes = ctx.themes;
    const moneyTasks = t.filter((x) => x.domains?.includes("money"));
    tasks = (moneyTasks.length > 0 ? moneyTasks : t.slice(0, 3)).map((x) => ({ id: x.id, title: x.title, due_date: x.due_date }));
    reminders = r.map((x) => ({ id: x.id, title: x.title, body: x.body }));
  } catch {
    // Fallback to empty
  }

  const hasData = memories.length > 0 || tasks.length > 0;

  return (
    <PageShell>
      <PageHeader icon={<MoneyPageIcon />} title="Money" subtitle="Clarity in every decision." />

      {/* ── Money themes ──────────────────────────────────────── */}
      {themes.length > 0 && (
        <section className="mb-4">
          <Eyebrow>Financial Themes</Eyebrow>
          <Card style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {themes.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4810A", opacity: 0.6, flexShrink: 0 }} />
                  <p style={{ fontSize: 14, color: "#3A3860", lineHeight: 1.4, margin: 0 }}>{t}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* ── Money tasks ───────────────────────────────────────── */}
      {tasks.length > 0 && (
        <section className="mb-4">
          <Eyebrow>Financial Focus</Eyebrow>
          <Card>
            <ul style={{ padding: "4px 0" }}>
              {tasks.map((item, i) => (
                <li key={item.id} style={{ padding: "14px 18px", ...(i < tasks.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.04)" } : {}) }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#3A3860" }}>{item.title}</span>
                    {item.due_date && <span style={{ fontSize: 12, color: "#9E9CB0" }}>{item.due_date}</span>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* ── Reminders ─────────────────────────────────────────── */}
      {reminders.length > 0 && (
        <section className="mb-4">
          <Eyebrow>Reminders</Eyebrow>
          <Card>
            <ul style={{ padding: "4px 0" }}>
              {reminders.map((r, i) => (
                <li key={r.id} style={{ padding: "12px 18px", ...(i < reminders.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.04)" } : {}) }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#3A3860" }}>{r.title}</p>
                  {r.body && <p style={{ fontSize: 12, color: "#9E9CB0", marginTop: 2 }}>{r.body}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* ── Financial memories ─────────────────────────────────── */}
      {memories.length > 0 && (
        <section className="mb-6">
          <Eyebrow>What Meridian remembers</Eyebrow>
          <Card>
            <ul style={{ padding: "4px 0" }}>
              {memories.map((m, i) => (
                <li key={m.id} style={{ padding: "14px 18px", ...(i < memories.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.04)" } : {}) }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#3A3860", marginBottom: 3 }}>{m.title}</p>
                  {m.summary && <p style={{ fontSize: 13, color: "#9E9CB0", lineHeight: 1.45 }}>{m.summary}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!hasData && (
        <Card style={{ padding: "28px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#64627A", lineHeight: 1.5 }}>
            Nothing here yet. Talk about money, spending, or goals — clarity will build.
          </p>
        </Card>
      )}
    </PageShell>
  );
}
