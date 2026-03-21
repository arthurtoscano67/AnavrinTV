import { slugifyText } from "@/lib/format";

export const USERNAME_REGEX = /^[a-z0-9_]+$/;
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 30;

export function normalizeUsernameInput(value: string | null | undefined) {
  if (!value) return "";

  return value
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

export function usernameFromDisplayName(displayName: string, address?: string) {
  const normalized = displayName
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9_]+/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized) {
    return normalized.slice(0, MAX_USERNAME_LENGTH);
  }

  const fallback = slugifyText(displayName).replace(/-/g, "_");
  if (fallback) {
    return fallback.slice(0, MAX_USERNAME_LENGTH);
  }

  const addressSuffix = address?.replace(/^0x/, "").slice(0, 8) ?? "user";
  return `creator_${addressSuffix}`;
}

export function validateUsername(input: string) {
  const username = input.trim().replace(/^@+/, "");

  if (!username) return "Username is required.";
  if (username !== username.toLowerCase()) {
    return "Use lowercase letters, numbers, and underscores.";
  }
  if (/\s/.test(username)) {
    return "Username cannot contain spaces.";
  }
  if (username.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`;
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return `Username must be at most ${MAX_USERNAME_LENGTH} characters.`;
  }
  if (!USERNAME_REGEX.test(username)) {
    return "Use only lowercase letters, numbers, and underscores.";
  }

  return null;
}

export function ensureUniqueUsername(preferred: string, taken: Set<string>) {
  const prepared = (normalizeUsernameInput(preferred) || "creator")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_USERNAME_LENGTH);
  const base = prepared.length >= MIN_USERNAME_LENGTH ? prepared : `creator_${prepared || "user"}`;
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }

  let suffix = 2;
  while (suffix < 10_000) {
    const maxBaseLength = MAX_USERNAME_LENGTH - String(suffix).length - 1;
    const candidate = `${base.slice(0, Math.max(1, maxBaseLength))}_${suffix}`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
    suffix += 1;
  }

  const fallback = `${base.slice(0, 16)}_${Date.now().toString(36)}`.slice(0, MAX_USERNAME_LENGTH);
  taken.add(fallback);
  return fallback;
}

export function formatHandle(username: string) {
  const clean = normalizeUsernameInput(username);
  return clean ? `@${clean}` : "@creator";
}
