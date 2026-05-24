import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for PWA: allow serving manifest from public/
  // Headers help browsers treat it as installable
  async headers() {
    return [
      {
        source: "/manifest.json",
        headers: [{ key: "Content-Type", value: "application/manifest+json" }],
      },
    ];
  },
};

export default nextConfig;
