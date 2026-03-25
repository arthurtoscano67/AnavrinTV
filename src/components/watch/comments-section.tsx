"use client";

import { useMemo, useState } from "react";

import { formatCompact, formatRelativeTime } from "@/lib/format";

export type WatchComment = {
  id: string;
  authorName: string;
  authorHandle: string;
  body: string;
  likes: number;
  createdAt: string;
  pinned?: boolean;
};

type CommentsSectionProps = {
  totalCount: number;
  initialComments: WatchComment[];
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AN";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function CommentsSection({ totalCount, initialComments }: CommentsSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [draft, setDraft] = useState("");

  const orderedComments = useMemo(
    () =>
      [...comments].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [comments],
  );

  function addComment() {
    const body = draft.trim();
    if (!body) return;
    setComments((current) => [
      {
        id: `local-${Date.now()}`,
        authorName: "You",
        authorHandle: "@you",
        body,
        likes: 0,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setDraft("");
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-[#1a1a1a] p-4">
      <h2 className="text-base font-semibold text-white">
        Comments {formatCompact(Math.max(totalCount, comments.length))}
      </h2>

      <div className="mt-3 flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#2a2a2a] text-xs font-semibold text-white">
          YOU
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <textarea
            className="w-full rounded-xl border border-white/10 bg-[#202020] px-3 py-2 text-sm text-white outline-none placeholder:text-[#7a7a7a] focus:border-[#ff5f5f]/55"
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a comment..."
            rows={2}
            value={draft}
          />
          <div className="flex justify-end">
            <button className="btn-secondary px-3 py-2 text-xs uppercase tracking-[0.2em]" onClick={addComment} type="button">
              Comment
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {orderedComments.map((comment) => (
          <article key={comment.id} className="flex gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-[#2a2a2a] text-xs font-semibold text-white">
              {initials(comment.authorName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#9f9f9f]">
                <span className="font-semibold text-white">{comment.authorName}</span>
                <span>{comment.authorHandle}</span>
                <span>•</span>
                <span>{formatRelativeTime(comment.createdAt)}</span>
                {comment.pinned ? (
                  <span className="rounded-full border border-[#ff5f5f]/45 bg-[#ff5f5f]/18 px-2 py-0.5 uppercase tracking-[0.22em] text-[#ffd5d5]">
                    Pinned
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm leading-6 text-[#d4d4d4]">{comment.body}</p>
              <p className="mt-1 text-xs text-[#7f7f7f]">{formatCompact(comment.likes)} likes</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
