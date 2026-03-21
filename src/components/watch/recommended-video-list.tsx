"use client";

import { useMemo, useState } from "react";

import { RecommendedVideoCard } from "@/components/watch/recommended-video-card";
import type { VideoRecord } from "@/lib/types";

type RecommendedVideoListProps = {
  videos: VideoRecord[];
  currentVideoId: string;
  currentCategory: string;
};

export function RecommendedVideoList({
  videos,
  currentVideoId,
  currentCategory,
}: RecommendedVideoListProps) {
  const categories = useMemo(() => {
    const unique = new Set<string>(["All", currentCategory]);
    for (const video of videos) {
      unique.add(video.category);
      if (unique.size >= 8) break;
    }
    return Array.from(unique);
  }, [videos, currentCategory]);

  const [activeFilter, setActiveFilter] = useState(categories[1] ?? "All");

  const filtered = useMemo(() => {
    if (activeFilter === "All") return videos;
    return videos.filter((video) => video.category === activeFilter);
  }, [activeFilter, videos]);

  return (
    <aside className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => {
          const active = category === activeFilter;
          return (
            <button
              key={category}
              className={[
                "rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition",
                active
                  ? "border-cyan-300/35 bg-cyan-300/14 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white",
              ].join(" ")}
              onClick={() => setActiveFilter(category)}
              type="button"
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="space-y-2 overflow-y-auto">
        {filtered.map((video) => (
          <RecommendedVideoCard key={video.id} active={video.id === currentVideoId} video={video} />
        ))}
      </div>
    </aside>
  );
}
