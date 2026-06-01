"use client";

/**
 * BuildUpdateChecker — Polling-based update detection + build badge + update banner.
 *
 * Every 30 s, fetches /api/version (cache: no-store).
 * If the returned buildId differs from the current build, shows an update banner.
 * Also renders a tiny build badge in the bottom-left for dev/beta testing.
 */

import { useEffect, useState, useCallback, useRef } from "react";

const BUILD_ID  = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const BUILT_AT  = process.env.NEXT_PUBLIC_BUILT_AT ?? null;
const POLL_MS   = 30_000;

function shortBuild(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function formatBuiltAt(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

export default function BuildUpdateChecker() {
  const [newBuild, setNewBuild]     = useState<string | null>(null);
  const [lastCheck, setLastCheck]   = useState<string | null>(null);
  const [showBadge, setShowBadge]   = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkVersion = useCallback(async () => {
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
      setLastCheck(now);

      console.log(`[PWA ${ts()}] current build: ${BUILD_ID}, fetched build: ${data.buildId}`);

      if (data.buildId && data.buildId !== BUILD_ID) {
        console.log(`[PWA ${ts()}] update available: ${BUILD_ID} → ${data.buildId}`);
        setNewBuild(data.buildId);
      }
    } catch {
      // Network error — skip
    }
  }, []);

  useEffect(() => {
    console.log(`[PWA ${ts()}] BuildUpdateChecker mounted. build=${BUILD_ID}, builtAt=${BUILT_AT}`);

    // Register SW (minimal, no aggressive caching)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Initial check after 3s (avoid blocking startup)
    const initTimeout = setTimeout(checkVersion, 3000);

    // Poll every 30s when visible
    pollRef.current = setInterval(() => {
      if (document.visibilityState === "visible") {
        checkVersion();
      }
    }, POLL_MS);

    return () => {
      clearTimeout(initTimeout);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkVersion]);

  const handleRefresh = useCallback(() => {
    console.log(`[PWA ${ts()}] manual reload triggered`);
    caches.keys().then((names) => {
      console.log(`[PWA ${ts()}] clearing ${names.length} caches`);
      return Promise.all(names.map((n) => caches.delete(n)));
    }).finally(() => {
      window.location.reload();
    });
  }, []);

  return (
    <>
      {/* Update banner — shown when new build detected */}
      {newBuild && (
        <div
          style={{
            position: "fixed",
            bottom: "calc(60px + env(safe-area-inset-bottom, 0px) + 80px)",
            left: 16,
            right: 16,
            zIndex: 100,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              background: "rgba(28,26,46,0.92)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              color: "#FFFFFF",
              borderRadius: 22,
              padding: "8px 8px 8px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 12px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.06) inset",
              maxWidth: 320,
              width: "auto",
              animation: "toast-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both",
              pointerEvents: "auto",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 500, flex: 1, whiteSpace: "nowrap" }}>
              New build available
            </span>
            <button
              onClick={handleRefresh}
              style={{
                background: "rgba(108,105,224,0.85)",
                border: "none",
                borderRadius: 14,
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 14px",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Build badge — tiny, bottom-left, tap to toggle details */}
      {showBadge && (
        <div
          onClick={() => setShowBadge(false)}
          style={{
            position: "fixed",
            bottom: "calc(60px + env(safe-area-inset-bottom, 0px) + 6px)",
            left: 8,
            zIndex: 40,
            background: "rgba(28,26,46,0.55)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "rgba(255,255,255,0.7)",
            borderRadius: 8,
            padding: "3px 8px",
            fontSize: 9,
            fontWeight: 500,
            fontFamily: "monospace",
            cursor: "pointer",
            letterSpacing: "0.02em",
            lineHeight: 1.4,
            maxWidth: 160,
            pointerEvents: "auto",
          }}
        >
          <span style={{ opacity: 0.6 }}>build </span>
          {shortBuild(BUILD_ID)}
          {BUILT_AT && (
            <>
              <br />
              <span style={{ opacity: 0.5 }}>{formatBuiltAt(BUILT_AT)}</span>
            </>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Exported for use in the Settings debug section.
 */
export function useBuildInfo() {
  return {
    buildId: BUILD_ID,
    builtAt: BUILT_AT,
    builtAtFormatted: formatBuiltAt(BUILT_AT),
    shortBuild: shortBuild(BUILD_ID),
  };
}
