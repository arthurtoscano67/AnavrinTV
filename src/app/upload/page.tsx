"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Circle,
  FileVideo2,
  LockKeyhole,
  Square,
  UploadCloud,
  WandSparkles,
} from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount, useCurrentClient, useCurrentWallet, useDAppKit } from "@mysten/dapp-kit-react";
import { toHex } from "@mysten/sui/utils";
import { walrus } from "@mysten/walrus";

import { formatBytes, shortAddress, slugifyText } from "@/lib/format";
import {
  getUploadRelayHost,
  getUploadRelayIdleTimeoutMs,
  getMvrName,
  getNetwork,
  getPolicyPackageId,
  getSealThreshold,
  getUploadTreasuryAddress,
  resolveUploadRelayConfig,
} from "@/lib/anavrin-config";
import { buildApiUrl, getApiOrigin } from "@/lib/site-url";
import { buildPolicyInitTransaction, buildVideoIdentityHex, generateVideoNonce } from "@/lib/video-policy";
import type { AnavrinClient } from "@/lib/anavrin-client";
import { defaultPlatformSettings } from "@/lib/platform-settings";
import { formatMistAsSui, parseSuiAmountToMist } from "@/lib/video-monetization";
import {
  serializeWalrusCertificate,
  uploadBlobToWalrusRelayWithProgress,
  type RelayUploadProgress,
} from "@/lib/walrus-upload-relay";
import { clearWalletBalanceSnapshot, getWalletBalanceSnapshot, type WalletBalanceSnapshot } from "@/lib/wallet-funds";
import type { PlatformSettings, VideoAccessModel, VideoRecord, WalletMode } from "@/lib/types";

const categories = ["Launches", "Music", "Gaming", "DeFi", "Culture", "AI Labs", "Shorts", "Live Events"];
const visibilities = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
  { value: "draft", label: "Draft" },
] as const;
const accessModels: Array<{ value: VideoAccessModel; label: string; detail: string }> = [
  { value: "open", label: "Open", detail: "Anyone with the published page can decrypt playback." },
  { value: "purchase", label: "Purchase only", detail: "Viewers buy a permanent license object." },
  { value: "rental", label: "Rental only", detail: "Viewers rent a time-limited playback pass." },
  {
    value: "purchase_or_rental",
    label: "Purchase or rental",
    detail: "Offer both a permanent license and a timed rental pass.",
  },
];

const storageDurationOptions = [30, 90, 180, 365, 730] as const;
const BLOB_MAX_DURATION_SECONDS = 30;

function inferWalletMode(name?: string | null): WalletMode {
  const normalized = name?.toLowerCase() ?? "";
  if (normalized.includes("slush")) return "slush";
  if (normalized.includes("zk")) return "zklogin";
  if (normalized.includes("wallet")) return "wallet";
  return "guest";
}

type PendingUpload = {
  encryptedSizeBytes: number;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  thumbnailFile: File | null;
  durationSeconds: number;
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
  policyPackageId: string;
  purchasePriceMist: string;
  rentalPriceMist: string;
  rentalDurationDays: number;
  uploadTxDigest: string;
  publishAsBlob: boolean;
  walrus: {
    blobId: string;
    blobObjectId: string;
    certificate: string;
  };
};

type PendingRelayUpload = Omit<PendingUpload, "walrus"> & {
  walrus: {
    blobId: string;
    blobObjectId: string;
    nonce: Uint8Array;
    encryptedBytes: Uint8Array;
    encodingType?: string;
  };
};

type WalrusReadyClient = AnavrinClient & {
  walrus: NonNullable<AnavrinClient["walrus"]>;
};

function formatSuiAmount(mist: bigint | number, digits = 3) {
  return (Number(mist) / 1_000_000_000).toFixed(digits);
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function normalizeVideoExtension(mimeType: string) {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogv";
  return "webm";
}

function formatRelayEta(seconds: number | null) {
  if (!Number.isFinite(seconds) || seconds == null || seconds < 0) return "Calculating ETA";

  const rounded = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  if (hours > 0) {
    return `ETA ${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `ETA ${minutes}:${String(secs).padStart(2, "0")}`;
}

async function readApiError(response: Response, fallback: string) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const looksLikeHtml = contentType.includes("text/html");

  if (response.status === 404 && looksLikeHtml) {
    return "Upload API is unavailable on this host. Deploy the Next.js API server and set NEXT_PUBLIC_API_ORIGIN for static frontend deployments.";
  }

  if (contentType.includes("application/json")) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  }

  return fallback;
}

function describeUploadFailure(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const message = error.message?.trim();
  if (!message) return fallback;

  if (message === "Failed to fetch") {
    const apiOrigin = getApiOrigin();
    if (apiOrigin) {
      return `Could not reach the upload API at ${apiOrigin}. The static frontend and Railway backend are likely out of sync or the backend deployment is unavailable.`;
    }

    return "Could not reach the upload API. This static frontend needs NEXT_PUBLIC_API_ORIGIN set to a live backend.";
  }

  if (
    message === "signal timed out" ||
    message.includes("timed out") ||
    error.name === "TimeoutError"
  ) {
    return "Walrus relay upload timed out before the encrypted blob finished uploading. Retry the relay step without signing again.";
  }

  if (message.includes("stalled before the relay acknowledged the blob")) {
    return "Walrus relay upload stalled before the relay acknowledged the blob. Retry the relay upload without signing again.";
  }

  return message;
}

async function extractVideoDurationSeconds(file: File) {
  return await new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };

    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = Number(video.duration);
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("Could not read video duration."));
        return;
      }
      resolve(duration);
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not read video duration."));
    };
    video.src = url;
  });
}

function requireWalrusClient(client: AnavrinClient): WalrusReadyClient {
  if ((client as WalrusReadyClient).walrus) {
    return client as WalrusReadyClient;
  }

  const extendableClient = client as AnavrinClient & {
    $extend?: (extension: ReturnType<typeof walrus>) => unknown;
  };

  if (typeof extendableClient.$extend !== "function") {
    throw new Error("Walrus client is unavailable. Refresh and retry.");
  }

  const extended = extendableClient.$extend(
    walrus({
      uploadRelay: resolveUploadRelayConfig(getNetwork()) ?? undefined,
    }),
  ) as AnavrinClient;

  if (!(extended as WalrusReadyClient).walrus) {
    throw new Error("Walrus client failed to initialize. Refresh and retry.");
  }

  return extended as WalrusReadyClient;
}

export default function UploadPage() {
  const searchParams = useSearchParams();
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const currentClient = useCurrentClient() as AnavrinClient;
  const blobQuery = searchParams.get("blob");
  const isBlobComposerRoute = blobQuery === "true" || blobQuery === "1";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("sui, walrus, seal");
  const [category, setCategory] = useState("Launches");
  const [visibility, setVisibility] = useState<(typeof visibilities)[number]["value"]>("draft");
  const [publishNow, setPublishNow] = useState(false);
  const [publishAsBlob, setPublishAsBlob] = useState(false);
  const [accessModel, setAccessModel] = useState<VideoAccessModel>("open");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [rentalPrice, setRentalPrice] = useState("");
  const [rentalDurationDays, setRentalDurationDays] = useState(3);
  const [storageDays, setStorageDays] = useState(30);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [checkingDuration, setCheckingDuration] = useState(false);
  const [sourceMode, setSourceMode] = useState<"import" | "record">("import");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
  const [platform, setPlatform] = useState<PlatformSettings>(defaultPlatformSettings());
  const [balances, setBalances] = useState<WalletBalanceSnapshot | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [relayUploadProgress, setRelayUploadProgress] = useState<RelayUploadProgress | null>(null);
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
  const pendingRelayUploadRef = useRef<PendingRelayUpload | null>(null);
  const blobModeSeededRef = useRef(false);
  const recorderVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingTickRef = useRef<number | null>(null);
  const recordingStopTimeoutRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const relayUploadRequestRef = useRef<XMLHttpRequest | null>(null);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const thumbnailPreviewUrl = useMemo(
    () => (thumbnailFile ? URL.createObjectURL(thumbnailFile) : null),
    [thumbnailFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [thumbnailPreviewUrl]);

  useEffect(() => {
    let active = true;

    async function loadPlatform() {
      try {
        const response = await fetch(buildApiUrl("/api/platform"));
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
    if (isBlobComposerRoute) {
      setPublishAsBlob(true);
      setCategory("Shorts");
      setVisibility("public");
      setPublishNow(true);
      setAccessModel("open");
      setPurchasePrice("");
      setRentalPrice("");
    }
    blobModeSeededRef.current = true;
  }, [isBlobComposerRoute]);

  useEffect(() => {
    if (!publishAsBlob) return;
    setCategory("Shorts");
    setVisibility("public");
    setPublishNow(true);
    setAccessModel("open");
  }, [publishAsBlob]);

  useEffect(() => {
    if (accessModel === "open") {
      setPurchasePrice("");
      setRentalPrice("");
      return;
    }

    if (accessModel === "purchase") {
      setRentalPrice("");
      return;
    }

    if (accessModel === "rental") {
      setPurchasePrice("");
    }
  }, [accessModel]);

  useEffect(() => {
    const preview = recorderVideoRef.current;
    if (!preview) return;

    preview.muted = true;
    preview.playsInline = true;
    preview.autoplay = true;
    preview.srcObject = mediaStreamRef.current;
    if (mediaStreamRef.current) {
      void preview.play().catch(() => {
        // autoplay might be blocked until interaction.
      });
    }
  }, [cameraReady, sourceMode]);

  useEffect(() => {
    return () => {
      const relayRequest = relayUploadRequestRef.current;
      if (relayRequest) {
        relayRequest.abort();
      }
      if (recordingTickRef.current) {
        window.clearInterval(recordingTickRef.current);
      }
      if (recordingStopTimeoutRef.current) {
        window.clearTimeout(recordingStopTimeoutRef.current);
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      const stream = mediaStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      mediaRecorderRef.current = null;
      mediaStreamRef.current = null;
    };
  }, []);

  function clearRecordingTimers() {
    if (recordingTickRef.current) {
      window.clearInterval(recordingTickRef.current);
      recordingTickRef.current = null;
    }
    if (recordingStopTimeoutRef.current) {
      window.clearTimeout(recordingStopTimeoutRef.current);
      recordingStopTimeoutRef.current = null;
    }
    recordingStartedAtRef.current = null;
  }

  async function selectVideoFile(nextFile: File | null, fallbackDurationSeconds?: number) {
    pendingUploadRef.current = null;
    pendingRelayUploadRef.current = null;
    setRelayUploadProgress(null);

    if (!nextFile) {
      setFile(null);
      setDurationSeconds(null);
      return false;
    }

    if (!nextFile.type.startsWith("video/")) {
      setStatus("Please select a video file.");
      setFile(null);
      setDurationSeconds(null);
      return false;
    }

    setCheckingDuration(true);
    try {
      let resolvedDuration: number;
      try {
        resolvedDuration = await extractVideoDurationSeconds(nextFile);
      } catch (error) {
        if (Number.isFinite(fallbackDurationSeconds) && (fallbackDurationSeconds ?? 0) > 0) {
          resolvedDuration = Number(fallbackDurationSeconds);
        } else if (publishAsBlob) {
          throw error;
        } else {
          resolvedDuration = 0;
        }
      }

      if (publishAsBlob && resolvedDuration > BLOB_MAX_DURATION_SECONDS) {
        setStatus(
          `Blob videos are limited to ${BLOB_MAX_DURATION_SECONDS} seconds. Current file is ${formatDuration(resolvedDuration)}.`,
        );
        setFile(null);
        setDurationSeconds(null);
        return false;
      }

      setFile(nextFile);
      setDurationSeconds(resolvedDuration > 0 ? resolvedDuration : null);
      setStatus(null);
      return true;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not read video metadata.");
      setFile(null);
      setDurationSeconds(null);
      return false;
    } finally {
      setCheckingDuration(false);
    }
  }

  async function handleVideoInputChange(fileInput?: File | null) {
    const nextFile = fileInput ?? null;
    const selected = await selectVideoFile(nextFile);
    if (!selected) return;
    setSourceMode("import");
  }

  function selectThumbnailFile(nextFile: File | null) {
    if (!nextFile) {
      setThumbnailFile(null);
      return;
    }

    if (!nextFile.type.startsWith("image/")) {
      setStatus("Thumbnail must be an image file.");
      setThumbnailFile(null);
      return;
    }

    setThumbnailFile(nextFile);
    setStatus(null);
  }

  function stopCameraSession() {
    clearRecordingTimers();
    setRecording(false);
    setRecordingElapsedSeconds(0);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    mediaRecorderRef.current = null;

    const stream = mediaStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    const preview = recorderVideoRef.current;
    if (preview) {
      preview.srcObject = null;
    }
    setCameraReady(false);
  }

  async function enableCamera() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera recording is not supported in this browser.");
      return;
    }

    try {
      setCameraError(null);
      if (mediaStreamRef.current) {
        setCameraReady(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: true,
      });
      mediaStreamRef.current = stream;
      setCameraReady(true);
      setStatus("Camera ready. Record up to 30 seconds.");
    } catch (error) {
      setCameraReady(false);
      setCameraError(error instanceof Error ? error.message : "Camera permission was denied.");
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    clearRecordingTimers();
    recorder.stop();
    setRecording(false);
  }

  async function startRecording() {
    const stream = mediaStreamRef.current;
    if (!stream) {
      setCameraError("Enable camera access before recording.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setCameraError("MediaRecorder is not available in this browser.");
      return;
    }

    if (recording) return;

    try {
      const preferredMimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const selectedMimeType = preferredMimeTypes.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
      const recorder = selectedMimeType ? new MediaRecorder(stream, { mimeType: selectedMimeType }) : new MediaRecorder(stream);

      recordingChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      setCameraError(null);
      setRecording(true);
      setRecordingElapsedSeconds(0);
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setCameraError("Recording failed. Please try again.");
        clearRecordingTimers();
        setRecording(false);
      };

      recorder.onstop = () => {
        const startedAt = recordingStartedAtRef.current;
        const elapsedByClock = startedAt ? Math.ceil((Date.now() - startedAt) / 1000) : 0;
        const fallbackDurationSeconds = Math.min(
          BLOB_MAX_DURATION_SECONDS,
          Math.max(1, elapsedByClock || Number(recordingElapsedSeconds || 0)),
        );
        clearRecordingTimers();
        setRecording(false);

        if (!recordingChunksRef.current.length) {
          setCameraError("No recording data was captured.");
          return;
        }

        const resolvedMimeType =
          recorder.mimeType || (recordingChunksRef.current[0] instanceof Blob ? recordingChunksRef.current[0].type : "") || "video/webm";
        const extension = normalizeVideoExtension(resolvedMimeType);
        const recordingBlob = new Blob(recordingChunksRef.current, { type: resolvedMimeType });
        const recordingFile = new File([recordingBlob], `blob-recording-${Date.now()}.${extension}`, {
          type: resolvedMimeType,
        });
        void selectVideoFile(recordingFile, fallbackDurationSeconds);
        setStatus("Recording captured. Ready to sign and publish your Blob.");
        setSourceMode("import");
        stopCameraSession();
      };

      recorder.start(250);

      recordingTickRef.current = window.setInterval(() => {
        const startedAt = recordingStartedAtRef.current;
        if (!startedAt) return;
        const elapsed = Math.min(BLOB_MAX_DURATION_SECONDS, Math.floor((Date.now() - startedAt) / 1000));
        setRecordingElapsedSeconds(elapsed);
      }, 200);

      recordingStopTimeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, BLOB_MAX_DURATION_SECONDS * 1000);
    } catch (error) {
      setRecording(false);
      setCameraError(error instanceof Error ? error.message : "Could not start recording.");
    }
  }

  function buildPendingUploadFromRelayUpload(pending: PendingRelayUpload, certificate: string): PendingUpload {
    return {
      ...pending,
      walrus: {
        blobId: pending.walrus.blobId,
        blobObjectId: pending.walrus.blobObjectId,
        certificate,
      },
    };
  }

  async function uploadPendingRelayBundle(pending: PendingRelayUpload) {
    const relayHost = getUploadRelayHost(getNetwork());
    if (!relayHost) {
      throw new Error("Walrus upload relay host is not configured.");
    }

    let currentStage: RelayUploadProgress["stage"] = "uploading";
    const certificate = await uploadBlobToWalrusRelayWithProgress({
      host: relayHost,
      blobId: pending.walrus.blobId,
      blob: pending.walrus.encryptedBytes,
      nonce: pending.walrus.nonce,
      txDigest: pending.uploadTxDigest,
      blobObjectId: pending.walrus.blobObjectId,
      deletable: false,
      encodingType: pending.walrus.encodingType,
      idleTimeoutMs: getUploadRelayIdleTimeoutMs(),
      onRequestReady: (request) => {
        relayUploadRequestRef.current = request;
      },
      onProgress: (progress) => {
        setRelayUploadProgress(progress);
        if (progress.stage !== currentStage) {
          currentStage = progress.stage;
          if (progress.stage === "awaiting_certificate") {
            setStatus(
              "Encrypted bytes uploaded. Waiting for the Walrus relay to return the availability certificate...",
            );
          }
        }
      },
    });

    setRelayUploadProgress(null);
    return buildPendingUploadFromRelayUpload(pending, serializeWalrusCertificate(certificate));
  }

  async function submitPendingUpload(pending: PendingUpload) {
    const formData = new FormData();
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
    formData.append("policyPackageId", pending.policyPackageId);
    formData.append("policyNonce", pending.policyNonce);
    formData.append("purchasePriceMist", pending.purchasePriceMist);
    formData.append("rentalPriceMist", pending.rentalPriceMist);
    formData.append("rentalDurationDays", String(pending.rentalDurationDays));
    formData.append("uploadTxDigest", pending.uploadTxDigest);
    formData.append("storageDays", String(pending.storageDays));
    formData.append("originalName", pending.originalName);
    formData.append("contentType", pending.contentType);
    formData.append("sizeBytes", String(pending.sizeBytes));
    formData.append("durationSeconds", String(pending.durationSeconds));
    formData.append("encryptedSizeBytes", String(pending.encryptedSizeBytes));
    formData.append("walrusBlobId", pending.walrus.blobId);
    formData.append("walrusBlobObjectId", pending.walrus.blobObjectId);
    formData.append("walrusCertificate", pending.walrus.certificate);
    if (pending.thumbnailFile) {
      formData.append("thumbnail", pending.thumbnailFile, pending.thumbnailFile.name || "thumbnail");
    }

    const response = await fetch(buildApiUrl("/api/videos"), {
      method: "POST",
      body: formData,
      headers: {
        "x-anavrin-actor-address": pending.ownerAddress,
      },
    });

    if (!response.ok) {
      throw new Error(await readApiError(response, "Upload failed"));
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
    pendingRelayUploadRef.current = null;
    setRelayUploadProgress(null);
    setTitle("");
    setDescription("");
    setTags("sui, walrus, seal");
    setCategory("Launches");
    setVisibility("draft");
    setPublishNow(false);
    setPublishAsBlob(false);
    setAccessModel("open");
    setPurchasePrice("");
    setRentalPrice("");
    setRentalDurationDays(3);
    setStorageDays(30);
    setFile(null);
    setThumbnailFile(null);
    setDurationSeconds(null);
    setSourceMode("import");
    setCameraError(null);
    if (isBlobComposerRoute) {
      setPublishAsBlob(true);
      setCategory("Shorts");
      setVisibility("public");
      setPublishNow(true);
    }
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

    if (checkingDuration) {
      setStatus("Reading video metadata. Please wait a moment.");
      return;
    }

    let resolvedDurationSeconds = durationSeconds ?? 0;
    if (!Number.isFinite(resolvedDurationSeconds) || resolvedDurationSeconds <= 0) {
      try {
        resolvedDurationSeconds = await extractVideoDurationSeconds(file);
      } catch {
        resolvedDurationSeconds = 0;
      }
    }

    if (publishAsBlob && (!Number.isFinite(resolvedDurationSeconds) || resolvedDurationSeconds <= 0)) {
      setStatus("Blob uploads require a readable video duration (max 30 seconds).");
      return;
    }

    if (publishAsBlob && resolvedDurationSeconds > BLOB_MAX_DURATION_SECONDS) {
      setStatus(
        `Blob videos are limited to ${BLOB_MAX_DURATION_SECONDS} seconds. Current file is ${formatDuration(resolvedDurationSeconds)}.`,
      );
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

    const resolvedVisibility = publishAsBlob ? "public" : visibility;
    const resolvedPublishNow = publishAsBlob ? true : publishNow;
    const resolvedCategory = publishAsBlob ? "Shorts" : category;
    const resolvedAccessModel = publishAsBlob ? "open" : accessModel;
    const purchasePriceMist =
      resolvedAccessModel === "purchase" || resolvedAccessModel === "purchase_or_rental"
        ? parseSuiAmountToMist(purchasePrice)
        : BigInt(0);
    const rentalPriceMist =
      resolvedAccessModel === "rental" || resolvedAccessModel === "purchase_or_rental"
        ? parseSuiAmountToMist(rentalPrice)
        : BigInt(0);
    const rentalDurationDaysClamped =
      resolvedAccessModel === "rental" || resolvedAccessModel === "purchase_or_rental"
        ? Math.max(1, Math.min(30, Math.floor(rentalDurationDays)))
        : 0;

    if (purchasePriceMist == null) {
      setStatus("Enter a valid SUI amount for the purchase price.");
      return;
    }

    if (rentalPriceMist == null) {
      setStatus("Enter a valid SUI amount for the rental price.");
      return;
    }

    if (
      (resolvedAccessModel === "purchase" || resolvedAccessModel === "purchase_or_rental") &&
      purchasePriceMist <= BigInt(0)
    ) {
      setStatus("Purchase-enabled releases need a purchase price above 0 SUI.");
      return;
    }

    if (
      (resolvedAccessModel === "rental" || resolvedAccessModel === "purchase_or_rental") &&
      rentalPriceMist <= BigInt(0)
    ) {
      setStatus("Rental-enabled releases need a rental price above 0 SUI.");
      return;
    }

    pendingUploadRef.current = null;
    pendingRelayUploadRef.current = null;
    setRelayUploadProgress(null);
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
      const walrusClient = requireWalrusClient(currentClient);

      const blobMetadata = await walrusClient.walrus.computeBlobMetadata({
        bytes: encryptedObject,
        nonce,
      });

      const platformTreasuryAddress = treasuryAddress;
      const storageDaysClamped = Math.max(
        1,
        Math.min(platform.fees.maxStorageExtensionDays, Math.floor(storageDays)),
      );
      const stakingState = await walrusClient.walrus.stakingState();
      const epochDurationSeconds = Math.max(1, Number(stakingState.epoch_duration) || 86_400);
      const storageEpochs = Math.max(
        1,
        Math.ceil((storageDaysClamped * 24 * 60 * 60) / epochDurationSeconds),
      );
      const storageCost = await walrusClient.walrus.storageCost(encryptedObject.length, storageEpochs);
      const relayTipMist = await walrusClient.walrus.calculateUploadRelayTip({
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
          walrusClient as unknown as Parameters<typeof getWalletBalanceSnapshot>[0],
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
        visibility: resolvedVisibility,
        published: resolvedPublishNow,
        nonce,
        title: title.trim(),
        slug: slugifyText(title),
        ttlDays: storageDaysClamped,
        purchasePriceMist,
        rentalPriceMist,
        rentalDurationDays: rentalDurationDaysClamped,
      });
      tx.setSender(account.address);
      tx.setGasBudget(gasBudgetMist);

      if (platform.fees.uploadFeeMist > 0) {
        const [feeCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(BigInt(platform.fees.uploadFeeMist))]);
        tx.transferObjects([feeCoin], tx.pure.address(platformTreasuryAddress));
      }

      await walrusClient.walrus.sendUploadRelayTip({
        size: encryptedObject.length,
        blobDigest: blobMetadata.blobDigest,
        nonce: blobMetadata.nonce,
      })(tx);

      const registeredBlob = await walrusClient.walrus.registerBlob({
        size: encryptedObject.length,
        epochs: storageEpochs,
        blobId: blobMetadata.blobId,
        rootHash: blobMetadata.rootHash,
        deletable: false,
        attributes: {
          title: title.trim(),
          category: resolvedCategory,
          visibility: resolvedVisibility,
          accessModel: resolvedAccessModel,
          purchasePriceMist: purchasePriceMist > BigInt(0) ? purchasePriceMist.toString() : "",
          rentalPriceMist: rentalPriceMist > BigInt(0) ? rentalPriceMist.toString() : "",
          rentalDurationDays: rentalDurationDaysClamped ? String(rentalDurationDaysClamped) : "",
          creatorAddress: account.address,
          storageOwnerAddress: account.address,
          policyNonce: toHex(nonce),
        },
      })(tx);
      tx.transferObjects([registeredBlob], account.address);

      setStatus("Confirm the single wallet signature for Seal, Walrus, and the platform fee...");
      const signedTx = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (signedTx.$kind === "FailedTransaction") {
        throw new Error(signedTx.FailedTransaction.status.error?.message ?? "Upload transaction failed.");
      }

      setStatus("Waiting for the Walrus registration objects...");
      const finalizedTx = await walrusClient.core.waitForTransaction({
        digest: signedTx.Transaction.digest,
        include: { objectTypes: true },
      });
      if (finalizedTx.$kind === "FailedTransaction") {
        throw new Error(finalizedTx.FailedTransaction.status.error?.message ?? "Upload transaction failed.");
      }

      const blobType = await walrusClient.walrus.getBlobType();
      const blobObjectId = Object.entries(finalizedTx.Transaction.objectTypes ?? {}).find(
        ([, type]) => type === blobType,
      )?.[0];
      if (!blobObjectId) {
        throw new Error("Could not resolve the Walrus blob object from the upload transaction.");
      }

      setStatus("Uploading the encrypted bundle to the Walrus relay...");
      const pendingRelayUpload: PendingRelayUpload = {
        encryptedSizeBytes: encryptedObject.length,
        originalName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        thumbnailFile,
        title: title.trim(),
        description,
        tags,
        category: resolvedCategory,
        visibility: resolvedVisibility,
        publishNow: resolvedPublishNow,
        policyNonce: toHex(nonce),
        ownerAddress: account.address,
        ownerName: wallet?.name ?? account.label ?? "Creator",
        walletMode: inferWalletMode(wallet?.name),
        treasuryFeeSui: platform.fees.uploadFeeMist / 1_000_000_000,
        storageDays: storageDaysClamped,
        policyPackageId: packageId,
        purchasePriceMist: purchasePriceMist.toString(),
        rentalPriceMist: rentalPriceMist.toString(),
        rentalDurationDays: rentalDurationDaysClamped,
        durationSeconds: resolvedDurationSeconds,
        uploadTxDigest: signedTx.Transaction.digest,
        publishAsBlob,
        walrus: {
          blobId: blobMetadata.blobId,
          blobObjectId,
          nonce,
          encryptedBytes: encryptedObject,
          encodingType: blobMetadata.metadata.encodingType,
        },
      };
      pendingRelayUploadRef.current = pendingRelayUpload;
      const pendingUpload = await uploadPendingRelayBundle(pendingRelayUpload);
      pendingUploadRef.current = pendingUpload;
      pendingRelayUploadRef.current = null;
      setStatus("Finalizing the Walrus upload...");
      await submitPendingUpload(pendingUpload);
    } catch (error) {
      const message = describeUploadFailure(error, "Upload failed");
      setRelayUploadProgress(null);
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function retryUpload() {
    if (!pendingUploadRef.current && !pendingRelayUploadRef.current) {
      setStatus("There is no pending upload to retry.");
      return;
    }

    setSubmitting(true);
    setRelayUploadProgress(null);

    try {
      if (pendingRelayUploadRef.current) {
        setStatus("Retrying the Walrus relay upload...");
        const pendingUpload = await uploadPendingRelayBundle(pendingRelayUploadRef.current);
        pendingUploadRef.current = pendingUpload;
        pendingRelayUploadRef.current = null;
      }

      if (!pendingUploadRef.current) {
        throw new Error("There is no finalized Walrus upload to submit.");
      }

      setStatus("Finalizing the Walrus upload...");
      await submitPendingUpload(pendingUploadRef.current);
    } catch (error) {
      const message = describeUploadFailure(error, "Retry failed");
      setRelayUploadProgress(null);
      setStatus(message);
    } finally {
      setSubmitting(false);
    }
  }

  const canRetryUpload = Boolean(pendingUploadRef.current || pendingRelayUploadRef.current);
  const fileStats = file
    ? [
        { label: "File name", value: file.name },
        { label: "File size", value: formatBytes(file.size) },
        { label: "Type", value: file.type || "unknown" },
        { label: "Duration", value: durationSeconds ? formatDuration(durationSeconds) : "Unknown" },
      ]
    : [];
  const supportsPurchase = accessModel === "purchase" || accessModel === "purchase_or_rental";
  const supportsRental = accessModel === "rental" || accessModel === "purchase_or_rental";

  return (
    <div className="space-y-6">
      <section className="surface p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <span className="badge border-red-300/20 bg-red-300/12 text-red-100">
              <UploadCloud className="size-4" />
              {isBlobComposerRoute ? "Create blob" : "Profile upload"}
            </span>
            <h1 className="mt-5 text-3xl font-semibold text-white md:text-4xl">
              {isBlobComposerRoute
                ? "Import or record a 30-second blob, then sign once to publish."
                : "Encrypt locally, sign once, and register wallet-owned Walrus storage."}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              {isBlobComposerRoute
                ? "Choose an imported short video or record from camera + mic. The browser seals it with Seal, your wallet signs once, and the encrypted blob is stored on Walrus then published to the swipe feed."
                : "The browser seals the file with Seal, the wallet signs a single SUI transaction that covers the policy, Walrus registration, and upload relay tip, and the server finalizes the blob certificate and playback record against your wallet address."}
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
                disabled={isBlobComposerRoute || publishAsBlob}
                value={visibility}
              >
                {visibilities.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              {isBlobComposerRoute || publishAsBlob ? (
                <p className="mt-2 text-xs leading-6 text-slate-400">Blob uploads are always published publicly.</p>
              ) : null}
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-200">Publish state</span>
              <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300">
                {isBlobComposerRoute || publishAsBlob
                  ? "Blob mode signs and publishes immediately after Walrus upload completes."
                  : "Pick draft to keep the upload private on your profile, or publish now to make it visible in the feed."}
              </div>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Blob publishing</span>
              <div className="mt-2 rounded-[24px] border border-white/10 bg-black/20 p-4">
                <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                  <input
                    checked={publishAsBlob}
                    className="size-4 accent-red-300"
                    disabled={isBlobComposerRoute}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setPublishAsBlob(checked);
                      if (checked) {
                        setCategory("Shorts");
                        setAccessModel("open");
                        setPurchasePrice("");
                        setRentalPrice("");
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
                {publishAsBlob ? (
                  <p className="mt-2 text-xs leading-6 text-red-100">
                    Blob V1 limit: videos must be 30 seconds or shorter.
                  </p>
                ) : null}
              </div>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Release access</span>
              <div className="mt-2 rounded-[24px] border border-white/10 bg-black/20 p-4">
                <select
                  className="select"
                  disabled={publishAsBlob}
                  onChange={(event) => setAccessModel(event.target.value as VideoAccessModel)}
                  value={accessModel}
                >
                  {accessModels.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="mt-3 text-xs leading-6 text-slate-400">
                  {publishAsBlob
                    ? "Blob videos stay open so the swipe feed can play instantly."
                    : accessModels.find((item) => item.value === accessModel)?.detail}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-500">
                  Paid releases mint a Sui entitlement object that viewers can keep in wallet now and move into a kiosk
                  later without re-uploading the encrypted video.
                </p>

                {!publishAsBlob && accessModel !== "open" ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {supportsPurchase ? (
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Purchase price
                        </span>
                        <input
                          className="input mt-2"
                          inputMode="decimal"
                          onChange={(event) => setPurchasePrice(event.target.value)}
                          placeholder="12.5"
                          value={purchasePrice}
                        />
                        <p className="mt-2 text-xs leading-6 text-slate-500">
                          Permanent license minted to the buyer.
                        </p>
                      </label>
                    ) : (
                      <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-xs leading-6 text-slate-500">
                        Purchase is disabled for this release.
                      </div>
                    )}

                    {supportsRental ? (
                      <>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                            Rental price
                          </span>
                          <input
                            className="input mt-2"
                            inputMode="decimal"
                            onChange={(event) => setRentalPrice(event.target.value)}
                            placeholder="3.99"
                            value={rentalPrice}
                          />
                          <p className="mt-2 text-xs leading-6 text-slate-500">
                            Time-limited pass minted to the buyer.
                          </p>
                        </label>

                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                            Rental term
                          </span>
                          <input
                            className="input mt-2"
                            inputMode="numeric"
                            min={1}
                            max={30}
                            onChange={(event) => setRentalDurationDays(Number(event.target.value) || 1)}
                            type="number"
                            value={rentalDurationDays}
                          />
                          <p className="mt-2 text-xs leading-6 text-slate-500">Measured in days on-chain.</p>
                        </label>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-xs leading-6 text-slate-500 md:col-span-2">
                        Rentals are disabled for this release.
                      </div>
                    )}
                  </div>
                ) : null}

                {!publishAsBlob && accessModel !== "open" ? (
                  <div className="mt-4 rounded-2xl border border-red-300/12 bg-red-300/10 px-4 py-3 text-sm text-red-50">
                    {supportsPurchase ? `Buy: ${formatMistAsSui(parseSuiAmountToMist(purchasePrice) ?? BigInt(0))} SUI` : "Buy: off"}
                    {" • "}
                    {supportsRental
                      ? `Rent: ${formatMistAsSui(parseSuiAmountToMist(rentalPrice) ?? BigInt(0))} SUI / ${Math.max(1, rentalDurationDays)} day${Math.max(1, rentalDurationDays) === 1 ? "" : "s"}`
                      : "Rent: off"}
                  </div>
                ) : null}
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

            <div className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">
                {publishAsBlob ? "Blob source (max 30s)" : "Video file"}
              </span>

              {publishAsBlob ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <button
                    className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                      sourceMode === "import"
                        ? "border-red-300/35 bg-red-300/15 text-red-100"
                        : "border-white/10 bg-white/5 text-slate-200 hover:border-red-300/30"
                    }`}
                    onClick={() => setSourceMode("import")}
                    type="button"
                  >
                    <FileVideo2 className="mr-2 inline size-4" />
                    Import video
                  </button>
                  <button
                    className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                      sourceMode === "record"
                        ? "border-red-300/35 bg-red-300/15 text-red-100"
                        : "border-white/10 bg-white/5 text-slate-200 hover:border-red-300/30"
                    }`}
                    onClick={() => setSourceMode("record")}
                    type="button"
                  >
                    <Camera className="mr-2 inline size-4" />
                    Record with camera
                  </button>
                </div>
              ) : null}

              {!publishAsBlob || sourceMode === "import" ? (
                <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-white/12 bg-black/20 px-6 py-8 text-center transition hover:border-red-300/30 hover:bg-black/28">
                  <FileVideo2 className="size-10 text-red-200" />
                  <p className="mt-4 text-lg font-semibold text-white">
                    {publishAsBlob ? "Import a short video" : "Drop any video format here"}
                  </p>
                  <p className="mt-2 max-w-lg text-sm leading-7 text-slate-400">
                    {publishAsBlob
                      ? "MP4, MOV, MKV, WEBM, AVI, WMV, FLV, and more. Blob V1 accepts up to 30 seconds."
                      : "MP4, MOV, MKV, WEBM, AVI, WMV, FLV, and more. The browser encrypts the file before anything is sent to the server."}
                  </p>
                  <input
                    accept="video/*,.mov,.mkv,.webm,.mp4,.m4v,.avi,.flv,.wmv,.ogv"
                    className="sr-only"
                    type="file"
                    onChange={async (event) => {
                      await handleVideoInputChange(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              ) : null}

              {publishAsBlob && sourceMode === "record" ? (
                <div className="mt-2 rounded-[28px] border border-white/10 bg-black/20 p-4">
                  {!cameraReady ? (
                    <div className="space-y-3">
                      <p className="text-sm leading-7 text-slate-300">
                        Allow camera and microphone access to record a blob. Recording stops automatically at 30
                        seconds.
                      </p>
                      <button className="btn-secondary px-4 py-2.5 text-sm" onClick={enableCamera} type="button">
                        <Camera className="size-4" />
                        Allow camera + mic
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <video
                        ref={recorderVideoRef}
                        autoPlay
                        className="aspect-[9/16] max-h-[420px] w-full rounded-2xl border border-white/10 bg-black object-cover"
                        muted
                        playsInline
                      />
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-300">
                          {recording ? "Recording..." : "Ready to record"} {formatDuration(recordingElapsedSeconds)} /{" "}
                          {formatDuration(BLOB_MAX_DURATION_SECONDS)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {!recording ? (
                            <button className="btn-primary px-4 py-2.5 text-sm" onClick={startRecording} type="button">
                              <Circle className="size-4" />
                              Start recording
                            </button>
                          ) : (
                            <button className="btn-danger px-4 py-2.5 text-sm" onClick={stopRecording} type="button">
                              <Square className="size-4" />
                              Stop
                            </button>
                          )}
                          <button className="btn-secondary px-4 py-2.5 text-sm" onClick={stopCameraSession} type="button">
                            Turn off camera
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {cameraError ? (
                    <p className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
                      {cameraError}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {checkingDuration ? (
                <p className="mt-2 text-xs text-slate-400">Reading video duration...</p>
              ) : null}
            </div>

            <div className="block md:col-span-2">
              <span className="text-sm font-medium text-slate-200">Thumbnail image (optional)</span>
              <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-white/12 bg-black/20 px-6 py-6 text-center transition hover:border-red-300/30 hover:bg-black/28">
                <p className="text-sm font-semibold text-white">
                  {thumbnailFile ? "Replace thumbnail image" : "Upload thumbnail image"}
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-400">
                  JPG, PNG, WEBP, GIF, or AVIF. Used across feed cards, profile cards, and blob posters.
                </p>
                <input
                  accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif"
                  className="sr-only"
                  type="file"
                  onChange={(event) => {
                    selectThumbnailFile(event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            <div className="md:col-span-2 grid gap-3 rounded-[28px] border border-white/10 bg-black/20 p-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <input
                  checked={publishNow}
                  className="size-4 accent-red-300"
                  disabled={isBlobComposerRoute || publishAsBlob}
                  onChange={(event) => setPublishNow(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  <span className="block text-sm font-semibold text-white">Publish immediately</span>
                  <span className="block text-xs text-slate-400">Create the on-chain policy in a live state.</span>
                </span>
              </label>

              <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.32em] text-red-100/60">Seal</p>
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
                    The browser seals this file and uploads the encrypted bytes to Walrus after your wallet has
                    already registered the storage object. The backend only certifies the blob and stores the
                    finalized video record.
                  </p>
                </div>
                <LockKeyhole className="size-10 text-red-200" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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

              {thumbnailPreviewUrl ? (
                <div className="mt-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Thumbnail preview</p>
                  <img
                    alt="Upload thumbnail preview"
                    className="mt-2 aspect-video w-full rounded-[24px] border border-white/10 bg-black object-cover"
                    draggable={false}
                    loading="lazy"
                    src={thumbnailPreviewUrl}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn-primary" disabled={submitting || !account || checkingDuration} type="submit">
              <UploadCloud className="size-4" />
              {submitting ? "Uploading..." : publishAsBlob ? "Sign, store, and publish Blob" : "Seal and upload"}
            </button>
            {canRetryUpload ? (
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

          {relayUploadProgress ? (
            <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  {relayUploadProgress.stage === "uploading"
                    ? "Uploading encrypted bytes to Walrus"
                    : "Encrypted bytes sent. Waiting for the Walrus certificate"}
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-100/70">
                  {Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round((relayUploadProgress.loadedBytes / Math.max(1, relayUploadProgress.totalBytes)) * 100),
                    ),
                  )}
                  %
                </p>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-red-300 transition-[width] duration-300"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        (relayUploadProgress.loadedBytes / Math.max(1, relayUploadProgress.totalBytes)) * 100,
                      ),
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs leading-6 text-slate-300">
                <span>
                  {formatBytes(relayUploadProgress.loadedBytes)} / {formatBytes(relayUploadProgress.totalBytes)}
                </span>
                <span>
                  {relayUploadProgress.stage === "uploading" && relayUploadProgress.bytesPerSecond
                    ? `${formatBytes(relayUploadProgress.bytesPerSecond)}/s`
                    : relayUploadProgress.stage === "uploading"
                      ? "Calculating speed"
                      : "Encrypted bytes uploaded"}
                </span>
                <span>
                  {relayUploadProgress.stage === "uploading"
                    ? formatRelayEta(relayUploadProgress.etaSeconds)
                    : "Relay is encoding the blob and returning the certificate"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Keep this tab open. If the relay step fails, you can retry it without signing the wallet transaction
                again.
              </p>
            </div>
          ) : null}

          {status ? (
            <div className="mt-4 rounded-[24px] border border-red-300/20 bg-red-300/10 p-4 text-sm leading-7 text-red-50">
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
                  description:
                    "The browser sends the encrypted bundle to the Walrus relay, and the backend certifies the blob after the chain confirms.",
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
                  <WandSparkles className="mt-1 size-4 shrink-0 text-red-200" />
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
