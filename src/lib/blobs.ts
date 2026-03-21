import { shortAddress, slugifyText } from "@/lib/format";
import type { VideoRecord, WalletSession } from "@/lib/types";

export interface BlobComment {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  authorAddress?: string;
  body: string;
  createdAt: string;
  pinned?: boolean;
}

export interface BlobItem {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  posterUrl?: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  creatorAddress?: string;
  caption: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  tipEnabled: boolean;
  followable: boolean;
  likedByUser: boolean;
  followedByUser: boolean;
  createdAt: string;
  duration: string;
  audioLabel?: string;
  visibility?: "public" | "private" | "members";
  tokenGate?: "public" | "token";
  watchTimeSeconds?: number;
  completionRate?: number;
  replayCount?: number;
  skipSpeed?: number;
  storageMode?: "local" | "walrus";
  policyObjectId?: string;
  policyNonce?: string;
  contentType?: string;
  videoId?: string;
  comments: BlobComment[];
}

export interface BlobUserState {
  likedAdjustments: Record<string, number>;
  likedIds: Record<string, boolean>;
  followedHandles: Record<string, boolean>;
  shareAdjustments: Record<string, number>;
  commentDrafts: Record<string, string>;
  commentsByBlobId: Record<string, BlobComment[]>;
  muted: boolean;
}

const SAMPLE_VIDEO_URLS = [
  "https://download.samplelib.com/mp4/sample-5s.mp4",
  "https://download.samplelib.com/mp4/sample-10s.mp4",
  "https://download.samplelib.com/mp4/sample-15s.mp4",
  "https://download.samplelib.com/mp4/sample-20s.mp4",
  "https://download.samplelib.com/mp4/sample-30s.mp4",
] as const;

function createPoster({
  title,
  handle,
  accent,
  secondary,
}: {
  title: string;
  handle: string;
  accent: string;
  secondary: string;
}) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${accent}" />
          <stop offset="55%" stop-color="${secondary}" />
          <stop offset="100%" stop-color="#020617" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#bg)" />
      <rect width="1080" height="1920" fill="url(#glow)" />
      <circle cx="540" cy="760" r="120" fill="#ffffff" fill-opacity="0.08" />
      <circle cx="540" cy="760" r="72" fill="#ffffff" fill-opacity="0.18" />
      <polygon points="520,700 520,820 620,760" fill="white" fill-opacity="0.94" />
      <text x="72" y="1610" fill="white" font-family="Inter, system-ui, sans-serif" font-size="54" font-weight="700">${title}</text>
      <text x="72" y="1688" fill="#ffffff" fill-opacity="0.82" font-family="Inter, system-ui, sans-serif" font-size="30" font-weight="500">${handle}</text>
      <text x="72" y="1765" fill="#ffffff" fill-opacity="0.68" font-family="Inter, system-ui, sans-serif" font-size="24" letter-spacing="4">BLOBS</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function durationToSeconds(duration: string) {
  const parts = duration
    .split(":")
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part));

  if (!parts.length) return 0;
  if (parts.length === 1) return Math.max(0, Math.floor(parts[0]));
  if (parts.length === 2) return Math.max(0, Math.floor(parts[0] * 60 + parts[1]));
  return Math.max(0, Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]));
}

export function isBlobVideoRecord(video: VideoRecord) {
  const surface = video.asset?.blobAttributes?.surface?.trim().toLowerCase();
  if (surface === "blob" || surface === "short" || surface === "short-form") return true;
  if (video.category === "Shorts") return true;
  return durationToSeconds(video.duration) > 0 && durationToSeconds(video.duration) <= 60;
}

function creatorHandleFor(video: VideoRecord, account?: Pick<WalletSession, "handle" | "displayName" | "avatarSeed" | "address"> | null) {
  const rawHandle = account?.handle?.trim();
  if (rawHandle) {
    return rawHandle.startsWith("@") ? rawHandle : `@${rawHandle}`;
  }

  const fallback = slugifyText(account?.displayName || video.ownerName || video.ownerAddress || "creator");
  return `@${fallback || shortAddress(video.ownerAddress, 4).replace(/…/g, "")}`;
}

function creatorAvatarFor(video: VideoRecord, account?: Pick<WalletSession, "avatarSeed" | "displayName"> | null) {
  return account?.avatarSeed || initialsFromName(account?.displayName || video.ownerName || "Creator");
}

function creatorNameFor(video: VideoRecord, account?: Pick<WalletSession, "displayName"> | null) {
  return account?.displayName || video.ownerName;
}

function creatorPosterFor(
  video: VideoRecord,
  account?: Pick<WalletSession, "handle" | "displayName" | "avatarSeed" | "address"> | null,
) {
  return createPoster({
    title: video.title,
    handle: creatorHandleFor(video, account),
    accent: video.coverFrom,
    secondary: video.coverVia,
  });
}

export function mapVideoToBlobItem(
  video: VideoRecord,
  account?: Pick<WalletSession, "handle" | "displayName" | "avatarSeed" | "address"> | null,
): BlobItem {
  const durationSeconds = durationToSeconds(video.duration);
  const creatorName = creatorNameFor(video, account);
  const creatorHandle = creatorHandleFor(video, account);
  const creatorAvatar = creatorAvatarFor(video, account);
  const poster = creatorPosterFor(video, account);
  const isPublicBlob = isBlobVideoRecord(video);

  return {
    id: video.id,
    title: video.title,
    videoUrl: `/api/videos/${video.id}/stream`,
    thumbnailUrl: poster,
    posterUrl: poster,
    creatorName,
    creatorHandle,
    creatorAvatar,
    creatorAddress: video.ownerAddress,
    caption: video.description || video.title,
    tags: video.tags.length ? video.tags : [video.category],
    likesCount: Number(video.likes) || 0,
    commentsCount: Number(video.comments) || 0,
    sharesCount: Math.max(0, Math.round((Number(video.likes) || 0) / 12)),
    tipEnabled: isPublicBlob,
    followable: true,
    likedByUser: false,
    followedByUser: false,
    createdAt: video.publishedAt || video.createdAt,
    duration: video.duration,
    audioLabel: video.category,
    visibility: video.visibility === "public" ? "public" : video.visibility === "private" ? "private" : "members",
    tokenGate: isPublicBlob ? "public" : undefined,
    watchTimeSeconds: Math.max(8, Math.round(durationSeconds * 1.4) || 12),
    completionRate: Math.min(0.98, durationSeconds <= 15 ? 0.91 : durationSeconds <= 30 ? 0.82 : 0.74),
    replayCount: Math.max(0, Math.round((Number(video.views) || 0) / 250000)),
    skipSpeed: durationSeconds <= 15 ? 0.96 : 1.04,
    storageMode: video.asset?.storageMode ?? "local",
    policyObjectId: video.policyObjectId,
    policyNonce: video.asset?.nonce ?? video.policyNonce,
    contentType: video.asset?.contentType || "video/mp4",
    videoId: video.id,
    comments: [],
  };
}

export function buildBlobFeedFromVideos(
  videos: VideoRecord[],
  accountsByAddress: Map<string, Pick<WalletSession, "handle" | "displayName" | "avatarSeed" | "address"> | null> = new Map(),
) {
  return rankBlobFeed(
    videos.map((video) => mapVideoToBlobItem(video, accountsByAddress.get(video.ownerAddress) ?? null)),
  );
}

function commentId(blobId: string, index: number) {
  return `comment-${blobId}-${index + 1}`;
}

function makeComments(
  blobId: string,
  entries: Array<Pick<BlobComment, "authorName" | "authorHandle" | "authorAvatar" | "body" | "createdAt"> & { pinned?: boolean }>,
) {
  return entries.map((entry, index) => ({
    id: commentId(blobId, index),
    ...entry,
  }));
}

export const blobSeed: BlobItem[] = [
  {
    id: "blobs-walrus-seal-loop",
    title: "Walrus + Seal Loop",
    videoUrl: SAMPLE_VIDEO_URLS[0],
    thumbnailUrl: createPoster({
      title: "Walrus + Seal Loop",
      handle: "@anavrin",
      accent: "#22d3ee",
      secondary: "#3b82f6",
    }),
    creatorName: "Anavrin TV",
    creatorHandle: "@anavrin",
    creatorAvatar: "AT",
    creatorAddress: "0x1111111111111111111111111111111111111111111111111111111111111111",
    caption: "Walrus upload, Seal protection, and one-signature creator flow in a vertical short.",
    tags: ["Walrus", "Seal", "Sui"],
    likesCount: 28120,
    commentsCount: 428,
    sharesCount: 1080,
    tipEnabled: true,
    followable: true,
    likedByUser: false,
    followedByUser: true,
    createdAt: "2026-03-20T14:12:00.000Z",
    duration: "0:12",
    audioLabel: "Original audio",
    visibility: "public",
    tokenGate: "public",
    watchTimeSeconds: 43,
    completionRate: 0.89,
    replayCount: 2,
    skipSpeed: 0.96,
    comments: makeComments("blobs-walrus-seal-loop", [
      {
        authorName: "Mina",
        authorHandle: "@mina",
        authorAvatar: "M",
        body: "This feels like a real short-form app, not a dashboard.",
        createdAt: "2026-03-20T16:14:00.000Z",
        pinned: true,
      },
      {
        authorName: "Kai",
        authorHandle: "@kai",
        authorAvatar: "K",
        body: "The swipe feel is clean and the overlays stay out of the way.",
        createdAt: "2026-03-20T16:30:00.000Z",
      },
    ]),
  },
  {
    id: "blobs-creator-profile-swipe",
    title: "Creator Profile Swipe",
    videoUrl: SAMPLE_VIDEO_URLS[1],
    thumbnailUrl: createPoster({
      title: "Creator Profile Swipe",
      handle: "@kairo",
      accent: "#8b5cf6",
      secondary: "#0ea5e9",
    }),
    creatorName: "Kairo Labs",
    creatorHandle: "@kairo",
    creatorAvatar: "KL",
    creatorAddress: "0x2222222222222222222222222222222222222222222222222222222222222222",
    caption: "Follow the creator, tip directly, and keep the blob playing while comments slide in.",
    tags: ["Creator", "Profile", "Shorts"],
    likesCount: 18420,
    commentsCount: 314,
    sharesCount: 720,
    tipEnabled: true,
    followable: true,
    likedByUser: false,
    followedByUser: false,
    createdAt: "2026-03-20T13:42:00.000Z",
    duration: "0:24",
    audioLabel: "Creator voiceover",
    visibility: "public",
    tokenGate: "public",
    watchTimeSeconds: 31,
    completionRate: 0.72,
    replayCount: 4,
    skipSpeed: 1.08,
    comments: makeComments("blobs-creator-profile-swipe", [
      {
        authorName: "Nia",
        authorHandle: "@nia",
        authorAvatar: "N",
        body: "The right rail is exactly what a mobile short feed needs.",
        createdAt: "2026-03-20T15:05:00.000Z",
        pinned: true,
      },
      {
        authorName: "Luca",
        authorHandle: "@luca",
        authorAvatar: "L",
        body: "I like that the comments stay open without killing playback.",
        createdAt: "2026-03-20T15:26:00.000Z",
      },
    ]),
  },
  {
    id: "blobs-shorts-live-drop",
    title: "Live Drop Recap",
    videoUrl: SAMPLE_VIDEO_URLS[2],
    thumbnailUrl: createPoster({
      title: "Live Drop Recap",
      handle: "@walrusweekly",
      accent: "#34d399",
      secondary: "#14b8a6",
    }),
    creatorName: "Walrus Weekly",
    creatorHandle: "@walrusweekly",
    creatorAvatar: "WW",
    creatorAddress: "0x4444444444444444444444444444444444444444444444444444444444444444",
    caption: "A live recap cut into a clean vertical loop for quick replays and tips.",
    tags: ["Live", "Recap", "Loop"],
    likesCount: 14920,
    commentsCount: 256,
    sharesCount: 602,
    tipEnabled: true,
    followable: true,
    likedByUser: false,
    followedByUser: false,
    createdAt: "2026-03-20T12:20:00.000Z",
    duration: "0:18",
    audioLabel: "Live audio",
    visibility: "public",
    tokenGate: "public",
    watchTimeSeconds: 28,
    completionRate: 0.61,
    replayCount: 3,
    skipSpeed: 1.12,
    comments: makeComments("blobs-shorts-live-drop", [
      {
        authorName: "Sora",
        authorHandle: "@sora",
        authorAvatar: "S",
        body: "This looks like Shorts but the UX feels more premium.",
        createdAt: "2026-03-20T14:06:00.000Z",
        pinned: true,
      },
      {
        authorName: "Jae",
        authorHandle: "@jae",
        authorAvatar: "J",
        body: "The autoplay and snap behavior are super smooth on desktop.",
        createdAt: "2026-03-20T14:19:00.000Z",
      },
    ]),
  },
  {
    id: "blobs-community-highlights",
    title: "Community Highlights",
    videoUrl: SAMPLE_VIDEO_URLS[3],
    thumbnailUrl: createPoster({
      title: "Community Highlights",
      handle: "@novaclips",
      accent: "#f97316",
      secondary: "#7c3aed",
    }),
    creatorName: "Nova Clips",
    creatorHandle: "@novaclips",
    creatorAvatar: "NC",
    creatorAddress: "0x3333333333333333333333333333333333333333333333333333333333333333",
    caption: "Fast community highlight reel built for quick swipes, likes, and replays.",
    tags: ["Community", "Highlights", "Shorts"],
    likesCount: 20180,
    commentsCount: 380,
    sharesCount: 945,
    tipEnabled: true,
    followable: true,
    likedByUser: false,
    followedByUser: false,
    createdAt: "2026-03-20T11:16:00.000Z",
    duration: "0:30",
    audioLabel: "Trending audio",
    visibility: "public",
    tokenGate: "public",
    watchTimeSeconds: 38,
    completionRate: 0.79,
    replayCount: 5,
    skipSpeed: 1.01,
    comments: makeComments("blobs-community-highlights", [
      {
        authorName: "Tess",
        authorHandle: "@tess",
        authorAvatar: "T",
        body: "I want this exact feed style for every creator channel.",
        createdAt: "2026-03-20T12:49:00.000Z",
        pinned: true,
      },
      {
        authorName: "Owen",
        authorHandle: "@owen",
        authorAvatar: "O",
        body: "The progress bar and action rail make it feel native.",
        createdAt: "2026-03-20T13:12:00.000Z",
      },
    ]),
  },
  {
    id: "blobs-sui-sprint-labs",
    title: "Sui Sprint Labs",
    videoUrl: SAMPLE_VIDEO_URLS[4],
    thumbnailUrl: createPoster({
      title: "Sui Sprint Labs",
      handle: "@suilabs",
      accent: "#60a5fa",
      secondary: "#a78bfa",
    }),
    creatorName: "Sui Labs",
    creatorHandle: "@suilabs",
    creatorAvatar: "SL",
    creatorAddress: "0x5555555555555555555555555555555555555555555555555555555555555555",
    caption: "Short-form product demos with wallet-aware engagement and fast creator follow-ups.",
    tags: ["Sui", "Product", "Demo"],
    likesCount: 13120,
    commentsCount: 196,
    sharesCount: 504,
    tipEnabled: true,
    followable: true,
    likedByUser: false,
    followedByUser: false,
    createdAt: "2026-03-20T10:48:00.000Z",
    duration: "0:20",
    audioLabel: "Product narration",
    visibility: "public",
    tokenGate: "public",
    watchTimeSeconds: 19,
    completionRate: 0.67,
    replayCount: 1,
    skipSpeed: 1.07,
    comments: makeComments("blobs-sui-sprint-labs", [
      {
        authorName: "Priya",
        authorHandle: "@priya",
        authorAvatar: "P",
        body: "The layout is dense, but the video remains the focus.",
        createdAt: "2026-03-20T11:36:00.000Z",
        pinned: true,
      },
    ]),
  },
  {
    id: "blobs-private-drafts",
    title: "Private Drafts",
    videoUrl: SAMPLE_VIDEO_URLS[1],
    thumbnailUrl: createPoster({
      title: "Private Drafts",
      handle: "@anavrin",
      accent: "#f472b6",
      secondary: "#fb7185",
    }),
    creatorName: "Anavrin TV",
    creatorHandle: "@anavrin",
    creatorAvatar: "AT",
    creatorAddress: "0x1111111111111111111111111111111111111111111111111111111111111111",
    caption: "Drafts can stay private, token gated, or published into the public blob feed.",
    tags: ["Drafts", "Private", "Token Gate"],
    likesCount: 8120,
    commentsCount: 102,
    sharesCount: 220,
    tipEnabled: false,
    followable: true,
    likedByUser: false,
    followedByUser: true,
    createdAt: "2026-03-20T09:30:00.000Z",
    duration: "0:14",
    audioLabel: "Private mix",
    visibility: "members",
    tokenGate: "token",
    watchTimeSeconds: 16,
    completionRate: 0.58,
    replayCount: 2,
    skipSpeed: 1.15,
    comments: makeComments("blobs-private-drafts", [
      {
        authorName: "Lena",
        authorHandle: "@lena",
        authorAvatar: "L",
        body: "Nice to see the content model support private and gated drops.",
        createdAt: "2026-03-20T10:04:00.000Z",
        pinned: true,
      },
    ]),
  },
];

export function createBlobUserState(): BlobUserState {
  return {
    likedAdjustments: {},
    likedIds: {},
    followedHandles: {},
    shareAdjustments: {},
    commentDrafts: {},
    commentsByBlobId: {},
    muted: true,
  };
}

export function blobStateStorageKey(address?: string | null) {
  return `anavrin:blobs:${address ?? "guest"}`;
}

export function rankBlobFeed(items: BlobItem[]) {
  return [...items].sort((a, b) => {
    const scoreA =
      a.likesCount * 0.42 +
      a.commentsCount * 0.28 +
      a.sharesCount * 0.18 +
      (a.replayCount ?? 0) * 0.5 +
      (a.completionRate ?? 0) * 100 +
      (a.watchTimeSeconds ?? 0) * 0.2;
    const scoreB =
      b.likesCount * 0.42 +
      b.commentsCount * 0.28 +
      b.sharesCount * 0.18 +
      (b.replayCount ?? 0) * 0.5 +
      (b.completionRate ?? 0) * 100 +
      (b.watchTimeSeconds ?? 0) * 0.2;

    if (scoreA !== scoreB) return scoreB - scoreA;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
