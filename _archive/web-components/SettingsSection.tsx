/**
 * SettingsSection — titled section wrapper for the settings page.
 */

interface SettingsSectionProps {
  title:    string;
  children: React.ReactNode;
}

export default function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <section style={{ marginBottom: 32 }}>
      <p
        style={{
          fontSize:      11,
          fontWeight:    600,
          color:         "#B0AEC4",
          letterSpacing: "0.09em",
          marginBottom:  10,
          paddingLeft:   2,
        }}
      >
        {title.toUpperCase()}
      </p>
      <div
        style={{
          background:   "#FFFFFF",
          borderRadius: 18,
          border:       "1px solid rgba(0,0,0,0.06)",
          boxShadow:    "0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.04)",
          overflow:     "hidden",
        }}
      >
        {children}
      </div>
    </section>
  );
}

// ─── Row primitives ───────────────────────────────────────────────────────────

interface SettingsRowProps {
  label:     string;
  value?:    string;
  action?:   React.ReactNode;
  danger?:   boolean;
  border?:   boolean;
}

export function SettingsRow({
  label,
  value,
  action,
  danger  = false,
  border  = true,
}: SettingsRowProps) {
  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "center",
        padding:      "14px 16px",
        gap:          12,
        borderBottom: border ? "1px solid rgba(0,0,0,0.045)" : "none",
      }}
    >
      <p
        style={{
          flex:       1,
          fontSize:   14,
          fontWeight: 400,
          color:      danger ? "#E03E3E" : "#1C1A2E",
          lineHeight: 1.3,
        }}
      >
        {label}
      </p>
      {value && (
        <p style={{ fontSize: 13, color: "#9E9CB0" }}>{value}</p>
      )}
      {action}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

interface SettingsToggleProps {
  enabled:   boolean;
  onToggle:  () => void;
}

export function SettingsToggle({ enabled, onToggle }: SettingsToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={enabled}
      role="switch"
      style={{
        width:          44,
        height:         26,
        borderRadius:   13,
        background:     enabled ? "#6C69E0" : "rgba(0,0,0,0.12)",
        border:         "none",
        cursor:         "pointer",
        position:       "relative",
        flexShrink:     0,
        transition:     "background 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        minHeight:      44,
        display:        "flex",
        alignItems:     "center",
      }}
    >
      <span
        style={{
          position:   "absolute",
          top:        3,
          left:       enabled ? 21 : 3,
          width:      20,
          height:     20,
          borderRadius: "50%",
          background: "#FFFFFF",
          boxShadow:  "0 1px 3px rgba(0,0,0,0.18)",
          transition: "left 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      />
    </button>
  );
}
