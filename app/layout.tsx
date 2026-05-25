import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import TopBar from "@/components/TopBar";
import { MeridianProvider } from "@/lib/meridian-context";

export const metadata: Metadata = {
  title: "Meridian",
  description: "Your calm, personal life operating system.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Meridian",
  },
};

export const viewport: Viewport = {
  themeColor: "#F7F6FA",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#F7F6FA" />
        <meta name="apple-mobile-web-app-title" content="Meridian" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <MeridianProvider>
          <TopBar />
          {children}
          <BottomNav />
        </MeridianProvider>
      </body>
    </html>
  );
}
