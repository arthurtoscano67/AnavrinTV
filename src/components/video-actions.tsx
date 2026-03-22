"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Flag, Gift, Heart, Link2, MessageSquareMore, MoreHorizontal, ThumbsDown, WandSparkles } from "lucide-react";
import { useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";

import { formatCompact } from "@/lib/format";
import { getUploadTreasuryAddress } from "@/lib/anavrin-config";
import { buildPublicUrl } from "@/lib/site-url";
import { calculateTipPlatformFeeSui, defaultPlatformSettings } from "@/lib/platform-settings";
import type { VideoRecord } from "@/lib/types";

async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Request failed");
  }

  return response.json();
}

function parseSuiAmountToMist(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,9})?$/.test(trimmed)) return null;

  const [wholePart, fractionPart = ""] = trimmed.split(".");
  const whole = BigInt(wholePart);
  const fraction = BigInt(`${fractionPart.padEnd(9, "0")}`.slice(0, 9));
  return whole * BigInt(1_000_000_000) + fraction;
}

export function VideoActions({ video }: { video: VideoRecord }) {
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const [likes, setLikes] = useState(video.likes);
  const [tips, setTips] = useState(video.tips);
  const [disliked, setDisliked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTipPanel, setShowTipPanel] = useState(false);
  const [showMorePanel, setShowMorePanel] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submittingTip, setSubmittingTip] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [tipAmount, setTipAmount] = useState("1");
  const [platform, setPlatform] = useState(defaultPlatformSettings());
  const actorAddress = account?.address?.trim().toLowerCase() ?? "";

  useEffect(() => {
    let active = true;

    async function loadPlatform() {
      try {
        const response = await fetch("/api/platform");
        const data = (await response.json()) as { settings?: typeof platform };
        if (active && data.settings) {
          setPlatform(data.settings);
        }
      } catch {
        if (active) setPlatform(defaultPlatformSettings());
      }
    }

    void loadPlatform();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setLikes(video.likes);
    setTips(video.tips);
    setSaved(false);
    setDisliked(false);
  }, [video.id, video.likes, video.tips]);

  useEffect(() => {
    let active = true;
    const address = actorAddress;

    if (!address) {
      setSaved(false);
      setBookmarkPending(false);
      return () => {
        active = false;
      };
    }

    async function loadBookmarkStatus() {
      setBookmarkPending(true);
      try {
        const data = (await jsonFetch(
          `/api/videos/${video.id}/bookmark?address=${encodeURIComponent(address)}`,
          {
            headers: {
              "x-anavrin-actor-address": address,
            },
          },
        )) as { saved?: boolean };
        if (!active) return;
        setSaved(Boolean(data.saved));
      } catch {
        if (!active) return;
        setSaved(false);
      } finally {
        if (active) {
          setBookmarkPending(false);
        }
      }
    }

    void loadBookmarkStatus();

    return () => {
      active = false;
    };
  }, [actorAddress, video.id]);

  const tipPreview = useMemo(() => {
    const amount = Number(tipAmount);
    if (!Number.isFinite(amount) || amount < 1) return null;
    return calculateTipPlatformFeeSui(platform, amount);
  }, [platform, tipAmount]);

  async function handleCopy() {
    await navigator.clipboard.writeText(buildPublicUrl(`/video/${video.id}`));
    setStatus("Link copied.");
  }

  async function handleLike() {
    const next = await jsonFetch(`/api/videos/${video.id}/like`, {
      method: "POST",
      headers: actorAddress
        ? {
            "x-anavrin-actor-address": actorAddress,
          }
        : undefined,
      body: actorAddress
        ? JSON.stringify({
            address: actorAddress,
          })
        : undefined,
    });
    setLikes(next.likes);
    setStatus("Liked.");
  }

  async function handleTip() {
    if (!account) {
      setStatus("Connect a wallet to tip this video.");
      return;
    }

    if (!tipPreview) {
      setStatus("Tips must be at least 1 SUI.");
      return;
    }

    const treasuryAddress = getUploadTreasuryAddress();
    if (!treasuryAddress) {
      setStatus("Set NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS before tipping.");
      return;
    }

    setSubmittingTip(true);
    setStatus("Preparing the tip transaction...");

    try {
      const tipMist = parseSuiAmountToMist(tipAmount);
      if (tipMist == null || tipMist < BigInt(platform.fees.minimumTipMist)) {
        throw new Error("Tips must be at least 1 SUI.");
      }

      const tx = new Transaction();
      const [creatorCoin, platformCoin] = tx.splitCoins(tx.gas, [
        tx.pure.u64(tipPreview.creatorMist),
        tx.pure.u64(tipPreview.platformFeeMist),
      ]);
      tx.transferObjects([creatorCoin], tx.pure.address(video.ownerAddress));
      if (tipPreview.platformFeeMist > 0) {
        tx.transferObjects([platformCoin], tx.pure.address(treasuryAddress));
      }
      tx.setGasBudgetIfNotSet(50_000_000);

      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (result.$kind === "FailedTransaction") {
        throw new Error(result.FailedTransaction.status.error?.message ?? "Tip transaction failed.");
      }

      const next = await jsonFetch(`/api/videos/${video.id}/tip`, {
        method: "POST",
        headers: {
          "x-anavrin-actor-address": account.address,
        },
        body: JSON.stringify({
          address: account.address,
          amount: tipPreview.amountSui,
          platformFeeSui: tipPreview.platformFeeSui,
        }),
      });
      setTips(next.tips);
      setShowTipPanel(false);
      setStatus(
        `Tipped ${tipPreview.amountSui.toFixed(2)} SUI. Platform fee ${tipPreview.platformFeeSui.toFixed(2)} SUI.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tip failed.");
    } finally {
      setSubmittingTip(false);
    }
  }

  async function handleReport() {
    const detailInput = window.prompt("Report issue (required):", "Describe the issue with this content.");
    const detail = detailInput?.trim();
    if (!detail) {
      setStatus("Report cancelled.");
      return;
    }

    await jsonFetch(`/api/videos/${video.id}/report`, {
      method: "POST",
      headers: actorAddress
        ? {
            "x-anavrin-actor-address": actorAddress,
          }
        : undefined,
      body: JSON.stringify({
        reason: "Needs review",
        detail,
        severity: "medium",
        reporter: actorAddress || "viewer",
        reporterAddress: actorAddress || undefined,
      }),
    });
    setShowMorePanel(false);
    setStatus("Report sent.");
  }

  async function handleBookmark() {
    const address = account?.address?.trim().toLowerCase();
    if (!address) {
      setStatus("Connect a wallet to save this video.");
      return;
    }

    if (bookmarkPending) return;
    setBookmarkPending(true);

    try {
      const next = (await jsonFetch(`/api/videos/${video.id}/bookmark`, {
        method: "POST",
        headers: {
          "x-anavrin-actor-address": address,
        },
        body: JSON.stringify({
          address,
          saved: !saved,
        }),
      })) as { saved?: boolean };
      const nextSaved = Boolean(next.saved);
      setSaved(nextSaved);
      setStatus(nextSaved ? "Saved to watch later." : "Removed from watch later.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update bookmark.");
    } finally {
      setBookmarkPending(false);
    }
  }

  function setQuickTip(value: number) {
    setTipAmount(String(value));
  }

  function actionClass(active = false) {
    return [
      "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition",
      active
        ? "border-cyan-300/35 bg-cyan-300/14 text-cyan-100"
        : "border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10 hover:text-white",
    ].join(" ");
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className={actionClass()} onClick={handleLike} type="button">
          <Heart className="size-4" />
          <span>{formatCompact(likes)}</span>
        </button>

        <button
          className={actionClass(disliked)}
          onClick={() => {
            setDisliked((current) => !current);
            setStatus(disliked ? "Dislike removed." : "Feedback saved.");
          }}
          type="button"
        >
          <ThumbsDown className="size-4" />
        </button>

        <button className={actionClass()} onClick={handleCopy} type="button">
          <Link2 className="size-4" />
          Share
        </button>

        <button
          className={actionClass(saved)}
          disabled={bookmarkPending}
          onClick={handleBookmark}
          type="button"
        >
          <Bookmark className="size-4" />
          {bookmarkPending ? "Saving..." : "Save"}
        </button>

        <button
          className={actionClass(showTipPanel)}
          onClick={() => {
            setShowTipPanel((current) => !current);
            setShowMorePanel(false);
          }}
          type="button"
        >
          <Gift className="size-4" />
          Tip {formatCompact(tips)}
        </button>

        <button
          className={actionClass()}
          onClick={() => setStatus("Ask assistant is available in the next release.")}
          type="button"
        >
          <WandSparkles className="size-4" />
          Ask
        </button>

        <div className="relative">
          <button
            className={actionClass(showMorePanel)}
            onClick={() => {
              setShowMorePanel((current) => !current);
              setShowTipPanel(false);
            }}
            type="button"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {showMorePanel ? (
            <div className="absolute right-0 top-full z-30 mt-2 w-40 rounded-xl border border-white/10 bg-[#1a1a1a] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
              <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10 hover:text-white" onClick={handleReport} type="button">
                <Flag className="size-4" />
                Report
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showTipPanel ? (
        <div className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 5, 10].map((amount) => (
              <button
                key={amount}
                className={actionClass(Number(tipAmount) === amount)}
                onClick={() => setQuickTip(amount)}
                type="button"
              >
                {amount} SUI
              </button>
            ))}
            <input
              className="ml-auto w-[100px] rounded-full border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300/35"
              inputMode="decimal"
              min="1"
              onChange={(event) => setTipAmount(event.target.value)}
              placeholder="1.0"
              step="0.1"
              type="number"
              value={tipAmount}
            />
            <button className="btn-primary px-3.5 py-2 text-sm" disabled={submittingTip} onClick={handleTip} type="button">
              {submittingTip ? "Sending..." : "Send tip"}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            {tipPreview
              ? `${tipPreview.amountSui.toFixed(2)} SUI total • ${tipPreview.platformFeeSui.toFixed(2)} SUI platform fee`
              : "Tips require at least 1 SUI."}
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-slate-300">
        <MessageSquareMore className="size-4 text-cyan-200" />
        {status ?? "Engagement actions update instantly for the current clip."}
      </div>
    </div>
  );
}
