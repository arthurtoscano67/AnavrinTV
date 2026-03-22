import { getUploadFeeMist } from "@/lib/anavrin-config";
import type {
  PlatformAdvertisingSettings,
  PlatformFeeSchedule,
  PlatformSettings,
  StorageHealthSummary,
  StorageHealthVideo,
  VideoRecord,
} from "@/lib/types";

const MIST_PER_SUI = 1_000_000_000;
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

function clampNumber(value: unknown, fallback: number, minimum = 0, maximum = Number.POSITIVE_INFINITY) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, parsed));
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeFees(input?: Partial<PlatformFeeSchedule>): PlatformFeeSchedule {
  const fallback = defaultPlatformFeeSchedule();
  return {
    uploadFeeMist: clampNumber(input?.uploadFeeMist, fallback.uploadFeeMist, 0),
    videoPublishFeeMist: clampNumber(input?.videoPublishFeeMist, fallback.videoPublishFeeMist, 0),
    videoUnpublishFeeMist: clampNumber(input?.videoUnpublishFeeMist, fallback.videoUnpublishFeeMist, 0),
    storageExtensionFeeMistPerDay: clampNumber(
      input?.storageExtensionFeeMistPerDay,
      fallback.storageExtensionFeeMistPerDay,
      0,
    ),
    tipPlatformBps: clampNumber(input?.tipPlatformBps, fallback.tipPlatformBps, 0, 10_000),
    adCampaignSetupFeeMist: clampNumber(input?.adCampaignSetupFeeMist, fallback.adCampaignSetupFeeMist, 0),
    minimumTipMist: clampNumber(input?.minimumTipMist, fallback.minimumTipMist, 1),
    maxStorageExtensionDays: clampNumber(
      input?.maxStorageExtensionDays,
      fallback.maxStorageExtensionDays,
      1,
      730,
    ),
    storageExpiryWarningDays: clampNumber(
      input?.storageExpiryWarningDays,
      fallback.storageExpiryWarningDays,
      1,
      365,
    ),
  };
}

function normalizeAdvertising(input?: Partial<PlatformAdvertisingSettings>): PlatformAdvertisingSettings {
  const fallback = defaultAdvertisingSettings();
  return {
    enabled: typeof input?.enabled === "boolean" ? input.enabled : fallback.enabled,
    homeFeedSlots: clampNumber(input?.homeFeedSlots, fallback.homeFeedSlots, 0, 24),
    browseRailSlots: clampNumber(input?.browseRailSlots, fallback.browseRailSlots, 0, 24),
    videoPageSlots: clampNumber(input?.videoPageSlots, fallback.videoPageSlots, 0, 24),
    campaignLeadTimeDays: clampNumber(input?.campaignLeadTimeDays, fallback.campaignLeadTimeDays, 0, 180),
    notes: readString(input?.notes, fallback.notes),
  };
}

export function defaultPlatformFeeSchedule(): PlatformFeeSchedule {
  return {
    uploadFeeMist: getUploadFeeMist(),
    videoPublishFeeMist: 0,
    videoUnpublishFeeMist: 0,
    storageExtensionFeeMistPerDay: 10_000_000,
    tipPlatformBps: 250,
    adCampaignSetupFeeMist: 100_000_000,
    minimumTipMist: 1,
    maxStorageExtensionDays: 730,
    storageExpiryWarningDays: 14,
  };
}

export function defaultAdvertisingSettings(): PlatformAdvertisingSettings {
  return {
    enabled: false,
    homeFeedSlots: 1,
    browseRailSlots: 1,
    videoPageSlots: 1,
    campaignLeadTimeDays: 7,
    notes: "Ad inventory scaffolding is reserved but not yet live.",
  };
}

export function defaultPlatformSettings(): PlatformSettings {
  return {
    fees: defaultPlatformFeeSchedule(),
    advertising: defaultAdvertisingSettings(),
  };
}

export function normalizePlatformSettings(input?: Partial<PlatformSettings> | null): PlatformSettings {
  return {
    fees: normalizeFees(input?.fees ?? undefined),
    advertising: normalizeAdvertising(input?.advertising ?? undefined),
  };
}

export function mergePlatformSettings(
  current: PlatformSettings,
  patch: Partial<PlatformSettings>,
): PlatformSettings {
  return normalizePlatformSettings({
    fees: {
      ...current.fees,
      ...patch.fees,
    },
    advertising: {
      ...current.advertising,
      ...patch.advertising,
    },
  });
}

export function formatMistToSui(mist: number | bigint) {
  const value = typeof mist === "bigint" ? Number(mist) : mist;
  return value / MIST_PER_SUI;
}

export function calculateStorageExtensionFeeSui(
  settings: PlatformSettings,
  days: number,
) {
  const clampedDays = Math.max(1, Math.min(settings.fees.maxStorageExtensionDays, Math.floor(days)));
  const mist = Math.ceil(clampedDays * settings.fees.storageExtensionFeeMistPerDay);
  return {
    days: clampedDays,
    mist,
    sui: formatMistToSui(mist),
  };
}

export function calculateTipPlatformFeeSui(
  settings: PlatformSettings,
  tipAmountSui: number,
) {
  const amountMist = Math.max(settings.fees.minimumTipMist, Math.floor(tipAmountSui * MIST_PER_SUI));
  const platformFeeMist = Math.max(
    0,
    Math.floor((amountMist * settings.fees.tipPlatformBps) / 10_000),
  );
  const creatorMist = Math.max(0, amountMist - platformFeeMist);

  return {
    amountMist,
    amountSui: formatMistToSui(amountMist),
    platformFeeMist,
    platformFeeSui: formatMistToSui(platformFeeMist),
    creatorMist,
    creatorSui: formatMistToSui(creatorMist),
  };
}

export function calculateVideoStorageExpiry(
  startedAt: string | Date | number,
  days = 30,
) {
  const time = typeof startedAt === "number" ? startedAt : new Date(startedAt).getTime();
  const safeDays = Math.max(1, Math.floor(days));
  return new Date(time + safeDays * MILLIS_PER_DAY).toISOString();
}

export function calculateStorageHealthSummary(input: {
  videos: VideoRecord[];
  settings: PlatformSettings;
  now?: number;
}): StorageHealthSummary {
  const now = input.now ?? Date.now();
  const thresholdDays = input.settings.fees.storageExpiryWarningDays;
  const maxExtensionDays = input.settings.fees.maxStorageExtensionDays;

  const storageVideos: StorageHealthVideo[] = input.videos
    .filter((video) => Boolean(video.asset?.storageExpiresAt))
    .map((video) => {
      const expiresAt = new Date(video.asset?.storageExpiresAt ?? "").getTime();
      const daysRemaining = Math.ceil((expiresAt - now) / MILLIS_PER_DAY);
      const renewalFeeMist = Math.ceil(
        Math.max(1, Math.min(maxExtensionDays, Math.max(daysRemaining, thresholdDays))) *
          input.settings.fees.storageExtensionFeeMistPerDay,
      );

      return {
        id: video.id,
        title: video.title,
        ownerAddress: video.ownerAddress,
        storageExpiresAt: video.asset?.storageExpiresAt ?? new Date(now).toISOString(),
        daysRemaining,
        sizeBytes: video.asset?.sizeBytes ?? 0,
        renewalFeeSui: formatMistToSui(renewalFeeMist),
        storageMode: video.asset?.storageMode ?? "local",
      };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const expiringVideos = storageVideos.filter((video) => video.daysRemaining <= thresholdDays);
  const nextExpiryAt = storageVideos[0]?.storageExpiresAt ?? null;
  const daysRemaining = storageVideos[0]?.daysRemaining ?? null;

  return {
    nextExpiryAt,
    daysRemaining,
    expiringVideoCount: expiringVideos.length,
    warningDays: thresholdDays,
    maxExtensionDays,
    expiringVideos,
  };
}
