import PageShell from "@/components/PageShell";
import PageHeader, { LifePageIcon } from "@/components/PageHeader";
import { requireOnboarding } from "@/lib/auth";

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

export default async function GoalsPage() {
  await requireOnboarding();

  return (
    <PageShell>
      <PageHeader icon={<LifePageIcon />} title="Goals" subtitle="Where you're heading." />

      <Card style={{ padding: "28px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#64627A", lineHeight: 1.5, marginBottom: 4 }}>
          Goals are coming soon.
        </p>
        <p style={{ fontSize: 13, color: "#9E9CB0", lineHeight: 1.5 }}>
          This will become your long-term direction layer.
        </p>
      </Card>
    </PageShell>
  );
}
