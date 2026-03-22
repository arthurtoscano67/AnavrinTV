import Link from "next/link";

import { CreatorLink } from "@/components/creator-link";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { buildApiUrl } from "@/lib/site-url";
import { formatMistAsSui, isPaidVideoMonetization } from "@/lib/video-monetization";
import type { VideoRecord } from "@/lib/types";

type RecommendedVideoCardProps = {
  video: VideoRecord;
  active?: boolean;
};

export function RecommendedVideoCard({ video, active = false }: RecommendedVideoCardProps) {
  const publishedAt = video.publishedAt ?? video.createdAt;
  const creatorName = video.creatorDisplayName || video.ownerName;
  const creatorUsername = video.creatorUsername;
  const creatorLabel = creatorUsername ? `${creatorName} · @${creatorUsername}` : creatorName;
  const posterUrl = video.thumbnailUrl?.trim() ? buildApiUrl(video.thumbnailUrl) : undefined;
  const isPaidRelease = isPaidVideoMonetization(video.monetization);

  return (
    <article
      className={[
        "group rounded-xl border p-2 transition",
        active
          ? "border-cyan-300/35 bg-cyan-300/8"
          : "border-white/10 bg-[#1a1a1a] hover:border-white/20 hover:bg-white/5",
      ].join(" ")}
    >
      <div className="flex gap-3">
        <Link href={`/video/${video.id}`}>
          <div
            className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-white/10"
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
            {isPaidRelease ? (
              <div className="absolute left-1.5 top-1.5 flex flex-wrap gap-1">
                {video.monetization.purchasePriceMist > 0 ? (
                  <span className="rounded bg-cyan-300/85 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-950">
                    Buy {formatMistAsSui(video.monetization.purchasePriceMist)} SUI
                  </span>
                ) : null}
                {video.monetization.rentalPriceMist > 0 ? (
                  <span className="rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white">
                    Rent {formatMistAsSui(video.monetization.rentalPriceMist)} SUI
                  </span>
                ) : null}
              </div>
            ) : null}
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {video.duration}
            </span>
          </div>
        </Link>

        <div className="min-w-0 pt-0.5">
          <Link href={`/video/${video.id}`} className="line-clamp-2 block text-sm font-medium leading-5 text-white group-hover:text-cyan-100">
            <h3>{video.title}</h3>
          </Link>
          <div className="mt-1 flex items-center gap-1.5">
            <CreatorLink
              className="block size-5 overflow-hidden rounded-full border border-white/10 bg-white/5"
              title={creatorName}
              username={creatorUsername}
            >
              {video.creatorAvatarUrl ? (
                <img
                  alt={creatorName}
                  className="size-full object-cover"
                  draggable={false}
                  src={video.creatorAvatarUrl}
                />
              ) : (
                <span className="grid size-full place-items-center text-[10px] font-semibold uppercase text-white/90">
                  {(creatorName || "AT").slice(0, 1).toUpperCase()}
                </span>
              )}
            </CreatorLink>
            <CreatorLink
              className="truncate text-xs text-slate-300 hover:text-cyan-100"
              title={creatorName}
              username={creatorUsername}
            >
              {creatorLabel}
            </CreatorLink>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {formatCompact(video.views)} views • {formatRelativeTime(publishedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
