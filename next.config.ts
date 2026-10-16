import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (no Vercel runtime needed).
  output: "standalone",
  poweredByHeader: false,
  // Version-skew protection: a browser still on the previous deploy gets a full reload on
  // navigation instead of mixing builds. Railway passes this in as a build arg (see Dockerfile).
  deploymentId: process.env.NEXT_DEPLOYMENT_ID || process.env.RAILWAY_DEPLOYMENT_ID || undefined,
};

export default nextConfig;
