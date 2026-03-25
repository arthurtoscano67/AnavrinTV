import { PlayCircle } from "lucide-react";

import { VideoPlayer } from "@/components/video-player";
import { buildApiUrl } from "@/lib/site-url";
import type { VideoRecord } from "@/lib/types";

type MainVideoPlayerProps = {
  video: VideoRecord;
  refreshToken?: number;
};

export function MainVideoPlayer({ video, refreshToken = 0 }: MainVideoPlayerProps) {
  const posterUrl = video.thumbnailUrl?.trim() ? buildApiUrl(video.thumbnailUrl) : undefined;

  if (video.asset) {
    return (
      <VideoPlayer
        contentType={video.asset.contentType}
        monetization={video.monetization}
        ownerAddress={video.ownerAddress}
        policyPackageId={video.policyPackageId}
        policyNonce={video.asset.nonce ?? video.policyNonce}
        policyObjectId={video.policyObjectId}
        posterUrl={posterUrl}
        refreshToken={refreshToken}
        storageMode={video.asset.storageMode}
        videoId={video.id}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#111111]">
      <div className="relative aspect-video">
        <div
          className="absolute inset-0 opacity-90"
          style={{
            background: `linear-gradient(145deg, ${video.coverFrom} 0%, ${video.coverVia} 48%, ${video.coverTo} 100%)`,
          }}
        />
        {posterUrl ? (
          <img
            alt={video.title}
            className="absolute inset-0 size-full object-cover"
            draggable={false}
            loading="lazy"
            src={posterUrl}
          />
        ) : null}
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div className="rounded-2xl border border-white/15 bg-black/50 px-6 py-5">
            <PlayCircle className="mx-auto size-9 text-white/90" />
            <p className="mt-2 text-sm font-medium text-white">Clip preview card</p>
            <p className="mt-1 text-xs text-[#d1d1d1]">No uploaded stream for this seeded item yet.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
