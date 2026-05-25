import Link from "next/link";
import AmbientBar from "@/components/AmbientBar";

interface PageShellProps {
  children:   React.ReactNode;
  padBottom?: boolean;
}

export default function PageShell({ children, padBottom = true }: PageShellProps) {
  return (
    <>
      <main
        className={`min-h-dvh px-5 pt-16 max-w-lg mx-auto ${padBottom ? "pb-52" : ""}`}
        style={{ background: "var(--bg)" }}
      >
        {children}
      </main>

      {/*
        Ambient context bar — passive system awareness,
        floats silently above the Ask Meridian composer.
      */}
      <AmbientBar />

      {/*
        Global Ask Meridian composer — fixed above the bottom nav.
        Chat has its own full ChatInput; this appears on all other pages.
      */}
      <div
        style={{
          position:  "fixed",
          bottom:    "calc(60px + env(safe-area-inset-bottom, 0px) + 10px)",
          left:      "50%",
          transform: "translateX(-50%)",
          width:     "min(calc(100% - 32px), 480px)",
          zIndex:    40,
        }}
      >
        <Link href="/chat" style={{ textDecoration: "none" }}>
          <div
            style={{
          display:             "flex",
            alignItems:          "center",
            background:          "linear-gradient(160deg, rgba(255,255,255,0.98) 0%, rgba(248,247,255,0.97) 100%)",
            backdropFilter:      "blur(32px)",
            WebkitBackdropFilter:"blur(32px)",
            borderRadius:        32,
            height:              54,
            padding:             "0 12px 0 16px",
            border:              "1px solid rgba(108,105,224,0.16)",
            boxShadow:
              "0 2px 4px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.07), 0 16px 48px rgba(108,105,224,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
            transition: "box-shadow 0.2s ease",
            }}
          >
            {/* Presence dot — ambient pulse indicates Meridian is ready */}
            <div
              className="animate-ambient-pulse"
              style={{
                width:        7,
                height:       7,
                borderRadius: "50%",
                background:   "#6C69E0",
                flexShrink:   0,
                marginRight:  10,
              }}
            />

            {/* Placeholder */}
            <span
              style={{
                flex:          1,
                fontSize:      15,
                color:         "#B0AEC4",
                letterSpacing: "-0.01em",
              }}
            >
              Ask Meridian anything…
            </span>

            {/* Send button */}
            <div
              style={{
                width:          34,
                height:         34,
                borderRadius:   "50%",
                background:     "#6C69E0",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                flexShrink:     0,
                boxShadow:      "0 2px 8px rgba(108,105,224,0.30), 0 1px 2px rgba(108,105,224,0.20)",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
}

