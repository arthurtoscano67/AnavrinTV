import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import crypto from "node:crypto";

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
import type {
  Database,
  BlobCommentRecord,
  BlobFollowRecord,
  BlobLikeRecord,
  ReportRecord,
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
const DB_FILE = join(DATA_DIR, "anavrin-db.json");
let bootstrapPromise: Promise<Database> | null = null;
const DEFAULT_STORAGE_DAYS = 30;
const DEFAULT_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024 * 1024;

async function ensureStorage() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(WALRUS_DIR, { recursive: true });
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
  return {
    id:
      account.id ??
      `acct-${slugify(account.displayName)}-${shortAddress(account.address, 4).replace(/…/g, "")}`,
    displayName: account.displayName || "Creator",
    address: account.address,
    mode: account.mode,
    avatarSeed: account.avatarSeed || account.displayName.slice(0, 2).toUpperCase() || "AT",
    handle: account.handle,
    bio: account.bio,
    avatarUrl: account.avatarUrl,
    storageLimitBytes: Number(account.storageLimitBytes) || DEFAULT_STORAGE_LIMIT_BYTES,
    storageUsedBytes: Number(account.storageUsedBytes) || 0,
    treasuryFeeBps: Number(account.treasuryFeeBps) || 0,
    renewalAt: account.renewalAt || new Date(Date.now() + 1000 * 60 * 60 * 24 * DEFAULT_STORAGE_DAYS).toISOString(),
    createdAt: account.createdAt || now,
    lastActiveAt: account.lastActiveAt || now,
    uploadsPublished: Number(account.uploadsPublished) || 0,
    totalViews: Number(account.totalViews) || 0,
    totalTips: Number(account.totalTips) || 0,
    followers: Number(account.followers) || 0,
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

function normalizeVideoRecord(video: Partial<VideoRecord> & Pick<VideoRecord, "id" | "title" | "ownerAddress" | "ownerName">): VideoRecord {
  const createdAt = video.createdAt || timestamp();
  const asset = normalizeVideoAsset(video.asset ?? null, video.ownerAddress, createdAt);
  return {
    id: video.id,
    slug: video.slug || slugifyText(video.title || video.id),
    title: video.title || "Untitled video",
    description: video.description || "",
    tags: Array.isArray(video.tags) ? video.tags : [],
    category: video.category || "Launches",
    visibility: video.visibility || "draft",
    status: video.status || "draft",
    ownerAddress: video.ownerAddress,
    ownerName: video.ownerName || "Creator",
    coverFrom: video.coverFrom || "#22d3ee",
    coverVia: video.coverVia || "#3b82f6",
    coverTo: video.coverTo || "#0f172a",
    duration: video.duration || "0:00",
    createdAt,
    updatedAt: video.updatedAt || createdAt,
    publishedAt: video.publishedAt,
    policyObjectId: video.policyObjectId,
    capObjectId: video.capObjectId,
    policyStatus: video.policyStatus,
    policyVisibility: video.policyVisibility,
    policyNonce: video.policyNonce,
    uploadTxDigest: video.uploadTxDigest,
    storageExpiresAt: video.storageExpiresAt || asset?.storageExpiresAt,
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
  const accounts = Array.isArray(db.accounts)
    ? db.accounts.map((account) =>
        normalizeAccountRecord({
          ...(account ?? {}),
          address: account.address ?? "0x0",
          displayName: account.displayName ?? "Creator",
          mode: account.mode ?? "wallet",
        }),
      )
    : [];
  const videos = Array.isArray(db.videos)
    ? db.videos.map((video) =>
        normalizeVideoRecord({
          ...(video ?? {}),
          id: video.id ?? crypto.randomUUID(),
          title: video.title ?? "Untitled video",
          ownerAddress: video.ownerAddress ?? "0x0",
          ownerName: video.ownerName ?? "Creator",
        }),
      )
    : [];
  const reports = Array.isArray(db.reports)
    ? db.reports.map((report) => ({
        id: report.id ?? crypto.randomUUID(),
        videoId: report.videoId ?? "",
        videoTitle: report.videoTitle ?? "Unknown video",
        reason: report.reason ?? "Needs review",
        detail: report.detail ?? "",
        severity: (report.severity as ReportRecord["severity"]) ?? "low",
        status: (report.status as ReportRecord["status"]) ?? "open",
        reporter: report.reporter ?? "viewer",
        createdAt: report.createdAt ?? timestamp(),
      }))
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
}) {
  const createdAt = timestamp();
  return {
    id: `acct-${slugify(input.displayName)}-${shortAddress(input.address, 4).replace(/…/g, "")}`,
    displayName: input.displayName,
    address: input.address,
    mode: input.mode,
    avatarSeed: input.displayName.slice(0, 2).toUpperCase() || "AT",
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
    userAddress: record.userAddress,
    createdAt: record.createdAt ?? timestamp(),
  };
}

function normalizeBlobFollowRecord(
  record: Partial<BlobFollowRecord> & Pick<BlobFollowRecord, "blobId" | "creatorAddress" | "userAddress">,
): BlobFollowRecord {
  return {
    id: record.id ?? crypto.randomUUID(),
    blobId: record.blobId,
    creatorAddress: record.creatorAddress,
    userAddress: record.userAddress,
    createdAt: record.createdAt ?? timestamp(),
  };
}

function normalizeBlobCommentRecord(
  record: Partial<BlobCommentRecord> &
    Pick<BlobCommentRecord, "blobId" | "authorAddress" | "authorName" | "authorHandle" | "authorAvatar" | "body">,
): BlobCommentRecord {
  const authorName = record.authorName?.trim() || "Creator";
  const authorAddress = record.authorAddress?.trim() || "0x0";
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
    "application/octet-stream": ".bin",
  };

  return contentMap[contentType] ?? ".bin";
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
) {
  const existing = db.accounts.find((account) => account.address === input.address);
  if (existing) {
    existing.displayName = input.displayName;
    existing.mode = input.mode;
    existing.storageUsedBytes += input.storageDeltaBytes ?? 0;
    existing.renewalAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
    existing.lastActiveAt = timestamp();
    return existing;
  }

  const account = createAccountRecord({
    address: input.address,
    displayName: input.displayName,
    mode: input.mode,
    storageUsedBytes: input.storageDeltaBytes ?? 0,
  });

  db.accounts.push(account);
  return account;
}

export async function updateAccountProfile(
  address: string,
  input: {
    displayName?: string;
    handle?: string;
    bio?: string;
    avatarUrl?: string;
    mode?: WalletMode;
  },
) {
  const db = await loadDb();
  let account = db.accounts.find((item) => item.address === address);

  if (!account) {
    account = createAccountRecord({
      address,
      displayName: input.displayName ?? "Creator",
      mode: input.mode ?? "wallet",
    });
    db.accounts.push(account);
  }

  if (typeof input.displayName === "string" && input.displayName.trim()) {
    account.displayName = input.displayName.trim();
  }

  if (input.handle !== undefined) {
    account.handle = input.handle.trim() || undefined;
  }

  if (input.bio !== undefined) {
    account.bio = input.bio.trim() || undefined;
  }

  if (input.avatarUrl !== undefined) {
    account.avatarUrl = input.avatarUrl.trim() || undefined;
  }

  if (input.mode) {
    account.mode = input.mode;
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

  return db.videos
    .filter((video) => {
      if (options?.ownerAddress && video.ownerAddress !== options.ownerAddress) return false;
      if (options?.publicOnly && video.visibility !== "public") return false;
      if (!options?.includeDrafts && video.status === "hidden") return false;
      if (options?.category && options.category !== "All" && video.category !== options.category) return false;
      if (q) {
        const searchable = [
          video.title,
          video.description,
          video.ownerName,
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
  return db.accounts.find((account) => account.address === address) ?? null;
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
  const video = db.videos.find((item) => item.id === input.blobId);
  if (!video) return null;
  const actor = db.accounts.find((account) => account.address === input.userAddress);

  const matches = db.blobLikes.filter((record) => record.blobId === input.blobId && record.userAddress === input.userAddress);
  const desiredLiked = typeof input.liked === "boolean" ? input.liked : !matches.length;

  db.blobLikes = db.blobLikes.filter(
    (record) => !(record.blobId === input.blobId && record.userAddress === input.userAddress),
  );

  if (desiredLiked) {
    db.blobLikes.unshift(
      normalizeBlobLikeRecord({
        blobId: input.blobId,
        userAddress: input.userAddress,
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
  const video = db.videos.find((item) => item.id === input.blobId);
  if (!video) return null;
  const actor = db.accounts.find((account) => account.address === input.userAddress);

  const creatorAddress = video.ownerAddress;
  const matches = db.blobFollows.filter(
    (record) => record.creatorAddress === creatorAddress && record.userAddress === input.userAddress,
  );
  const desiredFollowed = typeof input.followed === "boolean" ? input.followed : !matches.length;

  db.blobFollows = db.blobFollows.filter(
    (record) => !(record.creatorAddress === creatorAddress && record.userAddress === input.userAddress),
  );

  const creator = db.accounts.find((account) => account.address === creatorAddress);

  if (desiredFollowed) {
    db.blobFollows.unshift(
      normalizeBlobFollowRecord({
        blobId: input.blobId,
        creatorAddress,
        userAddress: input.userAddress,
      }),
    );
  }

  const delta = desiredFollowed ? 1 - matches.length : -matches.length;
  if (creator && delta !== 0) {
    creator.followers = Math.max(0, (creator.followers ?? 0) + delta);
    creator.lastActiveAt = timestamp();
  } else if (creator && matches.length > 1) {
    creator.lastActiveAt = timestamp();
  }

  if (delta !== 0 || matches.length > 1) {
    video.updatedAt = timestamp();
    if (actor) {
      actor.lastActiveAt = timestamp();
    }
    await saveDb(db);
  }

  return { video, followed: desiredFollowed, followers: creator?.followers ?? 0 };
}

export async function addBlobComment(input: { blobId: string; authorAddress: string; body: string }) {
  const db = await loadDb();
  const video = db.videos.find((item) => item.id === input.blobId);
  if (!video) return null;

  const account = db.accounts.find((item) => item.address === input.authorAddress);
  const authorName = account?.displayName?.trim() || shortAddress(input.authorAddress, 4);
  const authorHandle =
    account?.handle?.trim()
      ? account.handle.startsWith("@")
        ? account.handle
        : `@${account.handle}`
      : `@${shortAddress(input.authorAddress.replace(/^0x/, ""), 4)}`;
  const comment = normalizeBlobCommentRecord({
    blobId: input.blobId,
    authorAddress: input.authorAddress,
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
}) {
  const db = await loadDb();
  const createdAt = timestamp();
  const id = crypto.randomUUID();
  const slug = `${slugify(input.title)}-${id.slice(0, 6)}`;
  const extension = guessExtension(input.file.name, input.file.type);
  const sealedPath = join("data", "walrus", `${id}${extension}.sealed`);
  const sealedAbsolutePath = join(/* turbopackIgnore: true */ process.cwd(), sealedPath);
  const fileBytes = Buffer.from(await input.file.arrayBuffer());
  const sealedBytes = sealBuffer(fileBytes, id);

  await ensureStorage();
  await writeFile(sealedAbsolutePath, sealedBytes);

  const account = await upsertAccount(db, {
    address: input.ownerAddress,
    displayName: input.ownerName,
    mode: input.walletMode,
    storageDeltaBytes: fileBytes.length,
  });

  const cover = chooseCover(input.category);
  const storageOwnerAddress = input.storageOwnerAddress ?? input.ownerAddress;
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
    ownerAddress: input.ownerAddress,
    ownerName: input.ownerName,
    coverFrom: cover.from,
    coverVia: cover.via,
    coverTo: cover.to,
    duration: "0:00",
    createdAt,
    updatedAt: createdAt,
    publishedAt: input.publishNow ? createdAt : undefined,
    storageExpiresAt: calculateVideoStorageExpiry(createdAt, storageDays),
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
      originalName: input.file.name,
      contentType: input.file.type || "application/octet-stream",
      sizeBytes: fileBytes.length,
      sealedAt: createdAt,
      encryption: "seal-aes256-gcm",
    },
  };

  db.videos.unshift(video);
  account.uploadsPublished = (account.uploadsPublished ?? 0) + 1;
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
  ownerAddress: string;
  ownerName: string;
  walletMode: WalletMode;
  treasuryFeeSui: number;
  policyObjectId: string;
  capObjectId: string;
  policyNonce: string;
  uploadTxDigest: string;
  asset: VideoAsset;
  storageOwnerAddress?: string;
  storageDays?: number;
}) {
  const db = await loadDb();
  const createdAt = timestamp();
  const id = crypto.randomUUID();
  const slug = `${slugifyText(input.title)}-${id.slice(0, 6)}`;
  const cover = chooseCover(input.category);
  const storageOwnerAddress = input.storageOwnerAddress ?? input.ownerAddress;
  const asset = normalizeVideoAsset(
    {
      ...input.asset,
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
    ownerAddress: input.ownerAddress,
    ownerName: input.ownerName,
    coverFrom: cover.from,
    coverVia: cover.via,
    coverTo: cover.to,
    duration: "0:00",
    createdAt,
    updatedAt: createdAt,
    publishedAt: input.publishNow ? createdAt : undefined,
    storageExpiresAt: asset?.storageExpiresAt,
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
  if (video?.asset?.sealedPath) {
    const sealedAbsolutePath = join(/* turbopackIgnore: true */ process.cwd(), video.asset.sealedPath);
    try {
      await unlink(sealedAbsolutePath);
    } catch {
      // Ignore missing sealed bundles in local development.
    }
  }

  if (video?.asset) {
    const account = db.accounts.find((item) => item.address === video.ownerAddress);
    if (account) {
      account.storageUsedBytes = Math.max(0, account.storageUsedBytes - video.asset.sizeBytes);
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
  },
) {
  const db = await loadDb();
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
    }
  }

  video.updatedAt = timestamp();
  await saveDb(db);
  return video;
}

export async function createReport(input: {
  videoId: string;
  reporter: string;
  reason: string;
  detail: string;
  severity: "low" | "medium" | "high";
}) {
  const db = await loadDb();
  const video = db.videos.find((item) => item.id === input.videoId);
  if (!video) return null;

  const report: ReportRecord = {
    id: crypto.randomUUID(),
    videoId: video.id,
    videoTitle: video.title,
    reason: input.reason,
    detail: input.detail,
    severity: input.severity,
    status: "open",
    reporter: input.reporter,
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
  const account = db.accounts.find((item) => item.address === address);
  if (!account) return null;

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
  if (input.ownerAddress && video.ownerAddress !== input.ownerAddress) return null;

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

  const account = db.accounts.find((item) => item.address === video.ownerAddress);
  if (account) {
    const ownedVideos = db.videos.filter((item) => item.ownerAddress === account.address && item.asset?.storageExpiresAt);
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
  const owned = address ? db.videos.filter((video) => video.ownerAddress === address) : [];
  return {
    metrics: computeMetrics(db),
    videos: owned,
    account: address ? db.accounts.find((item) => item.address === address) ?? null : null,
    reports: db.reports.filter((item) => item.status === "open"),
    settings: db.settings,
    storageHealth: calculateStorageHealthSummary({
      videos: owned,
      settings: db.settings,
    }),
  };
}

export async function streamVideo(id: string) {
  const video = await getVideo(id);
  if (!video?.asset) {
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
