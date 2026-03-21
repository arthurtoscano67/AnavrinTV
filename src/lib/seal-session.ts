"use client";

import { CurrentAccountSigner } from "@mysten/dapp-kit-core";
import type { DAppKit } from "@mysten/dapp-kit-core";
import { SessionKey } from "@mysten/seal";

import { getMvrName, getPolicyPackageId } from "@/lib/anavrin-config";
import type { AnavrinClient } from "@/lib/anavrin-client";

const SESSION_PREFIX = "anavrin:seal-session";

function storageKey(network: string, packageId: string, address: string) {
  return `${SESSION_PREFIX}:${network}:${packageId}:${address}`;
}

export function readStoredSessionKey(network: string, packageId: string, address: string) {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(network, packageId, address));
    if (!raw) return null;
    return JSON.parse(raw) as ReturnType<SessionKey["export"]>;
  } catch {
    return null;
  }
}

export function writeStoredSessionKey(network: string, packageId: string, address: string, sessionKey: SessionKey) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey(network, packageId, address), JSON.stringify(sessionKey.export()));
  } catch {
    // Ignore storage failures in restricted browser environments.
  }
}

export function clearStoredSessionKey(network: string, packageId: string, address: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(storageKey(network, packageId, address));
  } catch {
    // Ignore storage failures in restricted browser environments.
  }
}

export async function getSessionKeyForAccount(input: {
  dAppKit: DAppKit;
  client: AnavrinClient;
  address: string;
  network: string;
  ttlMin?: number;
}) {
  const packageId = getPolicyPackageId();
  if (!packageId) {
    throw new Error("Set NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID before trying to decrypt videos.");
  }

  const ttlMin = input.ttlMin ?? 30;
  const imported = readStoredSessionKey(input.network, packageId, input.address);
  if (imported) {
    try {
      const restored = SessionKey.import(imported, input.client, new CurrentAccountSigner(input.dAppKit));
      if (!restored.isExpired()) return restored;
    } catch {
      clearStoredSessionKey(input.network, packageId, input.address);
    }
  }

  const sessionKey = await SessionKey.create({
    address: input.address,
    packageId,
    mvrName: getMvrName() ?? undefined,
    ttlMin,
    signer: new CurrentAccountSigner(input.dAppKit),
    suiClient: input.client,
  });

  writeStoredSessionKey(input.network, packageId, input.address, sessionKey);
  return sessionKey;
}
