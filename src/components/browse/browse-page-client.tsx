"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { formatCompact, formatRelativeTime } from "@/lib/format";
import { buildApiUrl } from "@/lib/site-url";
import type { VideoRecord } from "@/lib/types";

type BrowsePageClientProps = {
  videos: VideoRecord[];
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function BrowsePageClient({ videos }: BrowsePageClientProps) {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.toLowerCase().trim() || "";

  const results = useMemo(
    () =>
      videos.filter((video) => {
        if (!query) return true;
        return (
          video.title.toLowerCase().includes(query) ||
          video.description.toLowerCase().includes(query) ||
          video.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }),
    [query, videos],
  );

  return (
    <div className="mx-auto max-w-[1284px] p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between border-b border-yt-border pb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-yt-gray">
          <span>About {results.length} results</span>
        </div>

        <button className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors hover:bg-white/10" type="button">
          <SlidersHorizontal className="h-4 w-4" />
          Filters
        </button>
      </div>

      <div className="flex flex-col gap-8">
        {results.length > 0 ? (
          results.map((video) => {
            const href = `/video/${video.id}`;
            const thumb = video.thumbnailUrl?.trim() ? buildApiUrl(video.thumbnailUrl) : null;
            const creatorName = video.creatorDisplayName || video.ownerName;

            return (
              <Link key={video.id} href={href} className="group flex flex-col gap-4 sm:flex-row">
                <div className="relative aspect-video w-full flex-shrink-0 overflow-hidden rounded-xl border border-yt-border bg-yt-dark sm:w-80">
                  {thumb ? (
                    <img src={thumb} alt={video.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  ) : (
                    <div
                      className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                      style={{ background: `linear-gradient(145deg, ${video.coverFrom} 0%, ${video.coverVia} 48%, ${video.coverTo} 100%)` }}
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2 overflow-hidden py-1">
                  <h3 className="line-clamp-2 text-lg font-bold leading-tight transition-colors group-hover:text-yt-red">{video.title}</h3>

                  <div className="flex items-center gap-2 text-xs text-yt-gray">
                    <span>{formatCompact(video.views)} views</span>
                    <span>•</span>
                    <span>{formatRelativeTime(video.publishedAt ?? video.createdAt)}</span>
                  </div>

                  <div className="my-2 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-yt-border bg-yt-dark">
                      {video.creatorAvatarUrl ? (
                        <img src={video.creatorAvatarUrl} alt={creatorName} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px]">{initials(creatorName)}</span>
                      )}
                    </div>
                    <span className="text-xs text-yt-gray transition-colors hover:text-white">{creatorName}</span>
                  </div>

                  <p className="line-clamp-2 text-xs leading-snug text-yt-gray">{video.description}</p>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-yt-gray">
            <div className="text-4xl">🔍</div>
            <h3 className="text-xl font-bold text-white">No results found for &quot;{query}&quot;</h3>
            <p className="max-w-xs text-center text-sm">Try different keywords or check your spelling.</p>
          </div>
        )}
      </div>
    </div>
  );
}
