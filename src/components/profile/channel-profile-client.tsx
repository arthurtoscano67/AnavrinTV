"use client";

import Link from "next/link";
import { useState } from "react";

import { VideoCard } from "@/components/video-card";
import { formatCompact, formatDate } from "@/lib/format";
import type { VideoRecord } from "@/lib/types";

type ChannelProfile = {
  displayName: string;
  username: string;
  address: string;
  avatarUrl?: string;
  bio: string;
  subscriberCount: number;
  joinedAt: string;
};

type ChannelProfileClientProps = {
  profile: ChannelProfile;
  videos: VideoRecord[];
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function ChannelProfileClient({ profile, videos }: ChannelProfileClientProps) {
  const [activeTab, setActiveTab] = useState<"videos" | "about">("videos");
  const totalViews = videos.reduce((sum, video) => sum + video.views, 0);
  const bannerVideo = videos[0];

  return (
    <div className="flex flex-col">
      <div
        className="relative h-40 bg-gradient-to-r sm:h-60 lg:h-80"
        style={{
          backgroundImage: bannerVideo
            ? `linear-gradient(135deg, ${bannerVideo.coverFrom} 0%, ${bannerVideo.coverVia} 52%, ${bannerVideo.coverTo} 100%)`
            : "linear-gradient(135deg, #1f2937 0%, #374151 52%, #111827 100%)",
        }}
      >
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <div className="relative z-10 mx-auto -mt-12 w-full max-w-[1284px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 border-b border-yt-border pb-6 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-yt-black bg-yt-black text-5xl shadow-2xl sm:h-40 sm:w-40 sm:text-6xl">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
            ) : (
              <span>{initials(profile.displayName)}</span>
            )}
          </div>

          <div className="mb-4 flex flex-1 flex-col items-center gap-2 sm:items-start">
            <h1 className="text-3xl font-bold tracking-tight">{profile.displayName}</h1>
            <div className="flex items-center gap-2 text-sm font-medium text-yt-gray">
              <span>@{profile.username}</span>
              <span>•</span>
              <span>{formatCompact(profile.subscriberCount)} subscribers</span>
              <span>•</span>
              <span>{videos.length} videos</span>
            </div>
            <button className="mt-2 rounded-full bg-white px-6 py-2 font-bold text-black transition-colors hover:bg-white/90" type="button">
              Subscribe
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-8">
          <button
            onClick={() => setActiveTab("videos")}
            className={`border-b-2 py-4 text-sm font-bold transition-colors ${
              activeTab === "videos" ? "border-white text-white" : "border-transparent text-yt-gray hover:text-white"
            }`}
            type="button"
          >
            VIDEOS
          </button>
          <button
            onClick={() => setActiveTab("about")}
            className={`border-b-2 py-4 text-sm font-bold transition-colors ${
              activeTab === "about" ? "border-white text-white" : "border-transparent text-yt-gray hover:text-white"
            }`}
            type="button"
          >
            ABOUT
          </button>
        </div>

        <div className="py-8">
          {activeTab === "videos" ? (
            <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {videos.length > 0 ? (
                videos.map((video) => <VideoCard key={video.id} video={video} />)
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center gap-4 py-20 text-yt-gray">
                  <h3 className="text-xl font-bold text-white">No videos yet</h3>
                  <p className="max-w-xs text-center text-sm">This channel has not uploaded any videos yet.</p>
                  <Link href="/upload" className="rounded-full bg-yt-red px-6 py-2 font-bold text-white transition-colors hover:bg-red-500">
                    Upload first video
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl space-y-8">
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Description</h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-yt-gray">
                  {profile.bio || "No description provided."}
                </p>
              </div>
              <div className="space-y-4">
                <h3 className="text-lg font-bold">Stats</h3>
                <div className="flex flex-col gap-2 text-sm text-yt-gray">
                  <span>Joined {formatDate(profile.joinedAt)}</span>
                  <span>{formatCompact(totalViews)} total views</span>
                  <span>Wallet {profile.address}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
