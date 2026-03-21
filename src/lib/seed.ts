import type { Database, ReportRecord, SiteMetrics, VideoRecord, WalletMode, WalletSession } from "@/lib/types";
import { defaultPlatformSettings } from "@/lib/platform-settings";
import { usernameFromDisplayName } from "@/lib/creator-identity";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function gradientForCategory(category: string) {
  const palette: Record<string, { from: string; via: string; to: string }> = {
    Launches: { from: "#22d3ee", via: "#3b82f6", to: "#312e81" },
    Music: { from: "#8b5cf6", via: "#0ea5e9", to: "#0f172a" },
    Gaming: { from: "#34d399", via: "#14b8a6", to: "#1e293b" },
    DeFi: { from: "#f472b6", via: "#fb7185", to: "#1e1b4b" },
    Culture: { from: "#f59e0b", via: "#f97316", to: "#1f2937" },
    "AI Labs": { from: "#60a5fa", via: "#a78bfa", to: "#0f172a" },
    Shorts: { from: "#06b6d4", via: "#818cf8", to: "#020617" },
    "Live Events": { from: "#22c55e", via: "#14b8a6", to: "#0f172a" },
  };

  return palette[category] ?? { from: "#22d3ee", via: "#2563eb", to: "#0f172a" };
}

const creatorSeeds: Array<{
  displayName: string;
  address: string;
  mode: WalletMode;
  treasuryFeeBps: number;
  storageUsedBytes: number;
}> = [
  {
    displayName: "Anavrin TV",
    address: "0x1111111111111111111111111111111111111111111111111111111111111111",
    mode: "wallet",
    treasuryFeeBps: 65,
    storageUsedBytes: 183_000_000_000,
  },
  {
    displayName: "Kairo Labs",
    address: "0x2222222222222222222222222222222222222222222222222222222222222222",
    mode: "slush",
    treasuryFeeBps: 75,
    storageUsedBytes: 92_000_000_000,
  },
  {
    displayName: "Nova Clips",
    address: "0x3333333333333333333333333333333333333333333333333333333333333333",
    mode: "zklogin",
    treasuryFeeBps: 90,
    storageUsedBytes: 51_000_000_000,
  },
  {
    displayName: "Walrus Weekly",
    address: "0x4444444444444444444444444444444444444444444444444444444444444444",
    mode: "wallet",
    treasuryFeeBps: 65,
    storageUsedBytes: 63_000_000_000,
  },
];

const videoSeeds = [
  {
    title: "Sui Creator Summit Keynote",
    description:
      "A cinematic recap of the launch-night product demos, creator onboarding, and the new sealed upload flow.",
    tags: ["sui", "launch", "keynote", "creators"],
    category: "Launches",
    duration: "14:22",
    views: 428000,
    comments: 1840,
    likes: 25100,
    tips: 1290,
    subscribers: 18800,
    reportedCount: 0,
    ownerAddress: "0x1111111111111111111111111111111111111111111111111111111111111111",
    ownerName: "Anavrin TV",
  },
  {
    title: "Walrus Relay Architecture Walkthrough",
    description:
      "Deep dive into the relay pipeline, encrypted bundles, and the one-signature upload path for publishers.",
    tags: ["walrus", "storage", "architecture", "relay"],
    category: "AI Labs",
    duration: "09:18",
    views: 183000,
    comments: 960,
    likes: 9800,
    tips: 610,
    subscribers: 8800,
    reportedCount: 0,
    ownerAddress: "0x4444444444444444444444444444444444444444444444444444444444444444",
    ownerName: "Walrus Weekly",
  },
  {
    title: "Seal Encryption for Private Drops",
    description:
      "How creators protect pre-release content, publisher notes, and premium members-only videos with access control.",
    tags: ["seal", "encryption", "privacy", "members"],
    category: "Culture",
    duration: "08:07",
    views: 97600,
    comments: 510,
    likes: 5400,
    tips: 420,
    subscribers: 4900,
    reportedCount: 1,
    ownerAddress: "0x2222222222222222222222222222222222222222222222222222222222222222",
    ownerName: "Kairo Labs",
  },
  {
    title: "zkLogin Onboarding in 45 Seconds",
    description:
      "A fast, no-friction walletless path for new viewers who still want a creator-grade account and profile page.",
    tags: ["zklogin", "onboarding", "wallet", "ux"],
    category: "Launches",
    duration: "03:42",
    views: 86200,
    comments: 280,
    likes: 3800,
    tips: 210,
    subscribers: 3400,
    reportedCount: 0,
    ownerAddress: "0x3333333333333333333333333333333333333333333333333333333333333333",
    ownerName: "Nova Clips",
  },
  {
    title: "Live Music Drop: Night Harbor",
    description:
      "An audio-first premiere with tipped replays, subscriber boosts, and creator treasury receipts in the dashboard.",
    tags: ["music", "premiere", "tipping", "live"],
    category: "Music",
    duration: "11:30",
    views: 351000,
    comments: 1320,
    likes: 19900,
    tips: 1520,
    subscribers: 12400,
    reportedCount: 0,
    ownerAddress: "0x1111111111111111111111111111111111111111111111111111111111111111",
    ownerName: "Anavrin TV",
  },
  {
    title: "On-chain Game Clips: Volume 12",
    description:
      "Short-form creator clips with video chapters, thumb-friendly cards, and auto-sealed publishing.",
    tags: ["gaming", "clips", "shorts"],
    category: "Gaming",
    duration: "05:09",
    views: 149000,
    comments: 620,
    likes: 7200,
    tips: 330,
    subscribers: 6100,
    reportedCount: 2,
    ownerAddress: "0x3333333333333333333333333333333333333333333333333333333333333333",
    ownerName: "Nova Clips",
  },
  {
    title: "Treasury Report: Creator Economy",
    description:
      "A weekly update on treasury fees, storage renewals, moderation health, and ad-free viewer growth.",
    tags: ["treasury", "analytics", "revenue"],
    category: "DeFi",
    duration: "07:51",
    views: 64000,
    comments: 210,
    likes: 2800,
    tips: 100,
    subscribers: 2100,
    reportedCount: 0,
    ownerAddress: "0x4444444444444444444444444444444444444444444444444444444444444444",
    ownerName: "Walrus Weekly",
  },
  {
    title: "Community Highlights: Sui Surge",
    description:
      "The week's best community uploads, fast publishing wins, and the top tipped creator moments.",
    tags: ["community", "highlights", "surge"],
    category: "Shorts",
    duration: "02:28",
    views: 512000,
    comments: 1640,
    likes: 28800,
    tips: 1600,
    subscribers: 24600,
    reportedCount: 1,
    ownerAddress: "0x1111111111111111111111111111111111111111111111111111111111111111",
    ownerName: "Anavrin TV",
  },
  {
    title: "Creator Console: Publish Drafts Faster",
    description:
      "A guided walkthrough of the profile dashboard, draft queue, unpublish switch, and storage renewal workflow.",
    tags: ["profile", "publish", "dashboard"],
    category: "Launches",
    duration: "06:44",
    views: 77200,
    comments: 340,
    likes: 4100,
    tips: 260,
    subscribers: 4200,
    reportedCount: 0,
    ownerAddress: "0x2222222222222222222222222222222222222222222222222222222222222222",
    ownerName: "Kairo Labs",
  },
  {
    title: "Creator Shorts: Sui Colors",
    description:
      "A clean color study for channel branding, thumbnails, and mobile-first browsing.",
    tags: ["design", "branding", "colors"],
    category: "Culture",
    duration: "01:52",
    views: 207000,
    comments: 880,
    likes: 13500,
    tips: 720,
    subscribers: 8900,
    reportedCount: 0,
    ownerAddress: "0x3333333333333333333333333333333333333333333333333333333333333333",
    ownerName: "Nova Clips",
  },
];

const reportSeeds: ReportRecord[] = [
  {
    id: "report-seal-1",
    videoId: "seed-seal",
    videoTitle: "Seal Encryption for Private Drops",
    reason: "Potential privacy issue in the comments preview",
    detail: "Viewer notes mention access confusion around a members-only drop.",
    severity: "medium",
    status: "open",
    reporter: "0xviewer8a",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
  {
    id: "report-clips-1",
    videoId: "seed-clips",
    videoTitle: "On-chain Game Clips: Volume 12",
    reason: "Copyright claim review",
    detail: "A creator requested a moderation check for one background segment.",
    severity: "low",
    status: "open",
    reporter: "0xmoderator1",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 15).toISOString(),
  },
];

function makeSeedVideo(
  seed: (typeof videoSeeds)[number],
  index: number,
): VideoRecord {
  const createdAt = new Date(Date.now() - 1000 * 60 * 60 * (18 + index * 6)).toISOString();
  const publishedAt = new Date(Date.now() - 1000 * 60 * 60 * (10 + index * 4)).toISOString();
  const gradient = gradientForCategory(seed.category);
  const id = `seed-${slugify(seed.title)}-${index + 1}`;
  return {
    id,
    slug: slugify(seed.title),
    title: seed.title,
    description: seed.description,
    tags: seed.tags,
    category: seed.category,
    visibility: "public",
    status: "published",
    ownerAddress: seed.ownerAddress,
    ownerName: seed.ownerName,
    creatorId: `acct-${slugify(seed.ownerName)}`,
    creatorUsername: usernameFromDisplayName(seed.ownerName, seed.ownerAddress),
    creatorDisplayName: seed.ownerName,
    creatorAvatarUrl: undefined,
    coverFrom: gradient.from,
    coverVia: gradient.via,
    coverTo: gradient.to,
    duration: seed.duration,
    createdAt,
    updatedAt: publishedAt,
    publishedAt,
    views: seed.views,
    comments: seed.comments,
    likes: seed.likes,
    tips: seed.tips,
    subscribers: seed.subscribers,
    reportedCount: seed.reportedCount,
    asset: null,
  };
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function gradientForTopic(category: string) {
  return gradientForCategory(category);
}

export function buildSeedDatabase(): Database {
  const videos = videoSeeds.map((seed, index) => makeSeedVideo(seed, index));
  const accounts: WalletSession[] = creatorSeeds.map((creator) => ({
    id: `acct-${slugify(creator.displayName)}`,
    displayName: creator.displayName,
    username: usernameFromDisplayName(creator.displayName, creator.address),
    handle: usernameFromDisplayName(creator.displayName, creator.address),
    address: creator.address,
    mode: creator.mode,
    avatarSeed: creator.displayName.slice(0, 2).toUpperCase(),
    storageLimitBytes: 500 * 1024 * 1024 * 1024,
    storageUsedBytes: creator.storageUsedBytes,
    treasuryFeeBps: creator.treasuryFeeBps,
    renewalAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    followers: 0,
    followersCount: 0,
    following: 0,
    followingCount: 0,
    totalVideos: videos.filter((video) => video.ownerAddress === creator.address).length,
    totalBlobs: videos.filter((video) => video.ownerAddress === creator.address && video.category === "Shorts").length,
    totalViews: videos
      .filter((video) => video.ownerAddress === creator.address)
      .reduce((sum, video) => sum + video.views, 0),
  }));

  const metrics: SiteMetrics = {
    visitorsToday: 187_420,
    activeStreams: 124,
    uploadsToday: 84,
    treasuryCollectedSui: 15_231.8,
    uploadFeesCollectedSui: 8_420.5,
    tipFeesCollectedSui: 3_120.2,
    storageFeesCollectedSui: 2_450.6,
    adFeesCollectedSui: 0,
    reportsOpen: reportSeeds.length,
    storageUsedBytes: sum(accounts.map((account) => account.storageUsedBytes)),
    creatorCount: accounts.length,
    weeklyVisitors: [56_000, 64_000, 71_000, 94_000, 110_000, 152_000, 187_420],
    weeklyUploads: [42, 48, 59, 61, 73, 79, 84],
    weeklyWatchMinutes: [132_000, 148_000, 163_000, 189_000, 205_000, 221_000, 243_000],
  };

  return {
    videos,
    reports: reportSeeds,
    accounts,
    blobLikes: [],
    blobFollows: [],
    blobComments: [],
    metrics,
    settings: defaultPlatformSettings(),
  };
}

export const platformHighlights = [
  {
    title: "Single-signature uploads",
    description: "Connect once, send the relay, and mint the sealed video without extra approval steps.",
  },
  {
    title: "Walrus-first storage",
    description: "Any file format can be accepted, sealed, and stored as a durable bundle before publishing.",
  },
  {
    title: "Private or public publishing",
    description: "Draft locally, publish later, or keep the upload locked to the creator profile until release day.",
  },
  {
    title: "Admin moderation",
    description: "Track reports, visitor trends, suspicious spikes, and featured content from the control room.",
  },
];

export const browseTopics = [
  "Launches",
  "Music",
  "Gaming",
  "DeFi",
  "Culture",
  "AI Labs",
  "Shorts",
  "Live Events",
];

export const creatorPromises = [
  "Encrypted creator vaults",
  "Treasury fee routing",
  "Tip, subscribe, like, and watch analytics",
  "Profile page with renewal controls",
];
