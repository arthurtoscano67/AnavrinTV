"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Flag, Gift, Heart, Link2, MessageSquareMore } from "lucide-react";
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
  const [subscribers, setSubscribers] = useState(video.subscribers);
  const [status, setStatus] = useState<string | null>(null);
  const [submittingTip, setSubmittingTip] = useState(false);
  const [tipAmount, setTipAmount] = useState("1");
  const [platform, setPlatform] = useState(defaultPlatformSettings());

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

  const tipPreview = useMemo(() => {
    const amount = Number(tipAmount);
    if (!Number.isFinite(amount) || amount < 1) return null;
    return calculateTipPlatformFeeSui(platform, amount);
  }, [platform, tipAmount]);

  async function handleCopy() {
    await navigator.clipboard.writeText(buildPublicUrl(`/video/${video.id}`));
    setStatus("Link copied");
  }

  async function handleLike() {
    const next = await jsonFetch(`/api/videos/${video.id}/like`, { method: "POST" });
    setLikes(next.likes);
    setStatus("Liked");
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
        body: JSON.stringify({
          amount: tipPreview.amountSui,
          platformFeeSui: tipPreview.platformFeeSui,
        }),
      });
      setTips(next.tips);
      setStatus(
        `Tipped ${tipPreview.amountSui.toFixed(2)} SUI. Platform fee ${tipPreview.platformFeeSui.toFixed(2)} SUI.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tip failed.");
    } finally {
      setSubmittingTip(false);
    }
  }

  async function handleSubscribe() {
    const next = await jsonFetch(`/api/videos/${video.id}/subscribe`, { method: "POST" });
    setSubscribers(next.subscribers);
    setStatus("Subscribed");
  }

  async function handleReport() {
    await jsonFetch(`/api/videos/${video.id}/report`, {
      method: "POST",
      body: JSON.stringify({
        reason: "Needs review",
        detail: "Reported from the Anavrin TV viewer UI.",
        severity: "medium",
        reporter: "viewer",
      }),
    });
    setStatus("Report sent");
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 md:grid-cols-[0.9fr,1.1fr]">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.28em] text-slate-500">Tip amount</span>
          <input
            className="input mt-2"
            inputMode="decimal"
            min="1"
            onChange={(event) => setTipAmount(event.target.value)}
            placeholder="1.0"
            step="0.1"
            type="number"
            value={tipAmount}
          />
        </label>

        <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Tip preview</p>
          <p className="mt-2 font-semibold text-white">
            {tipPreview
              ? `${tipPreview.amountSui.toFixed(2)} SUI to creator, ${tipPreview.platformFeeSui.toFixed(2)} SUI platform fee`
              : "Enter at least 1 SUI"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            The user keeps full control of the amount, and the platform cut is editable in admin.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={handleLike} type="button">
          <Heart className="size-4" />
          Like {formatCompact(likes)}
        </button>
        <button className="btn-secondary" disabled={submittingTip} onClick={handleTip} type="button">
          <Gift className="size-4" />
          {submittingTip ? "Sending..." : `Tip ${tipAmount || "1"} SUI ${formatCompact(tips)}`}
        </button>
        <button className="btn-secondary" onClick={handleSubscribe} type="button">
          <BellRing className="size-4" />
          Subscribe {formatCompact(subscribers)}
        </button>
        <button className="btn-secondary" onClick={handleCopy} type="button">
          <Link2 className="size-4" />
          Copy link
        </button>
        <button className="btn-ghost" onClick={handleReport} type="button">
          <Flag className="size-4" />
          Report
        </button>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
        <MessageSquareMore className="size-4 text-cyan-200" />
        {status ?? "All actions are single-signature friendly and update instantly."}
      </div>
    </div>
  );
}
