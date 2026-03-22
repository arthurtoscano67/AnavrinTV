import { formatCompact, formatRelativeTime } from "@/lib/format";
import { formatMistAsSui, isPaidVideoMonetization } from "@/lib/video-monetization";
import type { VideoRecord } from "@/lib/types";

type VideoTitleSectionProps = {
  video: VideoRecord;
};

export function VideoTitleSection({ video }: VideoTitleSectionProps) {
  const publishedAt = video.publishedAt ?? video.createdAt;
  const isPaidRelease = isPaidVideoMonetization(video.monetization);

  return (
    <section className="space-y-2">
      {isPaidRelease ? (
        <div className="flex flex-wrap gap-2">
          {video.monetization.purchasePriceMist > 0 ? (
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100">
              Buy {formatMistAsSui(video.monetization.purchasePriceMist)} SUI
            </span>
          ) : null}
          {video.monetization.rentalPriceMist > 0 ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-200">
              Rent {formatMistAsSui(video.monetization.rentalPriceMist)} SUI
            </span>
          ) : null}
        </div>
      ) : null}
      <h1 className="text-xl font-semibold leading-7 text-white md:text-2xl">{video.title}</h1>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 md:text-sm">
        <span>{formatCompact(video.views)} views</span>
        <span>•</span>
        <span>{formatRelativeTime(publishedAt)}</span>
        <span>•</span>
        <span>{video.category}</span>
      </div>
    </section>
  );
}
