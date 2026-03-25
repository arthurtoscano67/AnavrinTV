import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ChannelProfileClient } from "@/components/profile/channel-profile-client";
import { normalizeUsernameInput, usernameFromDisplayName } from "@/lib/creator-identity";
import { loadDb } from "@/lib/db";
import { isPublishedWatchRelease } from "@/lib/video-monetization";

export const dynamicParams = false;

type CreatorSource = {
  username: string;
  displayName: string;
  address: string;
  avatarUrl?: string;
  bio: string;
  subscriberCount: number;
  joinedAt: string;
};

function resolveSource(
  username: string,
  db: Awaited<ReturnType<typeof loadDb>>,
): CreatorSource | null {
  const normalized = normalizeUsernameInput(username);
  if (!normalized) return null;

  const account = db.accounts.find(
    (entry) => normalizeUsernameInput(entry.username || entry.handle) === normalized,
  );

  if (account) {
    return {
      username: normalizeUsernameInput(account.username || account.handle) || normalized,
      displayName: account.displayName,
      address: account.address,
      avatarUrl: account.avatarUrl,
      bio: account.bio || "",
      subscriberCount: account.followersCount ?? account.followers ?? 0,
      joinedAt: account.createdAt || new Date().toISOString(),
    };
  }

  const matchedVideo = db.videos.find(
    (video) => normalizeUsernameInput(video.creatorUsername) === normalized,
  );
  if (!matchedVideo) return null;

  return {
    username:
      normalizeUsernameInput(matchedVideo.creatorUsername) ||
      usernameFromDisplayName(matchedVideo.ownerName, matchedVideo.ownerAddress),
    displayName: matchedVideo.creatorDisplayName || matchedVideo.ownerName,
    address: matchedVideo.ownerAddress,
    bio: "Sui-native creator publishing encrypted videos and short-form blobs on Anavrin TV.",
    subscriberCount: matchedVideo.subscribers,
    joinedAt: matchedVideo.createdAt,
  };
}

export async function generateStaticParams() {
  const db = await loadDb();
  const usernames = new Set<string>();

  for (const account of db.accounts) {
    const normalized = normalizeUsernameInput(account.username || account.handle);
    if (normalized) usernames.add(normalized);
  }

  for (const video of db.videos) {
    const normalized = normalizeUsernameInput(
      video.creatorUsername || usernameFromDisplayName(video.ownerName, video.ownerAddress),
    );
    if (normalized) usernames.add(normalized);
  }

  return [...usernames].map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const db = await loadDb();
  const source = resolveSource(username, db);

  if (!source) {
    return { title: "Channel not found | Anavrin TV" };
  }

  return {
    title: `${source.displayName} | Anavrin TV`,
    description: `${source.displayName} creator profile on Anavrin TV.`,
  };
}

export default async function CreatorProfileRoute({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const normalized = normalizeUsernameInput(username);
  if (!normalized) notFound();

  if (normalized !== username) {
    redirect(`/profile/${normalized}`);
  }

  const db = await loadDb();
  const source = resolveSource(normalized, db);
  if (!source) notFound();

  if (source.username !== normalized) {
    redirect(`/profile/${source.username}`);
  }

  const videos = db.videos
    .filter((video) => video.ownerAddress === source.address && isPublishedWatchRelease(video))
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? b.createdAt).getTime() -
        new Date(a.publishedAt ?? a.createdAt).getTime(),
    );

  return (
    <ChannelProfileClient
      key={source.username}
      profile={source}
      videos={videos}
    />
  );
}
