import type { NextConfig } from "next";

const IS_GITHUB_PAGES = process.env.GITHUB_PAGES === "true";
const GITHUB_PAGES_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH?.trim() || "/AnavrinTV";

const nextConfig: NextConfig = {
  output: IS_GITHUB_PAGES ? "export" : "standalone",
  basePath: IS_GITHUB_PAGES ? GITHUB_PAGES_BASE_PATH : undefined,
  assetPrefix: IS_GITHUB_PAGES ? GITHUB_PAGES_BASE_PATH : undefined,
  trailingSlash: IS_GITHUB_PAGES,
  images: {
    unoptimized: IS_GITHUB_PAGES,
  },
  poweredByHeader: false,
  serverExternalPackages: ["@mysten/walrus", "@mysten/walrus-wasm"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
