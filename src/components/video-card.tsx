import Link from "next/link";

import { CreatorLink } from "@/components/creator-link";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { buildApiUrl } from "@/lib/site-url";
import { formatMistAsSui, isPaidVideoMonetization } from "@/lib/video-monetization";
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

export function VideoCard({
  video,
  compact = false,
}: {
  video: VideoRecord;
  compact?: boolean;
}) {
  const publishedAt = video.publishedAt ?? video.createdAt;
  const creatorName = video.creatorDisplayName || video.ownerName;
  const creatorUsername = video.creatorUsername;
  const watchHref = `/video/${video.id}`;
  const posterUrl = video.thumbnailUrl?.trim() ? buildApiUrl(video.thumbnailUrl) : undefined;
  const isPaidRelease = isPaidVideoMonetization(video.monetization);

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/12 bg-[#181818] shadow-[0_8px_22px_rgba(0,0,0,0.3)] transition duration-200 hover:border-white/20 hover:bg-[#202020]">
      <Link href={watchHref} className="block">
        <div
          className="relative aspect-video overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${video.coverFrom} 0%, ${video.coverVia} 48%, ${video.coverTo} 100%)`,
          }}
        >
          {posterUrl ? (
            <img
              alt={video.title}
              className="absolute inset-0 size-full object-cover"
              draggable={false}
              loading="lazy"
              src={posterUrl}
            />
          ) : null}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.76))]" />
          {isPaidRelease ? (
            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              {video.monetization.purchasePriceMist > 0 ? (
                <span className="rounded-full border border-[#ff5f5f]/40 bg-[#ff5f5f]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffd3d3] backdrop-blur-sm">
                  Buy {formatMistAsSui(video.monetization.purchasePriceMist)} SUI
                </span>
              ) : null}
              {video.monetization.rentalPriceMist > 0 ? (
                <span className="rounded-full border border-white/12 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white backdrop-blur-sm">
                  Rent {formatMistAsSui(video.monetization.rentalPriceMist)} SUI
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {video.duration}
          </div>
        </div>
      </Link>

      <div className={`flex gap-3 ${compact ? "p-3" : "p-3.5 md:p-4"}`}>
        <CreatorLink
          username={creatorUsername}
          className="mt-0.5 block size-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#2a2a2a]"
          title={creatorName}
        >
          {video.creatorAvatarUrl ? (
            <img
              alt={creatorName}
              className="size-full object-cover"
              draggable={false}
              src={video.creatorAvatarUrl}
            />
          ) : (
            <span className="grid size-full place-items-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
              {getInitials(creatorName)}
            </span>
          )}
        </CreatorLink>

        <div className="min-w-0 flex-1">
          <Link
            href={watchHref}
            className={`line-clamp-2 block font-medium leading-5 text-white transition group-hover:text-[#ffd0d0] ${
              compact ? "text-[14px]" : "text-[15px]"
            }`}
          >
            <h3>
              {video.title}
            </h3>
          </Link>
          <CreatorLink
            username={creatorUsername}
            className="mt-1 block truncate text-sm text-[#b4b4b4] hover:text-white"
          >
            {creatorUsername ? `${creatorName} · @${creatorUsername}` : creatorName}
          </CreatorLink>
          <p className="mt-1 text-xs text-[#949494]">
            {formatCompact(video.views)} views · {formatRelativeTime(publishedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
