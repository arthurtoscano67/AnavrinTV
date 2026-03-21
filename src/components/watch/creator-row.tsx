import Link from "next/link";

import { formatCompact } from "@/lib/format";
import type { VideoRecord } from "@/lib/types";

type CreatorRowProps = {
  video: VideoRecord;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function CreatorRow({ video }: CreatorRowProps) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1120] p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold tracking-wide text-white">
          {initials(video.ownerName)}
        </div>
        <div className="min-w-0">
          <Link className="block truncate text-sm font-semibold text-white hover:text-cyan-100" href={`/browse?q=${encodeURIComponent(video.ownerName)}`}>
            {video.ownerName}
          </Link>
          <p className="truncate text-xs text-slate-400">
            {formatCompact(video.subscribers)} subscribers
          </p>
        </div>
      </div>

      <button className="btn-primary px-4 py-2 text-xs uppercase tracking-[0.2em]" type="button">
        Subscribe
      </button>
    </section>
  );
}
