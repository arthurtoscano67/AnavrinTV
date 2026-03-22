import type { NextConfig } from "next";

const IS_GITHUB_PAGES = process.env.GITHUB_PAGES === "true";
const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH?.trim();

function resolvePagesBasePath() {
  if (!rawBasePath) return "/AnavrinTV";
  if (rawBasePath === "/" || rawBasePath.toLowerCase() === "root" || rawBasePath.toLowerCase() === "none") {
    return undefined;
  }
  const withLeadingSlash = rawBasePath.startsWith("/") ? rawBasePath : `/${rawBasePath}`;
  const cleaned = withLeadingSlash.replace(/\/+$/, "");
  return cleaned === "/" ? undefined : cleaned;
}

const GITHUB_PAGES_BASE_PATH = resolvePagesBasePath();

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
  experimental: {
    // The current frontend finalizes uploads with Walrus metadata only, but
    // deployed browsers can lag behind during a rollout and still POST the
    // sealed video bundle through /api/videos. Keep the proxy ceiling above
    // Railway's observed 64 MB truncation until the older clients age out.
    proxyClientMaxBodySize: "512mb",
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
