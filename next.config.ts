import type { NextConfig } from "next";

/**
 * The API now lives inside this app (see `src/app/api/**` and `src/server/**`),
 * so there is no proxy target and no CORS configuration to maintain: the
 * browser, the route handlers and the SSE stream all share one origin.
 */
const nextConfig: NextConfig = {
  // Mongoose ships optional native bindings; keep it out of the bundle and
  // load it from node_modules when MONGODB_URI is configured.
  serverExternalPackages: ["mongoose"],
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Allows the API to serve downloadable files cross-origin.
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
