"use client";

import { VideoCard } from "@/components/video-card";
import type { SiteMetrics, VideoRecord } from "@/lib/types";

type HomeDiscoveryClientProps = {
  videos: VideoRecord[];
  metrics: SiteMetrics;
};

export function HomeDiscoveryClient({ videos }: HomeDiscoveryClientProps) {
  const publicVideos = videos.filter((video) => video.visibility === "public");

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {publicVideos.length > 0 ? (
          publicVideos.map((video) => <VideoCard key={video.id} video={video} />)
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center gap-4 py-20 text-yt-gray">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-yt-border bg-yt-dark">
              <span className="text-4xl">🎬</span>
            </div>
            <h3 className="text-xl font-bold text-white">No videos yet</h3>
            <p className="max-w-xs text-center text-sm">Be the first to upload a video to Anavrin TV and share it with the world!</p>
          </div>
        )}
      </div>
    </div>
  );
}
