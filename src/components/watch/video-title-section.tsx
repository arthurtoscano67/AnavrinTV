import { formatCompact, formatRelativeTime } from "@/lib/format";
import type { VideoRecord } from "@/lib/types";

type VideoTitleSectionProps = {
  video: VideoRecord;
};

export function VideoTitleSection({ video }: VideoTitleSectionProps) {
  const publishedAt = video.publishedAt ?? video.createdAt;

  return (
    <section className="space-y-2">
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
