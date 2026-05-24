import PageShell from "@/components/PageShell";

const PRIORITIES = [
  { id: "1", text: "Review Q2 goals",         done: false },
  { id: "2", text: "Call dentist",             done: true  },
  { id: "3", text: "Finish reading chapter 4", done: false },
];

const CALENDAR = [
  { id: "1", time: "9:00",  title: "Team standup"       },
  { id: "2", time: "12:30", title: "Lunch with Alex"    },
  { id: "3", time: "3:00",  title: "Doctor appointment" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Still up?";
  if (h < 12) return "Good morning, Ryan.";
  if (h < 17) return "Good afternoon, Ryan.";
  if (h < 21) return "Good evening, Ryan.";
  return "Winding down.";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/*
  A single, quietly intelligent sentence derived from the day's data.
  This is what makes the briefing card feel curated rather than generated.
*/
function briefingLine(openCount: number, cal: typeof CALENDAR): string {
  const h    = new Date().getHours();
  const next = cal[0];

  if (openCount === 0 && cal.length === 0) return "Nothing pressing. Rare.";

  if (h < 12) {
    if (openCount === 0) return next ? `Clear list. First up at ${next.time}.` : "Nothing open.";
    if (openCount === 1) return next ? `One thing to close. First up at ${next.time}.` : "One thing to work through.";
    return next
      ? `${openCount} things open. First up at ${next.time}.`
      : `${openCount} things on the list.`;
  }

  if (h < 17) {
    if (openCount === 0)
      return cal.length > 0
        ? `Clear list. ${cal.length === 1 ? "One event" : `${cal.length} events`} left.`
        : "All clear.";
    return openCount === 1 ? "One thing still open." : `${openCount} things still open.`;
  }

  if (openCount === 0) return "Nearly done for the day.";
  return openCount === 1 ? "One thing left open." : `${openCount} things left open.`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const open         = PRIORITIES.filter((p) => !p.done);
  const done         = PRIORITIES.filter((p) =>  p.done);
  const primaryFocus = open[0] ?? null;
  const remaining    = open.slice(1);
  const briefing     = briefingLine(open.length, CALENDAR);

  return (
    <PageShell>

      {/*
        ── Briefing card — the focal anchor ────────────────────────────
        This card IS the daily briefing. Everything below is context.
        It should feel like an envelope that was prepared for you.
      */}
      <div
        className="rounded-[28px] px-6 py-7 mb-12"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-2)",
          boxShadow:
            "0 2px 20px rgba(16,10,4,0.09), 0 6px 40px rgba(16,10,4,0.05)",
        }}
      >
        {/* Date — quiet orientation */}
        <p
          className="text-[11px] font-semibold tracking-[0.09em] mb-4"
          style={{ color: "var(--ink-3)" }}
        >
          {formatDate().toUpperCase()}
        </p>

        {/* Greeting — the card's anchor */}
        <h1
          className="text-[30px] font-bold leading-[1.1] tracking-[-0.03em] mb-3"
          style={{ color: "var(--ink)" }}
        >
          {greeting()}
        </h1>

        {/* Briefing line — the curated insight */}
        <p
          className="text-[16px] font-medium leading-snug"
          style={{ color: "var(--ink-2)" }}
        >
          {briefing}
        </p>

        {/* Primary focus — only if there's something open */}
        {primaryFocus && (
          <>
            <div
              className="my-6"
              style={{ height: 1, background: "var(--border-2)" }}
            />
            <p
              className="text-[11px] font-semibold tracking-[0.08em] mb-2.5"
              style={{ color: "var(--ink-3)" }}
            >
              FOCUS TODAY
            </p>
            <p
              className="text-[17px] font-medium leading-snug"
              style={{ color: "var(--ink)" }}
            >
              {primaryFocus.text}
            </p>
          </>
        )}
      </div>

      {/* ── Remaining open priorities ─────────────────────────────────
          These exist outside the card — quieter, contextual.
          Primary focus is already held in the card above.
      */}
      {remaining.length > 0 && (
        <section className="mb-10">
          <ul>
            {remaining.map((item, i) => (
              <li
                key={item.id}
                className="flex items-center gap-4 py-[15px]"
                style={
                  i < remaining.length - 1
                    ? { borderBottom: "1px solid var(--border-2)" }
                    : undefined
                }
              >
                <span
                  className="flex-none rounded-full shrink-0"
                  style={{
                    width: 17,
                    height: 17,
                    border: "1.5px solid var(--ink-3)",
                  }}
                />
                <span
                  className="text-[16px] leading-snug"
                  style={{ color: "var(--ink)" }}
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Hairline between priorities and schedule */}
      {remaining.length > 0 && CALENDAR.length > 0 && (
        <div
          className="mb-10"
          style={{ height: 1, background: "var(--border-2)" }}
        />
      )}

      {/* ── Schedule — ambient, not primary ──────────────────────────
          Smaller, quieter text. Context for the day, not instructions.
          The next event reads slightly stronger than the rest.
      */}
      {CALENDAR.length > 0 && (
        <section className="mb-14">
          <ul>
            {CALENDAR.map((event, i) => (
              <li
                key={event.id}
                className="flex items-baseline gap-4 py-[11px]"
                style={
                  i < CALENDAR.length - 1
                    ? { borderBottom: "1px solid var(--border-2)" }
                    : undefined
                }
              >
                <span
                  className="tabular-nums flex-none shrink-0 text-[12px]"
                  style={{ color: "var(--ink-3)", width: 38 }}
                >
                  {event.time}
                </span>
                <span
                  className="text-[14px]"
                  style={{
                    color: i === 0 ? "var(--ink-2)" : "var(--ink-3)",
                  }}
                >
                  {event.title}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Done — nearly invisible, not competing ────────────────────
          At 0.25 opacity these read more as memory than status.
      */}
      {done.length > 0 && (
        <section>
          <ul>
            {done.map((item, i) => (
              <li
                key={item.id}
                className="flex items-center gap-4 py-3"
                style={{
                  opacity: 0.25,
                  ...(i < done.length - 1
                    ? { borderBottom: "1px solid var(--border-2)" }
                    : {}),
                }}
              >
                <span
                  className="flex-none shrink-0 rounded-full"
                  style={{ width: 17, height: 17, background: "var(--ink-3)" }}
                />
                <span
                  className="text-[14px] line-through"
                  style={{ color: "var(--ink-2)" }}
                >
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

    </PageShell>
  );
}
