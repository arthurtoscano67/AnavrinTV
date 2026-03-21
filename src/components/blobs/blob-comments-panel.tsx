"use client";

import { useEffect, useMemo, useRef } from "react";
import { Clock3, Pin, Send, X } from "lucide-react";

import { formatRelativeTime } from "@/lib/format";
import type { BlobComment, BlobItem } from "@/lib/blobs";

type BlobCommentsPanelProps = {
  blob: BlobItem | null;
  comments: BlobComment[];
  open: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function BlobCommentsPanel({
  blob,
  comments,
  open,
  draft,
  onDraftChange,
  onSubmit,
  onClose,
}: BlobCommentsPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, blob?.id]);

  const pinnedComment = useMemo(() => comments.find((comment) => comment.pinned) ?? null, [comments]);
  const regularComments = useMemo(() => comments.filter((comment) => !comment.pinned), [comments]);

  if (!open || !blob) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/55 backdrop-blur-sm md:items-stretch">
      <button aria-label="Close comments" className="absolute inset-0 cursor-default" onClick={onClose} type="button" />

      <section
        data-blob-interactive="true"
        className="pointer-events-auto relative flex h-[76dvh] w-full flex-col rounded-t-[28px] border border-white/10 bg-[#070b15] shadow-[0_-24px_80px_rgba(0,0,0,0.45)] md:h-full md:w-[420px] md:rounded-l-[28px] md:rounded-tr-none"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-4 md:px-5">
          <div>
            <p className="text-xs uppercase tracking-[0.34em] text-slate-400">Comments</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{blob.title}</h2>
          </div>

          <button
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-5">
          {pinnedComment ? (
            <div className="rounded-[24px] border border-cyan-300/15 bg-cyan-300/8 p-4">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-cyan-100/80">
                <Pin className="size-3.5" />
                Pinned by creator
              </div>
              <div className="mt-3 flex gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white">
                  {pinnedComment.authorAvatar}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-white">{pinnedComment.authorName}</span>
                    <span className="text-slate-400">{pinnedComment.authorHandle}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-200">{pinnedComment.body}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {regularComments.map((comment) => (
              <article
                key={comment.id}
                className="rounded-[22px] border border-white/10 bg-white/5 p-4 transition hover:bg-white/7"
              >
                <div className="flex gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {comment.authorAvatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{comment.authorName}</p>
                        <p className="truncate text-[11px] uppercase tracking-[0.24em] text-slate-400">
                          {comment.authorHandle}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.26em] text-slate-400">
                        <Clock3 className="size-3.5" />
                        {formatRelativeTime(comment.createdAt)}
                      </div>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-200">{comment.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <form
          className="border-t border-white/10 px-4 py-4 md:px-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-3">
            <input
              ref={inputRef}
              className="input rounded-[18px] border-white/8 bg-white/5 px-4 py-3"
              onChange={(event) => onDraftChange(event.target.value)}
              placeholder="Add a comment"
              value={draft}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Keep the feed playing while you comment. Posts stay compact and fast.
              </p>
              <button className="btn-primary px-4 py-2.5 text-xs uppercase tracking-[0.22em]" type="submit">
                <Send className="size-4" />
                Send
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

