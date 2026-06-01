"use client";

/**
 * InlineTimePicker — Custom time selector that renders inline (no native popup).
 * Hour wheel, 5-minute increments, AM/PM toggle, quick presets.
 * Outputs HH:MM in 24h format to match <input type="time"> value format.
 */

import { useState, useCallback, useEffect } from "react";

const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const PRESETS: { label: string; h: number; m: number }[] = [
  { label: "Morning",   h: 9,  m: 0 },
  { label: "Afternoon", h: 13, m: 0 },
  { label: "Evening",   h: 18, m: 0 },
  { label: "Tonight",   h: 20, m: 0 },
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  accentColor?: string;
}

function parse24(val: string): { h12: number; min: number; ampm: "AM" | "PM" } {
  if (!val) return { h12: 12, min: 0, ampm: "AM" };
  const [hStr, mStr] = val.split(":");
  let h = parseInt(hStr, 10) || 0;
  const min = parseInt(mStr, 10) || 0;
  const ampm: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return { h12: h, min, ampm };
}

function to24(h12: number, min: number, ampm: "AM" | "PM"): string {
  let h = h12;
  if (ampm === "AM" && h === 12) h = 0;
  else if (ampm === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

const pillBtn: React.CSSProperties = {
  border: "none", cursor: "pointer",
  borderRadius: 10, fontSize: 13, fontWeight: 600,
  padding: "7px 0", textAlign: "center",
  transition: "all 0.12s ease",
};

export default function InlineTimePicker({ value, onChange, accentColor = "#6C69E0" }: Props) {
  const parsed = parse24(value);
  const [hour, setHour]   = useState(parsed.h12);
  const [minute, setMinute] = useState(parsed.min);
  const [ampm, setAmpm]   = useState(parsed.ampm);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (value) {
      const p = parse24(value);
      setHour(p.h12);
      setMinute(p.min);
      setAmpm(p.ampm);
    }
  }, [value]);

  const commit = useCallback((h: number, m: number, ap: "AM" | "PM") => {
    onChange(to24(h, m, ap));
  }, [onChange]);

  const selectHour = (h: number) => { setHour(h); commit(h, minute, ampm); };
  const selectMinute = (m: number) => { setMinute(m); commit(hour, m, ampm); };
  const toggleAmPm = () => {
    const next = ampm === "AM" ? "PM" : "AM";
    setAmpm(next);
    commit(hour, minute, next);
  };
  const selectPreset = (p: typeof PRESETS[number]) => {
    const { h12, min, ampm: ap } = parse24(to24FromRaw(p.h, p.m));
    setHour(h12);
    setMinute(min);
    setAmpm(ap);
    onChange(to24FromRaw(p.h, p.m));
  };
  const clearTime = () => { onChange(""); setExpanded(false); };

  const displayText = value
    ? `${hour}:${String(minute).padStart(2, "0")} ${ampm}`
    : "Set time";

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        type="button"
        style={{
          width: "100%", fontSize: 15, color: value ? "#1C1A2E" : "#B0AEC4",
          padding: "10px 12px", borderRadius: 10,
          border: "1px solid rgba(0,0,0,0.08)",
          background: "rgba(0,0,0,0.02)", textAlign: "left",
          cursor: "pointer", boxSizing: "border-box",
        }}
      >
        {displayText}
      </button>
    );
  }

  return (
    <div style={{
      border: `1.5px solid ${accentColor}30`,
      borderRadius: 14, background: "#FAFAFE",
      padding: 12,
    }}>
      {/* Presets */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => selectPreset(p)}
            className="tap-scale"
            style={{
              ...pillBtn,
              flex: 1,
              background: "rgba(108,105,224,0.06)",
              color: "#6C69E0",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Hour grid */}
      <p style={{ fontSize: 10, fontWeight: 600, color: "#B0AEC4", letterSpacing: "0.08em", marginBottom: 6 }}>HOUR</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 10 }}>
        {HOURS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => selectHour(h)}
            className="tap-scale"
            style={{
              ...pillBtn,
              background: hour === h ? accentColor : "rgba(0,0,0,0.03)",
              color: hour === h ? "#FFFFFF" : "#64627A",
              fontWeight: hour === h ? 700 : 500,
            }}
          >
            {h}
          </button>
        ))}
      </div>

      {/* Minute grid */}
      <p style={{ fontSize: 10, fontWeight: 600, color: "#B0AEC4", letterSpacing: "0.08em", marginBottom: 6 }}>MINUTE</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginBottom: 10 }}>
        {MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => selectMinute(m)}
            className="tap-scale"
            style={{
              ...pillBtn,
              background: minute === m ? accentColor : "rgba(0,0,0,0.03)",
              color: minute === m ? "#FFFFFF" : "#64627A",
              fontWeight: minute === m ? 700 : 500,
            }}
          >
            :{String(m).padStart(2, "0")}
          </button>
        ))}
      </div>

      {/* AM/PM + Clear row */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          type="button"
          onClick={toggleAmPm}
          className="tap-scale"
          style={{
            ...pillBtn, flex: 1,
            background: ampm === "AM" ? accentColor : "rgba(0,0,0,0.04)",
            color: ampm === "AM" ? "#FFFFFF" : "#64627A",
          }}
        >
          AM
        </button>
        <button
          type="button"
          onClick={toggleAmPm}
          className="tap-scale"
          style={{
            ...pillBtn, flex: 1,
            background: ampm === "PM" ? accentColor : "rgba(0,0,0,0.04)",
            color: ampm === "PM" ? "#FFFFFF" : "#64627A",
          }}
        >
          PM
        </button>
        <button
          type="button"
          onClick={clearTime}
          className="tap-scale"
          style={{
            ...pillBtn, flex: 1,
            background: "rgba(224,62,62,0.05)",
            color: "#C4597A",
          }}
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="tap-scale"
          style={{
            ...pillBtn, flex: 1,
            background: "rgba(61,154,122,0.08)",
            color: "#3D9A7A",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

function to24FromRaw(h24: number, min: number): string {
  return `${String(h24).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}
