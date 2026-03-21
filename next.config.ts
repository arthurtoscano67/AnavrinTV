import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  serverExternalPackages: ["@mysten/walrus", "@mysten/walrus-wasm"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
