const ALLOWED_PATHS = new Set(["/v1/service", "/v1/fetch_key"]);

function buildError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function isAllowedSealUrl(url: URL) {
  return url.protocol === "https:" && ALLOWED_PATHS.has(url.pathname);
}

function buildResponseHeaders(upstream: Response) {
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
  return headers;
}

async function proxySealRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const target = requestUrl.searchParams.get("url");

  if (!target) {
    return buildError("Missing target URL.");
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(target);
  } catch {
    return buildError("Invalid target URL.");
  }

  if (!isAllowedSealUrl(targetUrl)) {
    return buildError("Disallowed Seal endpoint.", 403);
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("origin");
  headers.delete("referer");
  headers.delete("content-length");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(targetUrl, init);
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: upstream.status,
    headers: buildResponseHeaders(upstream),
  });
}

export async function GET(request: Request) {
  return proxySealRequest(request);
}

export async function POST(request: Request) {
  return proxySealRequest(request);
}
