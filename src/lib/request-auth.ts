import { NextRequest, NextResponse } from "next/server";

import { isAdminAddress } from "@/lib/anavrin-config";

const ACTOR_HEADERS = [
  "x-anavrin-actor-address",
  "x-anavrin-address",
  "x-wallet-address",
] as const;

const ADMIN_HEADERS = [
  "x-anavrin-admin-address",
  "x-anavrin-actor-address",
  "x-anavrin-address",
] as const;

export function normalizeAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function firstHeaderValue(request: NextRequest, keys: readonly string[]) {
  for (const key of keys) {
    const value = request.headers.get(key);
    if (value?.trim()) return value;
  }
  return null;
}

export function readActorAddress(
  request: NextRequest,
  ...candidates: Array<string | null | undefined>
) {
  for (const candidate of candidates) {
    const normalized = normalizeAddress(candidate);
    if (normalized) return normalized;
  }

  const headerValue = firstHeaderValue(request, ACTOR_HEADERS);
  if (headerValue) return normalizeAddress(headerValue);

  const queryValue = request.nextUrl.searchParams.get("address");
  return normalizeAddress(queryValue);
}

export function readAdminAddress(
  request: NextRequest,
  ...candidates: Array<string | null | undefined>
) {
  for (const candidate of candidates) {
    const normalized = normalizeAddress(candidate);
    if (normalized) return normalized;
  }

  const headerValue = firstHeaderValue(request, ADMIN_HEADERS);
  return normalizeAddress(headerValue);
}

export function ensureSameActorAddress(request: NextRequest, expectedAddress: string) {
  const expected = normalizeAddress(expectedAddress);
  const actor = readActorAddress(request);
  if (!expected) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Wallet address is required." }, { status: 400 }),
    };
  }

  if (!actor) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authenticated wallet address is required." }, { status: 401 }),
    };
  }

  if (actor !== expected) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Authenticated wallet does not match the requested account." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true as const,
    address: expected,
  };
}

export function requireAdmin(request: NextRequest, ...candidates: Array<string | null | undefined>) {
  const adminAddress = readAdminAddress(request, ...candidates);
  if (!adminAddress || !isAdminAddress(adminAddress)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Admin access required." }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    adminAddress,
  };
}
