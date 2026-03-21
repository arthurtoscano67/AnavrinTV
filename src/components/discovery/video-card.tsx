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
  <rect width='1280' height='720' fill='rgba(7,11,20,0.42)' />
  <text x='64' y='625' fill='rgba(255,255,255,0.92)' font-family='system-ui, sans-serif' font-weight='700' font-size='44'>${title.slice(0, 52)}</text>
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
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-[#090f20] shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition md:hover:-translate-y-0.5 md:hover:border-white/20 md:hover:shadow-[0_16px_40px_rgba(2,12,35,0.4)] active:scale-[0.995] active:opacity-90">
      <Link className="block" href={watchHref}>
        <div className="relative aspect-video overflow-hidden bg-black/30">
          <img
            alt={video.title}
            className="size-full object-cover transition duration-300 group-hover:scale-[1.02]"
            draggable={false}
            loading="lazy"
            src={posterFor(video)}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,20,0.1),rgba(2,8,20,0.76))]" />
          {isTrending(video) ? (
            <span className="absolute left-2.5 top-2.5 rounded-full border border-amber-200/40 bg-amber-300/18 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100">
              Trending
            </span>
          ) : null}
          <span className="absolute bottom-2.5 right-2.5 rounded-md border border-black/30 bg-black/75 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {video.duration}
          </span>
        </div>
      </Link>

      <div className="flex items-start gap-3 p-3.5">
        <CreatorLink
          className="mt-0.5 block size-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/6"
          title={creatorName}
          username={video.creatorUsername}
        >
          {video.creatorAvatarUrl ? (
            <img alt={creatorName} className="size-full object-cover" draggable={false} loading="lazy" src={video.creatorAvatarUrl} />
          ) : (
            <span className="grid size-full place-items-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
              {initials(creatorName)}
            </span>
          )}
        </CreatorLink>

        <div className="min-w-0 flex-1">
          <Link className="line-clamp-2 text-[15px] font-semibold leading-5 text-white transition group-hover:text-cyan-100" href={watchHref}>
            {video.title}
          </Link>
          <CreatorLink className="mt-1 block truncate text-sm text-slate-300 transition hover:text-cyan-100" username={video.creatorUsername}>
            {video.creatorUsername ? `${creatorName} · @${video.creatorUsername}` : creatorName}
          </CreatorLink>
          <p className="mt-1 text-xs text-slate-400">
            {formatCompact(video.views)} views · {formatRelativeTime(publishedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
