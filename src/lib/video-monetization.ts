import type { VideoAccessModel, VideoMonetization, VideoRecord } from "@/lib/types";

export const MIST_PER_SUI = 1_000_000_000;
export const DEFAULT_RENTAL_DURATION_DAYS = 1;

function clampNonNegativeInteger(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.floor(parsed));
}

export function deriveVideoAccessModel(input: {
  purchasePriceMist?: number;
  rentalPriceMist?: number;
}): VideoAccessModel {
  const purchasePriceMist = clampNonNegativeInteger(input.purchasePriceMist);
  const rentalPriceMist = clampNonNegativeInteger(input.rentalPriceMist);

  if (purchasePriceMist > 0 && rentalPriceMist > 0) return "purchase_or_rental";
  if (purchasePriceMist > 0) return "purchase";
  if (rentalPriceMist > 0) return "rental";
  return "open";
}

export function normalizeVideoMonetization(input?: Partial<VideoMonetization> | null): VideoMonetization {
  const purchasePriceMist = clampNonNegativeInteger(input?.purchasePriceMist);
  const rentalPriceMist = clampNonNegativeInteger(input?.rentalPriceMist);
  const accessModel = deriveVideoAccessModel({ purchasePriceMist, rentalPriceMist });
  const rentalDurationDays =
    rentalPriceMist > 0
      ? Math.max(DEFAULT_RENTAL_DURATION_DAYS, clampNonNegativeInteger(input?.rentalDurationDays, DEFAULT_RENTAL_DURATION_DAYS))
      : 0;

  return {
    accessModel,
    purchasePriceMist,
    rentalPriceMist,
    rentalDurationDays,
  };
}

export function isPaidVideoMonetization(input: VideoMonetization | Pick<VideoRecord, "monetization">) {
  const monetization = "monetization" in input ? input.monetization : input;
  return normalizeVideoMonetization(monetization).accessModel !== "open";
}

export function isPublishedWatchRelease(
  video: Pick<VideoRecord, "status" | "visibility" | "monetization">,
) {
  if (video.status !== "published") return false;
  if (video.visibility === "public") return true;
  return isPaidVideoMonetization(video.monetization);
}

export function formatMistAsSui(value: number | bigint, digits = 3) {
  const amount = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  const fixed = (amount / MIST_PER_SUI).toFixed(digits);
  return fixed.replace(/\.?0+$/, "");
}

export function parseSuiAmountToMist(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d{0,9})?$/.test(trimmed)) return null;

  const [wholePart, fractionPart = ""] = trimmed.split(".");
  const whole = BigInt(wholePart);
  const fraction = BigInt(`${fractionPart.padEnd(9, "0")}`.slice(0, 9));
  return whole * BigInt(MIST_PER_SUI) + fraction;
}
