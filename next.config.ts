import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (no Vercel runtime needed).
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
