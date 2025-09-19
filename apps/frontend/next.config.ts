// apps/frontend/next.config.ts
import type { NextConfig } from "next";

const USE_LOCAL_API = process.env.SET_API_TO_LOCAL === "1";
const API_LOCAL_TARGET = process.env.API_LOCAL_TARGET || "http://backend:8000";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Uncomment if you want builds to pass even with errors (not recommended for production)
  // typescript: { ignoreBuildErrors: true },
  // eslint: { ignoreDuringBuilds: true },

  async rewrites() {
    // When enabled, proxy /api/* to your local/backend target
    if (USE_LOCAL_API) {
      return [
        {
          source: "/api/:path*",
          destination: `${API_LOCAL_TARGET}/:path*`,
        },
      ];
    }
    return [];
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
