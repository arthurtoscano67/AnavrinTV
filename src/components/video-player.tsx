"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2, LockKeyhole, PlayCircle } from "lucide-react";
import { useCurrentAccount, useCurrentClient, useCurrentNetwork, useDAppKit } from "@mysten/dapp-kit-react";
import { fromHex } from "@mysten/sui/utils";

import { getPolicyPackageId } from "@/lib/anavrin-config";
import { getSessionKeyForAccount } from "@/lib/seal-session";
import type { AnavrinClient } from "@/lib/anavrin-client";
import { buildApiUrl } from "@/lib/site-url";
import { findOwnedVideoEntitlement } from "@/lib/video-entitlements";
import { isPaidVideoMonetization } from "@/lib/video-monetization";
import type { VideoMonetization } from "@/lib/types";
import { buildSealApprovalTransaction } from "@/lib/video-policy";

type VideoPlayerProps = {
  videoId: string;
  storageMode: "local" | "walrus";
  contentType: string;
  ownerAddress: string;
  policyPackageId?: string;
  policyObjectId?: string;
  policyNonce?: string;
  posterUrl?: string;
  monetization: VideoMonetization;
  refreshToken?: number;
};

function toArrayBuffer(bytes: Uint8Array<ArrayBufferLike>) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function resolvePosterUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:") || /^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return buildApiUrl(trimmed);
}

export function VideoPlayer({
  videoId,
  storageMode,
  contentType,
  ownerAddress,
  policyPackageId,
  policyObjectId,
  policyNonce,
  posterUrl,
  monetization,
  refreshToken = 0,
}: VideoPlayerProps) {
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const network = useCurrentNetwork();
  const currentClient = useCurrentClient() as AnavrinClient;
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resolvedPosterUrl = resolvePosterUrl(posterUrl);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let cancelled = false;

    async function loadPlayback() {
      setError(null);
      setStatus(null);

      if (storageMode !== "walrus") {
        const url = new URL(buildApiUrl(`/api/videos/${videoId}/stream`), window.location.origin);
        if (account?.address) {
          url.searchParams.set("address", account.address.toLowerCase());
        }
        setSourceUrl(url.toString());
        return;
      }

      if (!policyObjectId || !policyNonce) {
        setError("This Walrus upload is missing policy metadata.");
        return;
      }

      if (!account) {
        setError("Connect a wallet to decrypt this video.");
        setStatus("Encrypted Walrus playback");
        return;
      }

      const packageId = policyPackageId || getPolicyPackageId();
      if (!packageId) {
        setError("Set NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID to enable decryption.");
        return;
      }

      try {
        const normalizedOwner = ownerAddress.trim().toLowerCase();
        const normalizedViewer = account.address.trim().toLowerCase();
        const isOwner = normalizedOwner === normalizedViewer;
        const isPaidRelease = isPaidVideoMonetization(monetization);
        let proof: Parameters<typeof buildSealApprovalTransaction>[0]["proof"] = {
          kind: "owner_or_public",
        };

        if (isPaidRelease && !isOwner) {
          setStatus("Checking your playback entitlement...");
          const entitlement = await findOwnedVideoEntitlement({
            client: currentClient,
            ownerAddress: account.address,
            packageId,
            policyObjectId,
          });
          if (!entitlement) {
            setError("Purchase or rent this release to decrypt playback.");
            setStatus(null);
            return;
          }

          proof = entitlement.proof;
        }

        setStatus("Creating a Seal session...");
        const sessionKey = await getSessionKeyForAccount({
          dAppKit,
          client: currentClient,
          address: account.address,
          network: String(network),
          ttlMin: 30,
        });

        const approvalTx = buildSealApprovalTransaction({
          packageId,
          policyObjectId,
          ownerAddress,
          nonce: fromHex(policyNonce),
          proof,
        });
        const txBytes = await approvalTx.build({
          client: currentClient,
          onlyTransactionKind: true,
        });

        setStatus("Loading encrypted bytes from Walrus...");
        const response = await fetch(buildApiUrl(`/api/videos/${videoId}/stream`), {
          cache: "no-store",
          headers: account?.address
            ? {
                "x-anavrin-actor-address": account.address.toLowerCase(),
              }
            : undefined,
        });
        if (!response.ok) {
          throw new Error("Could not load the encrypted video bundle.");
        }

        const encryptedBytes = new Uint8Array(await response.arrayBuffer());
        setStatus("Decrypting playback...");
        const decryptedBytes = await currentClient.seal.decrypt({
          data: encryptedBytes,
          sessionKey,
          txBytes,
        });

        const blob = new Blob([toArrayBuffer(decryptedBytes)], {
          type: contentType || "video/mp4",
        });
        const url = URL.createObjectURL(blob);
        revokedUrl = url;
        if (!cancelled) {
          setSourceUrl(url);
          setStatus(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Playback failed.");
          setStatus(null);
        }
      }
    }

    void loadPlayback();

    return () => {
      cancelled = true;
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [
    account,
    contentType,
    currentClient,
    dAppKit,
    network,
    ownerAddress,
    policyPackageId,
    policyNonce,
    policyObjectId,
    monetization,
    refreshToken,
    storageMode,
    videoId,
  ]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <div className="relative aspect-video bg-black">
        {sourceUrl ? (
          <video
            autoPlay
            className="h-full w-full bg-black object-contain"
            controls
            playsInline
            poster={resolvedPosterUrl}
            preload="metadata"
            src={sourceUrl}
          />
        ) : (
          <div className="relative flex h-full items-center justify-center p-8 text-center">
            {resolvedPosterUrl ? (
              <img
                alt="Video poster"
                className="absolute inset-0 size-full object-cover opacity-60"
                draggable={false}
                loading="lazy"
                src={resolvedPosterUrl}
              />
            ) : null}
            <div className="absolute inset-0 bg-black/45" />
            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-black/45 p-6 backdrop-blur">
              <div className="mb-4 h-1.5 w-full animate-pulse rounded-full bg-white/10" />
              {error ? (
                <AlertTriangle className="mx-auto size-9 text-amber-300" />
              ) : (
                <LockKeyhole className="mx-auto size-9 text-cyan-100" />
              )}
              <h2 className="mt-3 text-lg font-semibold text-white">
                {error ? "Playback unavailable" : "Secure playback"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{error ?? status ?? "Preparing stream..."}</p>
              {status ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  <Loader2 className="size-4 animate-spin text-cyan-200" />
                  {status}
                </div>
              ) : (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  <PlayCircle className="size-4 text-cyan-200" />
                  {storageMode === "walrus" ? "Walrus + Seal" : "Direct stream"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
