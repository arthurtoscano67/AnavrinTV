import { ProfilePage, type ProfilePageData } from "@/components/profile/profile-page";
import type { ProfileContentItem } from "@/components/profile/content-card";
import { formatCompact, formatDate, shortAddress } from "@/lib/format";
import { loadDb } from "@/lib/db";
import type { VideoRecord, WalletSession } from "@/lib/types";

type OwnerAggregate = {
  address: string;
  ownerName: string;
  videos: VideoRecord[];
  totalViews: number;
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

function pickProfileOwner(videos: VideoRecord[]) {
  const byOwner = new Map<string, OwnerAggregate>();

  for (const video of videos) {
    const entry = byOwner.get(video.ownerAddress);
    if (entry) {
      entry.videos.push(video);
      entry.totalViews += video.views;
    } else {
      byOwner.set(video.ownerAddress, {
        address: video.ownerAddress,
        ownerName: video.ownerName,
        videos: [video],
        totalViews: video.views,
      });
    }
  }

  const ranked = [...byOwner.values()].sort((a, b) => b.totalViews - a.totalViews);
  return ranked[0] ?? null;
}

function toContentItem(video: VideoRecord): ProfileContentItem {
  return {
    id: video.id,
    href: `/video/${video.id}`,
    title: video.title,
    creatorName: video.ownerName,
    views: video.views,
    createdAt: video.publishedAt ?? video.createdAt,
    durationLabel: video.duration,
    coverFrom: video.coverFrom,
    coverVia: video.coverVia,
    coverTo: video.coverTo,
  };
}

function buildPlaylistItems(videos: VideoRecord[], ownerName: string): ProfileContentItem[] {
  const grouped = new Map<string, VideoRecord[]>();

  for (const video of videos) {
    const bucket = grouped.get(video.category) ?? [];
    bucket.push(video);
    grouped.set(video.category, bucket);
  }

  return [...grouped.entries()]
    .map(([category, categoryVideos]) => {
      const sorted = [...categoryVideos].sort(
        (a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime(),
      );
      const lead = sorted[0];

      return {
        id: `playlist-${category.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        href: `/browse?category=${encodeURIComponent(category)}`,
        title: `${category} Collection`,
        creatorName: ownerName,
        views: categoryVideos.reduce((total, video) => total + video.views, 0),
        createdAt: lead.publishedAt ?? lead.createdAt,
        durationLabel: `${categoryVideos.length} vids`,
        coverFrom: lead.coverFrom,
        coverVia: lead.coverVia,
        coverTo: lead.coverTo,
      } satisfies ProfileContentItem;
    })
    .sort((a, b) => b.views - a.views);
}

function pickAccount(accounts: WalletSession[], address: string) {
  return accounts.find((account) => account.address === address) ?? null;
}

function buildProfileData(owner: OwnerAggregate, account: WalletSession | null): ProfilePageData {
  const sorted = [...owner.videos].sort(
    (a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime(),
  );
  const videos = sorted.map(toContentItem);
  const blobs = sorted
    .filter(
      (video) =>
        video.category === "Shorts" ||
        video.tags.some((tag) => tag.toLowerCase().includes("short")) ||
        durationToSeconds(video.duration) <= 120,
    )
    .map(toContentItem);
  const playlists = buildPlaylistItems(sorted, owner.ownerName);
  const lead = sorted[0];
  const joinedDate = formatDate(account?.createdAt ?? sorted[sorted.length - 1]?.createdAt ?? new Date().toISOString());
  const followers = account?.followers ?? Math.max(320, Math.round(owner.totalViews * 0.032));
  const following = 32;
  const totalViews = owner.totalViews;

  return {
    bannerFrom: lead?.coverFrom ?? "#1f2937",
    bannerVia: lead?.coverVia ?? "#334155",
    bannerTo: lead?.coverTo ?? "#0f172a",
    avatarLabel: initials(owner.ownerName),
    displayName: account?.displayName ?? owner.ownerName,
    handle:
      account?.handle && account.handle.trim()
        ? account.handle.startsWith("@")
          ? account.handle
          : `@${account.handle}`
        : `@${owner.ownerName.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
    bio:
      account?.bio?.trim() ||
      "Sui-native creator sharing encrypted uploads, curated blobs, and weekly platform content.",
    verified: true,
    walletBadge: `Wallet ${shortAddress(owner.address, 4)}`,
    stats: {
      followers,
      following,
      totalVideos: videos.length,
      totalBlobs: blobs.length,
      totalViews,
    },
    about: {
      joinedDate,
      walletAddress: `${shortAddress(owner.address, 8)} (${formatCompact(totalViews)} views)`,
      links: [
        { label: "Website", href: "https://www.anavritv.xyz" },
        { label: "Walrus", href: "https://walrus.space" },
      ],
      socials: [
        { label: "X / Twitter", href: "https://x.com" },
        { label: "Discord", href: "https://discord.com" },
      ],
    },
    videos,
    blobs,
    playlists,
  };
}

export default async function ProfileRoute() {
  const db = await loadDb();
  const visibleVideos = db.videos.filter((video) => video.visibility === "public");
  const owner = pickProfileOwner(visibleVideos);

  if (!owner) {
    const empty: ProfilePageData = {
      bannerFrom: "#0f172a",
      bannerVia: "#1e293b",
      bannerTo: "#334155",
      avatarLabel: "AT",
      displayName: "Anavrin Creator",
      handle: "@anavrincreator",
      bio: "Creator profile is ready. Publish videos to populate this page.",
      verified: false,
      stats: {
        followers: 0,
        following: 0,
        totalVideos: 0,
        totalBlobs: 0,
        totalViews: 0,
      },
      about: {
        joinedDate: formatDate(new Date()),
        walletAddress: "Not connected",
        links: [],
        socials: [],
      },
      videos: [],
      blobs: [],
      playlists: [],
    };

    return <ProfilePage data={empty} />;
  }

  const account = pickAccount(db.accounts, owner.address);
  const data = buildProfileData(owner, account);

  return <ProfilePage data={data} />;
}
