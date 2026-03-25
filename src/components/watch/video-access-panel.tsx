"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShoppingBag, Ticket } from "lucide-react";
import { useCurrentAccount, useCurrentClient, useDAppKit } from "@mysten/dapp-kit-react";

import { ModalShell } from "@/components/ui/modal-shell";
import { getPolicyPackageId } from "@/lib/anavrin-config";
import type { AnavrinClient } from "@/lib/anavrin-client";
import { findOwnedVideoEntitlement, type ResolvedVideoEntitlement } from "@/lib/video-entitlements";
import { formatDateTime } from "@/lib/format";
import { formatMistAsSui, isPaidVideoMonetization } from "@/lib/video-monetization";
import {
  buildBuyLicenseTransaction,
  buildRentVideoTransaction,
} from "@/lib/video-policy";
import type { VideoRecord } from "@/lib/types";

type VideoAccessPanelProps = {
  video: VideoRecord;
  onUnlocked: () => void;
};

type PurchaseKind = "purchase" | "rental";

export function VideoAccessPanel({ video, onUnlocked }: VideoAccessPanelProps) {
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const currentClient = useCurrentClient() as AnavrinClient;
  const [open, setOpen] = useState(false);
  const [entitlement, setEntitlement] = useState<ResolvedVideoEntitlement | null>(null);
  const [checkingEntitlement, setCheckingEntitlement] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<string | null>(null);
  const [processingKind, setProcessingKind] = useState<PurchaseKind | null>(null);
  const viewerAddress = account?.address?.trim().toLowerCase() ?? "";

  const isOwner = Boolean(viewerAddress) && viewerAddress === video.ownerAddress.trim().toLowerCase();
  const isPaidRelease = isPaidVideoMonetization(video.monetization);
  const packageId = video.policyPackageId?.trim() || getPolicyPackageId() || "";
  const supportsPurchase =
    video.monetization.accessModel === "purchase" || video.monetization.accessModel === "purchase_or_rental";
  const supportsRental =
    video.monetization.accessModel === "rental" || video.monetization.accessModel === "purchase_or_rental";

  useEffect(() => {
    let cancelled = false;

    async function loadEntitlement() {
      if (!account?.address || !isPaidRelease || !video.policyObjectId || !packageId || isOwner) {
        setEntitlement(null);
        setCheckingEntitlement(false);
        return;
      }

      setCheckingEntitlement(true);
      try {
        const nextEntitlement = await findOwnedVideoEntitlement({
          client: currentClient,
          ownerAddress: account.address,
          packageId,
          policyObjectId: video.policyObjectId,
        });
        if (!cancelled) {
          setEntitlement(nextEntitlement ?? null);
        }
      } catch {
        if (!cancelled) {
          setEntitlement(null);
        }
      } finally {
        if (!cancelled) {
          setCheckingEntitlement(false);
        }
      }
    }

    void loadEntitlement();

    return () => {
      cancelled = true;
    };
  }, [account?.address, currentClient, isOwner, isPaidRelease, packageId, video.policyObjectId]);

  const statusCopy = useMemo(() => {
    if (isOwner) {
      return {
        title: "Creator access",
        detail: "You own this release and can decrypt it without buying a viewer entitlement.",
      };
    }

    if (entitlement?.kind === "license") {
      return {
        title: entitlement.ownership === "kiosk" ? "License found in kiosk" : "License unlocked",
        detail:
          entitlement.ownership === "kiosk"
            ? "Playback will validate the license object from your kiosk before decrypting."
            : "Playback will validate the license object from your wallet before decrypting.",
      };
    }

    if (entitlement?.kind === "rental" && entitlement.expiresAtMs) {
      return {
        title: entitlement.ownership === "kiosk" ? "Rental pass found in kiosk" : "Rental active",
        detail: `Access stays live until ${formatDateTime(new Date(entitlement.expiresAtMs))}.`,
      };
    }

    return {
      title: "Rent or buy this release",
      detail: "Playback stays encrypted until the connected wallet or kiosk proves ownership of an active entitlement.",
    };
  }, [entitlement, isOwner]);

  if (!isPaidRelease) {
    return null;
  }

  async function refreshEntitlementState() {
    if (!account?.address || !video.policyObjectId || !packageId) return;
    const nextEntitlement = await findOwnedVideoEntitlement({
      client: currentClient,
      ownerAddress: account.address,
      packageId,
      policyObjectId: video.policyObjectId,
    });
    setEntitlement(nextEntitlement ?? null);
    if (nextEntitlement) {
      onUnlocked();
    }
  }

  async function handleAcquire(kind: PurchaseKind) {
    if (!account) {
      setOpen(true);
      return;
    }

    if (!video.policyObjectId || !packageId) {
      setTransactionStatus("This release is missing policy metadata.");
      return;
    }

    const amountMist =
      kind === "purchase" ? BigInt(video.monetization.purchasePriceMist) : BigInt(video.monetization.rentalPriceMist);
    if (amountMist <= BigInt(0)) {
      setTransactionStatus(`This release does not have a ${kind} price configured.`);
      return;
    }

    setProcessingKind(kind);
    setTransactionStatus(`Preparing ${kind} transaction...`);

    try {
      const transaction =
        kind === "purchase"
          ? buildBuyLicenseTransaction({
              packageId,
              policyObjectId: video.policyObjectId,
              amountMist,
            })
          : buildRentVideoTransaction({
              packageId,
              policyObjectId: video.policyObjectId,
              amountMist,
            });

      const result = await dAppKit.signAndExecuteTransaction({ transaction });
      if (result.$kind === "FailedTransaction") {
        throw new Error(result.FailedTransaction.status.error?.message ?? `${kind} transaction failed.`);
      }

      setTransactionStatus(kind === "purchase" ? "License minted. Refreshing access..." : "Rental pass minted. Refreshing access...");
      await refreshEntitlementState();
      setOpen(false);
      setTransactionStatus(kind === "purchase" ? "Purchase complete." : "Rental complete.");
    } catch (error) {
      setTransactionStatus(error instanceof Error ? error.message : `${kind} transaction failed.`);
    } finally {
      setProcessingKind(null);
    }
  }

  return (
    <>
      <section className="rounded-[24px] border border-[#ff5f5f]/24 bg-[#ff5f5f]/12 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-[#ffd2d2]/90">Release Access</p>
            <h2 className="mt-2 text-base font-semibold text-white">{statusCopy.title}</h2>
            <p className="mt-1 text-sm leading-6 text-[#c1c1c1]">{statusCopy.detail}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {checkingEntitlement ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#222222] px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#c7c7c7]">
                <Loader2 className="size-4 animate-spin" />
                Checking
              </span>
            ) : entitlement || isOwner ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/14 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">
                <CheckCircle2 className="size-4" />
                Unlocked
              </span>
            ) : (
              <button
                className="btn-primary px-4 py-2 text-xs uppercase tracking-[0.2em]"
                onClick={() => setOpen(true)}
                type="button"
              >
                Unlock
              </button>
            )}
          </div>
        </div>
      </section>

      <ModalShell
        bodyClassName="space-y-4 px-4 py-4 md:px-5"
        description="Keep release pricing and entitlement choices out of the main watch layout."
        eyebrow="Paid release"
        maxWidthClassName="max-w-xl"
        onClose={() => setOpen(false)}
        open={open}
        title={video.title}
      >
        {!account ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#1d1d1d] p-5 text-sm leading-7 text-[#c1c1c1]">
            Connect a wallet first so purchase and rental entitlements are minted to a real Sui account.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-[#1d1d1d] p-4">
              <p className="text-sm font-semibold text-white">{video.ownerName}</p>
              <p className="mt-1 text-sm leading-6 text-[#c1c1c1]">{video.description || "Encrypted playback stays sealed until entitlement is proven."}</p>
            </div>

            {supportsPurchase ? (
              <button
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#1f1f1f] px-4 py-4 text-left transition hover:bg-[#282828]"
                disabled={processingKind !== null}
                onClick={() => void handleAcquire("purchase")}
                type="button"
              >
                <span className="inline-flex items-center gap-3">
                  <ShoppingBag className="size-5 text-[#ffd0d0]" />
                  <span>
                    <span className="block text-sm font-semibold text-white">Buy permanent license</span>
                    <span className="block text-xs text-[#9f9f9f]">Keep the entitlement in wallet or move it into a kiosk later.</span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-[#ffd0d0]">
                  {formatMistAsSui(video.monetization.purchasePriceMist)} SUI
                </span>
              </button>
            ) : null}

            {supportsRental ? (
              <button
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-[#1f1f1f] px-4 py-4 text-left transition hover:bg-[#282828]"
                disabled={processingKind !== null}
                onClick={() => void handleAcquire("rental")}
                type="button"
              >
                <span className="inline-flex items-center gap-3">
                  <Ticket className="size-5 text-[#ffd0d0]" />
                  <span>
                    <span className="block text-sm font-semibold text-white">Rent encrypted playback</span>
                    <span className="block text-xs text-[#9f9f9f]">
                      Active for {Math.max(1, video.monetization.rentalDurationDays)} day
                      {Math.max(1, video.monetization.rentalDurationDays) === 1 ? "" : "s"} after mint.
                    </span>
                  </span>
                </span>
                <span className="text-sm font-semibold text-[#ffd0d0]">
                  {formatMistAsSui(video.monetization.rentalPriceMist)} SUI
                </span>
              </button>
            ) : null}

            {transactionStatus ? (
              <div className="rounded-2xl border border-white/10 bg-[#1d1d1d] px-4 py-3 text-sm leading-6 text-[#c1c1c1]">
                {processingKind ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin text-[#ffd0d0]" />
                    {transactionStatus}
                  </span>
                ) : (
                  transactionStatus
                )}
              </div>
            ) : null}
          </>
        )}
      </ModalShell>
    </>
  );
}
