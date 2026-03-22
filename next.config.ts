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
    // Upload finalization posts sealed multipart payloads through proxy/middleware.
    // Next.js buffers these bodies with a 10 MB default limit, which truncates
    // real video uploads before the route handler can parse them.
    proxyClientMaxBodySize: "64mb",
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
