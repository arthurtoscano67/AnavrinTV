import Link from "next/link";

import { CreatorLink } from "@/components/creator-link";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import type { VideoRecord } from "@/lib/types";

type DiscoveryVideoCardProps = {
  video: VideoRecord;
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function posterFor(video: VideoRecord) {
  const title = (video.title || "Anavrin TV").replace(/[&<>]/g, "");
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1280 720'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0%' stop-color='${video.coverFrom}' />
      <stop offset='48%' stop-color='${video.coverVia}' />
      <stop offset='100%' stop-color='${video.coverTo}' />
    </linearGradient>
  </defs>
  <rect width='1280' height='720' fill='url(#g)' />
  <rect width='1280' height='720' fill='rgba(0,0,0,0.32)' />
  <text x='64' y='625' fill='rgba(255,255,255,0.95)' font-family='system-ui, sans-serif' font-weight='700' font-size='44'>${title.slice(0, 52)}</text>
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function isTrending(video: VideoRecord) {
  return video.views >= 75_000 || video.likes >= 15_000;
}

export function VideoCard({ video }: DiscoveryVideoCardProps) {
  const watchHref = `/video/${video.id}`;
  const creatorName = video.creatorDisplayName || video.ownerName;
  const publishedAt = video.publishedAt ?? video.createdAt;

  return (
    <article className="group cursor-pointer">
      {/* Thumbnail */}
      <Link className="block" href={watchHref}>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-[#212121]">
          <img
            alt={video.title}
            className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
            draggable={false}
            loading="lazy"
            src={posterFor(video)}
          />

          {/* subtle bottom fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Trending badge */}
          {isTrending(video) ? (
            <span className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ff0000] backdrop-blur-sm">
              Trending
            </span>
          ) : null}

          {/* Duration badge */}
          <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
            {video.duration}
          </span>
        </div>
      </Link>

      {/* Metadata row */}
      <div className="mt-3 flex items-start gap-3">
        {/* Avatar */}
        <CreatorLink
          className="mt-0.5 block size-9 shrink-0 overflow-hidden rounded-full bg-[#272727]"
          title={creatorName}
          username={video.creatorUsername}
        >
          {video.creatorAvatarUrl ? (
            <img
              alt={creatorName}
              className="size-full object-cover"
              draggable={false}
              loading="lazy"
              src={video.creatorAvatarUrl}
            />
          ) : (
            <span className="grid size-full place-items-center text-[11px] font-bold uppercase tracking-wide text-white/80">
              {initials(creatorName)}
            </span>
          )}
        </CreatorLink>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <Link
            className="line-clamp-2 text-sm font-semibold leading-5 text-[#f1f1f1] transition group-hover:text-white"
            href={watchHref}
          >
            {video.title}
          </Link>

          <CreatorLink
            className="mt-1 block truncate text-xs text-[#aaa] transition hover:text-white"
            username={video.creatorUsername}
          >
            {video.creatorUsername ? `${creatorName} · @${video.creatorUsername}` : creatorName}
          </CreatorLink>

          <p className="mt-0.5 text-xs text-[#717171]">
            {formatCompact(video.views)} views · {formatRelativeTime(publishedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
