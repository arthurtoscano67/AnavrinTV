const RAW_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH?.trim() ?? "";

function normalizeBasePath(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed === "/" ? "" : prefixed.replace(/\/+$/, "");
}

export function getBasePath() {
  return normalizeBasePath(RAW_BASE_PATH);
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
