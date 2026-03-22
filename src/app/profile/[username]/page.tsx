import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProfilePage, type ProfilePageData } from "@/components/profile/profile-page";
import type { ProfileContentItem } from "@/components/profile/content-card";
import { formatHandle, normalizeUsernameInput, usernameFromDisplayName } from "@/lib/creator-identity";
import { formatDate, shortAddress } from "@/lib/format";
import { loadDb } from "@/lib/db";
import { isPublishedWatchRelease } from "@/lib/video-monetization";
import type { VideoRecord, WalletSession } from "@/lib/types";

type CreatorSource = {
  account: WalletSession | null;
  username: string;
  displayName: string;
  address: string;
  videos: VideoRecord[];
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function durationToSeconds(duration: string) {
  const [minutes, seconds] = duration.split(":").map((part) => Number(part) || 0);
  return minutes * 60 + seconds;
}

function isBlobVideo(video: VideoRecord) {
  if (video.category === "Shorts") return true;
  if (video.tags.some((tag) => tag.toLowerCase().includes("short"))) return true;
  return durationToSeconds(video.duration) > 0 && durationToSeconds(video.duration) <= 120;
}

function toVideoCardItem(video: VideoRecord): ProfileContentItem {
  return {
    id: video.id,
    href: `/video/${video.id}`,
    title: video.title,
    creatorName: video.creatorDisplayName || video.ownerName,
    views: video.views,
    createdAt: video.publishedAt ?? video.createdAt,
    durationLabel: video.duration,
    thumbnailUrl: video.thumbnailUrl,
    coverFrom: video.coverFrom,
    coverVia: video.coverVia,
    coverTo: video.coverTo,
  };
}

function toBlobCardItem(video: VideoRecord): ProfileContentItem {
  return {
    id: `blob-${video.id}`,
    href: `/blobs?blob=${encodeURIComponent(video.id)}`,
    title: video.title,
    creatorName: video.creatorDisplayName || video.ownerName,
    views: video.views,
    createdAt: video.publishedAt ?? video.createdAt,
    durationLabel: video.duration,
    thumbnailUrl: video.thumbnailUrl,
    coverFrom: video.coverFrom,
    coverVia: video.coverVia,
    coverTo: video.coverTo,
  };
}

function buildPlaylistItems(videos: VideoRecord[], creatorName: string): ProfileContentItem[] {
  const grouped = new Map<string, VideoRecord[]>();

  for (const video of videos) {
    const list = grouped.get(video.category) ?? [];
    list.push(video);
    grouped.set(video.category, list);
  }

  return [...grouped.entries()]
    .map(([category, entries]) => {
      const lead = [...entries].sort(
        (a, b) =>
          new Date(b.publishedAt ?? b.createdAt).getTime() -
          new Date(a.publishedAt ?? a.createdAt).getTime(),
      )[0];

      return {
        id: `playlist-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        href: `/browse?category=${encodeURIComponent(category)}&q=${encodeURIComponent(creatorName)}`,
        title: `${category} playlist`,
        creatorName,
        views: entries.reduce((sum, video) => sum + video.views, 0),
        createdAt: lead?.publishedAt ?? lead?.createdAt ?? new Date().toISOString(),
        durationLabel: `${entries.length} vids`,
        coverFrom: lead?.coverFrom ?? "#22d3ee",
        coverVia: lead?.coverVia ?? "#3b82f6",
        coverTo: lead?.coverTo ?? "#0f172a",
      } satisfies ProfileContentItem;
    })
    .sort((a, b) => b.views - a.views);
}

function resolveCreatorByUsername(
  username: string,
  accounts: WalletSession[],
  videos: VideoRecord[],
): CreatorSource | null {
  const normalized = normalizeUsernameInput(username);
  if (!normalized) return null;

  const account = accounts.find(
    (entry) => normalizeUsernameInput(entry.username || entry.handle) === normalized,
  );
  if (account) {
    return {
      account,
      username: account.username,
      displayName: account.displayName,
      address: account.address,
      videos: videos.filter((video) => video.ownerAddress === account.address && isPublishedWatchRelease(video)),
    };
  }

  const matchedVideo = videos.find(
    (video) => normalizeUsernameInput(video.creatorUsername) === normalized,
  );
  if (!matchedVideo) return null;

  const usernameFromVideo = normalizeUsernameInput(matchedVideo.creatorUsername) ||
    usernameFromDisplayName(matchedVideo.ownerName, matchedVideo.ownerAddress);
  return {
    account: null,
    username: usernameFromVideo,
    displayName: matchedVideo.creatorDisplayName || matchedVideo.ownerName,
    address: matchedVideo.ownerAddress,
    videos: videos.filter((video) => video.ownerAddress === matchedVideo.ownerAddress && isPublishedWatchRelease(video)),
  };
}

function toProfilePageData(source: CreatorSource): ProfilePageData {
  const sortedVideos = [...source.videos].sort(
    (a, b) =>
      new Date(b.publishedAt ?? b.createdAt).getTime() -
      new Date(a.publishedAt ?? a.createdAt).getTime(),
  );
  const videos = sortedVideos.map(toVideoCardItem);
  const blobs = sortedVideos.filter(isBlobVideo).map(toBlobCardItem);
  const playlists = buildPlaylistItems(sortedVideos, source.displayName);
  const lead = sortedVideos[0];
  const joinedAt = source.account?.createdAt || sortedVideos[sortedVideos.length - 1]?.createdAt || new Date().toISOString();
  const totalViews =
    source.account?.totalViews ??
    sortedVideos.reduce((sum, video) => sum + (Number(video.views) || 0), 0);
  const followers = source.account?.followersCount ?? source.account?.followers ?? 0;
  const following = source.account?.followingCount ?? source.account?.following ?? 0;

  return {
    id: source.account?.id || `creator-${source.address.slice(2, 10) || "unknown"}`,
    address: source.address,
    displayName: source.displayName,
    username: source.username,
    handle: formatHandle(source.username),
    bio:
      source.account?.bio?.trim() ||
      "Sui-native creator publishing encrypted videos and short-form blobs on Anavrin TV.",
    avatarLabel: initials(source.displayName),
    avatarUrl: source.account?.avatarUrl,
    bannerFrom: lead?.coverFrom ?? "#1f2937",
    bannerVia: lead?.coverVia ?? "#334155",
    bannerTo: lead?.coverTo ?? "#0f172a",
    bannerUrl: source.account?.bannerUrl,
    verified: Boolean(source.account),
    walletBadge: source.address ? `Wallet ${shortAddress(source.address, 4)}` : undefined,
    stats: {
      followers,
      following,
      totalVideos: source.account?.totalVideos ?? videos.length,
      totalBlobs: source.account?.totalBlobs ?? blobs.length,
      totalViews,
    },
    about: {
      joinedDate: formatDate(joinedAt),
      walletAddress: source.address ? shortAddress(source.address, 10) : "Not connected",
      links: [{ label: "Website", href: "https://www.anavritv.xyz" }],
      socials: [{ label: "X / Twitter", href: "https://x.com" }],
    },
    videos,
    blobs,
    playlists,
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
  const source = resolveCreatorByUsername(username, db.accounts, db.videos);

  if (!source) {
    return {
      title: "Creator not found | Anavrin TV",
    };
  }

  return {
    title: `${source.displayName} (${formatHandle(source.username)}) | Anavrin TV`,
    description: `${source.displayName} creator profile on Anavrin TV.`,
  };
}

export default async function CreatorProfileRoute({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const normalizedUsername = normalizeUsernameInput(username);

  if (!normalizedUsername) {
    notFound();
  }

  if (normalizedUsername !== username) {
    redirect(`/profile/${normalizedUsername}`);
  }

  const db = await loadDb();
  const source = resolveCreatorByUsername(normalizedUsername, db.accounts, db.videos);
  if (!source) {
    notFound();
  }

  if (source.username !== normalizedUsername) {
    redirect(`/profile/${source.username}`);
  }

  return <ProfilePage key={source.username} data={toProfilePageData(source)} />;
}
