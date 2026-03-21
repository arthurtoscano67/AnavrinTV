"use client";

const PROXY_MARKER = Symbol.for("anavrin.seal.fetchProxyInstalled");

function shouldProxySealRequest(url: URL) {
  if (url.protocol !== "https:") return false;
  return url.pathname === "/v1/service" || url.pathname === "/v1/fetch_key";
}

export function installSealFetchProxy() {
  if (typeof window === "undefined") return;

  const targetWindow = window as typeof window & { [PROXY_MARKER]?: boolean };
  if (targetWindow[PROXY_MARKER]) return;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const requestUrl = request ? new URL(request.url) : new URL(input.toString(), window.location.origin);

    if (shouldProxySealRequest(requestUrl)) {
      const proxyUrl = new URL("/api/seal/proxy", window.location.origin);
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
