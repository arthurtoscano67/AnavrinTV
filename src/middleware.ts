import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://onreel.xyz",
  "https://www.onreel.xyz",
  "https://arthurtoscano67.github.io",
];

const DEFAULT_ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "x-anavrin-actor-address",
  "x-anavrin-admin-address",
  "Client-Sdk-Type",
  "Client-Sdk-Version",
  "Request-Id",
  "X-Request-Id",
];

const DEFAULT_ALLOWED_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"];
const DEFAULT_EXPOSE_HEADERS = [
  "X-KeyServer-Version",
  "X-KeyServer-GitVersion",
];

function getAllowedOrigins() {
  const configured = process.env.CORS_ALLOWED_ORIGINS?.trim();
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;

  const parsed = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return parsed.length ? parsed : DEFAULT_ALLOWED_ORIGINS;
}

function resolveAllowedOrigin(requestOrigin: string | null) {
  if (!requestOrigin) return DEFAULT_ALLOWED_ORIGINS[0];

  const allowed = getAllowedOrigins();
  if (allowed.includes("*")) return "*";
  if (allowed.includes(requestOrigin)) return requestOrigin;
  return "";
}

function applyCorsHeaders(response: NextResponse, request: NextRequest) {
  const requestOrigin = request.headers.get("origin");
  const allowedOrigin = resolveAllowedOrigin(requestOrigin);

  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }

  response.headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOWED_METHODS.join(", "));
  response.headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOWED_HEADERS.join(", "));
  response.headers.set("Access-Control-Expose-Headers", DEFAULT_EXPOSE_HEADERS.join(", "));
  response.headers.set("Access-Control-Max-Age", "86400");
  response.headers.append("Vary", "Origin");
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    applyCorsHeaders(preflight, request);
    return preflight;
  }

  const response = NextResponse.next();
  applyCorsHeaders(response, request);
  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
