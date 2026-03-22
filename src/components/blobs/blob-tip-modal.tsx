"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Coins, Gift, X } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

import { calculateTipPlatformFeeSui, defaultPlatformSettings } from "@/lib/platform-settings";
import type { BlobItem } from "@/lib/blobs";
import type { PlatformSettings } from "@/lib/types";

type BlobTipModalProps = {
  blob: BlobItem | null;
  open: boolean;
  platform: PlatformSettings;
  onClose: () => void;
  onSend: (amountSui: number) => Promise<void>;
};

const QUICK_AMOUNTS = [1, 2, 5, 10] as const;

export function BlobTipModal({ blob, open, platform, onClose, onSend }: BlobTipModalProps) {
  const account = useCurrentAccount();
  const [amount, setAmount] = useState("1");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const tipPlatform = platform ?? defaultPlatformSettings();

  const preview = useMemo(() => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return calculateTipPlatformFeeSui(tipPlatform, parsed);
  }, [amount, tipPlatform]);

  useEffect(() => {
    if (!open) return;
    setStatus(null);
    setAmount("1");
  }, [blob?.id, open]);

  if (!open || !blob) return null;

  async function handleSend() {
    const activeBlob = blob;
    if (!activeBlob) return;

    if (!account) {
      setStatus("Connect a wallet to send a tip.");
      return;
    }

    if (!activeBlob.tipEnabled) {
      setStatus("Tips are disabled for this Blob.");
      return;
    }

    if (!preview) {
      setStatus("Enter a positive SUI amount.");
      return;
    }

    setSending(true);
    setStatus("Preparing tip...");

    try {
      await onSend(preview.amountSui);
      setStatus(`Sent ${preview.amountSui.toFixed(2)} SUI to ${activeBlob.creatorName}.`);
      window.setTimeout(() => {
        onClose();
      }, 420);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Tip failed.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-6">
      <button aria-label="Close tip modal" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />

      <section
        data-blob-interactive="true"
        className="pointer-events-auto relative w-full max-w-xl rounded-[28px] border border-white/10 bg-[#070b15] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:max-w-lg"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 md:px-5">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-slate-400">Tip creator</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{blob.creatorName}</h2>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{blob.creatorHandle}</p>
          </div>

          <button
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-4 px-4 py-4 md:px-5">
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
                {blob.creatorAvatar}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{blob.caption}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">
                  Tips are paid in SUI with an automatic platform split.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-4">
            {QUICK_AMOUNTS.map((quick) => {
              const active = Number(amount) === quick;
              return (
                <button
                  key={quick}
                  className={[
                    "rounded-2xl border px-3 py-3 text-sm font-semibold transition",
                    active ? "border-cyan-300/30 bg-cyan-300/12 text-cyan-50" : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                  ].join(" ")}
                  onClick={() => setAmount(String(quick))}
                  type="button"
                >
                  {quick} SUI
                </button>
              );
            })}
          </div>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Token</span>
            <select
              className="select mt-2 rounded-[18px] border-white/10 bg-white/5 text-white"
              defaultValue="SUI"
              disabled
              title="SUI tips only"
            >
              <option value="SUI">SUI</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.28em] text-slate-400">Custom amount</span>
            <input
              className="input mt-2 rounded-[18px]"
              inputMode="decimal"
              min="0.000000001"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.5"
              step="0.01"
              type="number"
              value={amount}
            />
          </label>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Tip preview</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Creator</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {preview ? `${preview.creatorSui.toFixed(2)} SUI` : "Enter amount"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Platform fee</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {preview ? `${preview.platformFeeSui.toFixed(2)} SUI` : "0.00 SUI"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Total</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {preview ? `${preview.amountSui.toFixed(2)} SUI` : "0.00 SUI"}
                </p>
              </div>
            </div>
          </div>

          {status ? (
            <div className="rounded-[22px] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-7 text-cyan-50">
              {status}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-6 text-slate-400">
              {account ? "Send is a single SUI transaction with the platform fee split automatically." : "Connect a wallet to tip."}
            </p>
            <button
              className="btn-primary"
              disabled={sending || !blob.tipEnabled}
              onClick={handleSend}
              type="button"
            >
              {sending ? (
                <Coins className="size-4 animate-pulse" />
              ) : (
                <Gift className="size-4" />
              )}
              {sending ? "Sending..." : `Send ${preview ? preview.amountSui.toFixed(2) : "1.00"} SUI`}
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
            <CheckCircle2 className="size-4 text-cyan-200" />
            Wallet signs once, creator and treasury receive the split automatically.
          </div>
        </div>
      </section>
    </div>
  );
}
