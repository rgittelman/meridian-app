"use client";

/**
 * PwaUpdateHandler — Registers the service worker, detects updates,
 * and shows a "New version available" toast on Android PWA / mobile.
 *
 * Also checks a build-time version stamp as a fallback when the SW
 * update API isn't available (e.g. iOS WKWebView).
 */

import { useEffect, useState, useCallback } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? "dev";
const VERSION_KEY = "meridian_build_id";
const RELOAD_GUARD_KEY = "meridian_reload_guard";

export default function PwaUpdateHandler() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // --- Fallback: build-id version check ---
    const storedBuild = localStorage.getItem(VERSION_KEY);
    if (storedBuild && storedBuild !== BUILD_ID) {
      const guard = sessionStorage.getItem(RELOAD_GUARD_KEY);
      if (!guard) {
        console.log("[PWA UPDATE] build version changed:", storedBuild, "→", BUILD_ID);
        setUpdateAvailable(true);
      }
    }
    localStorage.setItem(VERSION_KEY, BUILD_ID);

    // --- Service worker registration ---
    if (!("serviceWorker" in navigator)) {
      console.log("[PWA UPDATE] service worker not supported");
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
        console.log("[PWA UPDATE] service worker registered");

        // Check if there's already a waiting worker (e.g. from a previous visit)
        if (reg.waiting) {
          console.log("[PWA UPDATE] waiting worker available (existing)");
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
        }

        reg.addEventListener("updatefound", () => {
          console.log("[PWA UPDATE] update found");
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[PWA UPDATE] waiting worker available (new)");
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((err) => {
        console.warn("[PWA UPDATE] registration failed:", err);
      });

    // When the new SW takes over, reload
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      console.log("[PWA UPDATE] controller changed, reloading");
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      window.location.reload();
    });

    // Periodically check for updates (every 60s when page is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && registration) {
        registration.update().catch(() => {});
      }
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const handleUpdate = useCallback(() => {
    console.log("[PWA UPDATE] update accepted by user");

    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      // controllerchange listener above will handle reload
    } else {
      // Fallback: no waiting worker, just reload
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      caches.keys().then((names) =>
        Promise.all(names.map((n) => caches.delete(n)))
      ).finally(() => {
        console.log("[PWA UPDATE] caches cleared, reloading");
        window.location.reload();
      });
    }
  }, [waitingWorker]);

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top, 0px) + 12px)",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        background: "#1C1A2E",
        color: "#FFFFFF",
        borderRadius: 14,
        padding: "11px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        animation: "fade-up 0.25s ease both",
        maxWidth: "calc(100% - 32px)",
        width: "auto",
      }}
    >
      <span style={{ fontSize: 14, flex: 1, whiteSpace: "nowrap" }}>
        New version available
      </span>
      <button
        onClick={handleUpdate}
        style={{
          background: "#6C69E0",
          border: "none",
          borderRadius: 10,
          color: "#FFFFFF",
          fontSize: 13,
          fontWeight: 700,
          padding: "7px 16px",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        Update
      </button>
    </div>
  );
}
