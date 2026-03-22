"use client";

import { buildApiUrl } from "@/lib/site-url";

const PROXY_MARKER = Symbol.for("anavrin.seal.fetchProxyInstalled");

function shouldProxySealRequest(url: URL) {
  if (url.protocol !== "https:") return false;
  return url.pathname === "/v1/service" || url.pathname === "/v1/fetch_key";
}

function shouldFallbackToDirect(response: Response) {
  return response.status === 404 || response.status === 405;
}

export function installSealFetchProxy() {
  if (typeof window === "undefined") return;

  const targetWindow = window as typeof window & { [PROXY_MARKER]?: boolean };
  if (targetWindow[PROXY_MARKER]) return;

  const originalFetch = window.fetch.bind(window);
  let proxyActive = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const requestUrl = request ? new URL(request.url, window.location.origin) : new URL(input.toString(), window.location.origin);

    if (proxyActive && shouldProxySealRequest(requestUrl)) {
      const proxyUrl = new URL(buildApiUrl("/api/seal/proxy"), window.location.origin);
      proxyUrl.searchParams.set("url", requestUrl.toString());
      const allowDirectFallback = proxyUrl.origin === window.location.origin;

      const directRequest = request ? request.clone() : new Request(requestUrl.toString(), init);

      if (request) {
        try {
          const proxied = await originalFetch(new Request(proxyUrl.toString(), request));
          if (!shouldFallbackToDirect(proxied) || !allowDirectFallback) {
            return proxied;
          }
          proxyActive = false;
        } catch (error) {
          if (!allowDirectFallback) {
            throw error;
          }
          // Fall through to direct request below.
          proxyActive = false;
        }
        return originalFetch(directRequest);
      }

      try {
        const proxied = await originalFetch(new Request(proxyUrl.toString(), init));
        if (!shouldFallbackToDirect(proxied) || !allowDirectFallback) {
          return proxied;
        }
        proxyActive = false;
      } catch (error) {
        if (!allowDirectFallback) {
          throw error;
        }
        // Fall through to direct request below.
        proxyActive = false;
      }
      return originalFetch(directRequest);
    }

    return originalFetch(input, init);
  };

  targetWindow[PROXY_MARKER] = true;
}
