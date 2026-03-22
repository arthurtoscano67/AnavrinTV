import Link from "next/link";

import { CreatorLink } from "@/components/creator-link";
import { formatCompact, formatRelativeTime } from "@/lib/format";
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

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/12 bg-[#0c162c]/88 shadow-[0_10px_26px_rgba(2,6,23,0.3)] transition duration-200 hover:-translate-y-0.5 hover:border-cyan-200/35 hover:shadow-[0_14px_32px_rgba(14,116,144,0.24)]">
      <Link href={watchHref} className="block">
        <div
          className="relative aspect-video overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${video.coverFrom} 0%, ${video.coverVia} 48%, ${video.coverTo} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,9,18,0.08),rgba(5,9,18,0.76))]" />
          <div className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {video.duration}
          </div>
        </div>
      </Link>

      <div className={`flex gap-3 ${compact ? "p-3" : "p-3.5 md:p-4"}`}>
        <CreatorLink
          username={creatorUsername}
          className="mt-0.5 block size-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5"
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
            <span className="grid size-full place-items-center text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
              {getInitials(creatorName)}
            </span>
          )}
        </CreatorLink>

        <div className="min-w-0 flex-1">
          <Link
            href={watchHref}
            className={`line-clamp-2 block font-medium leading-5 text-white transition group-hover:text-cyan-100 ${
              compact ? "text-[14px]" : "text-[15px]"
            }`}
          >
            <h3>
              {video.title}
            </h3>
          </Link>
          <CreatorLink
            username={creatorUsername}
            className="mt-1 block truncate text-sm text-slate-300 hover:text-cyan-100"
          >
            {creatorUsername ? `${creatorName} · @${creatorUsername}` : creatorName}
          </CreatorLink>
          <p className="mt-1 text-xs text-slate-400">
            {formatCompact(video.views)} views · {formatRelativeTime(publishedAt)}
          </p>
        </div>
      </div>
    </article>
  );
}
