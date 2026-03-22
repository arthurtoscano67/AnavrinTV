export type WalletMode = "wallet" | "slush" | "zklogin" | "guest";

export type VideoVisibility = "public" | "private" | "draft";

export type VideoStatus = "published" | "processing" | "draft" | "hidden";

export type ReportSeverity = "low" | "medium" | "high";

export type ReportStatus = "open" | "resolved";

export type ReportContentType = "video" | "blob" | "live";

export interface PlatformFeeSchedule {
  uploadFeeMist: number;
  videoPublishFeeMist: number;
  videoUnpublishFeeMist: number;
  storageExtensionFeeMistPerDay: number;
  tipPlatformBps: number;
  adCampaignSetupFeeMist: number;
  minimumTipMist: number;
  maxStorageExtensionDays: number;
  storageExpiryWarningDays: number;
}

export interface PlatformAdvertisingSettings {
  enabled: boolean;
  homeFeedSlots: number;
  browseRailSlots: number;
  videoPageSlots: number;
  campaignLeadTimeDays: number;
  notes: string;
}

export interface PlatformSettings {
  fees: PlatformFeeSchedule;
  advertising: PlatformAdvertisingSettings;
}

export interface WalletSession {
  id: string;
  displayName: string;
  username: string;
  address: string;
  mode: WalletMode;
  avatarSeed: string;
  handle?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  storageLimitBytes: number;
  storageUsedBytes: number;
  treasuryFeeBps: number;
  renewalAt: string;
  createdAt?: string;
  lastActiveAt?: string;
  uploadsPublished?: number;
  totalViews?: number;
  totalTips?: number;
  followers?: number;
  followersCount?: number;
  following?: number;
  followingCount?: number;
  totalVideos?: number;
  totalBlobs?: number;
  isBanned?: boolean;
  bannedAt?: string;
  bannedUntil?: string;
  bannedReason?: string;
  bannedBy?: string;
  moderationNotes?: string;
}

export interface VideoAsset {
  storageMode: "local" | "walrus";
  storageOwnerAddress?: string;
  storageStartedAt?: string;
  storageExpiresAt?: string;
  storageRenewedAt?: string;
  storageRenewalDays?: number;
  storageRenewalFeeSui?: number;
  storageMaxExtensionDays?: number;
  walrusUri?: string;
  walrusBlobId?: string;
  walrusBlobObjectId?: string;
  sealedPath?: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  encryptedSizeBytes?: number;
  sealedAt: string;
  encryption: string;
  nonce?: string;
  uploadTxDigest?: string;
  blobAttributes?: Record<string, string | null>;
}

export interface VideoRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  visibility: VideoVisibility;
  status: VideoStatus;
  ownerAddress: string;
  ownerName: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName: string;
  creatorAvatarUrl?: string;
  coverFrom: string;
  coverVia: string;
  coverTo: string;
  duration: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  policyObjectId?: string;
  capObjectId?: string;
  policyStatus?: "draft" | "published" | "hidden";
  policyVisibility?: VideoVisibility;
  policyNonce?: string;
  uploadTxDigest?: string;
  storageExpiresAt?: string;
  views: number;
  comments: number;
  likes: number;
  tips: number;
  subscribers: number;
  reportedCount: number;
  asset: VideoAsset | null;
}

export interface ReportRecord {
  id: string;
  videoId: string;
  videoTitle: string;
  contentType: ReportContentType;
  reason: string;
  detail: string;
  severity: ReportSeverity;
  status: ReportStatus;
  reporter: string;
  createdAt: string;
}

export interface BlobLikeRecord {
  id: string;
  blobId: string;
  userAddress: string;
  createdAt: string;
}

export interface BlobFollowRecord {
  id: string;
  blobId: string;
  creatorAddress: string;
  userAddress: string;
  createdAt: string;
}

export interface BlobCommentRecord {
  id: string;
  blobId: string;
  authorAddress: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string;
  body: string;
  createdAt: string;
  pinned?: boolean;
}

export interface VideoBookmarkRecord {
  id: string;
  videoId: string;
  userAddress: string;
  createdAt: string;
}

export interface SiteMetrics {
  visitorsToday: number;
  activeStreams: number;
  uploadsToday: number;
  treasuryCollectedSui: number;
  uploadFeesCollectedSui: number;
  tipFeesCollectedSui: number;
  storageFeesCollectedSui: number;
  adFeesCollectedSui: number;
  reportsOpen: number;
  storageUsedBytes: number;
  creatorCount: number;
  weeklyVisitors: number[];
  weeklyUploads: number[];
  weeklyWatchMinutes: number[];
}

export interface Database {
  videos: VideoRecord[];
  reports: ReportRecord[];
  accounts: WalletSession[];
  videoBookmarks: VideoBookmarkRecord[];
  blobLikes: BlobLikeRecord[];
  blobFollows: BlobFollowRecord[];
  blobComments: BlobCommentRecord[];
  metrics: SiteMetrics;
  settings: PlatformSettings;
}

export interface StorageHealthVideo {
  id: string;
  title: string;
  ownerAddress: string;
  storageExpiresAt: string;
  daysRemaining: number;
  sizeBytes: number;
  renewalFeeSui: number;
  storageMode: VideoAsset["storageMode"];
}

export interface StorageHealthSummary {
  nextExpiryAt: string | null;
  daysRemaining: number | null;
  expiringVideoCount: number;
  warningDays: number;
  maxExtensionDays: number;
  expiringVideos: StorageHealthVideo[];
}

export interface DashboardSnapshot {
  metrics: SiteMetrics;
  videos: VideoRecord[];
  watchLaterVideos: VideoRecord[];
  account: WalletSession | null;
  reports: ReportRecord[];
  settings: PlatformSettings;
  storageHealth: StorageHealthSummary;
}

export interface AdminSnapshot {
  metrics: SiteMetrics;
  reports: ReportRecord[];
  videos: VideoRecord[];
  accounts: WalletSession[];
  moderationQueue: ReportRecord[];
  topVideos: VideoRecord[];
  settings: PlatformSettings;
}
