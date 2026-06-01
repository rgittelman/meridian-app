import PageShell from "@/components/PageShell";
import PageHeader, { LifePageIcon } from "@/components/PageHeader";
import { requireOnboarding } from "@/lib/auth";
import { getTasksForUser } from "@/lib/tasks/db";

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

export default async function ProjectsPage() {
  const profile = await requireOnboarding();

  let tasks: { id: string; title: string; due_date: string | null; status: string }[] = [];

  try {
    const t = await getTasksForUser(profile.id, { status: ["open", "snoozed"], limit: 20 });
    tasks = t
      .filter((x) => x.task_type === "hard" || x.domains?.includes("life"))
      .slice(0, 10)
      .map((x) => ({ id: x.id, title: x.title, due_date: x.due_date, status: x.status }));
  } catch {
    // Fallback to empty
  }

  return (
    <PageShell>
      <PageHeader icon={<LifePageIcon />} title="Projects" subtitle="Open commitments and active work." />

      {tasks.length > 0 && (
        <section className="mb-6">
          <Eyebrow>Active</Eyebrow>
          <Card>
            <ul style={{ padding: "4px 0" }}>
              {tasks.map((item, i) => (
                <li key={item.id} style={{ padding: "14px 18px", ...(i < tasks.length - 1 ? { borderBottom: "1px solid rgba(0,0,0,0.04)" } : {}) }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

      {tasks.length === 0 && (
        <Card style={{ padding: "28px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#64627A", lineHeight: 1.5, marginBottom: 4 }}>
            No active projects yet.
          </p>
          <p style={{ fontSize: 13, color: "#9E9CB0", lineHeight: 1.5 }}>
            Tasks and commitments will appear here as you add them.
          </p>
        </Card>
      )}
    </PageShell>
  );
}
