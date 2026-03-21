import { CreatorLink } from "@/components/creator-link";
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
  const creatorName = video.creatorDisplayName || video.ownerName;
  const creatorHandle = video.creatorUsername ? `@${video.creatorUsername}` : null;

  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1120] p-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <CreatorLink
          username={video.creatorUsername}
          className="block size-11 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5"
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
            <span className="grid size-full place-items-center text-sm font-semibold tracking-wide text-white">
              {initials(creatorName)}
            </span>
          )}
        </CreatorLink>
        <div className="min-w-0">
          <CreatorLink
            className="block truncate text-sm font-semibold text-white hover:text-cyan-100"
            title={creatorName}
            username={video.creatorUsername}
          >
            {creatorName}
          </CreatorLink>
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            {creatorHandle ? (
              <CreatorLink
                className="truncate text-xs text-slate-400 hover:text-cyan-100"
                title={creatorHandle}
                username={video.creatorUsername}
              >
                {creatorHandle}
              </CreatorLink>
            ) : null}
            <span>{formatCompact(video.subscribers)} subscribers</span>
          </div>
        </div>
      </div>

      <button className="btn-primary px-4 py-2 text-xs uppercase tracking-[0.2em]" type="button">
        Subscribe
      </button>
    </section>
  );
}
