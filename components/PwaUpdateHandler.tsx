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

function ts(): string {
  return new Date().toISOString().slice(11, 23);
}

export default function PwaUpdateHandler() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    console.log(`[PWA ${ts()}] current build: ${BUILD_ID}`);
    console.log(`[PWA ${ts()}] standalone: ${window.matchMedia("(display-mode: standalone)").matches}`);
    console.log(`[PWA ${ts()}] serviceWorker supported: ${"serviceWorker" in navigator}`);
    console.log(`[PWA ${ts()}] existing controller: ${navigator.serviceWorker?.controller?.state ?? "none"}`);

    // --- Fallback: build-id version check ---
    const storedBuild = localStorage.getItem(VERSION_KEY);
    console.log(`[PWA ${ts()}] stored build: ${storedBuild ?? "(none)"}`);
    if (storedBuild && storedBuild !== BUILD_ID) {
      const guard = sessionStorage.getItem(RELOAD_GUARD_KEY);
      if (!guard) {
        console.log(`[PWA ${ts()}] build version changed: ${storedBuild} → ${BUILD_ID}`);
        setUpdateAvailable(true);
      } else {
        console.log(`[PWA ${ts()}] build changed but reload guard active, skipping`);
      }
    }
    localStorage.setItem(VERSION_KEY, BUILD_ID);

    // --- Service worker registration ---
    if (!("serviceWorker" in navigator)) {
      console.log(`[PWA ${ts()}] service worker not supported, aborting`);
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        registration = reg;
        console.log(`[PWA ${ts()}] service worker registered (scope: ${reg.scope})`);
        console.log(`[PWA ${ts()}] active: ${reg.active?.state ?? "none"}, installing: ${reg.installing?.state ?? "none"}, waiting: ${reg.waiting?.state ?? "none"}`);

        if (reg.waiting) {
          console.log(`[PWA ${ts()}] waiting worker exists`);
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
        }

        // Force immediate update check against server
        try {
          console.log(`[PWA ${ts()}] calling registration.update()...`);
          await reg.update();
          console.log(`[PWA ${ts()}] registration.update() completed. installing: ${reg.installing?.state ?? "none"}, waiting: ${reg.waiting?.state ?? "none"}`);
        } catch (err) {
          console.warn(`[PWA ${ts()}] registration.update() failed:`, err);
        }

        // Re-check after update() in case a waiting worker appeared
        if (reg.waiting && !waitingWorker) {
          console.log(`[PWA ${ts()}] waiting worker appeared after update()`);
          setWaitingWorker(reg.waiting);
          setUpdateAvailable(true);
        }

        reg.addEventListener("updatefound", () => {
          console.log(`[PWA ${ts()}] updatefound event fired`);
          const newWorker = reg.installing;
          if (!newWorker) {
            console.log(`[PWA ${ts()}] updatefound but no installing worker`);
            return;
          }
          console.log(`[PWA ${ts()}] new worker state: ${newWorker.state}`);

          newWorker.addEventListener("statechange", () => {
            console.log(`[PWA ${ts()}] new worker statechange: ${newWorker.state}`);
            if (newWorker.state === "installed") {
              if (navigator.serviceWorker.controller) {
                console.log(`[PWA ${ts()}] new waiting worker installed — update available`);
                setWaitingWorker(newWorker);
                setUpdateAvailable(true);
              } else {
                console.log(`[PWA ${ts()}] worker installed but no controller — first install`);
              }
            }
          });
        });
      })
      .catch((err) => {
        console.warn(`[PWA ${ts()}] registration failed:`, err);
      });

    // When the new SW takes over, reload
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      console.log(`[PWA ${ts()}] controllerchange event fired`);
      if (refreshing) {
        console.log(`[PWA ${ts()}] already refreshing, skipping`);
        return;
      }
      refreshing = true;
      console.log(`[PWA ${ts()}] setting reload guard and reloading`);
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      window.location.reload();
    });

    // Periodically check for updates (every 30s when page is visible)
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && registration) {
        console.log(`[PWA ${ts()}] periodic update check`);
        registration.update().catch(() => {});
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = useCallback(() => {
    console.log(`[PWA ${ts()}] update accepted by user`);

    if (waitingWorker) {
      console.log(`[PWA ${ts()}] posting SKIP_WAITING to waiting worker`);
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      console.log(`[PWA ${ts()}] no waiting worker — clearing caches and reloading`);
      sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      caches.keys().then((names) => {
        console.log(`[PWA ${ts()}] clearing ${names.length} caches:`, names);
        return Promise.all(names.map((n) => caches.delete(n)));
      }).finally(() => {
        console.log(`[PWA ${ts()}] caches cleared, reloading`);
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
