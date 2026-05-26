import { space, color, textStyle, radius } from "@/lib/design/tokens";

interface PageHeaderProps {
  icon:     React.ReactNode;
  title:    string;
  subtitle: string;
  mb?:      number;
}

export default function PageHeader({
  icon,
  title,
  subtitle,
  mb = 24,
}: PageHeaderProps) {
  return (
    <div style={{ paddingBottom: mb }}>
      <div style={{ display: "flex", alignItems: "center", gap: space[3], marginBottom: space[1] }}>
        {icon}
        <h1 style={{ ...textStyle("display"), color: color.ink, margin: 0 }}>
          {title}
        </h1>
      </div>
      <p style={{ ...textStyle("caption"), color: color.tertiary, margin: 0 }}>
        {subtitle}
      </p>
    </div>
  );
}

// ─── Icon chips ───────────────────────────────────────────────────────────────
// Small 32×32 chips with 10px radius — matching the compact reference style.

export function TodayIcon() {
  return (
    <Chip bg="#FFF5E6">
      <svg
        width="18" height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#D4810A"
        strokeWidth={1.8}
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <line x1="12" y1="2"    x2="12" y2="5.5"  />
        <line x1="12" y1="18.5" x2="12" y2="22"   />
        <line x1="4.22"  y1="4.22"  x2="6.34"  y2="6.34"  />
        <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
        <line x1="2"     y1="12"    x2="5.5"   y2="12"    />
        <line x1="18.5"  y1="12"    x2="22"    y2="12"    />
        <line x1="4.22"  y1="19.78" x2="6.34"  y2="17.66" />
        <line x1="17.66" y1="6.34"  x2="19.78" y2="4.22"  />
      </svg>
    </Chip>
  );
}

export function ChatPageIcon() {
  return (
    <Chip bg="#EEEDFB">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="#6C69E0">
        <path d="M12 2 L13.5 9.5 L21 12 L13.5 14.5 L12 22 L10.5 14.5 L3 12 L10.5 9.5 Z" />
      </svg>
    </Chip>
  );
}

export function LifePageIcon() {
  return (
    <Chip bg="#E6F5F0">
      <LeafSvg size={18} color="#3A9A7A" strokeWidth={1.8} />
    </Chip>
  );
}

/** Shared leaf SVG — used by both the page header chip and the bottom nav icon */
export function LeafSvg({
  size,
  color = "currentColor",
  strokeWidth = 1.8,
}: {
  size: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Leaf body — pointed top, rounded bottom */}
      <path d="M12 2C9 2 4 7 4 13a8 8 0 0 0 16 0C20 7 15 2 12 2Z" />
      {/* Stem */}
      <line x1="12" y1="21" x2="12" y2="23" />
      {/* Midrib vein */}
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  );
}

export function HealthPageIcon() {
  return (
    <Chip bg="#FFE8F3">
      <svg
        width="18" height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#C4597A"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </Chip>
  );
}

export function MoneyPageIcon() {
  return (
    <Chip bg="#E6EEFB">
      <svg
        width="18" height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4A7EC4"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="7" width="20" height="13" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    </Chip>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ bg, children }: { bg: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width:          32,
        height:         32,
        borderRadius:   radius.sm,
        background:     bg,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        flexShrink:     0,
      }}
    >
      {children}
    </div>
  );
}
