"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  FileVideo2,
  LockKeyhole,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount, useCurrentClient, useCurrentWallet, useDAppKit } from "@mysten/dapp-kit-react";
import { toHex } from "@mysten/sui/utils";

import { formatBytes, shortAddress, slugifyText } from "@/lib/format";
import { getMvrName, getPolicyPackageId, getSealThreshold, getUploadTreasuryAddress } from "@/lib/anavrin-config";
import { buildPolicyInitTransaction, buildVideoIdentityHex, generateVideoNonce } from "@/lib/video-policy";
import type { AnavrinClient } from "@/lib/anavrin-client";
import { defaultPlatformSettings } from "@/lib/platform-settings";
import { clearWalletBalanceSnapshot, getWalletBalanceSnapshot, type WalletBalanceSnapshot } from "@/lib/wallet-funds";
import type { PlatformSettings, VideoRecord, WalletMode } from "@/lib/types";

const categories = ["Launches", "Music", "Gaming", "DeFi", "Culture", "AI Labs", "Shorts", "Live Events"];
const visibilities = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "draft", label: "Draft" },
] as const;

const storageDurationOptions = [30, 90, 180, 365, 730] as const;

function inferWalletMode(name?: string | null): WalletMode {
  const normalized = name?.toLowerCase() ?? "";
  if (normalized.includes("slush")) return "slush";
  if (normalized.includes("zk")) return "zklogin";
  if (normalized.includes("wallet")) return "wallet";
  return "guest";
}

type PendingUpload = {
  sealedBytes: Uint8Array;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  title: string;
  description: string;
  tags: string;
  category: string;
  visibility: (typeof visibilities)[number]["value"];
  publishNow: boolean;
  policyNonce: string;
  ownerAddress: string;
  ownerName: string;
  walletMode: WalletMode;
  treasuryFeeSui: number;
  storageDays: number;
  uploadTxDigest: string;
  publishAsBlob: boolean;
};

function toArrayBuffer(bytes: Uint8Array<ArrayBufferLike>) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function formatSuiAmount(mist: bigint | number, digits = 3) {
  return (Number(mist) / 1_000_000_000).toFixed(digits);
}

export default function UploadPage() {
  const searchParams = useSearchParams();
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const currentClient = useCurrentClient() as AnavrinClient;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("sui, walrus, seal");
  const [category, setCategory] = useState("Launches");
  const [visibility, setVisibility] = useState<(typeof visibilities)[number]["value"]>("draft");
  const [publishNow, setPublishNow] = useState(false);
  const [publishAsBlob, setPublishAsBlob] = useState(false);
  const [storageDays, setStorageDays] = useState(30);
  const [file, setFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<PlatformSettings>(defaultPlatformSettings());
  const [balances, setBalances] = useState<WalletBalanceSnapshot | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    video: VideoRecord;
    walrus: {
      blobId: string;
      blobObjectId: string;
      registerTxDigest: string;
      certifyTxDigest: string;
    };
    publishAsBlob: boolean;
  } | null>(null);
  const pendingUploadRef = useRef<PendingUpload | null>(null);
  const blobModeSeededRef = useRef(false);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    let active = true;

    async function loadPlatform() {
      try {
        const response = await fetch("/api/platform");
        const data = (await response.json()) as { settings?: PlatformSettings };
        if (active && data.settings) {
          setPlatform(data.settings);
          setStorageDays((current) =>
            Math.min(Math.max(1, current), data.settings?.fees.maxStorageExtensionDays ?? current),
          );
        }
      } catch {
        if (active) setPlatform(defaultPlatformSettings());
      }
    }

    void loadPlatform();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadBalances() {
      if (!account?.address) {
        clearWalletBalanceSnapshot();
        if (active) setBalances(null);
        return;
      }

      try {
        const snapshot = await getWalletBalanceSnapshot(
          currentClient as unknown as Parameters<typeof getWalletBalanceSnapshot>[0],
          account.address,
        );
        if (active) setBalances(snapshot);
      } catch {
        if (active) setBalances(null);
      }
    }

    void loadBalances();

    return () => {
      active = false;
    };
  }, [account?.address, currentClient]);

  useEffect(() => {
    if (blobModeSeededRef.current) return;
    const blobMode = searchParams.get("blob");
    if (blobMode === "true" || blobMode === "1") {
      setPublishAsBlob(true);
      setCategory("Shorts");
    }
    blobModeSeededRef.current = true;
  }, [searchParams]);

  async function submitPendingUpload(pending: PendingUpload) {
    const formData = new FormData();
    formData.append(
      "sealedVideo",
      new File([toArrayBuffer(pending.sealedBytes)], `${pending.originalName}.sealed`, {
        type: "application/octet-stream",
      }),
    );
    formData.append("title", pending.title);
    formData.append("description", pending.description);
    formData.append("tags", pending.tags);
    formData.append("category", pending.category);
    formData.append("visibility", pending.visibility);
    formData.append("publishNow", String(pending.publishNow));
    formData.append("publishAsBlob", String(pending.publishAsBlob));
    formData.append("ownerAddress", pending.ownerAddress);
    formData.append("ownerName", pending.ownerName);
    formData.append("walletMode", pending.walletMode);
    formData.append("treasuryFeeSui", String(pending.treasuryFeeSui));
    formData.append("policyNonce", pending.policyNonce);
    formData.append("uploadTxDigest", pending.uploadTxDigest);
    formData.append("storageDays", String(pending.storageDays));
    formData.append("originalName", pending.originalName);
    formData.append("contentType", pending.contentType);
    formData.append("sizeBytes", String(pending.sizeBytes));
    formData.append("encryptedSizeBytes", String(pending.sealedBytes.length));

    const response = await fetch("/api/videos", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Upload failed");
    }

    const data = (await response.json()) as {
      video: VideoRecord;
      walrus: {
        blobId: string;
        blobObjectId: string;
        registerTxDigest: string;
        certifyTxDigest: string;
      };
    };

    setResult({
      ...data,
      publishAsBlob: pending.publishAsBlob,
    });
    setStatus(
      pending.publishAsBlob
        ? "Upload complete. The Blob is sealed, registered under your wallet, uploaded through Walrus, and published into the swipe feed."
        : "Upload complete. The video is sealed, registered under your wallet, uploaded through Walrus, and linked to your policy object.",
    );
    pendingUploadRef.current = null;
    setTitle("");
    setDescription("");
    setTags("sui, walrus, seal");
    setCategory("Launches");
    setVisibility("draft");
    setPublishNow(false);
    setPublishAsBlob(false);
    setStorageDays(30);
    setFile(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!account) {
      setStatus("Connect a wallet before uploading.");
      return;
    }

    if (!title.trim()) {
      setStatus("Add a title before uploading.");
      return;
    }

    if (!file) {
      setStatus("Pick a video file first.");
      return;
    }

    const packageId = getPolicyPackageId();
    if (!packageId) {
      setStatus("Set NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID before uploading.");
      return;
    }

    const treasuryAddress = getUploadTreasuryAddress();
    if (!treasuryAddress) {
      setStatus("Set NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS before uploading.");
      return;
    }

    const resolvedCategory = publishAsBlob ? "Shorts" : category;
    setSubmitting(true);
    setStatus("Encrypting the video with Seal...");

    try {
      const nonce = generateVideoNonce();
      const identityHex = buildVideoIdentityHex(account.address, nonce);
      const rawBytes = new Uint8Array(await file.arrayBuffer());
      const { encryptedObject } = await currentClient.seal.encrypt({
        threshold: getSealThreshold(),
        packageId,
        id: identityHex,
        data: rawBytes,
      });

      const blobMetadata = await currentClient.walrus.computeBlobMetadata({
        bytes: encryptedObject,
        nonce,
      });

      const platformTreasuryAddress = treasuryAddress;
      const storageDaysClamped = Math.max(
        1,
        Math.min(platform.fees.maxStorageExtensionDays, Math.floor(storageDays)),
      );
      const stakingState = await currentClient.walrus.stakingState();
      const epochDurationSeconds = Math.max(1, Number(stakingState.epoch_duration) || 86_400);
      const storageEpochs = Math.max(
        1,
        Math.ceil((storageDaysClamped * 24 * 60 * 60) / epochDurationSeconds),
      );
      const storageCost = await currentClient.walrus.storageCost(encryptedObject.length, storageEpochs);
      const relayTipMist = await currentClient.walrus.calculateUploadRelayTip({
        size: encryptedObject.length,
      });
      const gasBudgetMist = BigInt(300_000_000);
      const uploadFeeMist = BigInt(platform.fees.uploadFeeMist);
      const relayTipMistBigInt = typeof relayTipMist === "bigint" ? relayTipMist : BigInt(relayTipMist);
      const requiredWalMist = storageCost.totalCost + relayTipMistBigInt;
      const requiredSuiMist = gasBudgetMist + uploadFeeMist;
      const walletSnapshot =
        balances ??
        (await getWalletBalanceSnapshot(
          currentClient as unknown as Parameters<typeof getWalletBalanceSnapshot>[0],
          account.address,
        ));

      if (walletSnapshot.suiBalanceMist < requiredSuiMist) {
        setStatus(
          `Your wallet needs at least ${formatSuiAmount(requiredSuiMist)} SUI for gas and the platform upload fee.`,
        );
        return;
      }

      if (walletSnapshot.walBalanceMist < requiredWalMist) {
        setStatus(
          `Your wallet needs at least ${formatSuiAmount(requiredWalMist)} WAL to own the encrypted blob and pay the upload relay tip.`,
        );
        return;
      }

      const tx = buildPolicyInitTransaction({
        packageId,
        visibility,
        published: publishNow,
        nonce,
        title: title.trim(),
        slug: slugifyText(title),
        ttlDays: storageDaysClamped,
      });
      tx.setSender(account.address);
      tx.setGasBudget(gasBudgetMist);

      if (platform.fees.uploadFeeMist > 0) {
        const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(platform.fees.uploadFeeMist))]);
        tx.transferObjects([feeCoin], tx.pure.address(platformTreasuryAddress));
      }

      await currentClient.walrus.sendUploadRelayTip({
        size: encryptedObject.length,
        blobDigest: blobMetadata.blobDigest,
        nonce: blobMetadata.nonce,
      })(tx);

      await currentClient.walrus.registerBlob({
        size: encryptedObject.length,
        epochs: storageEpochs,
        blobId: blobMetadata.blobId,
        rootHash: blobMetadata.rootHash,
        deletable: false,
        attributes: {
          title: title.trim(),
          category: resolvedCategory,
          visibility,
          creatorAddress: account.address,
          storageOwnerAddress: account.address,
          policyNonce: toHex(nonce),
        },
      })(tx);

      setStatus("Confirm the single wallet signature for Seal, Walrus, and the platform fee...");
      const signedTx = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (signedTx.$kind === "FailedTransaction") {
        throw new Error(signedTx.FailedTransaction.status.error?.message ?? "Upload transaction failed.");
      }

      const pendingUpload: PendingUpload = {
        sealedBytes: encryptedObject,
        originalName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        title: title.trim(),
        description,
        tags,
        category: resolvedCategory,
        visibility,
        publishNow,
        policyNonce: toHex(nonce),
        ownerAddress: account.address,
        ownerName: wallet?.name ?? account.label ?? "Creator",
        walletMode: inferWalletMode(wallet?.name),
        treasuryFeeSui: platform.fees.uploadFeeMist / 1_000_000_000,
        storageDays: storageDaysClamped,
        uploadTxDigest: signedTx.Transaction.digest,
        publishAsBlob,
      };

      pendingUploadRef.current = pendingUpload;
      setStatus("Uploading the encrypted bundle to Walrus...");
      await submitPendingUpload(pendingUpload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function retryUpload() {
    if (!pendingUploadRef.current) {
      setStatus("There is no pending upload to retry.");
      return;
    }

    setSubmitting(true);
    setStatus("Retrying the Walrus upload...");

    try {
      await submitPendingUpload(pendingUploadRef.current);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Retry failed";
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  const fileStats = file
    ? [
        { label: "File name", value: file.name },
        { label: "File size", value: formatBytes(file.size) },
        { label: "Type", value: file.type || "unknown" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <section className="surface p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <span className="badge border-cyan-300/20 bg-cyan-300/12 text-cyan-100">
              <UploadCloud className="size-4" />
              Profile upload
            </span>
            <h1 className="mt-5 text-3xl font-semibold text-white md:text-4xl">
              Encrypt locally, sign once, and register wallet-owned Walrus storage.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              The browser seals the file with Seal, the wallet signs a single SUI transaction that covers the policy,
              Walrus registration, and upload relay tip, and the server finalizes the blob certificate and playback
              record against your wallet address.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="kpi min-w-40">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Wallet</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {account ? wallet?.name ?? account.label ?? "Connected" : "Connect wallet"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {account ? shortAddress(account.address, 5) : "Sui Wallet, Slush, or zkLogin"}
              </p>
            </div>
            <div className="kpi min-w-40">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Upload fee</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {formatSuiAmount(platform.fees.uploadFeeMist)} SUI
                </p>
              <p className="mt-1 text-xs text-slate-400">Editable in the admin fee schedule.</p>
            </div>
            <div className="kpi min-w-40">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Storage term</p>
              <p className="mt-2 text-lg font-semibold text-white">{storageDays} days</p>
              <p className="mt-1 text-xs text-slate-400">Prorated Walrus reservation with a 2 year maximum.</p>
            </div>
          </div>
        </div>
      </section>

      <form className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]" onSubmit={handleSubmit}>
        <section className="surface p-6 md:p-8">
          {!account ? (
            <div className="mb-6 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-semibold text-white">Connect a wallet to continue</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                The upload flow works with Sui Wallet, Slush, and zkLogin. After connect, the form will use the
                current account for Seal encryption and the on-chain policy transaction.
              </p>
              <div className="mt-4">
                <ConnectButton className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/15 hover:bg-white/10">
                  <span>Connect wallet</span>
                </ConnectButton>
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Title</span>
              <input
                className="input mt-2"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Launch trailer, creator drop, live replay..."
                value={title}
              />
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Description</span>
              <textarea
                className="textarea mt-2"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Tell viewers what makes the video worth watching."
                value={description}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">Tags</span>
              <input
                className="input mt-2"
                onChange={(event) => setTags(event.target.value)}
                placeholder="sui, walrus, seal"
                value={tags}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">Category</span>
              <select className="select mt-2" onChange={(event) => setCategory(event.target.value)} value={category}>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">Visibility</span>
              <select
                className="select mt-2"
                onChange={(event) => setVisibility(event.target.value as (typeof visibilities)[number]["value"])}
                value={visibility}
              >
                {visibilities.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">Publish state</span>
              <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                Pick draft to keep the upload private on your profile, or publish now to make it visible in the feed.
              </div>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Blob publishing</span>
              <div className="mt-2 rounded-[24px] border border-white/10 bg-black/20 p-4">
                <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                  <input
                    checked={publishAsBlob}
                    className="size-4 accent-cyan-300"
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setPublishAsBlob(checked);
                      if (checked) {
                        setCategory("Shorts");
                      }
                    }}
                    type="checkbox"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-white">Publish as Blob</span>
                    <span className="block text-xs text-slate-400">
                      Marks the upload for the vertical swipe feed and stores the blob as short-form content.
                    </span>
                  </span>
                </label>
                <p className="mt-3 text-xs leading-6 text-slate-400">
                  Blobs are public, swipeable, and optimized for vertical playback. When enabled, the upload is
                  surfaced in `/blobs` once published.
                </p>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">Storage term</span>
              <select
                className="select mt-2"
                onChange={(event) => setStorageDays(Number(event.target.value))}
                value={storageDays}
              >
                {storageDurationOptions
                  .filter((days) => days <= platform.fees.maxStorageExtensionDays)
                  .map((days) => (
                    <option key={days} value={days}>
                      {days} days
                    </option>
                  ))}
              </select>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Storage is prorated by day and capped at {platform.fees.maxStorageExtensionDays} days.
              </p>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Video file</span>
              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-black/20 px-6 py-8 text-center transition hover:border-cyan-300/30 hover:bg-black/28">
                <FileVideo2 className="size-10 text-cyan-200" />
                <p className="mt-4 text-lg font-semibold text-white">Drop any video format here</p>
                <p className="mt-2 max-w-lg text-sm leading-7 text-slate-400">
                  MP4, MOV, MKV, WEBM, AVI, WMV, FLV, and more. The browser encrypts the file before anything is sent
                  to the server.
                </p>
                <input
                  accept="video/*,.mov,.mkv,.webm,.mp4,.m4v,.avi,.flv,.wmv,.ogv"
                  className="sr-only"
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </label>

            <div className="md:col-span-2 grid gap-3 rounded-[28px] border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <input
                  checked={publishNow}
                  className="size-4 accent-cyan-300"
                  onChange={(event) => setPublishNow(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold text-white">Publish immediately</span>
                  <span className="block text-xs text-slate-400">Create the on-chain policy in a live state.</span>
                </span>
              </label>

              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.32em] text-cyan-100/60">Seal</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  Package {getMvrName() ?? "policy package"} with threshold {getSealThreshold()}
                </p>
                <p className="mt-1 text-xs leading-6 text-slate-400">
                  Uploads are encrypted locally before the SUI transaction is signed.
                </p>
              </div>
            </div>
          </div>

          {file ? (
            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-label">File preview</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{file.name}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                    The browser seals this file and the backend finalizes the encrypted Walrus bundle after your
                    wallet has already registered the storage object.
                  </p>
                </div>
                <LockKeyhole className="size-10 text-cyan-200" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {fileStats.map((item) => (
                  <div key={item.label} className="kpi">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              {previewUrl && file.type.startsWith("video/") ? (
                <video
                  className="mt-5 aspect-video w-full rounded-[24px] border border-white/10 bg-black object-cover"
                  controls
                  src={previewUrl}
                />
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={submitting || !account} type="submit">
              <UploadCloud className="size-4" />
              {submitting ? "Uploading..." : "Seal and upload"}
            </button>
            {pendingUploadRef.current ? (
              <button className="btn-secondary" disabled={submitting} type="button" onClick={retryUpload}>
                <CheckCircle2 className="size-4" />
                Retry Walrus upload
              </button>
            ) : null}
            <Link href="/profile" className="btn-secondary">
              <ArrowRight className="size-4" />
              Open profile
            </Link>
          </div>

          {status ? (
            <div className="mt-4 rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-50">
              {status}
            </div>
          ) : null}

          {result ? (
            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 p-5">
              <p className="section-label">Upload result</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{result.video.title}</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Video ID</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{result.video.id}</p>
                </div>
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Walrus blob</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{result.walrus.blobId}</p>
                </div>
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Policy object</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{result.video.policyObjectId}</p>
                </div>
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Cap object</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{result.video.capObjectId}</p>
                </div>
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Register tx</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{result.walrus.registerTxDigest}</p>
                </div>
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Certify tx</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{result.walrus.certifyTxDigest}</p>
                </div>
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Storage term</p>
                  <p className="mt-2 break-all text-sm font-semibold text-white">{storageDays} days</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                The upload is tied to a single policy object and a single Walrus blob, so the profile can publish,
                unpublish, and renew without re-uploading the video.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={result.publishAsBlob ? `/blobs?blob=${result.video.id}` : `/video/${result.video.id}`} className="btn-primary">
                  Open player
                </Link>
                <Link href="/profile" className="btn-secondary">
                  Open profile
                </Link>
                {result.publishAsBlob ? (
                  <Link href={`/video/${result.video.id}`} className="btn-secondary">
                    Open video page
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="metric-card">
            <p className="section-label">Pipeline</p>
            <div className="mt-4 space-y-3">
              {[
                {
                  title: "1. Connect wallet",
                  description: "Use Sui Wallet, Slush, or zkLogin before you upload.",
                },
                {
                  title: "2. Seal locally",
                  description: "The browser encrypts the raw bytes with Seal using the policy nonce.",
                },
                {
                  title: "3. Sign once",
                  description: "The wallet signs one SUI transaction that covers policy init, WAL registration, and the upload fee.",
                },
                {
                  title: "4. Store on Walrus",
                  description: "The server sends the encrypted bundle to the relay and certifies the blob after the chain confirms.",
                },
              ].map((step) => (
                <div key={step.title} className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  <p className="font-semibold text-white">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="metric-card">
            <p className="section-label">Why it stays easy</p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              {[
                "One browser encryption step, one wallet signature, one WAL-funded upload flow.",
                "The creator cap stays with the profile so publish, unpublish, and renew remain simple.",
                "The upload record stores the policy object, blob id, and wallet address for playback.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <WandSparkles className="mt-1 size-4 shrink-0 text-cyan-200" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="metric-card">
            <p className="section-label">Connected</p>
              <div className="mt-4 rounded-3xl border border-white/8 bg-black/20 p-4 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <span>Wallet</span>
                <span className="font-semibold text-white">
                  {account ? wallet?.name ?? account.label ?? "Connected" : "No wallet"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span>Address</span>
                <span className="font-semibold text-white">
                  {account ? shortAddress(account.address, 4) : "Connect first"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span>SUI balance</span>
                <span className="font-semibold text-white">
                  {balances ? `${formatSuiAmount(balances.suiBalanceMist)} SUI` : "Checking..."}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span>WAL balance</span>
                <span className="font-semibold text-white">
                  {balances ? `${formatSuiAmount(balances.walBalanceMist)} WAL` : "Checking..."}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span>Storage max</span>
                <span className="font-semibold text-white">{platform.fees.maxStorageExtensionDays} days</span>
              </div>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
