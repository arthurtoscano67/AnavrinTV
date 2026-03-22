const ALLOWED_PATHS = new Set(["/v1/service", "/v1/fetch_key"]);

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

function applyCorsHeaders(headers: Headers, request: Request) {
  const requestOrigin = request.headers.get("origin");
  const allowedOrigin = resolveAllowedOrigin(requestOrigin);

  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }

  headers.set("Access-Control-Allow-Methods", DEFAULT_ALLOWED_METHODS.join(", "));
  headers.set("Access-Control-Allow-Headers", DEFAULT_ALLOWED_HEADERS.join(", "));
  headers.set("Access-Control-Expose-Headers", DEFAULT_EXPOSE_HEADERS.join(", "));
  headers.set("Access-Control-Max-Age", "86400");
  headers.append("Vary", "Origin");
}

function buildError(request: Request, message: string, status = 400) {
  const response = Response.json({ error: message }, { status });
  applyCorsHeaders(response.headers, request);
  return response;
}

function isAllowedSealUrl(url: URL) {
  return url.protocol === "https:" && ALLOWED_PATHS.has(url.pathname);
}

function buildResponseHeaders(upstream: Response, request: Request) {
  const headers = new Headers(upstream.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  headers.delete("connection");
  headers.delete("keep-alive");
  headers.delete("proxy-authenticate");
  headers.delete("proxy-authorization");
  headers.delete("te");
  headers.delete("trailer");
  headers.delete("upgrade");
  headers.delete("access-control-allow-origin");
  headers.delete("access-control-allow-credentials");
  headers.delete("access-control-allow-headers");
  headers.delete("access-control-allow-methods");
  headers.delete("access-control-expose-headers");
  applyCorsHeaders(headers, request);
  return headers;
}

async function proxySealRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const target = requestUrl.searchParams.get("url");

  if (!target) {
    return buildError(request, "Missing target URL.");
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return buildError(request, "Invalid target URL.");
  }

  if (!isAllowedSealUrl(targetUrl)) {
    return buildError(request, "Disallowed Seal endpoint.", 403);
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("content-length");
  headers.delete("accept-encoding");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, init);
  } catch {
    return buildError(request, "Seal upstream request failed.", 502);
  }

  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: upstream.status,
    headers: buildResponseHeaders(upstream, request),
  });
}

export function OPTIONS(request: Request) {
  const response = new Response(null, { status: 204 });
  applyCorsHeaders(response.headers, request);
  return response;
}

export async function GET(request: Request) {
  return proxySealRequest(request);
}

export async function POST(request: Request) {
  return proxySealRequest(request);
}
