"use client";

import { getApiOrigin, getBasePath } from "@/lib/site-url";

const API_PROXY_MARKER = Symbol.for("anavrin.api.fetchProxyInstalled");

function resolveApiPath(pathname: string) {
  const basePath = getBasePath();

  if (pathname.startsWith("/api/")) {
    return pathname;
  }

  if (basePath && pathname.startsWith(`${basePath}/api/`)) {
    return pathname.slice(basePath.length);
  }

  return null;
}

export function installApiFetchProxy() {
  if (typeof window === "undefined") return;

  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return;

  const targetWindow = window as typeof window & { [API_PROXY_MARKER]?: boolean };
  if (targetWindow[API_PROXY_MARKER]) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const requestUrl = request ? new URL(request.url) : new URL(input.toString(), window.location.origin);

    const sameOrigin = requestUrl.origin === window.location.origin;
    if (!sameOrigin) {
      return originalFetch(input, init);
    }

    const apiPath = resolveApiPath(requestUrl.pathname);
    if (!apiPath) {
      return originalFetch(input, init);
    }

    const rewrittenUrl = new URL(`${apiPath}${requestUrl.search}`, apiOrigin).toString();

    if (request) {
      return originalFetch(new Request(rewrittenUrl, request));
    }

    return originalFetch(new Request(rewrittenUrl, init));
  };

  targetWindow[API_PROXY_MARKER] = true;
}
