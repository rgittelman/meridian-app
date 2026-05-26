"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LeafSvg } from "@/components/PageHeader";
import { haptic } from "@/lib/haptics";

const NAV_ITEMS = [
  { label: "Today",  href: "/",       icon: SunIcon    },
  { label: "Chat",   href: "/chat",   icon: ChatIcon   },
  { label: "Life",   href: "/life",   icon: LifeIcon   },
  { label: "Health", href: "/health", icon: HealthIcon },
  { label: "Money",  href: "/money",  icon: MoneyIcon  },
];

// Routes where the bottom nav is hidden
const HIDDEN_ON = ["/login", "/signup", "/onboarding", "/settings"];

export default function BottomNav() {
  const pathname = usePathname();

  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "var(--nav-bg)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "var(--shadow-nav)",
        willChange: "transform",
        transform: "translateZ(0)",
      }}
    >
      {/*
        Explicit min-height prevents any content-driven layout shift.
        Items are centered within a fixed 60px band; safe-area is added below.
      */}
      <div
        className="flex items-center justify-around max-w-lg mx-auto"
        style={{ height: 60 }}
      >
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => { if (!active) haptic.light(); }}
              className="flex flex-col items-center gap-[3px] transition-opacity duration-150"
              style={{
                width: 56,
                minHeight: 44,
                paddingTop: 6,
                paddingBottom: 6,
                color: active ? "var(--nav-active)" : "var(--nav-inactive)",
                justifyContent: "center",
              }}
            >
              {/* Icon wrapper: fixed size prevents any icon-shape shift */}
              <span className="flex items-center justify-center" style={{ width: 22, height: 22 }}>
                <Icon active={active} />
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "0.025em",
                  color: active ? "var(--nav-active)" : "var(--nav-inactive)",
                  lineHeight: 1,
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* iOS home indicator clearance */}
      <div style={{ height: "env(safe-area-inset-bottom, 0px)", background: "var(--nav-bg)" }} />
    </nav>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
// All icons: 22×22 viewport, strokeLinecap="round", strokeLinejoin="round"
// active=2px stroke, inactive=1.5px — consistent across all five.

function SunIcon({ active }: { active: boolean }) {
  const w = active ? 2 : 1.5;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2"    x2="12" y2="5"    />
      <line x1="12" y1="19"   x2="12" y2="22"   />
      <line x1="4.22" y1="4.22"   x2="6.34" y2="6.34"   />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2"  y1="12"   x2="5"  y2="12"   />
      <line x1="19" y1="12"   x2="22" y2="12"   />
      <line x1="4.22" y1="19.78"  x2="6.34" y2="17.66"  />
      <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"  />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  const w = active ? 2 : 1.5;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// Life: leaf — same icon as the Life page header chip
function LifeIcon({ active }: { active: boolean }) {
  return <LeafSvg size={22} strokeWidth={active ? 2 : 1.5} />;
}

function HealthIcon({ active }: { active: boolean }) {
  const w = active ? 2 : 1.5;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

// Money: credit card — clean, premium, universally understood
function MoneyIcon({ active }: { active: boolean }) {
  const w = active ? 2 : 1.5;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="9" y2="15" />
    </svg>
  );
}
