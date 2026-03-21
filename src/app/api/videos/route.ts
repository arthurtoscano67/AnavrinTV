import { NextRequest, NextResponse } from "next/server";
import { fromHex } from "@mysten/sui/utils";

import { getPolicyPackageId } from "@/lib/anavrin-config";
import { calculateVideoStorageExpiry } from "@/lib/platform-settings";
import { getPlatformSettings, getVideos, persistUploadRecord } from "@/lib/db";
import type { VideoVisibility, WalletMode } from "@/lib/types";
import { videoPolicyCapType, videoPolicyType } from "@/lib/video-policy";
import {
  certifyWalrusBlob,
  getServerWalrusClient,
  uploadEncryptedBlobToWalrusRelay,
} from "@/lib/walrus-storage";

export const runtime = "nodejs";
const BLOB_MAX_DURATION_SECONDS = 30;

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
  const videos = await getVideos({
    ownerAddress: searchParams.get("ownerAddress") ?? undefined,
    publicOnly: searchParams.get("publicOnly") !== "false",
    query: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    includeDrafts: searchParams.get("includeDrafts") === "true",
  });

  return NextResponse.json({ videos });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const sealedVideo = formData.get("sealedVideo");

  if (!(sealedVideo instanceof File)) {
    return NextResponse.json({ error: "Upload requires an encrypted video bundle." }, { status: 400 });
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  const ownerAddress = String(formData.get("ownerAddress") ?? "0xguest").trim();
  if (!ownerAddress) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

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
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Upload failed.",
      },
      { status: 500 },
    );
  }
}
