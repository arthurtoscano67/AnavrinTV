"use client";

import { useMemo, useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";

import { CreatorLink } from "@/components/creator-link";
import type { BlobItem } from "@/lib/blobs";
import { normalizeUsernameInput } from "@/lib/creator-identity";

type BlobCreatorMetaProps = {
  blob: BlobItem;
  followed: boolean;
  followLoading?: boolean;
  isCreatorOwner: boolean;
  onOpenOwnProfile: () => void;
  onToggleFollow: () => void;
  onTagClick: (tag: string) => void;
};

function captionSegments(value: string) {
  const pattern = /#[a-z0-9_]+/gi;
  const segments: Array<{ type: "text" | "tag"; value: string }> = [];
  let offset = 0;

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > offset) {
      segments.push({
        type: "text",
        value: value.slice(offset, index),
      });
    }
    segments.push({
      type: "tag",
      value: match[0],
    });
    offset = index + match[0].length;
  }

  if (offset < value.length) {
    segments.push({
      type: "text",
      value: value.slice(offset),
    });
  }

  return segments;
}

export function BlobCreatorMeta({
  blob,
  followed,
  followLoading,
  isCreatorOwner,
  onOpenOwnProfile,
  onToggleFollow,
  onTagClick,
}: BlobCreatorMetaProps) {
  const [expanded, setExpanded] = useState(false);
  const creatorUsername = normalizeUsernameInput(blob.creatorHandle || blob.creatorName);
  const segments = useMemo(() => captionSegments(blob.caption), [blob.caption]);
  const showExpand = blob.caption.length > 120;

  return (
    <section
      data-blob-interactive="true"
      className="pointer-events-auto max-w-[min(92vw,26rem)] text-white"
    >
      <div className="flex items-center gap-3">
        <CreatorLink
          className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/25 hover:bg-white/15"
          title="View creator profile"
          username={creatorUsername}
        >
          {blob.creatorAvatar}
        </CreatorLink>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <CreatorLink
                className="truncate text-sm font-semibold text-white transition hover:text-cyan-100 md:text-base"
                title="View creator profile"
                username={creatorUsername}
              >
                {blob.creatorName}
              </CreatorLink>
              <CreatorLink
                className="truncate text-xs text-white/65 transition hover:text-cyan-100"
                title="View creator profile"
                username={creatorUsername}
              >
                {blob.creatorHandle}
              </CreatorLink>
            </div>

            {isCreatorOwner ? (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15 active:scale-[0.98]"
                onClick={onOpenOwnProfile}
                title="Edit profile"
                type="button"
              >
                Edit profile
              </button>
            ) : (
              <button
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!blob.followable || followLoading}
                onClick={onToggleFollow}
                title={followed ? "Unfollow creator" : "Follow creator"}
                type="button"
              >
                {followed ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
                {followLoading ? "Saving..." : followed ? "Following" : "Follow"}
              </button>
            )}
          </div>
        </div>
      </div>

      <p
        className={`mt-3 max-w-[22rem] text-sm leading-6 text-white/92 ${expanded ? "" : "overflow-hidden"}`}
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
              }
        }
      >
        {segments.map((segment, index) =>
          segment.type === "tag" ? (
            <button
              key={`${segment.value}-${index}`}
              className="font-medium text-cyan-100 transition hover:text-cyan-200"
              onClick={() => onTagClick(segment.value)}
              title={`Browse ${segment.value}`}
              type="button"
            >
              {segment.value}
            </button>
          ) : (
            <span key={`${segment.value}-${index}`}>{segment.value}</span>
          ),
        )}
      </p>

      {showExpand ? (
        <button
          className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:text-cyan-200"
          onClick={() => setExpanded((value) => !value)}
          title={expanded ? "Show less" : "Show more"}
          type="button"
        >
          {expanded ? "Show less" : "More"}
        </button>
      ) : null}

      {blob.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {blob.tags.slice(0, 4).map((tag) => (
            <button
              key={tag}
              className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-300/15"
              onClick={() => onTagClick(tag)}
              title={`Filter by ${tag}`}
              type="button"
            >
              #{tag.replace(/^#/, "")}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
