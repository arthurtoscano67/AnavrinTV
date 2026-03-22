"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, Copy, Flag, Gift, Heart, Link2, Loader2, MessageSquareMore, Send, ThumbsDown } from "lucide-react";
import { useCurrentAccount, useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";

import { ModalShell } from "@/components/ui/modal-shell";
import { formatCompact } from "@/lib/format";
import { getUploadTreasuryAddress } from "@/lib/anavrin-config";
import { buildApiUrl, buildPublicUrl } from "@/lib/site-url";
import { calculateTipPlatformFeeSui, defaultPlatformSettings } from "@/lib/platform-settings";
import type { VideoRecord } from "@/lib/types";

type ShareAction = "copy" | "native" | "x" | "telegram" | "discord";

const QUICK_TIP_AMOUNTS = [1, 2, 5, 10] as const;
const REPORT_REASONS = [
  { value: "Spam or misleading", severity: "medium" as const },
  { value: "Harassment or hateful conduct", severity: "high" as const },
  { value: "Graphic or unsafe content", severity: "high" as const },
  { value: "Copyright or rights issue", severity: "medium" as const },
  { value: "Other", severity: "low" as const },
] as const;

async function jsonFetch(url: string, init?: RequestInit) {
  const targetUrl = url.startsWith("/api/") ? buildApiUrl(url) : url;
  const response = await fetch(targetUrl, {
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
  const [shareOpen, setShareOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [submittingTip, setSubmittingTip] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [tipAmount, setTipAmount] = useState("1");
  const [pendingShareAction, setPendingShareAction] = useState<ShareAction | null>(null);
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number]["value"]>(REPORT_REASONS[0].value);
  const [reportDetail, setReportDetail] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [platform, setPlatform] = useState(defaultPlatformSettings());
  const actorAddress = account?.address?.trim().toLowerCase() ?? "";

  useEffect(() => {
    let active = true;

    async function loadPlatform() {
      try {
        const response = await fetch(buildApiUrl("/api/platform"));
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
    setShareOpen(false);
    setTipOpen(false);
    setReportOpen(false);
    setTipAmount("1");
    setReportReason(REPORT_REASONS[0].value);
    setReportDetail("");
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

  const shareUrl = buildPublicUrl(`/video/${video.id}`);
  const shareTitle = `${video.title} · ${video.ownerName}`;
  const selectedReportReason = REPORT_REASONS.find((reason) => reason.value === reportReason) ?? REPORT_REASONS[0];

  async function handleShareAction(action: ShareAction) {
    setPendingShareAction(action);
    try {
      if (action === "copy") {
        await navigator.clipboard.writeText(shareUrl);
        setStatus("Link copied.");
      } else if (action === "native") {
        if (!navigator.share) {
          throw new Error("Native share is unavailable on this device.");
        }
        await navigator.share({
          title: shareTitle,
          text: video.description,
          url: shareUrl,
        });
        setStatus("Shared.");
      } else if (action === "x") {
        const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(video.title)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(xUrl, "_blank", "noopener,noreferrer");
        setStatus("Opened X share.");
      } else if (action === "telegram") {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(video.title)}`;
        window.open(telegramUrl, "_blank", "noopener,noreferrer");
        setStatus("Opened Telegram share.");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        window.open("https://discord.com/app", "_blank", "noopener,noreferrer");
        setStatus("Link copied for Discord.");
      }

      setShareOpen(false);
    } catch (error) {
      const fallback = action === "native" ? "Share cancelled." : "Could not share this video.";
      setStatus(error instanceof Error ? error.message || fallback : fallback);
    } finally {
      setPendingShareAction(null);
    }
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
      setTipOpen(false);
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
    const detail = reportDetail.trim();
    if (!detail) {
      setStatus("Add a short note before sending the report.");
      return;
    }

    setSubmittingReport(true);

    try {
      await jsonFetch(`/api/videos/${video.id}/report`, {
        method: "POST",
        headers: actorAddress
          ? {
              "x-anavrin-actor-address": actorAddress,
            }
          : undefined,
        body: JSON.stringify({
          reason: reportReason,
          detail,
          severity: selectedReportReason.severity,
          reporter: actorAddress || "viewer",
          reporterAddress: actorAddress || undefined,
        }),
      });
      setReportOpen(false);
      setReportReason(REPORT_REASONS[0].value);
      setReportDetail("");
      setStatus("Report sent.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send the report.");
    } finally {
      setSubmittingReport(false);
    }
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

        <button className={actionClass(shareOpen)} onClick={() => setShareOpen(true)} type="button">
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
          className={actionClass(tipOpen)}
          onClick={() => {
            setTipOpen(true);
          }}
          type="button"
        >
          <Gift className="size-4" />
          Tip {formatCompact(tips)}
        </button>

        <button
          className={actionClass()}
          onClick={() => setReportOpen(true)}
          type="button"
        >
          <Flag className="size-4" />
          Report
        </button>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-slate-300">
        <MessageSquareMore className="size-4 text-cyan-200" />
        {status ?? "Engagement actions update instantly for the current clip."}
      </div>

      <ModalShell
        bodyClassName="space-y-3 px-4 py-4 md:px-5"
        description="Send this video into your library or out to another app without leaving the watch page."
        eyebrow="Share"
        maxWidthClassName="max-w-md"
        onClose={() => setShareOpen(false)}
        open={shareOpen}
        title={video.title}
      >
        <button
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={Boolean(pendingShareAction)}
          onClick={() => void handleShareAction("copy")}
          type="button"
        >
          <span className="inline-flex items-center gap-2">
            <Copy className="size-4" />
            Copy link
          </span>
          {pendingShareAction === "copy" ? <Loader2 className="size-4 animate-spin" /> : null}
        </button>

        <button
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={Boolean(pendingShareAction) || typeof navigator === "undefined" || typeof navigator.share !== "function"}
          onClick={() => void handleShareAction("native")}
          type="button"
        >
          <span className="inline-flex items-center gap-2">
            <Send className="size-4" />
            Native share
          </span>
          {pendingShareAction === "native" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : typeof navigator === "undefined" || typeof navigator.share !== "function" ? (
            <span className="text-xs text-slate-400">Unavailable</span>
          ) : null}
        </button>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { action: "x" as const, label: "X" },
            { action: "telegram" as const, label: "Telegram" },
            { action: "discord" as const, label: "Discord" },
          ].map((option) => (
            <button
              key={option.action}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={Boolean(pendingShareAction)}
              onClick={() => void handleShareAction(option.action)}
              type="button"
            >
              {pendingShareAction === option.action ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
              {option.label}
            </button>
          ))}
        </div>
      </ModalShell>

      <ModalShell
        description="Tips stay simple here: one popup, one wallet signature, and the platform split is shown before you send."
        eyebrow="Tip creator"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-slate-400">
              {account ? "The creator and treasury split are handled automatically." : "Connect a wallet to tip this video."}
            </p>
            <button className="btn-primary" disabled={submittingTip} onClick={handleTip} type="button">
              {submittingTip ? "Sending..." : `Send ${tipPreview ? tipPreview.amountSui.toFixed(2) : "1.00"} SUI`}
            </button>
          </div>
        }
        onClose={() => setTipOpen(false)}
        open={tipOpen}
        title={video.ownerName}
      >
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
          <p className="text-sm font-semibold text-white">{video.title}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
            Tip in SUI and confirm once in your wallet.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-4">
          {QUICK_TIP_AMOUNTS.map((amount) => {
            const active = Number(tipAmount) === amount;
            return (
              <button
                key={amount}
                className={[
                  "rounded-2xl border px-3 py-3 text-sm font-semibold transition",
                  active ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-50" : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                ].join(" ")}
                onClick={() => setTipAmount(String(amount))}
                type="button"
              >
                {amount} SUI
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Custom amount</span>
          <input
            className="input mt-2 rounded-[18px]"
            inputMode="decimal"
            min="1"
            onChange={(event) => setTipAmount(event.target.value)}
            placeholder="1.0"
            step="0.1"
            type="number"
            value={tipAmount}
          />
        </label>

        <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Tip preview</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Creator</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {tipPreview ? `${tipPreview.creatorSui.toFixed(2)} SUI` : "Enter amount"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Platform fee</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {tipPreview ? `${tipPreview.platformFeeSui.toFixed(2)} SUI` : "0.00 SUI"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Total</p>
              <p className="mt-2 text-sm font-semibold text-white">
                {tipPreview ? `${tipPreview.amountSui.toFixed(2)} SUI` : "0.00 SUI"}
              </p>
            </div>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        description="Reports stay out of the main layout and go straight to moderation with a reason and a note."
        eyebrow="Safety"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-slate-400">
              Include enough detail for admin to review the clip quickly.
            </p>
            <button className="btn-primary" disabled={submittingReport} onClick={handleReport} type="button">
              {submittingReport ? "Sending..." : "Send report"}
            </button>
          </div>
        }
        maxWidthClassName="max-w-lg"
        onClose={() => setReportOpen(false)}
        open={reportOpen}
        title="Report this video"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {REPORT_REASONS.map((reason) => {
            const active = reason.value === reportReason;
            return (
              <button
                key={reason.value}
                className={[
                  "rounded-2xl border px-3 py-3 text-left text-sm transition",
                  active ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-50" : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                ].join(" ")}
                onClick={() => setReportReason(reason.value)}
                type="button"
              >
                {reason.value}
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Review note</span>
          <textarea
            className="mt-2 min-h-32 w-full rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/35"
            onChange={(event) => setReportDetail(event.target.value)}
            placeholder="Describe what needs review and include timestamps if useful."
            value={reportDetail}
          />
        </label>
      </ModalShell>
    </div>
  );
}
