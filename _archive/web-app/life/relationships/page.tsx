import PageShell from "@/components/PageShell";
import PageHeader, { LifePageIcon } from "@/components/PageHeader";
import { requireOnboarding } from "@/lib/auth";
import { getMemoriesForUser } from "@/lib/memory/db";

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

export default async function RelationshipsPage() {
  const profile = await requireOnboarding();

  let memories: { id: string; title: string; summary: string | null }[] = [];

  try {
    const all = await getMemoriesForUser(profile.id, {
      categories: ["relationships"],
      limit: 10,
    });
    memories = all.map((m) => ({ id: m.id, title: m.title, summary: m.summary }));
  } catch {
    // Fallback to empty
  }

  return (
    <PageShell>
      <PageHeader icon={<LifePageIcon />} title="Relationships" subtitle="People who matter." />

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

      {memories.length === 0 && (
        <Card style={{ padding: "28px 20px", textAlign: "center" }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "#64627A", lineHeight: 1.5, marginBottom: 4 }}>
            Nothing in Relationships yet.
          </p>
          <p style={{ fontSize: 13, color: "#9E9CB0", lineHeight: 1.5 }}>
            Capture important moments, reminders, or people-related notes.
          </p>
        </Card>
      )}
    </PageShell>
  );
}
