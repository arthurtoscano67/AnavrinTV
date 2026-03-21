import type { WalletMode, WalletSession } from "@/lib/types";
import { usernameFromDisplayName } from "@/lib/creator-identity";

const STORAGE_KEY = "anavrin-tv-session";
const SESSION_EVENT = "anavrin-session-change";

function seedFromText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

function randomSuffix() {
  return Math.random().toString(16).slice(2, 10);
}

function treasuryFeeForMode(mode: WalletMode) {
  switch (mode) {
    case "zklogin":
      return 90;
    case "slush":
      return 75;
    case "wallet":
      return 65;
    default:
      return 80;
  }
}

export function createDemoSession(displayName: string, mode: WalletMode): WalletSession {
  const safeName = displayName.trim() || "Creator";
  const slug = seedFromText(safeName) || "creator";
  const address = `0x${slug.slice(0, 6)}${randomSuffix()}`;
  const username = usernameFromDisplayName(safeName, address);
  const storageLimitBytes = 500 * 1024 * 1024 * 1024;
  return {
    id: `session-${randomSuffix()}`,
    displayName: safeName,
    username,
    address,
    mode,
    avatarSeed: safeName.slice(0, 2).toUpperCase() || "TV",
    handle: username,
    storageLimitBytes,
    storageUsedBytes: 0,
    treasuryFeeBps: treasuryFeeForMode(mode),
    renewalAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
}

export function loadSession(): WalletSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as WalletSession;
  } catch {
    return null;
  }
}

export function saveSession(session: WalletSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function updateSession(patch: Partial<WalletSession>) {
  const current = loadSession();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveSession(next);
  return next;
}

export function subscribeSessionChange(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(SESSION_EVENT, handler);
  return () => window.removeEventListener(SESSION_EVENT, handler);
}
