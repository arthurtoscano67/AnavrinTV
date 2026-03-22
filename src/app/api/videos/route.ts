import { NextRequest, NextResponse } from "next/server";
import { fromHex } from "@mysten/sui/utils";

import { getPolicyPackageId } from "@/lib/anavrin-config";
import { calculateVideoStorageExpiry } from "@/lib/platform-settings";
import { getPlatformSettings, getVideos, persistUploadRecord } from "@/lib/db";
import {
  DISCOVERY_PAGE_SIZE,
  applyDiscoveryFilters,
  collectDiscoveryTopics,
  paginateVideos,
} from "@/lib/discovery-feed";
import { ensureSameActorAddress, normalizeAddress, readActorAddress, requireAdmin } from "@/lib/request-auth";
import type { VideoVisibility, WalletMode } from "@/lib/types";
import { videoPolicyCapType, videoPolicyType } from "@/lib/video-policy";
import {
  certifyWalrusBlob,
  getServerWalrusClient,
  uploadEncryptedBlobToWalrusRelay,
} from "@/lib/walrus-storage";

export const runtime = "nodejs";
const BLOB_MAX_DURATION_SECONDS = 30;
const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024;

function parseIntegerParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function parseVisibility(value: string | null): VideoVisibility {
  if (value === "private" || value === "draft" || value === "public") return value;
  return "draft";
}

function parseWalletMode(value: string | null): WalletMode {
  if (value === "wallet" || value === "slush" || value === "zklogin" || value === "guest") return value;
  return "guest";
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") ?? undefined;
  const rawCategory = searchParams.get("category");
  const category = rawCategory?.trim() ? rawCategory.trim() : undefined;
  const ownerAddress = searchParams.get("ownerAddress")?.trim() || undefined;
  const publicOnly = searchParams.get("publicOnly") !== "false";
  const includeDrafts = searchParams.get("includeDrafts") === "true";
  const topicParam = searchParams.get("topic");
  const topic = topicParam?.trim() ? topicParam.trim() : category && category !== "All" ? category : undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;
  const includeDiscoveryPayload =
    searchParams.get("paginated") === "true" ||
    searchParams.has("offset") ||
    searchParams.has("limit") ||
    searchParams.has("topic") ||
    searchParams.has("tag") ||
    searchParams.has("sort");

  const actorAddress = readActorAddress(request);
  const adminCheck = requireAdmin(request);
  const ownerAddressNormalized = normalizeAddress(ownerAddress);
  const ownsRequestedProfile = Boolean(ownerAddressNormalized && actorAddress && ownerAddressNormalized === actorAddress);
  const requestingRestrictedData = !publicOnly || includeDrafts;

  if (requestingRestrictedData && !adminCheck.ok && !ownsRequestedProfile) {
    return NextResponse.json({ error: "Not authorized to access non-public videos." }, { status: 403 });
  }

  const videos = await getVideos({
    ownerAddress,
    publicOnly,
    query,
    category,
    includeDrafts,
  });

  if (includeDiscoveryPayload) {
    const filtered = applyDiscoveryFilters(videos, {
      query,
      category,
      topic,
      tag,
      sort,
    });
    const offset = parseIntegerParam(searchParams.get("offset"), 0, 0, Number.MAX_SAFE_INTEGER);
    const limit = parseIntegerParam(searchParams.get("limit"), DISCOVERY_PAGE_SIZE, 1, 60);
    const page = paginateVideos(filtered, offset, limit);

    return NextResponse.json({
      videos: page.videos,
      page: {
        offset: page.offset,
        limit: page.limit,
        total: page.total,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
      },
      topics: collectDiscoveryTopics(videos),
      filters: {
        q: query ?? "",
        category: category ?? "",
        topic: topic ?? "All",
        tag: tag ?? "",
        sort: sort ?? "",
      },
    });
  }

  return NextResponse.json({ videos });
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("POST /api/videos formData parsing failed", error);
    const message = error instanceof Error && error.message.trim() ? error.message : "Could not parse upload form data.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const sealedVideo = formData.get("sealedVideo");
  const thumbnail = formData.get("thumbnail");

  if (!(sealedVideo instanceof File)) {
    return NextResponse.json({ error: "Upload requires an encrypted video bundle." }, { status: 400 });
  }

  let thumbnailInput:
    | {
        bytes: Uint8Array;
        originalName: string;
        contentType: string;
      }
    | undefined;

  if (thumbnail !== null) {
    if (!(thumbnail instanceof File)) {
      return NextResponse.json({ error: "Thumbnail upload is invalid." }, { status: 400 });
    }
    if (thumbnail.size > 0) {
      const thumbnailContentType = (thumbnail.type || "application/octet-stream").toLowerCase();
      if (!thumbnailContentType.startsWith("image/")) {
        return NextResponse.json({ error: "Thumbnail must be an image file." }, { status: 400 });
      }
      if (thumbnail.size > MAX_THUMBNAIL_BYTES) {
        return NextResponse.json(
          {
            error: `Thumbnail is too large. Max size is ${Math.floor(MAX_THUMBNAIL_BYTES / (1024 * 1024))} MB.`,
          },
          { status: 400 },
        );
      }

      thumbnailInput = {
        bytes: new Uint8Array(await thumbnail.arrayBuffer()),
        originalName: thumbnail.name || "thumbnail",
        contentType: thumbnail.type || "application/octet-stream",
      };
    }
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  const ownerAddress = String(formData.get("ownerAddress") ?? "0xguest").trim();
  if (!ownerAddress) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

  const actorCheck = ensureSameActorAddress(request, ownerAddress);
  if (!actorCheck.ok) return actorCheck.response;

  const ownerName = String(formData.get("ownerName") ?? "Creator").trim() || "Creator";
  const walletMode = parseWalletMode(String(formData.get("walletMode") ?? null));
  const description = String(formData.get("description") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const category = String(formData.get("category") ?? "Launches").trim() || "Launches";
  const publishAsBlob = String(formData.get("publishAsBlob") ?? "false") === "true";
  const requestedVisibility = parseVisibility(String(formData.get("visibility") ?? null));
  const requestedPublishNow = String(formData.get("publishNow") ?? "true") !== "false";
  const uploadTxDigest = String(formData.get("uploadTxDigest") ?? formData.get("registerTxDigest") ?? "").trim();
  const policyNonce = String(formData.get("policyNonce") ?? "").trim();
  const originalName = String(formData.get("originalName") ?? sealedVideo.name ?? "video.bin");
  const contentType = String(formData.get("contentType") ?? sealedVideo.type ?? "application/octet-stream");
  const sizeBytes = Number(formData.get("sizeBytes") ?? sealedVideo.size ?? 0);
  const durationSecondsRaw = Number(formData.get("durationSeconds") ?? 0);
  const durationSeconds = Number.isFinite(durationSecondsRaw) && durationSecondsRaw > 0 ? durationSecondsRaw : 0;
  const encryptedSizeBytes = Number(formData.get("encryptedSizeBytes") ?? sealedVideo.size ?? 0);
  const treasuryFeeSui = Number(formData.get("treasuryFeeSui") ?? 0.25);
  const visibility = publishAsBlob ? "public" : requestedVisibility;
  const publishNow = publishAsBlob ? true : requestedPublishNow;

  if (!uploadTxDigest) {
    return NextResponse.json({ error: "A signed upload transaction digest is required." }, { status: 400 });
  }

  if (!policyNonce) {
    return NextResponse.json({ error: "A policy nonce is required for Seal playback." }, { status: 400 });
  }

  if (publishAsBlob && durationSeconds <= 0) {
    return NextResponse.json({ error: "Blob uploads require a readable duration and must be 30 seconds or less." }, { status: 400 });
  }

  if (publishAsBlob && durationSeconds > BLOB_MAX_DURATION_SECONDS) {
    return NextResponse.json(
      { error: `Blob uploads are limited to ${BLOB_MAX_DURATION_SECONDS} seconds.` },
      { status: 400 },
    );
  }

  try {
    const platform = await getPlatformSettings();
    const storageDays = Math.max(
      1,
      Math.min(platform.fees.maxStorageExtensionDays, Math.floor(Number(formData.get("storageDays") ?? 30))),
    );
    const resolvedCategory = publishAsBlob ? "Shorts" : category;
    const encryptedBytes = new Uint8Array(await sealedVideo.arrayBuffer());
    const nonce = fromHex(policyNonce);
    const client = await getServerWalrusClient();
    const metadata = await client.walrus.computeBlobMetadata({
      bytes: encryptedBytes,
      nonce,
    });

    const transactionResult = await client.core.waitForTransaction({
      digest: uploadTxDigest,
      include: { effects: true, objectTypes: true },
    });

    if (transactionResult.$kind === "FailedTransaction") {
      return NextResponse.json(
        {
          error:
            transactionResult.FailedTransaction.status.error?.message ?? "Upload transaction failed.",
        },
        { status: 400 },
      );
    }

    const blobType = await client.walrus.getBlobType();
    const blobObjectId = Object.entries(transactionResult.Transaction.objectTypes ?? {}).find(
      ([, type]) => type === blobType,
    )?.[0];
    if (!blobObjectId) {
      return NextResponse.json({ error: "Could not resolve the Walrus blob object from the upload transaction." }, { status: 500 });
    }

    const policyPackageId = getPolicyPackageId();
    if (!policyPackageId) {
      return NextResponse.json({ error: "Set NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID before uploading." }, { status: 400 });
    }

    const policyType = videoPolicyType(policyPackageId);
    const capType = videoPolicyCapType(policyPackageId);
    const policyObjectId = Object.entries(transactionResult.Transaction.objectTypes ?? {}).find(
      ([, type]) => type === policyType,
    )?.[0];
    const capObjectId = Object.entries(transactionResult.Transaction.objectTypes ?? {}).find(
      ([, type]) => type === capType,
    )?.[0];

    if (!policyObjectId || !capObjectId) {
      return NextResponse.json(
        {
          error: "Could not resolve the policy and cap objects from the signed upload transaction.",
        },
        { status: 500 },
      );
    }

    const relayResult = await uploadEncryptedBlobToWalrusRelay({
      bytes: encryptedBytes,
      blobId: metadata.blobId,
      blobObjectId,
      nonce,
      txDigest: uploadTxDigest,
      storageOwnerAddress: ownerAddress,
      deletable: false,
      encodingType: metadata.metadata.encodingType,
    });

    const certifyResult = await certifyWalrusBlob({
      blobId: metadata.blobId,
      blobObjectId,
      certificate: relayResult.certificate,
      deletable: false,
    });

    const now = new Date().toISOString();
    const result = await persistUploadRecord({
      title,
      description,
      tags,
      category: resolvedCategory,
      visibility,
      publishNow,
      ownerAddress,
      ownerName,
      walletMode,
      treasuryFeeSui: Number.isFinite(treasuryFeeSui) ? treasuryFeeSui : 0.25,
      durationSeconds,
      policyObjectId,
      capObjectId,
      policyNonce,
      uploadTxDigest,
      thumbnail: thumbnailInput,
      storageOwnerAddress: ownerAddress,
      storageDays,
      asset: {
        storageMode: "walrus",
        storageOwnerAddress: ownerAddress,
        storageStartedAt: now,
        storageExpiresAt: calculateVideoStorageExpiry(now, storageDays),
        storageRenewedAt: now,
        storageRenewalDays: storageDays,
        storageRenewalFeeSui: 0,
        storageMaxExtensionDays: platform.fees.maxStorageExtensionDays,
        walrusUri: `walrus://${metadata.blobId}`,
        walrusBlobId: metadata.blobId,
        walrusBlobObjectId: blobObjectId,
        originalName,
        contentType,
        sizeBytes,
        encryptedSizeBytes,
        sealedAt: now,
        encryption: "seal-aes256-gcm",
        nonce: policyNonce,
        uploadTxDigest,
        blobAttributes: {
          title,
          category: resolvedCategory,
          visibility,
          policyObjectId,
          capObjectId,
          policyNonce,
          creatorAddress: ownerAddress,
          storageOwnerAddress: ownerAddress,
          surface: publishAsBlob || resolvedCategory === "Shorts" ? "blob" : null,
          presentation: resolvedCategory === "Shorts" ? "vertical" : null,
        },
      },
    });

    return NextResponse.json(
      {
        video: result.video,
        account: result.account,
        walrus: {
          blobId: metadata.blobId,
          blobObjectId,
          registerTxDigest: uploadTxDigest,
          certifyTxDigest: certifyResult.digest,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/videos failed", error);
    const message = error instanceof Error ? error.message : "Upload failed.";
    const status = message.toLowerCase().includes("banned") ? 403 : 500;
    return NextResponse.json(
      {
        error: message,
      },
      { status },
    );
  }
}
