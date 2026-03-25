"use client";

import Link from "next/link";
import { Play, Clock } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";

import { CreatorLink } from "@/components/creator-link";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { buildApiUrl } from "@/lib/site-url";
import type { VideoRecord } from "@/lib/types";

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "TV";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getDaysUntilExpiry(storageExpiry?: string) {
  if (!storageExpiry) return null;
  const diff = new Date(storageExpiry).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function VideoCard({
  video,
}: {
  video: VideoRecord;
  compact?: boolean;
}) {
  const account = useCurrentAccount();
  const publishedAt = video.publishedAt ?? video.createdAt;
  const creatorName = video.creatorDisplayName || video.ownerName;
  const creatorUsername = video.creatorUsername;
  const watchHref = `/video/${video.id}`;
  const posterUrl = video.thumbnailUrl?.trim() ? buildApiUrl(video.thumbnailUrl) : undefined;
  const isOwner = account?.address?.toLowerCase() === video.ownerAddress.toLowerCase();
  const daysLeft = getDaysUntilExpiry(video.storageExpiresAt ?? video.asset?.storageExpiresAt);

  return (
    <div className="group flex cursor-pointer flex-col gap-3">
      <Link href={watchHref} className="relative aspect-video overflow-hidden rounded-xl border border-yt-border bg-yt-dark">
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={video.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center transition-transform duration-300 group-hover:scale-105"
            style={{
              background: `linear-gradient(145deg, ${video.coverFrom} 0%, ${video.coverVia} 48%, ${video.coverTo} 100%)`,
            }}
          >
            <Play className="h-12 w-12 fill-white/10 text-white/20" />
          </div>
        )}

        {video.duration ? (
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {video.duration}
          </div>
        ) : null}

        {isOwner && daysLeft !== null ? (
          <div
            className={[
              "absolute right-2 top-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md",
              daysLeft <= 0
                ? "bg-red-500 text-white"
                : daysLeft < 7
                  ? "bg-red-500/80 text-white"
                  : daysLeft < 30
                    ? "bg-yellow-500/80 text-black"
                    : "bg-emerald-500/80 text-white",
            ].join(" ")}
          >
            <Clock className="h-3 w-3" />
            {daysLeft <= 0 ? "Expired" : `${daysLeft}d`}
          </div>
        ) : null}
      </Link>

      <div className="flex gap-3 px-1">
        <CreatorLink
          username={creatorUsername}
          className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-yt-border bg-yt-dark"
          title={creatorName}
        >
          {video.creatorAvatarUrl ? (
            <img src={video.creatorAvatarUrl} alt={creatorName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">{getInitials(creatorName)}</div>
          )}
        </CreatorLink>

        <div className="flex flex-col gap-1 overflow-hidden">
          <Link href={watchHref} className="line-clamp-2 text-sm font-semibold leading-tight transition-colors group-hover:text-yt-red">
            {video.title}
          </Link>
          <div className="flex flex-col text-xs text-yt-gray">
            <CreatorLink username={creatorUsername} className="transition-colors hover:text-white" title={creatorName}>
              {creatorName}
            </CreatorLink>
            <div className="flex items-center gap-1">
              <span>{formatCompact(video.views)} views</span>
              <span className="text-[8px]">•</span>
              <span>{formatRelativeTime(publishedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
