import type { NextConfig } from "next";

const apiBase = (
  process.env.ORCHARD_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${apiBase}/api/:path*` },
      { source: "/git/:path*", destination: `${apiBase}/git/:path*` },
      { source: "/got/:path*", destination: `${apiBase}/got/:path*` },
    ];
  },
};

export default nextConfig;
