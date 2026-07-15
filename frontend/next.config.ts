import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // <--- Zid hadi
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
