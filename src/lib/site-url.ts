const RAW_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";
const RAW_API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN?.trim() ?? "";

function normalizeBasePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed === "/" ? "" : prefixed.replace(/\/+$/, "");
}

function normalizeOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return "";
  }
}

export function getBasePath() {
  return normalizeBasePath(RAW_BASE_PATH);
}

export function getApiOrigin() {
  return normalizeOrigin(RAW_API_ORIGIN);
}

export function withBasePath(pathname: string) {
  const basePath = getBasePath();
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (!basePath) return normalizedPath;
  if (normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath;
  }
  return `${basePath}${normalizedPath}`;
}

export function buildPublicUrl(pathname: string) {
  const resolvedPath = withBasePath(pathname);
  if (typeof window === "undefined") {
    return resolvedPath;
  }

  return new URL(resolvedPath, window.location.origin).toString();
}

export function buildApiUrl(pathname: string) {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const apiOrigin = getApiOrigin();

  if (!apiOrigin) {
    return normalizedPath;
  }

  return new URL(normalizedPath, apiOrigin).toString();
}
