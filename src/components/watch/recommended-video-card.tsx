import Link from "next/link";

import { formatCompact, formatRelativeTime } from "@/lib/format";
import type { VideoRecord } from "@/lib/types";

type RecommendedVideoCardProps = {
  video: VideoRecord;
  active?: boolean;
};

export function RecommendedVideoCard({ video, active = false }: RecommendedVideoCardProps) {
  const publishedAt = video.publishedAt ?? video.createdAt;

  return (
    <Link
      className={[
        "group block rounded-xl border p-2 transition",
        active
          ? "border-cyan-300/35 bg-cyan-300/8"
          : "border-white/10 bg-[#0b1120] hover:border-white/20 hover:bg-white/5",
      ].join(" ")}
      href={`/video/${video.id}`}
    >
      <div className="flex gap-3">
        <div
          className="relative h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-white/10"
          style={{
            background: `linear-gradient(145deg, ${video.coverFrom} 0%, ${video.coverVia} 48%, ${video.coverTo} 100%)`,
          }}
        >
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
            {video.duration}
          </span>
        </div>

        <div className="min-w-0 pt-0.5">
          <h3 className="line-clamp-2 text-sm font-medium leading-5 text-white group-hover:text-cyan-100">
            {video.title}
          </h3>
          <p className="mt-1 truncate text-xs text-slate-300">{video.ownerName}</p>
          <p className="mt-1 text-xs text-slate-400">
            {formatCompact(video.views)} views • {formatRelativeTime(publishedAt)}
          </p>
        </div>
      </div>
    </Link>
  );
}
