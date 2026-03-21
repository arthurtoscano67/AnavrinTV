"use client";

import { Copy, Loader2, Send, Share2, X } from "lucide-react";

import type { BlobItem } from "@/lib/blobs";

export type BlobShareAction = "copy" | "native" | "x" | "telegram" | "discord";

type BlobShareModalProps = {
  blob: BlobItem | null;
  open: boolean;
  loadingAction: BlobShareAction | null;
  onClose: () => void;
  onShare: (action: BlobShareAction) => void;
};

const SOCIAL_OPTIONS: Array<{ action: BlobShareAction; label: string }> = [
  { action: "x", label: "Share to X" },
  { action: "telegram", label: "Share to Telegram" },
  { action: "discord", label: "Share to Discord" },
];

export function BlobShareModal({ blob, open, loadingAction, onClose, onShare }: BlobShareModalProps) {
  const nativeSupported = typeof navigator !== "undefined" && typeof navigator.share === "function";

  if (!open || !blob) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm md:items-center md:p-6">
      <button aria-label="Close share modal" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />

      <section
        data-blob-interactive="true"
        className="pointer-events-auto relative w-full max-w-md rounded-[28px] border border-white/10 bg-[#070b15] shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 md:px-5">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-slate-400">Share Blob</p>
            <h2 className="mt-1 truncate text-base font-semibold text-white">{blob.title}</h2>
          </div>
          <button
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            onClick={onClose}
            title="Close share"
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-3 px-4 py-4 md:px-5">
          <button
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={Boolean(loadingAction)}
            onClick={() => onShare("copy")}
            title="Copy link"
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Copy className="size-4" />
              Copy link
            </span>
            {loadingAction === "copy" ? <Loader2 className="size-4 animate-spin" /> : null}
          </button>

          <button
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={Boolean(loadingAction) || !nativeSupported}
            onClick={() => onShare("native")}
            title={nativeSupported ? "Native share" : "Native share unavailable"}
            type="button"
          >
            <span className="inline-flex items-center gap-2">
              <Share2 className="size-4" />
              Native share
            </span>
            {loadingAction === "native" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : !nativeSupported ? (
              <span className="text-xs text-slate-400">Unavailable</span>
            ) : null}
          </button>

          <div className="grid gap-2 sm:grid-cols-3">
            {SOCIAL_OPTIONS.map((option) => (
              <button
                key={option.action}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={Boolean(loadingAction)}
                onClick={() => onShare(option.action)}
                title={option.label}
                type="button"
              >
                {loadingAction === option.action ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
                {option.label.replace("Share to ", "")}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
