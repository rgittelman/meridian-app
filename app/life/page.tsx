import PageShell from "@/components/PageShell";
import PageHeader, { LifePageIcon } from "@/components/PageHeader";
import { requireOnboarding } from "@/lib/auth";
import { assembleDomainContext } from "@/lib/domains/retrieve";
import { getTasksForUser } from "@/lib/tasks/db";
import { getRemindersForUser } from "@/lib/reminders/db";

// ─── Fallback data ────────────────────────────────────────────────────────────

const AREAS = [
  { id: "1", label: "Projects",      sub: "Track active projects",   bg: "#EEEDFB", accent: "#6C69E0", iconPath: "M12 2l3.09 6.26L22 9.27 17 14.14l1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
  { id: "2", label: "Goals",         sub: "What you're working on",  bg: "#FFF5E6", accent: "#D4810A", iconPath: "M12 2a6 6 0 016 6c0 2.22-1.21 4.16-3 5.19V22H9v-8.81A6.002 6.002 0 0112 2z" },
  { id: "3", label: "Relationships", sub: "People who matter",       bg: "#FFE8F3", accent: "#C4597A", iconPath: "M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" },
  { id: "4", label: "Personal",      sub: "Growth & wellbeing",      bg: "#E6F5F0", accent: "#3A9A7A", iconPath: "M12 22V12m0 0s-5-3-5-7.5a5 5 0 0110 0C17 9 12 12 12 12z" },
];

// ─── Shared card ──────────────────────────────────────────────────────────────

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: "#9E9CB0", letterSpacing: "0.08em", marginBottom: 10 }}>
      {String(children).toUpperCase()}
    </p>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LifePage() {
  const profile = await requireOnboarding();

  let domainContext: { themes: string[]; memories: { id: string; title: string; summary: string | null; category: string }[] } = { themes: [], memories: [] };
  let tasks: { id: string; title: string; due_date: string | null; status: string }[] = [];
  let reminders: { id: string; title: string; body: string | null }[] = [];

  try {
    const [ctx, t, r] = await Promise.all([
      assembleDomainContext(profile.id, "life"),
      getTasksForUser(profile.id, { status: ["open", "snoozed"], limit: 5 }),
      getRemindersForUser(profile.id, { status: "pending", limit: 3 }),
    ]);
    domainContext = {
      themes: ctx.themes,
      memories: ctx.memories.map((m) => ({ id: m.id, title: m.title, summary: m.summary, category: m.category })),
    };
    tasks = t.map((x) => ({ id: x.id, title: x.title, due_date: x.due_date, status: x.status }));
    reminders = r.map((x) => ({ id: x.id, title: x.title, body: x.body }));
  } catch {
    // Fallback to empty state
  }

  const hasData = domainContext.memories.length > 0 || tasks.length > 0 || reminders.length > 0;

  return (
    <PageShell>
      <PageHeader icon={<LifePageIcon />} title="Life" subtitle="Everything that matters." />

      {/* ── Areas grid ────────────────────────────────────────── */}
      <section className="mb-6">
        <Eyebrow>Areas</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {AREAS.map((area) => (
            <div key={area.id} style={{ background: area.bg, borderRadius: 16, padding: "16px 14px", border: "1px solid rgba(0,0,0,0.04)" }}>
              <div style={{ marginBottom: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={area.accent} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d={area.iconPath} />
                </svg>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#1C1A2E", marginBottom: 2 }}>{area.label}</p>
              <p style={{ fontSize: 12, color: "#9E9CB0" }}>{area.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tasks ─────────────────────────────────────────────── */}
      {tasks.length > 0 && (
        <section className="mb-6">
          <Eyebrow>Focus</Eyebrow>
          <Card>
            <ul style={{ padding: "4px 0" }}>
              {tasks.map((item, i) => (
                <li key={item.id} style={{ padding: "14px 18px", ...(i < tasks.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.04)" } : {}) }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#3A3860", flex: 1, paddingRight: 12 }}>{item.title}</span>
                    {item.due_date && (
                      <span style={{ fontSize: 12, color: "#9E9CB0", flexShrink: 0 }}>{item.due_date}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* ── Reminders ─────────────────────────────────────────── */}
      {reminders.length > 0 && (
        <section className="mb-6">
          <Eyebrow>Reminders</Eyebrow>
          <ul>
            {reminders.map((r, i) => (
              <li key={r.id} className="flex items-center gap-3 py-3" style={i < reminders.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.05)" } : undefined}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "rgba(108,105,224,0.40)", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, color: "#3A3860" }}>{r.title}</span>
                  {r.body && <p style={{ fontSize: 12, color: "#9E9CB0", marginTop: 2 }}>{r.body}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Domain memories ───────────────────────────────────── */}
      {domainContext.memories.length > 0 && (
        <section className="mb-6">
          <Eyebrow>What Meridian remembers</Eyebrow>
          <Card>
            <ul style={{ padding: "4px 0" }}>
              {domainContext.memories.map((m, i) => (
                <li key={m.id} style={{ padding: "14px 18px", ...(i < domainContext.memories.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.04)" } : {}) }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#3A3860", marginBottom: 3 }}>{m.title}</p>
                  {m.summary && <p style={{ fontSize: 13, color: "#9E9CB0", lineHeight: 1.45 }}>{m.summary}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {/* ── Themes ────────────────────────────────────────────── */}
      {domainContext.themes.length > 0 && (
        <section className="mb-6">
          <Eyebrow>Themes</Eyebrow>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {domainContext.themes.map((t, i) => (
              <div key={i} style={{
                padding: "8px 14px", borderRadius: 12,
                background: "rgba(108,105,224,0.06)", border: "1px solid rgba(108,105,224,0.10)",
              }}>
                <p style={{ fontSize: 13, color: "#64627A", margin: 0 }}>{t}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {!hasData && (
        <Card style={{ padding: "28px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#64627A", lineHeight: 1.5 }}>
            Nothing here yet. As you talk to Meridian, what matters will surface.
          </p>
        </Card>
      )}
    </PageShell>
  );
}
