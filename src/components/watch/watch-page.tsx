"use client";

import { useState } from "react";

import { CommentsSection, type WatchComment } from "@/components/watch/comments-section";
import { CreatorRow } from "@/components/watch/creator-row";
import { MainVideoPlayer } from "@/components/watch/main-video-player";
import { RecommendedVideoList } from "@/components/watch/recommended-video-list";
import { VideoAccessPanel } from "@/components/watch/video-access-panel";
import { VideoDescriptionPanel } from "@/components/watch/video-description-panel";
import { VideoTitleSection } from "@/components/watch/video-title-section";
import { VideoActions } from "@/components/video-actions";
import type { VideoRecord } from "@/lib/types";

type WatchPageProps = {
  video: VideoRecord;
  recommendations: VideoRecord[];
};

function buildSampleComments(video: VideoRecord): WatchComment[] {
  const now = Date.now();
  const tags = video.tags.slice(0, 3);

  return [
    {
      id: `${video.id}-pinned`,
      authorName: video.ownerName,
      authorHandle: `@${video.ownerName.toLowerCase().replace(/[^a-z0-9]+/g, "") || "creator"}`,
      body: "Thanks for watching. New uploads every week and private drops for subscribers.",
      likes: Math.max(12, Math.round(video.likes * 0.02)),
      createdAt: new Date(now - 1000 * 60 * 90).toISOString(),
      pinned: true,
    },
    {
      id: `${video.id}-c1`,
      authorName: "Sui Builder",
      authorHandle: "@suibuilder",
      body: `Great breakdown, especially around ${tags[0] ?? "the upload flow"}.`,
      likes: 84,
      createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: `${video.id}-c2`,
      authorName: "Walrus Dev",
      authorHandle: "@walrusdev",
      body: "The pacing and examples made this easy to follow. Please do a part 2.",
      likes: 46,
      createdAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    },
    {
      id: `${video.id}-c3`,
      authorName: "Creator Loop",
      authorHandle: "@creatorloop",
      body: `Publishing workflow + ${tags[1] ?? "analytics"} in one place is exactly what we needed.`,
      likes: 21,
      createdAt: new Date(now - 1000 * 60 * 60 * 14).toISOString(),
    },
  ];
}

export function WatchPage({ video, recommendations }: WatchPageProps) {
  const comments = buildSampleComments(video);
  const [entitlementRefreshKey, setEntitlementRefreshKey] = useState(0);

  return (
    <div className="mx-auto w-full max-w-[1720px]">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] 2xl:grid-cols-[minmax(0,1fr)_430px]">
        <section className="min-w-0 space-y-3">
          <MainVideoPlayer refreshToken={entitlementRefreshKey} video={video} />
          <VideoTitleSection video={video} />
          <VideoAccessPanel onUnlocked={() => setEntitlementRefreshKey((value) => value + 1)} video={video} />
          <CreatorRow video={video} />
          <VideoActions video={video} />
          <VideoDescriptionPanel
            createdAt={video.createdAt}
            description={video.description}
            publishedAt={video.publishedAt}
            tags={video.tags}
            views={video.views}
          />
          <CommentsSection initialComments={comments} totalCount={video.comments} />
        </section>

        <section className="min-w-0 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Up next</h2>
          <RecommendedVideoList
            currentCategory={video.category}
            currentVideoId={video.id}
            videos={recommendations}
          />
        </section>
      </div>
    </div>
  );
}
