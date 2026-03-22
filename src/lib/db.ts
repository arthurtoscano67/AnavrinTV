import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import crypto from "node:crypto";

import {
  ensureUniqueUsername,
  normalizeUsernameInput,
  usernameFromDisplayName,
  validateUsername,
} from "@/lib/creator-identity";
import { buildSeedDatabase, gradientForTopic } from "@/lib/seed";
import { formatBytes, shortAddress, slugifyText } from "@/lib/format";
import {
  calculateStorageHealthSummary,
  calculateVideoStorageExpiry,
  defaultPlatformSettings,
  mergePlatformSettings,
  normalizePlatformSettings,
} from "@/lib/platform-settings";
import { openBuffer, sealBuffer } from "@/lib/seal";
import { isAdminAddress } from "@/lib/anavrin-config";
import { isPaidVideoMonetization, isPublishedWatchRelease, normalizeVideoMonetization } from "@/lib/video-monetization";
import type {
  Database,
  BlobCommentRecord,
  BlobFollowRecord,
  BlobLikeRecord,
  VideoBookmarkRecord,
  ReportRecord,
  ReportContentType,
  PlatformSettings,
  SiteMetrics,
  VideoAsset,
  VideoRecord,
  VideoStatus,
  VideoVisibility,
  WalletMode,
  WalletSession,
} from "@/lib/types";

const DATA_DIR = join(/* turbopackIgnore: true */ process.cwd(), "data");
const WALRUS_DIR = join(DATA_DIR, "walrus");
const THUMBNAILS_DIR = join(DATA_DIR, "thumbnails");
const DB_FILE = join(DATA_DIR, "anavrin-db.json");
let bootstrapPromise: Promise<Database> | null = null;
const DEFAULT_STORAGE_DAYS = 30;
const DEFAULT_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024 * 1024;

async function ensureStorage() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(WALRUS_DIR, { recursive: true });
  await mkdir(THUMBNAILS_DIR, { recursive: true });
}

function normalizeAddress(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeMetrics(metrics?: Partial<SiteMetrics>): SiteMetrics {
  return {
    visitorsToday: Number(metrics?.visitorsToday) || 0,
    activeStreams: Number(metrics?.activeStreams) || 0,
    uploadsToday: Number(metrics?.uploadsToday) || 0,
    treasuryCollectedSui: Number(metrics?.treasuryCollectedSui) || 0,
    uploadFeesCollectedSui: Number(metrics?.uploadFeesCollectedSui) || 0,
    tipFeesCollectedSui: Number(metrics?.tipFeesCollectedSui) || 0,
    storageFeesCollectedSui: Number(metrics?.storageFeesCollectedSui) || 0,
    adFeesCollectedSui: Number(metrics?.adFeesCollectedSui) || 0,
    reportsOpen: Number(metrics?.reportsOpen) || 0,
    storageUsedBytes: Number(metrics?.storageUsedBytes) || 0,
    creatorCount: Number(metrics?.creatorCount) || 0,
    weeklyVisitors: Array.isArray(metrics?.weeklyVisitors) && metrics.weeklyVisitors.length
      ? [...metrics.weeklyVisitors].slice(0, 7)
      : [0, 0, 0, 0, 0, 0, 0],
    weeklyUploads: Array.isArray(metrics?.weeklyUploads) && metrics.weeklyUploads.length
      ? [...metrics.weeklyUploads].slice(0, 7)
      : [0, 0, 0, 0, 0, 0, 0],
    weeklyWatchMinutes:
      Array.isArray(metrics?.weeklyWatchMinutes) && metrics.weeklyWatchMinutes.length
        ? [...metrics.weeklyWatchMinutes].slice(0, 7)
        : [0, 0, 0, 0, 0, 0, 0],
  };
}

function normalizeAccountRecord(
  account: Partial<WalletSession> & Pick<WalletSession, "address" | "displayName" | "mode">,
): WalletSession {
  const now = timestamp();
  const normalizedAddress = normalizeAddress(account.address);
  const preferredUsername =
    normalizeUsernameInput(account.username) ||
    normalizeUsernameInput(account.handle) ||
    usernameFromDisplayName(account.displayName, normalizedAddress);
  const followers = Number(account.followersCount ?? account.followers) || 0;
  const following = Number(account.followingCount ?? account.following) || 0;

  return {
    id:
      account.id ??
      `acct-${slugify(account.displayName)}-${shortAddress(normalizedAddress, 4).replace(/…/g, "")}`,
    displayName: account.displayName || "Creator",
    username: preferredUsername,
    address: normalizedAddress,
    mode: account.mode,
    avatarSeed: account.avatarSeed || account.displayName.slice(0, 2).toUpperCase() || "AT",
    handle: preferredUsername,
    bio: account.bio,
    avatarUrl: account.avatarUrl,
    bannerUrl: account.bannerUrl,
    storageLimitBytes: Number(account.storageLimitBytes) || DEFAULT_STORAGE_LIMIT_BYTES,
    storageUsedBytes: Number(account.storageUsedBytes) || 0,
    treasuryFeeBps: Number(account.treasuryFeeBps) || 0,
    renewalAt: account.renewalAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * DEFAULT_STORAGE_DAYS).toISOString(),
    createdAt: account.createdAt || now,
    lastActiveAt: account.lastActiveAt || now,
    uploadsPublished: Number(account.uploadsPublished) || 0,
    totalViews: Number(account.totalViews) || 0,
    totalTips: Number(account.totalTips) || 0,
    followers,
    followersCount: followers,
    following,
    followingCount: following,
    totalVideos: Number(account.totalVideos) || 0,
    totalBlobs: Number(account.totalBlobs) || 0,
    isBanned: Boolean(account.isBanned),
    bannedAt: account.bannedAt,
    bannedUntil: account.bannedUntil,
    bannedReason: account.bannedReason,
    bannedBy: account.bannedBy,
    moderationNotes: account.moderationNotes,
  };
}

function normalizeVideoAsset(asset: VideoAsset | null, ownerAddress: string, createdAt: string) {
  if (!asset) return null;
  const storageMode = asset.storageMode ?? "local";
  const storageStartedAt = asset.storageStartedAt || createdAt;
  const storageExpiresAt =
    asset.storageExpiresAt || (storageMode === "walrus" ? calculateVideoStorageExpiry(storageStartedAt, DEFAULT_STORAGE_DAYS) : undefined);

  return {
    ...asset,
    storageMode,
    storageOwnerAddress: asset.storageOwnerAddress || ownerAddress,
    storageStartedAt,
    storageExpiresAt,
    storageRenewedAt: asset.storageRenewedAt || storageStartedAt,
    storageRenewalDays: Number(asset.storageRenewalDays) || DEFAULT_STORAGE_DAYS,
    storageRenewalFeeSui: Number(asset.storageRenewalFeeSui) || 0,
    storageMaxExtensionDays: Number(asset.storageMaxExtensionDays) || 730,
    sizeBytes: Number(asset.sizeBytes) || 0,
    encryptedSizeBytes: Number(asset.encryptedSizeBytes) || undefined,
    sealedAt: asset.sealedAt || createdAt,
    encryption: asset.encryption || "seal-aes256-gcm",
  };
}

function durationToSeconds(duration: string) {
  const [minutes, seconds] = duration.split(":").map((part) => Number(part) || 0);
  return minutes * 60 + seconds;
}

function formatDurationFromSeconds(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return "0:00";
  const rounded = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function isBlobVideoForCreator(video: Pick<VideoRecord, "category" | "duration" | "tags">) {
  if (video.category === "Shorts") return true;
  if (video.tags.some((tag) => tag.toLowerCase().includes("short"))) return true;
  return durationToSeconds(video.duration) > 0 && durationToSeconds(video.duration) <= 120;
}

function classifyReportContentType(video: Pick<VideoRecord, "category" | "duration" | "tags">): ReportContentType {
  if (video.category === "Live Events" || video.tags.some((tag) => tag.toLowerCase().includes("live"))) {
    return "live";
  }
  if (isBlobVideoForCreator(video)) {
    return "blob";
  }
  return "video";
}

function normalizeReportContentType(value: unknown): ReportContentType | null {
  if (value === "video" || value === "blob" || value === "live") return value;
  return null;
}

function isAccountBanned(account: Pick<WalletSession, "isBanned" | "bannedUntil"> | null | undefined) {
  if (!account?.isBanned) return false;
  if (!account.bannedUntil) return true;
  const bannedUntilMs = new Date(account.bannedUntil).getTime();
  if (!Number.isFinite(bannedUntilMs)) return true;
  return bannedUntilMs > Date.now();
}

function assertAccountCanAct(
  db: Database,
  address: string,
  action: string,
) {
  const normalizedAddress = normalizeAddress(address);
  if (!normalizedAddress) return null;

  const account = db.accounts.find((item) => normalizeAddress(item.address) === normalizedAddress);
  if (!account) return null;

  if (isAccountBanned(account)) {
    const reason = account.bannedReason?.trim();
    throw new Error(
      reason
        ? `Account is banned and cannot ${action}: ${reason}`
        : `Account is banned and cannot ${action}.`,
    );
  }

  return account;
}

function normalizeVideoRecord(video: Partial<VideoRecord> & Pick<VideoRecord, "id" | "title" | "ownerAddress" | "ownerName">): VideoRecord {
  const createdAt = video.createdAt || timestamp();
  const ownerAddress = normalizeAddress(video.ownerAddress);
  const asset = normalizeVideoAsset(video.asset ?? null, ownerAddress, createdAt);
  const explicitThumbnailUrl =
    typeof video.thumbnailUrl === "string" && video.thumbnailUrl.trim().length > 0
      ? video.thumbnailUrl.trim()
      : undefined;
  const derivedThumbnailUrl = asset?.thumbnailPath ? `/api/videos/${video.id}/thumbnail` : undefined;
  const creatorUsername =
    normalizeUsernameInput(video.creatorUsername) ||
    normalizeUsernameInput(video.ownerName) ||
    usernameFromDisplayName(video.ownerName, ownerAddress);

  return {
    id: video.id,
    slug: video.slug || slugifyText(video.title || video.id),
    title: video.title || "Untitled video",
    description: video.description || "",
    tags: Array.isArray(video.tags) ? video.tags : [],
    category: video.category || "Launches",
    visibility: video.visibility || "draft",
    status: video.status || "draft",
    ownerAddress,
    ownerName: video.ownerName || "Creator",
    creatorId: video.creatorId || `creator-${slugify(ownerAddress || video.id)}`,
    creatorUsername,
    creatorDisplayName: video.creatorDisplayName || video.ownerName || "Creator",
    creatorAvatarUrl: video.creatorAvatarUrl,
    thumbnailUrl: explicitThumbnailUrl || derivedThumbnailUrl,
    coverFrom: video.coverFrom || "#22d3ee",
    coverVia: video.coverVia || "#3b82f6",
    coverTo: video.coverTo || "#0f172a",
    duration: video.duration || "0:00",
    createdAt,
    updatedAt: video.updatedAt || createdAt,
    publishedAt: video.publishedAt,
    policyPackageId: video.policyPackageId,
    policyObjectId: video.policyObjectId,
    capObjectId: video.capObjectId,
    policyStatus: video.policyStatus,
    policyVisibility: video.policyVisibility,
    policyNonce: video.policyNonce,
    uploadTxDigest: video.uploadTxDigest,
    storageExpiresAt: video.storageExpiresAt || asset?.storageExpiresAt,
    monetization: normalizeVideoMonetization(video.monetization),
    views: Number(video.views) || 0,
    comments: Number(video.comments) || 0,
    likes: Number(video.likes) || 0,
    tips: Number(video.tips) || 0,
    subscribers: Number(video.subscribers) || 0,
    reportedCount: Number(video.reportedCount) || 0,
    asset,
  };
}

function normalizeDb(db: Partial<Database> & { videos?: Partial<VideoRecord>[]; reports?: Partial<ReportRecord>[]; accounts?: Partial<WalletSession>[]; settings?: Partial<PlatformSettings>; metrics?: Partial<SiteMetrics> }): Database {
  const settings = normalizePlatformSettings(db.settings ?? defaultPlatformSettings());
  const accountsRaw = Array.isArray(db.accounts)
    ? db.accounts.map((account) =>
        normalizeAccountRecord({
          ...(account ?? {}),
          address: account.address ?? "0x0",
          displayName: account.displayName ?? "Creator",
          mode: account.mode ?? "wallet",
        }),
      )
    : [];

  const usernames = new Set<string>();
  const accounts = accountsRaw.map((account) => {
    const uniqueUsername = ensureUniqueUsername(
      account.username || usernameFromDisplayName(account.displayName, account.address),
      usernames,
    );

    return {
      ...account,
      username: uniqueUsername,
      handle: uniqueUsername,
    };
  });

  const accountByAddress = new Map(accounts.map((account) => [account.address, account]));

  const videos = Array.isArray(db.videos)
    ? db.videos.map((video) => {
        const normalized = normalizeVideoRecord({
          ...(video ?? {}),
          id: video.id ?? crypto.randomUUID(),
          title: video.title ?? "Untitled video",
          ownerAddress: video.ownerAddress ?? "0x0",
          ownerName: video.ownerName ?? "Creator",
        });
        const owner = accountByAddress.get(normalized.ownerAddress);
        const creatorUsername =
          owner?.username ||
          normalizeUsernameInput(normalized.creatorUsername) ||
          usernameFromDisplayName(normalized.ownerName, normalized.ownerAddress);

        return {
          ...normalized,
          ownerName: owner?.displayName ?? normalized.ownerName,
          creatorId: owner?.id ?? normalized.creatorId,
          creatorUsername,
          creatorDisplayName: owner?.displayName ?? normalized.creatorDisplayName ?? normalized.ownerName,
          creatorAvatarUrl: owner?.avatarUrl ?? normalized.creatorAvatarUrl,
        };
      })
    : [];

  for (const account of accounts) {
    const ownedVideos = videos.filter((video) => video.ownerAddress === account.address);
    const blobCount = ownedVideos.filter(isBlobVideoForCreator).length;
    const totalViews = ownedVideos.reduce((sum, video) => sum + (Number(video.views) || 0), 0);
    const followers = Number(account.followersCount ?? account.followers) || 0;
    const following = Number(account.followingCount ?? account.following) || 0;

    account.totalVideos = ownedVideos.length;
    account.totalBlobs = blobCount;
    account.totalViews = totalViews;
    account.followers = followers;
    account.followersCount = followers;
    account.following = following;
    account.followingCount = following;
  }
  const reports = Array.isArray(db.reports)
    ? db.reports.map((report) => ({
        id: report.id ?? crypto.randomUUID(),
        videoId: report.videoId ?? "",
        videoTitle: report.videoTitle ?? "Unknown video",
        contentType:
          normalizeReportContentType(report.contentType) ??
          classifyReportContentType(
            videos.find((video) => video.id === report.videoId) ?? {
              category: "Launches",
              duration: "0:00",
              tags: [],
            },
          ),
        reason: report.reason ?? "Needs review",
        detail: report.detail ?? "",
        severity: (report.severity as ReportRecord["severity"]) ?? "low",
        status: (report.status as ReportRecord["status"]) ?? "open",
        reporter: report.reporter ?? "viewer",
        createdAt: report.createdAt ?? timestamp(),
      }))
    : [];
  const videoBookmarks = Array.isArray(db.videoBookmarks)
    ? db.videoBookmarks.map((record) =>
        normalizeVideoBookmarkRecord({
          ...(record ?? {}),
          videoId: record.videoId ?? "",
          userAddress: record.userAddress ?? "0x0",
        }),
      )
    : [];
  const blobLikes = Array.isArray(db.blobLikes)
    ? db.blobLikes.map((record) =>
        normalizeBlobLikeRecord({
          ...(record ?? {}),
          blobId: record.blobId ?? "",
          userAddress: record.userAddress ?? "0x0",
        }),
      )
    : [];
  const blobFollows = Array.isArray(db.blobFollows)
    ? db.blobFollows.map((record) =>
        normalizeBlobFollowRecord({
          ...(record ?? {}),
          blobId: record.blobId ?? "",
          creatorAddress: record.creatorAddress ?? "0x0",
          userAddress: record.userAddress ?? "0x0",
        }),
      )
    : [];
  const blobComments = Array.isArray(db.blobComments)
    ? db.blobComments.map((record) =>
        normalizeBlobCommentRecord({
          ...(record ?? {}),
          blobId: record.blobId ?? "",
          authorAddress: record.authorAddress ?? "0x0",
          authorName: record.authorName ?? "Creator",
          authorHandle: record.authorHandle ?? "",
          authorAvatar: record.authorAvatar ?? "",
          body: record.body ?? "",
        }),
      )
    : [];
  const dbMetrics = normalizeMetrics(db.metrics);

  return {
    videos,
    reports,
    accounts,
    videoBookmarks,
    blobLikes,
    blobFollows,
    blobComments,
    metrics: {
      ...dbMetrics,
      reportsOpen: reports.filter((report) => report.status === "open").length,
      creatorCount: accounts.length,
      storageUsedBytes: accounts.reduce((sum, account) => sum + account.storageUsedBytes, 0),
    },
    settings,
  };
}

function computeMetrics(db: Database): SiteMetrics {
  const normalized = normalizeMetrics(db.metrics);
  return {
    ...normalized,
    reportsOpen: db.reports.filter((report) => report.status === "open").length,
    creatorCount: db.accounts.length,
    storageUsedBytes: db.accounts.reduce((sum, account) => sum + account.storageUsedBytes, 0),
  };
}

async function loadSeededDb() {
  const seed = buildSeedDatabase();
  await writeDb(seed);
  return seed;
}

export async function loadDb(): Promise<Database> {
  if (bootstrapPromise) return bootstrapPromise;

  const promise = (async () => {
    await ensureStorage();

    try {
      const raw = await readFile(DB_FILE, "utf8");
      const parsed = JSON.parse(raw) as Database;
      return normalizeDb(parsed);
    } catch {
      return loadSeededDb();
    }
  })();

  bootstrapPromise = promise;

  try {
    return await promise;
  } finally {
    bootstrapPromise = null;
  }
}

async function writeDb(db: Database) {
  await ensureStorage();
  const payload = JSON.stringify(normalizeDb(db), null, 2);
  await writeFile(DB_FILE, payload, "utf8");
}

export async function saveDb(db: Database) {
  await writeDb(db);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function timestamp() {
  return new Date().toISOString();
}

function createAccountRecord(input: {
  address: string;
  displayName: string;
  mode: WalletMode;
  storageUsedBytes?: number;
  username?: string;
}): WalletSession {
  const createdAt = timestamp();
  const username = normalizeUsernameInput(input.username) || usernameFromDisplayName(input.displayName, input.address);
  return {
    id: `acct-${slugify(input.displayName)}-${shortAddress(input.address, 4).replace(/…/g, "")}`,
    displayName: input.displayName,
    username,
    address: input.address,
    mode: input.mode,
    avatarSeed: input.displayName.slice(0, 2).toUpperCase() || "AT",
    handle: username,
    storageLimitBytes: DEFAULT_STORAGE_LIMIT_BYTES,
    storageUsedBytes: input.storageUsedBytes ?? 0,
    treasuryFeeBps: input.mode === "zklogin" ? 90 : input.mode === "slush" ? 75 : 65,
    renewalAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    createdAt,
    lastActiveAt: createdAt,
    uploadsPublished: 0,
    totalViews: 0,
    totalTips: 0,
    followers: 0,
    followersCount: 0,
    following: 0,
    followingCount: 0,
    totalVideos: 0,
    totalBlobs: 0,
    isBanned: false,
    bannedAt: undefined,
    bannedUntil: undefined,
    bannedReason: undefined,
    bannedBy: undefined,
    moderationNotes: undefined,
  };
}

function initialsFromName(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function normalizeBlobLikeRecord(record: Partial<BlobLikeRecord> & Pick<BlobLikeRecord, "blobId" | "userAddress">): BlobLikeRecord {
  return {
    id: record.id ?? crypto.randomUUID(),
    blobId: record.blobId,
    userAddress: normalizeAddress(record.userAddress),
    createdAt: record.createdAt ?? timestamp(),
  };
}

function normalizeBlobFollowRecord(
  record: Partial<BlobFollowRecord> & Pick<BlobFollowRecord, "blobId" | "creatorAddress" | "userAddress">,
): BlobFollowRecord {
  return {
    id: record.id ?? crypto.randomUUID(),
    blobId: record.blobId,
    creatorAddress: normalizeAddress(record.creatorAddress),
    userAddress: normalizeAddress(record.userAddress),
    createdAt: record.createdAt ?? timestamp(),
  };
}

function normalizeBlobCommentRecord(
  record: Partial<BlobCommentRecord> &
    Pick<BlobCommentRecord, "blobId" | "authorAddress" | "authorName" | "authorHandle" | "authorAvatar" | "body">,
): BlobCommentRecord {
  const authorName = record.authorName?.trim() || "Creator";
  const authorAddress = normalizeAddress(record.authorAddress) || "0x0";
  const authorHandle = record.authorHandle?.trim()
    ? record.authorHandle.trim().startsWith("@")
      ? record.authorHandle.trim()
      : `@${record.authorHandle.trim()}`
    : `@${shortAddress(authorAddress, 4).replace(/…/g, "")}`;

  return {
    id: record.id ?? crypto.randomUUID(),
    blobId: record.blobId,
    authorAddress,
    authorName,
    authorHandle,
    authorAvatar: record.authorAvatar?.trim() || initialsFromName(authorName || "Creator"),
    body: record.body?.trim() || "",
    createdAt: record.createdAt ?? timestamp(),
    pinned: Boolean(record.pinned),
  };
}

function normalizeVideoBookmarkRecord(
  record: Partial<VideoBookmarkRecord> & Pick<VideoBookmarkRecord, "videoId" | "userAddress">,
): VideoBookmarkRecord {
  return {
    id: record.id ?? crypto.randomUUID(),
    videoId: record.videoId,
    userAddress: normalizeAddress(record.userAddress),
    createdAt: record.createdAt ?? timestamp(),
  };
}

function guessExtension(fileName: string, contentType: string) {
  const originalExt = basename(fileName).split(".").pop();
  if (originalExt && originalExt.length <= 6) return `.${originalExt.toLowerCase()}`;

  const contentMap: Record<string, string> = {
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
    "video/x-matroska": ".mkv",
    "video/x-msvideo": ".avi",
    "video/x-flv": ".flv",
    "video/x-ms-wmv": ".wmv",
    "video/ogg": ".ogv",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "application/octet-stream": ".bin",
  };

  return contentMap[contentType] ?? ".bin";
}

type ThumbnailUploadInput = {
  bytes: Uint8Array | Buffer;
  originalName: string;
  contentType: string;
};

async function storeThumbnailAsset(videoId: string, thumbnail?: ThumbnailUploadInput | null) {
  if (!thumbnail) return null;
  const contentType = thumbnail.contentType?.trim() || "application/octet-stream";
  const extension = guessExtension(thumbnail.originalName, contentType);
  const relativePath = join("data", "thumbnails", `${videoId}${extension}`);
  const absolutePath = join(/* turbopackIgnore: true */ process.cwd(), relativePath);
  await ensureStorage();
  await writeFile(absolutePath, Buffer.from(thumbnail.bytes));
  return {
    path: relativePath,
    contentType,
  };
}

function chooseCover(category: string) {
  return gradientForTopic(category);
}

function resolveReportsForVideo(db: Database, videoId: string) {
  let changed = false;

  for (const report of db.reports) {
    if (report.videoId === videoId && report.status !== "resolved") {
      report.status = "resolved";
      changed = true;
    }
  }

  if (changed) {
    db.metrics.reportsOpen = db.reports.filter((item) => item.status === "open").length;
  }
}

async function upsertAccount(
  db: Database,
  input: {
    address: string;
    displayName: string;
    mode: WalletMode;
    storageDeltaBytes?: number;
  },
): Promise<WalletSession> {
  const normalizedAddress = normalizeAddress(input.address);
  const existing = db.accounts.find((account) => normalizeAddress(account.address) === normalizedAddress);
  if (existing) {
    existing.displayName = input.displayName;
    if (!existing.username) {
      const taken = new Set(
        db.accounts
          .filter((account) => normalizeAddress(account.address) !== normalizedAddress)
          .map((account) => normalizeUsernameInput(account.username || account.handle))
          .filter(Boolean),
      );
      const nextUsername = ensureUniqueUsername(
        usernameFromDisplayName(input.displayName, normalizedAddress),
        taken,
      );
      existing.username = nextUsername;
      existing.handle = nextUsername;
    }
    existing.address = normalizedAddress;
    existing.mode = input.mode;
    existing.storageUsedBytes += input.storageDeltaBytes ?? 0;
    existing.renewalAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    existing.lastActiveAt = timestamp();
    return existing;
  }

  const taken = new Set(
    db.accounts
      .map((account) => normalizeUsernameInput(account.username || account.handle))
      .filter(Boolean),
  );
  const username = ensureUniqueUsername(usernameFromDisplayName(input.displayName, normalizedAddress), taken);
  const account = createAccountRecord({
    address: normalizedAddress,
    displayName: input.displayName,
    mode: input.mode,
    storageUsedBytes: input.storageDeltaBytes ?? 0,
    username,
  });

  db.accounts.push(account);
  return account;
}

export async function updateAccountProfile(
  address: string,
  input: {
    displayName?: string;
    username?: string;
    handle?: string;
    bio?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    mode?: WalletMode;
  },
) {
  const db = await loadDb();
  const normalizedAddress = normalizeAddress(address);
  let account = db.accounts.find((item) => normalizeAddress(item.address) === normalizedAddress);
  const rawUsernameInput =
    typeof input.username === "string"
      ? input.username
      : typeof input.handle === "string"
        ? input.handle
        : undefined;

  if (!account) {
    account = createAccountRecord({
      address: normalizedAddress,
      displayName: input.displayName ?? "Creator",
      mode: input.mode ?? "wallet",
      username: normalizeUsernameInput(rawUsernameInput) || undefined,
    });
    db.accounts.push(account);
  }

  if (isAccountBanned(account)) {
    const reason = account.bannedReason?.trim();
    throw new Error(
      reason
        ? `Account is banned and cannot update profile: ${reason}`
        : "Account is banned and cannot update profile.",
    );
  }

  if (typeof input.displayName === "string" && input.displayName.trim()) {
    account.displayName = input.displayName.trim();
  }

  const requestedUsername = normalizeUsernameInput(rawUsernameInput);
  if (input.username !== undefined || input.handle !== undefined) {
    if (rawUsernameInput !== undefined) {
      const rawUsernameError = validateUsername(rawUsernameInput);
      if (rawUsernameError) {
        throw new Error(rawUsernameError);
      }
    }

    const nextUsername = requestedUsername || usernameFromDisplayName(account.displayName, normalizedAddress);
    const usernameError = validateUsername(nextUsername);
    if (usernameError) {
      throw new Error(usernameError);
    }

    const duplicate = db.accounts.find(
      (item) =>
        normalizeAddress(item.address) !== normalizedAddress &&
        normalizeUsernameInput(item.username || item.handle) === nextUsername,
    );

    if (duplicate) {
      throw new Error("Username is already taken.");
    }

    account.username = nextUsername;
    account.handle = nextUsername;
  } else if (!account.username) {
    const taken = new Set(
      db.accounts
        .filter((item) => normalizeAddress(item.address) !== normalizedAddress)
        .map((item) => normalizeUsernameInput(item.username || item.handle))
        .filter(Boolean),
    );
    const fallbackUsername = ensureUniqueUsername(
      usernameFromDisplayName(account.displayName, normalizedAddress),
      taken,
    );
    account.username = fallbackUsername;
    account.handle = fallbackUsername;
  }

  if (input.bio !== undefined) {
    account.bio = input.bio.trim() || undefined;
  }

  if (input.avatarUrl !== undefined) {
    account.avatarUrl = input.avatarUrl.trim() || undefined;
  }

  if (input.bannerUrl !== undefined) {
    account.bannerUrl = input.bannerUrl.trim() || undefined;
  }

  if (input.mode) {
    account.mode = input.mode;
  }

  const normalizedUsername = account.username || usernameFromDisplayName(account.displayName, normalizedAddress);
  account.username = normalizedUsername;
  account.handle = normalizedUsername;
  account.followersCount = Number(account.followersCount ?? account.followers) || 0;
  account.followingCount = Number(account.followingCount ?? account.following) || 0;
  account.followers = account.followersCount;
  account.following = account.followingCount;
  account.totalVideos = db.videos.filter((video) => normalizeAddress(video.ownerAddress) === normalizedAddress).length;
  account.totalBlobs = db.videos.filter(
    (video) => normalizeAddress(video.ownerAddress) === normalizedAddress && isBlobVideoForCreator(video),
  ).length;
  account.totalViews = db.videos
    .filter((video) => normalizeAddress(video.ownerAddress) === normalizedAddress)
    .reduce((sum, video) => sum + (Number(video.views) || 0), 0);

  for (const video of db.videos) {
    if (normalizeAddress(video.ownerAddress) !== normalizedAddress) continue;
    video.ownerName = account.displayName;
    video.creatorId = account.id;
    video.creatorUsername = normalizedUsername;
    video.creatorDisplayName = account.displayName;
    video.creatorAvatarUrl = account.avatarUrl;
    video.updatedAt = timestamp();
  }

  account.lastActiveAt = timestamp();
  await saveDb(db);
  return account;
}

export async function getVideos(options?: {
  ownerAddress?: string;
  publicOnly?: boolean;
  query?: string;
  category?: string;
  includeDrafts?: boolean;
}) {
  const db = await loadDb();
  const q = options?.query?.trim().toLowerCase();
  const accountByAddress = new Map(
    db.accounts.map((account) => [normalizeAddress(account.address), account] as const),
  );

  return db.videos
    .filter((video) => {
      if (options?.ownerAddress && normalizeAddress(video.ownerAddress) !== normalizeAddress(options.ownerAddress)) {
        return false;
      }
      if (options?.publicOnly && !isPublishedWatchRelease(video)) return false;
      if (options?.publicOnly) {
        const owner = accountByAddress.get(normalizeAddress(video.ownerAddress));
        if (owner && isAccountBanned(owner)) return false;
      }
      if (!options?.includeDrafts && video.status === "hidden") return false;
      if (options?.category && options.category !== "All" && video.category !== options.category) return false;
      if (q) {
        const searchable = [
          video.title,
          video.description,
          video.ownerName,
          video.creatorDisplayName,
          video.creatorUsername,
          video.category,
          video.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        return searchable.includes(q);
      }
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getVideo(id: string) {
  const db = await loadDb();
  return db.videos.find((video) => video.id === id || video.slug === id) ?? null;
}

export async function getReports() {
  const db = await loadDb();
  return [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getMetrics() {
  const db = await loadDb();
  return computeMetrics(db);
}

export async function getAccount(address: string) {
  const db = await loadDb();
  const normalizedAddress = normalizeAddress(address);
  return db.accounts.find((account) => normalizeAddress(account.address) === normalizedAddress) ?? null;
}

export async function getAccountByUsername(username: string) {
  const db = await loadDb();
  const normalized = normalizeUsernameInput(username);
  if (!normalized) return null;

  return (
    db.accounts.find(
      (account) => normalizeUsernameInput(account.username || account.handle) === normalized,
    ) ?? null
  );
}

export async function getAccounts() {
  const db = await loadDb();
  return [...db.accounts].sort((a, b) => {
    const aTime = new Date(a.lastActiveAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.lastActiveAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  });
}

export async function updateAccountModeration(input: {
  address: string;
  banned?: boolean;
  bannedReason?: string | null;
  bannedUntil?: string | null;
  bannedBy?: string | null;
  treasuryFeeBps?: number;
  moderationNotes?: string | null;
}) {
  const db = await loadDb();
  const normalizedAddress = normalizeAddress(input.address);
  const account = db.accounts.find((item) => normalizeAddress(item.address) === normalizedAddress);
  if (!account) return null;

  if (typeof input.banned === "boolean") {
    account.isBanned = input.banned;
    if (input.banned) {
      account.bannedAt = timestamp();
      account.bannedReason = input.bannedReason?.trim() || "Policy violation";
      account.bannedBy = input.bannedBy?.trim() || undefined;
      account.bannedUntil = input.bannedUntil?.trim() || undefined;

      for (const video of db.videos) {
        if (normalizeAddress(video.ownerAddress) !== normalizedAddress) continue;
        video.visibility = "private";
        video.status = "hidden";
        video.updatedAt = timestamp();
        resolveReportsForVideo(db, video.id);
      }
    } else {
      account.bannedAt = undefined;
      account.bannedReason = undefined;
      account.bannedBy = undefined;
      account.bannedUntil = undefined;
    }
  }

  if (input.banned === true && input.bannedReason !== undefined) {
    account.bannedReason = input.bannedReason?.trim() || "Policy violation";
  }

  if (input.banned === true && input.bannedUntil !== undefined) {
    account.bannedUntil = input.bannedUntil?.trim() || undefined;
  }

  if (input.moderationNotes !== undefined) {
    account.moderationNotes = input.moderationNotes?.trim() || undefined;
  }

  if (input.treasuryFeeBps !== undefined) {
    account.treasuryFeeBps = Math.max(0, Math.min(10_000, Math.floor(Number(input.treasuryFeeBps) || 0)));
  }

  account.lastActiveAt = timestamp();
  await saveDb(db);
  return account;
}

function resolveWatchLaterVideos(db: Database, userAddress: string) {
  const normalizedAddress = normalizeAddress(userAddress);
  if (!normalizedAddress) return [];

  const saved = [...db.videoBookmarks]
    .filter((record) => normalizeAddress(record.userAddress) === normalizedAddress)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const seen = new Set<string>();
  const watchLater: VideoRecord[] = [];

  for (const record of saved) {
    if (!record.videoId || seen.has(record.videoId)) continue;
    const video = db.videos.find((item) => item.id === record.videoId);
    if (!video) continue;

    const ownsVideo = normalizeAddress(video.ownerAddress) === normalizedAddress;
    const visibleToViewer = isPublishedWatchRelease(video);
    if (!ownsVideo && !visibleToViewer) continue;

    watchLater.push(video);
    seen.add(record.videoId);
  }

  return watchLater;
}

export async function getVideoBookmarkStatus(input: { videoId: string; userAddress: string }) {
  const db = await loadDb();
  const videoId = input.videoId.trim();
  const userAddress = normalizeAddress(input.userAddress);
  if (!videoId || !userAddress) return false;

  return db.videoBookmarks.some(
    (record) => record.videoId === videoId && normalizeAddress(record.userAddress) === userAddress,
  );
}

export async function setVideoBookmark(input: { videoId: string; userAddress: string; saved?: boolean }) {
  const db = await loadDb();
  const videoId = input.videoId.trim();
  const userAddress = normalizeAddress(input.userAddress);
  if (!videoId || !userAddress) return null;

  const actor = assertAccountCanAct(db, userAddress, "save videos");

  const video = db.videos.find((item) => item.id === videoId);
  if (!video) return null;

  const matches = db.videoBookmarks.filter(
    (record) => record.videoId === videoId && normalizeAddress(record.userAddress) === userAddress,
  );
  const desiredSaved = typeof input.saved === "boolean" ? input.saved : !matches.length;

  db.videoBookmarks = db.videoBookmarks.filter(
    (record) => !(record.videoId === videoId && normalizeAddress(record.userAddress) === userAddress),
  );

  if (desiredSaved) {
    db.videoBookmarks.unshift(
      normalizeVideoBookmarkRecord({
        videoId,
        userAddress,
      }),
    );
  }

  const changed = desiredSaved ? matches.length !== 1 : matches.length !== 0;
  if (changed) {
    if (actor) {
      actor.lastActiveAt = timestamp();
    }
    await saveDb(db);
  }

  return { video, saved: desiredSaved };
}

export async function getWatchLaterVideos(userAddress: string) {
  const db = await loadDb();
  return resolveWatchLaterVideos(db, userAddress);
}

export async function getBlobComments(blobId: string, limit = 100) {
  const db = await loadDb();
  return [...db.blobComments]
    .filter((comment) => comment.blobId === blobId)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt.localeCompare(a.createdAt);
    })
    .slice(0, Math.max(1, limit));
}

export async function setBlobLike(input: { blobId: string; userAddress: string; liked?: boolean }) {
  const db = await loadDb();
  const blobId = input.blobId.trim();
  const userAddress = normalizeAddress(input.userAddress);
  const actor = assertAccountCanAct(db, userAddress, "like blobs");
  const video = db.videos.find((item) => item.id === blobId);
  if (!video) return null;

  const matches = db.blobLikes.filter((record) => record.blobId === blobId && normalizeAddress(record.userAddress) === userAddress);
  const desiredLiked = typeof input.liked === "boolean" ? input.liked : !matches.length;

  db.blobLikes = db.blobLikes.filter(
    (record) => !(record.blobId === blobId && normalizeAddress(record.userAddress) === userAddress),
  );

  if (desiredLiked) {
    db.blobLikes.unshift(
      normalizeBlobLikeRecord({
        blobId,
        userAddress,
      }),
    );
  }

  const delta = desiredLiked ? 1 - matches.length : -matches.length;
  if (delta !== 0) {
    video.likes = Math.max(0, video.likes + delta);
  }

  if (delta !== 0 || matches.length > 1) {
    video.updatedAt = timestamp();
    if (actor) {
      actor.lastActiveAt = timestamp();
    }
    await saveDb(db);
  }

  return { video, liked: desiredLiked };
}

export async function setBlobFollow(input: { blobId: string; userAddress: string; followed?: boolean }) {
  const db = await loadDb();
  const blobId = input.blobId.trim();
  const userAddress = normalizeAddress(input.userAddress);
  const actor = assertAccountCanAct(db, userAddress, "follow creators");
  const video = db.videos.find((item) => item.id === blobId);
  if (!video) return null;

  const creatorAddress = normalizeAddress(video.ownerAddress);
  const matches = db.blobFollows.filter(
    (record) => normalizeAddress(record.creatorAddress) === creatorAddress && normalizeAddress(record.userAddress) === userAddress,
  );
  const desiredFollowed = typeof input.followed === "boolean" ? input.followed : !matches.length;

  db.blobFollows = db.blobFollows.filter(
    (record) => !(normalizeAddress(record.creatorAddress) === creatorAddress && normalizeAddress(record.userAddress) === userAddress),
  );

  const creator = db.accounts.find((account) => normalizeAddress(account.address) === creatorAddress);

  if (desiredFollowed) {
    db.blobFollows.unshift(
      normalizeBlobFollowRecord({
        blobId,
        creatorAddress,
        userAddress,
      }),
    );
  }

  const delta = desiredFollowed ? 1 - matches.length : -matches.length;
  if (creator && delta !== 0) {
    creator.followers = Math.max(0, (creator.followers ?? 0) + delta);
    creator.followersCount = creator.followers;
    creator.lastActiveAt = timestamp();
  } else if (creator && matches.length > 1) {
    creator.lastActiveAt = timestamp();
  }

  if (actor && delta !== 0) {
    actor.following = Math.max(0, (actor.following ?? actor.followingCount ?? 0) + delta);
    actor.followingCount = actor.following;
    actor.lastActiveAt = timestamp();
  } else if (actor && matches.length > 1) {
    actor.lastActiveAt = timestamp();
  }

  if (delta !== 0 || matches.length > 1) {
    video.updatedAt = timestamp();
    if (actor) {
      actor.lastActiveAt = timestamp();
    }
    await saveDb(db);
  }

  return { video, followed: desiredFollowed, followers: creator?.followersCount ?? creator?.followers ?? 0 };
}

export async function addBlobComment(input: { blobId: string; authorAddress: string; body: string }) {
  const db = await loadDb();
  const blobId = input.blobId.trim();
  const authorAddress = normalizeAddress(input.authorAddress);
  const account = assertAccountCanAct(db, authorAddress, "comment on blobs");
  const video = db.videos.find((item) => item.id === blobId);
  if (!video) return null;
  const authorName = account?.displayName?.trim() || shortAddress(authorAddress, 4);
  const authorHandle =
    account?.handle?.trim()
      ? account.handle.startsWith("@")
        ? account.handle
        : `@${account.handle}`
      : `@${shortAddress(authorAddress.replace(/^0x/, ""), 4)}`;
  const comment = normalizeBlobCommentRecord({
    blobId,
    authorAddress,
    authorName,
    authorHandle,
    authorAvatar: account?.avatarSeed?.trim() || initialsFromName(authorName),
    body: input.body.trim(),
  });

  db.blobComments.unshift(comment);
  video.comments = Math.max(0, video.comments + 1);
  video.updatedAt = timestamp();

  if (account) {
    account.lastActiveAt = timestamp();
  }

  await saveDb(db);
  return { video, comment };
}

export async function createUpload(input: {
  file: File;
  thumbnail?: ThumbnailUploadInput;
  title: string;
  description: string;
  tags: string[];
  category: string;
  visibility: VideoVisibility;
  ownerAddress: string;
  ownerName: string;
  walletMode: WalletMode;
  publishNow: boolean;
  treasuryFeeSui: number;
  storageOwnerAddress?: string;
  storageDays?: number;
  monetization?: VideoRecord["monetization"];
}) {
  const db = await loadDb();
  assertAccountCanAct(db, input.ownerAddress, "upload videos");
  const createdAt = timestamp();
  const id = crypto.randomUUID();
  const slug = `${slugify(input.title)}-${id.slice(0, 6)}`;
  const extension = guessExtension(input.file.name, input.file.type);
  const sealedPath = join("data", "walrus", `${id}${extension}.sealed`);
  const sealedAbsolutePath = join(/* turbopackIgnore: true */ process.cwd(), sealedPath);
  const fileBytes = Buffer.from(await input.file.arrayBuffer());
  const sealedBytes = sealBuffer(fileBytes, id);
  const thumbnailAsset = await storeThumbnailAsset(id, input.thumbnail);

  await ensureStorage();
  await writeFile(sealedAbsolutePath, sealedBytes);

  const account = await upsertAccount(db, {
    address: input.ownerAddress,
    displayName: input.ownerName,
    mode: input.walletMode,
    storageDeltaBytes: fileBytes.length,
  });

  const cover = chooseCover(input.category);
  const storageOwnerAddress = normalizeAddress(input.storageOwnerAddress ?? input.ownerAddress);
  const storageDays = Math.max(1, Math.min(730, Math.floor(input.storageDays ?? DEFAULT_STORAGE_DAYS)));
  const video: VideoRecord = {
    id,
    slug,
    title: input.title,
    description: input.description,
    tags: input.tags,
    category: input.category,
    visibility: input.visibility,
    status: input.publishNow ? "published" : "draft",
    ownerAddress: account.address,
    ownerName: account.displayName,
    creatorId: account.id,
    creatorUsername: account.username,
    creatorDisplayName: account.displayName,
    creatorAvatarUrl: account.avatarUrl,
    thumbnailUrl: thumbnailAsset ? `/api/videos/${id}/thumbnail` : undefined,
    coverFrom: cover.from,
    coverVia: cover.via,
    coverTo: cover.to,
    duration: "0:00",
    createdAt,
    updatedAt: createdAt,
    publishedAt: input.publishNow ? createdAt : undefined,
    storageExpiresAt: calculateVideoStorageExpiry(createdAt, storageDays),
    monetization: normalizeVideoMonetization(input.monetization),
    views: 0,
    comments: 0,
    likes: 0,
    tips: 0,
    subscribers: 0,
    reportedCount: 0,
    asset: {
      storageMode: "local",
      storageOwnerAddress,
      storageStartedAt: createdAt,
      storageExpiresAt: calculateVideoStorageExpiry(createdAt, storageDays),
      storageRenewedAt: createdAt,
      storageRenewalDays: storageDays,
      storageRenewalFeeSui: input.treasuryFeeSui,
      storageMaxExtensionDays: 730,
      walrusUri: `walrus://${id}`,
      sealedPath,
      thumbnailPath: thumbnailAsset?.path,
      thumbnailContentType: thumbnailAsset?.contentType,
      originalName: input.file.name,
      contentType: input.file.type || "application/octet-stream",
      sizeBytes: fileBytes.length,
      sealedAt: createdAt,
      encryption: "seal-aes256-gcm",
    },
  };

  db.videos.unshift(video);
  account.uploadsPublished = (account.uploadsPublished ?? 0) + 1;
  const ownerVideos = db.videos.filter((item) => item.ownerAddress === account.address);
  account.totalVideos = ownerVideos.length;
  account.totalBlobs = ownerVideos.filter(isBlobVideoForCreator).length;
  account.totalViews = ownerVideos.reduce((sum, item) => sum + (Number(item.views) || 0), 0);
  db.metrics.uploadsToday += 1;
  db.metrics.storageUsedBytes = db.accounts.reduce((sum, item) => sum + item.storageUsedBytes, 0);
  db.metrics.creatorCount = db.accounts.length;
  db.metrics.reportsOpen = db.reports.filter((report) => report.status === "open").length;
  db.metrics.treasuryCollectedSui += input.treasuryFeeSui;
  db.metrics.uploadFeesCollectedSui += input.treasuryFeeSui;

  await saveDb(db);

  return {
    video,
    account,
  };
}

export async function persistUploadRecord(input: {
  title: string;
  description: string;
  tags: string[];
  category: string;
  visibility: VideoVisibility;
  publishNow: boolean;
  durationSeconds?: number;
  ownerAddress: string;
  ownerName: string;
  walletMode: WalletMode;
  treasuryFeeSui: number;
  policyPackageId?: string;
  policyObjectId: string;
  capObjectId: string;
  policyNonce: string;
  uploadTxDigest: string;
  asset: VideoAsset;
  thumbnail?: ThumbnailUploadInput;
  storageOwnerAddress?: string;
  storageDays?: number;
  monetization?: VideoRecord["monetization"];
}) {
  const db = await loadDb();
  assertAccountCanAct(db, input.ownerAddress, "publish uploads");
  const createdAt = timestamp();
  const id = crypto.randomUUID();
  const slug = `${slugifyText(input.title)}-${id.slice(0, 6)}`;
  const cover = chooseCover(input.category);
  const thumbnailAsset = await storeThumbnailAsset(id, input.thumbnail);
  const storageOwnerAddress = normalizeAddress(input.storageOwnerAddress ?? input.ownerAddress);
  const asset = normalizeVideoAsset(
    {
      ...input.asset,
      thumbnailPath: thumbnailAsset?.path ?? input.asset.thumbnailPath,
      thumbnailContentType: thumbnailAsset?.contentType ?? input.asset.thumbnailContentType,
      storageMode: "walrus",
      storageOwnerAddress,
      storageStartedAt: input.asset.storageStartedAt ?? createdAt,
      storageExpiresAt:
        input.asset.storageExpiresAt ||
        calculateVideoStorageExpiry(createdAt, Math.max(1, Math.min(730, Math.floor(input.storageDays ?? DEFAULT_STORAGE_DAYS)))),
      storageRenewedAt: input.asset.storageRenewedAt ?? createdAt,
      storageRenewalDays: input.asset.storageRenewalDays ?? input.storageDays ?? DEFAULT_STORAGE_DAYS,
      storageRenewalFeeSui: input.asset.storageRenewalFeeSui ?? input.treasuryFeeSui,
      storageMaxExtensionDays: input.asset.storageMaxExtensionDays ?? 730,
    },
    storageOwnerAddress,
    createdAt,
  );

  const account = await upsertAccount(db, {
    address: input.ownerAddress,
    displayName: input.ownerName,
    mode: input.walletMode,
    storageDeltaBytes: asset?.sizeBytes,
  });

  const video: VideoRecord = {
    id,
    slug,
    title: input.title,
    description: input.description,
    tags: input.tags,
    category: input.category,
    visibility: input.visibility,
    status: input.publishNow ? "published" : "draft",
    policyStatus: input.publishNow ? "published" : "draft",
    policyVisibility: input.visibility,
    policyObjectId: input.policyObjectId,
    capObjectId: input.capObjectId,
    policyNonce: input.policyNonce,
    uploadTxDigest: input.uploadTxDigest,
    ownerAddress: account.address,
    ownerName: account.displayName,
    creatorId: account.id,
    creatorUsername: account.username,
    creatorDisplayName: account.displayName,
    creatorAvatarUrl: account.avatarUrl,
    thumbnailUrl: asset?.thumbnailPath ? `/api/videos/${id}/thumbnail` : undefined,
    coverFrom: cover.from,
    coverVia: cover.via,
    coverTo: cover.to,
    duration: formatDurationFromSeconds(Number(input.durationSeconds) || 0),
    createdAt,
    updatedAt: createdAt,
    publishedAt: input.publishNow ? createdAt : undefined,
    storageExpiresAt: asset?.storageExpiresAt,
    policyPackageId: input.policyPackageId,
    monetization: normalizeVideoMonetization(input.monetization),
    views: 0,
    comments: 0,
    likes: 0,
    tips: 0,
    subscribers: 0,
    reportedCount: 0,
    asset,
  };

  db.videos.unshift(video);
  account.uploadsPublished = (account.uploadsPublished ?? 0) + 1;
  const ownerVideos = db.videos.filter((item) => item.ownerAddress === account.address);
  account.totalVideos = ownerVideos.length;
  account.totalBlobs = ownerVideos.filter(isBlobVideoForCreator).length;
  account.totalViews = ownerVideos.reduce((sum, item) => sum + (Number(item.views) || 0), 0);
  db.metrics.uploadsToday += 1;
  db.metrics.storageUsedBytes = db.accounts.reduce((sum, item) => sum + item.storageUsedBytes, 0);
  db.metrics.creatorCount = db.accounts.length;
  db.metrics.reportsOpen = db.reports.filter((report) => report.status === "open").length;
  db.metrics.treasuryCollectedSui += input.treasuryFeeSui;
  db.metrics.uploadFeesCollectedSui += input.treasuryFeeSui;

  await saveDb(db);

  return {
    video,
    account,
  };
}

export async function updateVideoStatus(
  id: string,
  input: {
    visibility?: VideoVisibility;
    status?: VideoStatus;
    title?: string;
    description?: string;
  },
) {
  const db = await loadDb();
  const video = db.videos.find((item) => item.id === id);
  if (!video) return null;

  if (input.visibility) video.visibility = input.visibility;
  if (input.status) video.status = input.status;
  if (input.title) video.title = input.title;
  if (input.description) video.description = input.description;
  if (video.status === "published" && !video.publishedAt) video.publishedAt = timestamp();
  if (input.visibility === "private" || input.status === "hidden") {
    resolveReportsForVideo(db, id);
  }
  video.updatedAt = timestamp();
  await saveDb(db);
  return video;
}

export async function removeVideo(id: string) {
  const db = await loadDb();
  const index = db.videos.findIndex((video) => video.id === id);
  if (index === -1) return false;

  resolveReportsForVideo(db, id);
  const [video] = db.videos.splice(index, 1);
  db.videoBookmarks = db.videoBookmarks.filter((record) => record.videoId !== id);
  if (video?.asset?.sealedPath) {
    const sealedAbsolutePath = join(/* turbopackIgnore: true */ process.cwd(), video.asset.sealedPath);
    try {
      await unlink(sealedAbsolutePath);
    } catch {
      // Ignore missing sealed bundles in local development.
    }
  }
  if (video?.asset?.thumbnailPath) {
    const thumbnailAbsolutePath = join(/* turbopackIgnore: true */ process.cwd(), video.asset.thumbnailPath);
    try {
      await unlink(thumbnailAbsolutePath);
    } catch {
      // Ignore missing thumbnails in local development.
    }
  }

  if (video?.asset) {
    const account = db.accounts.find((item) => item.address === video.ownerAddress);
    if (account) {
      account.storageUsedBytes = Math.max(0, account.storageUsedBytes - video.asset.sizeBytes);
      const ownerVideos = db.videos.filter((item) => item.ownerAddress === account.address);
      account.totalVideos = ownerVideos.length;
      account.totalBlobs = ownerVideos.filter(isBlobVideoForCreator).length;
      account.totalViews = ownerVideos.reduce((sum, item) => sum + (Number(item.views) || 0), 0);
    }
  }

  db.metrics.storageUsedBytes = db.accounts.reduce((sum, account) => sum + account.storageUsedBytes, 0);
  await saveDb(db);
  return true;
}

export async function recordReaction(
  id: string,
  type: "like" | "tip" | "subscribe",
  amount = 1,
  input?: {
    platformFeeSui?: number;
    actorAddress?: string;
  },
) {
  const db = await loadDb();
  const actorAddress = normalizeAddress(input?.actorAddress);
  const actor = actorAddress ? assertAccountCanAct(db, actorAddress, `${type} videos`) : null;
  const video = db.videos.find((item) => item.id === id);
  if (!video) return null;

  if (type === "like") video.likes += amount;
  if (type === "tip") {
    video.tips += amount;
    const platformFeeSui = Number(input?.platformFeeSui) || 0;
    db.metrics.treasuryCollectedSui += platformFeeSui;
    db.metrics.tipFeesCollectedSui += platformFeeSui;
  }
  if (type === "subscribe") video.subscribers += amount;

  const account = db.accounts.find((item) => item.address === video.ownerAddress);
  if (account) {
    if (type === "tip") {
      account.totalTips = (account.totalTips ?? 0) + amount;
    }

    if (type === "subscribe") {
      account.followers = (account.followers ?? 0) + amount;
      account.followersCount = account.followers;
    }
  }

  if (actor) {
    actor.lastActiveAt = timestamp();
  }

  video.updatedAt = timestamp();
  await saveDb(db);
  return video;
}

export async function createReport(input: {
  videoId: string;
  reporter: string;
  reporterAddress?: string;
  reason: string;
  detail: string;
  severity: "low" | "medium" | "high";
}) {
  const db = await loadDb();
  if (input.reporterAddress) {
    assertAccountCanAct(db, input.reporterAddress, "submit reports");
  }
  const video = db.videos.find((item) => item.id === input.videoId);
  if (!video) return null;

  const report: ReportRecord = {
    id: crypto.randomUUID(),
    videoId: video.id,
    videoTitle: video.title,
    contentType: classifyReportContentType(video),
    reason: input.reason,
    detail: input.detail,
    severity: input.severity,
    status: "open",
    reporter: input.reporterAddress ? normalizeAddress(input.reporterAddress) : input.reporter,
    createdAt: timestamp(),
  };

  video.reportedCount += 1;
  db.reports.unshift(report);
  db.metrics.reportsOpen = db.reports.filter((item) => item.status === "open").length;
  await saveDb(db);
  return report;
}

export async function resolveReport(id: string) {
  const db = await loadDb();
  const report = db.reports.find((item) => item.id === id);
  if (!report) return null;

  report.status = "resolved";
  db.metrics.reportsOpen = db.reports.filter((item) => item.status === "open").length;
  await saveDb(db);
  return report;
}

export async function getPlatformSettings() {
  const db = await loadDb();
  return db.settings;
}

export async function updatePlatformSettings(patch: Partial<PlatformSettings>) {
  const db = await loadDb();
  db.settings = mergePlatformSettings(db.settings, patch);
  await saveDb(db);
  return db.settings;
}

export async function renewAccount(address: string, additionalDays = 30) {
  const db = await loadDb();
  const normalizedAddress = normalizeAddress(address);
  const account = db.accounts.find((item) => normalizeAddress(item.address) === normalizedAddress);
  if (!account) return null;
  assertAccountCanAct(db, normalizedAddress, "renew storage");

  account.renewalAt = new Date(
    Math.max(Date.now(), new Date(account.renewalAt).getTime()) +
      1000 * 60 * 60 * 24 * additionalDays,
  ).toISOString();
  await saveDb(db);
  return account;
}

export async function renewVideoStorage(input: {
  videoId: string;
  days: number;
  ownerAddress?: string;
  platformFeeSui?: number;
}) {
  const db = await loadDb();
  const video = db.videos.find((item) => item.id === input.videoId);
  if (!video) return null;
  if (input.ownerAddress && normalizeAddress(video.ownerAddress) !== normalizeAddress(input.ownerAddress)) return null;
  assertAccountCanAct(db, input.ownerAddress ?? video.ownerAddress, "renew video storage");

  const now = timestamp();
  const days = Math.max(1, Math.min(db.settings.fees.maxStorageExtensionDays, Math.floor(input.days)));
  const currentExpiry = video.asset?.storageExpiresAt ? new Date(video.asset.storageExpiresAt).getTime() : Date.now();
  const nextBase = Math.max(Date.now(), currentExpiry);
  const nextExpiry = new Date(nextBase + days * 24 * 60 * 60 * 1000).toISOString();

  if (video.asset) {
    video.asset.storageStartedAt = video.asset.storageStartedAt || video.createdAt;
    video.asset.storageExpiresAt = nextExpiry;
    video.asset.storageRenewedAt = now;
    video.asset.storageRenewalDays = days;
    video.asset.storageRenewalFeeSui = Number(input.platformFeeSui) || video.asset.storageRenewalFeeSui || 0;
    video.asset.storageMaxExtensionDays = db.settings.fees.maxStorageExtensionDays;
    video.asset.storageOwnerAddress = video.asset.storageOwnerAddress || video.ownerAddress;
  }

  video.storageExpiresAt = nextExpiry;
  video.updatedAt = now;

  const account = db.accounts.find((item) => normalizeAddress(item.address) === normalizeAddress(video.ownerAddress));
  if (account) {
    const ownedVideos = db.videos.filter(
      (item) => normalizeAddress(item.ownerAddress) === normalizeAddress(account.address) && item.asset?.storageExpiresAt,
    );
    const earliestExpiry = ownedVideos
      .map((item) => new Date(item.asset!.storageExpiresAt!).getTime())
      .sort((a, b) => a - b)[0];
    account.renewalAt = new Date(earliestExpiry ?? nextExpiry).toISOString();
    account.lastActiveAt = now;
  }

  db.metrics.storageFeesCollectedSui += Number(input.platformFeeSui) || 0;
  db.metrics.treasuryCollectedSui += Number(input.platformFeeSui) || 0;
  await saveDb(db);

  return {
    video,
    account: account ?? null,
  };
}

export async function getDashboardSnapshot(address?: string) {
  const db = await loadDb();
  const normalizedAddress = normalizeAddress(address);
  const owned = normalizedAddress
    ? db.videos.filter((video) => normalizeAddress(video.ownerAddress) === normalizedAddress)
    : [];
  const watchLaterVideos = normalizedAddress ? resolveWatchLaterVideos(db, normalizedAddress) : [];
  return {
    metrics: computeMetrics(db),
    videos: owned,
    watchLaterVideos,
    account: normalizedAddress
      ? db.accounts.find((item) => normalizeAddress(item.address) === normalizedAddress) ?? null
      : null,
    reports: db.reports.filter((item) => item.status === "open"),
    settings: db.settings,
    storageHealth: calculateStorageHealthSummary({
      videos: owned,
      settings: db.settings,
    }),
  };
}

export async function streamVideo(
  id: string,
  options?: {
    viewerAddress?: string;
    adminAddress?: string;
  },
) {
  const video = await getVideo(id);
  if (!video?.asset) {
    return null;
  }

  const normalizedViewerAddress = normalizeAddress(options?.viewerAddress);
  const isOwner = Boolean(normalizedViewerAddress) && normalizeAddress(video.ownerAddress) === normalizedViewerAddress;
  const isAdmin = Boolean(options?.adminAddress && isAdminAddress(options.adminAddress));
  const isPublic = video.visibility === "public" && video.status !== "hidden";
  const isPaidWalrusRelease =
    video.status === "published" &&
    isPaidVideoMonetization(video.monetization) &&
    video.asset?.storageMode === "walrus";

  if (!isPublic && !isPaidWalrusRelease && !isOwner && !isAdmin) {
    return null;
  }

  if (video.asset.storageMode === "walrus" && video.asset.walrusBlobId) {
    const { readWalrusBlob } = await import("@/lib/walrus-storage");
    const encryptedBytes = await readWalrusBlob(video.asset.walrusBlobId);
    return {
      video,
      bytes: encryptedBytes,
      contentType: "application/octet-stream",
      encrypted: true,
    };
  }

  return {
    video,
    bytes: video.asset.sealedPath
      ? openBuffer(await readFile(join(/* turbopackIgnore: true */ process.cwd(), video.asset.sealedPath)), video.id)
      : Buffer.alloc(0),
    contentType: video.asset.contentType || "video/mp4",
    encrypted: false,
  };
}

export function summarizeStorage(bytes: number) {
  return formatBytes(bytes);
}
