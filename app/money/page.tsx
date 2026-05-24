import PageShell from "@/components/PageShell";

const SUMMARY = {
  balance: 4_820.5,
  income: 6_200,
  spent: 1_379.5,
  month: "May",
};

const TRANSACTIONS = [
  { id: "1", date: "Today",     description: "Whole Foods",     amount: -94.20,  category: "Groceries"     },
  { id: "2", date: "Today",     description: "Netflix",         amount: -15.99,  category: "Subscriptions" },
  { id: "3", date: "Yesterday", description: "Paycheck",        amount: 3100.00, category: "Income"        },
  { id: "4", date: "May 22",    description: "Dinner at Altro", amount: -62.50,  category: "Dining"        },
  { id: "5", date: "May 21",    description: "Amazon",          amount: -38.00,  category: "Shopping"      },
  { id: "6", date: "May 20",    description: "Gas station",     amount: -55.00,  category: "Transport"     },
];

const CATEGORIES = [
  { label: "Groceries",     spent: 240, budget: 400 },
  { label: "Dining",        spent: 180, budget: 250 },
  { label: "Subscriptions", spent: 89,  budget: 100 },
  { label: "Transport",     spent: 110, budget: 150 },
];

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2 });
  return n < 0 ? `−$${abs}` : `+$${abs}`;
}

export default function MoneyPage() {
  return (
    <PageShell>

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="mb-14">
        <h1
          className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em]"
          style={{ color: "var(--ink)" }}
        >
          Money
        </h1>
        <p className="text-[14px] mt-1.5" style={{ color: "var(--ink-3)" }}>
          {SUMMARY.month} overview
        </p>
      </header>

      {/* ── Balance — intentionally elevated; deserves a card ───── */}
      <section className="mb-12">
        <div
          className="rounded-2xl px-5 py-6"
          style={{ background: "var(--user-bubble)", boxShadow: "var(--shadow-raised)" }}
        >
          <p
            className="text-[11px] font-medium tracking-[0.07em] mb-2"
            style={{ color: "rgba(255,255,255,0.35)" }}
          >
            AVAILABLE
          </p>
          <p className="text-[34px] font-semibold tracking-[-0.025em] leading-none text-white">
            ${SUMMARY.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <div
            className="h-px mt-5 mb-4"
            style={{ background: "rgba(255,255,255,0.08)" }}
          />
          <div className="flex gap-8">
            <div>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Income</p>
              <p className="text-[15px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                +${SUMMARY.income.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Spent</p>
              <p className="text-[15px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>
                −${SUMMARY.spent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Budget ──────────────────────────────────────────────── */}
      <section className="mb-12">
        <Eyebrow>Budget</Eyebrow>
        <ul className="space-y-5">
          {CATEGORIES.map((cat) => {
            const pct = Math.min(Math.round((cat.spent / cat.budget) * 100), 100);
            const over = pct >= 88;
            return (
              <li key={cat.label}>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-[15px]" style={{ color: "var(--ink-2)" }}>
                    {cat.label}
                  </span>
                  <span className="text-[12px] tabular-nums" style={{ color: "var(--ink-3)" }}>
                    ${cat.spent} / ${cat.budget}
                  </span>
                </div>
                <div className="h-[2px] rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${pct}%`, background: over ? "#c0735a" : "var(--ink-2)" }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Transactions ─────────────────────────────────────────── */}
      <section>
        <Eyebrow>Recent</Eyebrow>
        <ul>
          {TRANSACTIONS.map((tx, i) => (
            <li
              key={tx.id}
              className="flex items-center gap-3 py-4"
              style={i < TRANSACTIONS.length - 1 ? { borderBottom: "1px solid var(--border-2)" } : undefined}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[15px]" style={{ color: "var(--ink)" }}>
                  {tx.description}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--ink-3)" }}>
                  {tx.category} · {tx.date}
                </p>
              </div>
              <span
                className="text-[15px] font-medium flex-none tabular-nums"
                style={{ color: tx.amount < 0 ? "var(--ink-2)" : "#5a8a6a" }}
              >
                {fmt(tx.amount)}
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
