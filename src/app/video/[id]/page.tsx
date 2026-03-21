import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WatchPage } from "@/components/watch/watch-page";
import { getVideo, getVideos } from "@/lib/db";
import type { VideoRecord } from "@/lib/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  const videos = await getVideos({ includeDrafts: true });
  const ids = new Set<string>();

  for (const video of videos) {
    if (video.slug) ids.add(video.slug);
    ids.add(video.id);
  }

  return Array.from(ids).map((id) => ({ id }));
}

function recommendationScore(current: VideoRecord, candidate: VideoRecord) {
  if (candidate.id === current.id) return Number.NEGATIVE_INFINITY;

  let score = 0;
  if (candidate.category === current.category) score += 40;
  if (candidate.ownerAddress === current.ownerAddress) score += 12;

  const currentTags = new Set(current.tags.map((tag) => tag.toLowerCase()));
  const sharedTags = candidate.tags.reduce((count, tag) => count + (currentTags.has(tag.toLowerCase()) ? 1 : 0), 0);
  score += sharedTags * 8;

  score += Math.min(candidate.views / 10_000, 24);
  score += Math.min(candidate.likes / 4_000, 12);

  const candidateTime = new Date(candidate.publishedAt ?? candidate.createdAt).getTime();
  const currentTime = new Date(current.publishedAt ?? current.createdAt).getTime();
  const daysDistance = Math.abs(candidateTime - currentTime) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 10 - daysDistance * 0.35);

  return score;
}

function getRecommendations(video: VideoRecord, videos: VideoRecord[]) {
  return [...videos]
    .filter((candidate) => candidate.id !== video.id)
    .sort((a, b) => recommendationScore(video, b) - recommendationScore(video, a))
    .slice(0, 20);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);

  if (!video) {
    return {
      title: "Video not found | Anavrin TV",
    };
  }

  return {
    title: `${video.title} | Anavrin TV`,
    description: video.description || "Watch on Anavrin TV.",
  };
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [video, allVideos] = await Promise.all([getVideo(id), getVideos({ publicOnly: true, includeDrafts: true })]);
  if (!video) notFound();

  const recommendations = getRecommendations(video, allVideos);

  return <WatchPage recommendations={recommendations} video={video} />;
}
