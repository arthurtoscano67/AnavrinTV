"use client";

import { Gift, Heart, MessageCircleMore, Share2, UserRoundPlus, UserRoundCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatCompact } from "@/lib/format";
import type { BlobItem } from "@/lib/blobs";

type BlobActionsProps = {
  blob: BlobItem;
  liked: boolean;
  followed: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onTip: () => void;
  onToggleFollow: () => void;
};

function ActionButton({
  label,
  value,
  active,
  disabled,
  icon: Icon,
  onClick,
}: {
  label: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "group flex w-16 flex-col items-center gap-1.5 text-white transition",
        disabled ? "cursor-not-allowed opacity-40" : "hover:scale-[1.02]",
      ].join(" ")}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span
        className={[
          "grid size-12 place-items-center rounded-full border border-white/8 bg-black/35 text-white backdrop-blur-md transition",
          active ? "border-rose-300/25 bg-rose-500/20 text-rose-100" : "hover:bg-black/45",
        ].join(" ")}
      >
        <Icon className={`size-5 ${active ? "fill-current" : ""}`} />
      </span>
      <span className="text-center text-[11px] font-medium leading-tight text-white/90">
        {value ?? label}
      </span>
    </button>
  );
}

export function BlobActions({
  blob,
  liked,
  followed,
  onLike,
  onComment,
  onShare,
  onTip,
  onToggleFollow,
}: BlobActionsProps) {
  return (
    <aside
      data-blob-interactive="true"
      className="pointer-events-auto flex flex-col items-center gap-3 md:gap-4"
    >
      <ActionButton
        active={liked}
        icon={Heart}
        label="Like"
        onClick={onLike}
        value={formatCompact(blob.likesCount)}
      />
      <ActionButton
        icon={MessageCircleMore}
        label="Comment"
        onClick={onComment}
        value={formatCompact(blob.commentsCount)}
      />
      <ActionButton
        icon={Share2}
        label="Share"
        onClick={onShare}
        value={formatCompact(blob.sharesCount)}
      />
      <ActionButton disabled={!blob.tipEnabled} icon={Gift} label="Tip" onClick={onTip} />
      <ActionButton
        active={followed}
        disabled={!blob.followable}
        icon={followed ? UserRoundCheck : UserRoundPlus}
        label="Follow"
        onClick={onToggleFollow}
      />
    </aside>
  );
}
