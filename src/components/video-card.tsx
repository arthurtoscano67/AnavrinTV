import Link from "next/link";

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

  return (
    <Link
      href={`/video/${video.id}`}
      className="group block transition duration-200 hover:-translate-y-0.5"
    >
      <article className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a1020] transition duration-200 group-hover:border-white/15 group-hover:bg-[#0c1326]">
        <div
          className="relative aspect-video overflow-hidden"
          style={{
            background: `linear-gradient(145deg, ${video.coverFrom} 0%, ${video.coverVia} 48%, ${video.coverTo} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,9,18,0.08),rgba(5,9,18,0.72))]" />
          <div className="absolute bottom-3 right-3 rounded-md bg-black/80 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {video.duration}
          </div>
        </div>

        <div className={`flex gap-3 ${compact ? "p-3" : "p-3.5 md:p-4"}`}>
          <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
            {getInitials(video.ownerName)}
          </div>

          <div className="min-w-0 flex-1">
            <h3
              className={`line-clamp-2 font-medium leading-5 text-white transition group-hover:text-cyan-100 ${
                compact ? "text-[14px]" : "text-[15px]"
              }`}
            >
              {video.title}
            </h3>
            <p className="mt-1 truncate text-sm text-slate-300">{video.ownerName}</p>
            <p className="mt-1 text-xs text-slate-400">
              {formatCompact(video.views)} views · {formatRelativeTime(publishedAt)}
            </p>
          </div>
        </div>
      </article>
    </Link>
  );
}
