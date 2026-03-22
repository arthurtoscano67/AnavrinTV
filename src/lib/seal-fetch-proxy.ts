"use client";

import { buildApiUrl } from "@/lib/site-url";

const PROXY_MARKER = Symbol.for("anavrin.seal.fetchProxyInstalled");
const ENABLE_SEAL_PROXY = process.env.NEXT_PUBLIC_ENABLE_SEAL_PROXY?.trim() === "true";

function shouldProxySealRequest(url: URL) {
  if (url.protocol !== "https:") return false;
  return url.pathname === "/v1/service" || url.pathname === "/v1/fetch_key";
}

export function installSealFetchProxy() {
  if (typeof window === "undefined") return;
  if (!ENABLE_SEAL_PROXY) return;

  const targetWindow = window as typeof window & { [PROXY_MARKER]?: boolean };
  if (targetWindow[PROXY_MARKER]) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const requestUrl = request ? new URL(request.url) : new URL(input.toString(), window.location.origin);

    if (shouldProxySealRequest(requestUrl)) {
      const proxyUrl = new URL(buildApiUrl("/api/seal/proxy"), window.location.origin);
      proxyUrl.searchParams.set("url", requestUrl.toString());

      if (request) {
        return originalFetch(new Request(proxyUrl.toString(), request));
      }

      return originalFetch(new Request(proxyUrl.toString(), init));
    }

    return originalFetch(input, init);
  };

  targetWindow[PROXY_MARKER] = true;
}
