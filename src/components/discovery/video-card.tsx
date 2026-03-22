import Link from "next/link";

import { CreatorLink } from "@/components/creator-link";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { buildApiUrl } from "@/lib/site-url";
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
  if (video.thumbnailUrl?.trim()) {
    return buildApiUrl(video.thumbnailUrl);
  }

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
  <rect width='1280' height='720' fill='rgba(2,8,22,0.38)' />
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
    <article className="group video-card cursor-pointer">
      <Link className="block" href={watchHref}>
        <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-[#15233d]">
          <img
            alt={video.title}
            className="size-full object-cover transition duration-300 group-hover:scale-[1.04]"
            draggable={false}
            loading="lazy"
            src={posterFor(video)}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/16 to-transparent" />

          {isTrending(video) ? (
            <span className="absolute left-2 top-2 rounded-full border border-amber-300/30 bg-amber-300/18 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-amber-100 backdrop-blur-sm">
              Trending
            </span>
          ) : null}

          <span className="absolute bottom-2 right-2 rounded-md border border-black/20 bg-black/70 px-2 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
            {video.duration}
          </span>
        </div>
      </Link>

      <div className="mt-3 flex items-start gap-3 p-3 pt-0">
        <CreatorLink
          className="mt-0.5 block size-9 shrink-0 overflow-hidden rounded-full border border-white/14 bg-white/7"
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
            <span className="grid size-full place-items-center text-[11px] font-bold uppercase tracking-wide text-white/85">
              {initials(creatorName)}
            </span>
          )}
        </CreatorLink>

        <div className="min-w-0 flex-1">
          <Link
            className="line-clamp-2 text-sm font-semibold leading-5 text-[#f8fbff] transition group-hover:text-cyan-100"
            href={watchHref}
          >
            {video.title}
          </Link>

          <CreatorLink
            className="mt-1 block truncate text-xs text-slate-300 transition hover:text-cyan-100"
            username={video.creatorUsername}
          >
            {video.creatorUsername ? `${creatorName} · @${video.creatorUsername}` : creatorName}
          </CreatorLink>

          <p className="mt-0.5 text-xs text-slate-400">
            {formatCompact(video.views)} views · {formatRelativeTime(publishedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
