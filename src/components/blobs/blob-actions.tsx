"use client";

import {
  Gift,
  Heart,
  Loader2,
  MessageCircleMore,
  Share2,
  UserRound,
  UserRoundCheck,
  UserRoundPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { formatCompact } from "@/lib/format";
import type { BlobItem } from "@/lib/blobs";

type BlobActionsProps = {
  blob: BlobItem;
  liked: boolean;
  followed: boolean;
  isCreatorOwner: boolean;
  pendingLike?: boolean;
  pendingComment?: boolean;
  pendingShare?: boolean;
  pendingTip?: boolean;
  pendingFollow?: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onTip: () => void;
  onToggleFollow: () => void;
  onOpenOwnProfile: () => void;
};

function ActionButton({
  label,
  value,
  active,
  disabled,
  loading,
  icon: Icon,
  tooltip,
  onClick,
}: {
  label: string;
  value?: string;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
  icon: LucideIcon;
  tooltip?: string;
  onClick: () => void;
}) {
  const interactiveDisabled = Boolean(disabled || loading);

  return (
    <button
      className={[
        "group flex w-16 flex-col items-center gap-1.5 text-white transition",
        interactiveDisabled
          ? "cursor-not-allowed opacity-45"
          : "hover:scale-[1.02] active:scale-[0.98]",
      ].join(" ")}
      aria-busy={loading}
      aria-label={value ? `${label} ${value}` : label}
      disabled={interactiveDisabled}
      onClick={onClick}
      title={tooltip ?? label}
      type="button"
    >
      <span
        className={[
          "grid size-12 place-items-center rounded-full border border-white/8 bg-black/35 text-white backdrop-blur-md transition",
          active ? "border-rose-300/25 bg-rose-500/20 text-rose-100" : "hover:bg-black/45",
        ].join(" ")}
      >
        {loading ? <Loader2 className="size-5 animate-spin" /> : <Icon className={`size-5 ${active ? "fill-current" : ""}`} />}
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
  isCreatorOwner,
  pendingLike,
  pendingComment,
  pendingShare,
  pendingTip,
  pendingFollow,
  onLike,
  onComment,
  onShare,
  onTip,
  onToggleFollow,
  onOpenOwnProfile,
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
        loading={pendingLike}
        onClick={onLike}
        tooltip={liked ? "Unlike" : "Like"}
        value={formatCompact(blob.likesCount)}
      />
      <ActionButton
        icon={MessageCircleMore}
        label="Comment"
        loading={pendingComment}
        onClick={onComment}
        tooltip="Comments"
        value={formatCompact(blob.commentsCount)}
      />
      <ActionButton
        icon={Share2}
        label="Share"
        loading={pendingShare}
        onClick={onShare}
        tooltip="Share"
        value={formatCompact(blob.sharesCount)}
      />
      <ActionButton
        disabled={!blob.tipEnabled}
        icon={Gift}
        label="Tip"
        loading={pendingTip}
        onClick={onTip}
        tooltip={blob.tipEnabled ? "Tip creator" : "Tips unavailable"}
      />
      {isCreatorOwner ? (
        <ActionButton
          icon={UserRound}
          label="Profile"
          loading={pendingFollow}
          onClick={onOpenOwnProfile}
          tooltip="Edit profile"
        />
      ) : (
        <ActionButton
          active={followed}
          disabled={!blob.followable}
          icon={followed ? UserRoundCheck : UserRoundPlus}
          label={followed ? "Following" : "Follow"}
          loading={pendingFollow}
          onClick={onToggleFollow}
          tooltip={followed ? "Unfollow creator" : "Follow creator"}
        />
      )}
    </aside>
  );
}
