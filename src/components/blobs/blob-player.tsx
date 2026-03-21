"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Heart,
  Loader2,
  LockKeyhole,
  Maximize2,
  Smartphone,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCurrentAccount, useCurrentClient, useCurrentNetwork, useDAppKit } from "@mysten/dapp-kit-react";
import { fromHex } from "@mysten/sui/utils";

import { getPolicyPackageId } from "@/lib/anavrin-config";
import type { AnavrinClient } from "@/lib/anavrin-client";
import { buildSealApprovalTransaction } from "@/lib/video-policy";
import { getSessionKeyForAccount } from "@/lib/seal-session";
import type { BlobItem } from "@/lib/blobs";

type BlobPlayerProps = {
  blob: BlobItem;
  active: boolean;
  shouldLoad: boolean;
  muted: boolean;
  paused: boolean;
  likePulseKey: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onLike: () => void;
};

function toArrayBuffer(bytes: Uint8Array<ArrayBufferLike>) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function PosterFallback({ blob }: { blob: BlobItem }) {
  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{
        backgroundImage: `url("${blob.posterUrl ?? blob.thumbnailUrl}")`,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.12),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.78))]" />
    </div>
  );
}

export function BlobPlayer({
  blob,
  active,
  shouldLoad,
  muted,
  paused,
  likePulseKey,
  onTogglePlay,
  onToggleMute,
  onLike,
}: BlobPlayerProps) {
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const network = useCurrentNetwork();
  const currentClient = useCurrentClient() as AnavrinClient;
  const playerShellRef = useRef<HTMLDivElement | null>(null);
  const fullscreenHostRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const tapTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const holdPauseRef = useRef(false);
  const lastPulseKeyRef = useRef(likePulseKey);
  const scrollRestoreRef = useRef(0);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [heartPulse, setHeartPulse] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [gestureUnlocked, setGestureUnlocked] = useState(false);
  const [landscapeViewport, setLandscapeViewport] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [fullscreenPending, setFullscreenPending] = useState(false);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);
  const [fullscreenHint, setFullscreenHint] = useState<string | null>(null);

  function isIosMobile() {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  const tryLockLandscape = useCallback(async () => {
    const orientationApi = (screen as Screen & { orientation?: { lock?: (orientation: string) => Promise<void> } }).orientation;
    if (!orientationApi?.lock) return;
    try {
      await orientationApi.lock("landscape");
    } catch {
      // Browser can reject lock outside fullscreen or unsupported contexts.
    }
  }, []);

  const requestLandscapeFullscreen = useCallback(async () => {
    const host = fullscreenHostRef.current;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!host || !video) return false;
    if (typeof window !== "undefined") {
      scrollRestoreRef.current = window.scrollY || window.pageYOffset || 0;
    }

    setFullscreenPending(true);
    setFullscreenHint(null);

    try {
      if (document.fullscreenElement !== host && host.requestFullscreen) {
        await host.requestFullscreen();
      }
      setFullscreenActive(true);
      setShowRotatePrompt(false);
      return true;
    } catch {
      if (isIosMobile() && typeof video.webkitEnterFullscreen === "function") {
        try {
          video.webkitEnterFullscreen();
          setFullscreenActive(true);
          setShowRotatePrompt(false);
          return true;
        } catch {
          // fall through to rotate prompt.
        }
      }
      setFullscreenHint("Rotate to landscape and tap Fullscreen.");
      setShowRotatePrompt(true);
      return false;
    } finally {
      setFullscreenPending(false);
    }
  }, []);

  const exitFullscreenIfNeeded = useCallback(async () => {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore exit failures.
    }
  }, []);

  async function handleFullscreenButton() {
    setGestureUnlocked(true);
    await tryLockLandscape();
    await requestLandscapeFullscreen();
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!active || paused || !sourceUrl) {
      video.pause();
      return;
    }

    const playVideo = async () => {
      try {
        await video.play();
      } catch {
        // Ignore autoplay failures and let the tap control recover playback.
      }
    };

    void playVideo();
  }, [active, paused, sourceUrl]);

  useEffect(() => {
    let revokedUrl: string | null = null;
    let cancelled = false;

    async function loadPlayback() {
      setError(null);
      setStatus(null);
      setSourceUrl(null);

      if (!shouldLoad) {
        setSourceUrl(null);
        return;
      }

      if (blob.storageMode !== "walrus") {
        setSourceUrl(blob.videoUrl);
        return;
      }

      if (!blob.policyObjectId || !blob.policyNonce) {
        setError("This Blob is missing Seal metadata.");
        return;
      }

      if (!account) {
        setError("Connect a wallet to decrypt this Blob.");
        setStatus("Encrypted Walrus playback");
        return;
      }

      const packageId = getPolicyPackageId();
      if (!packageId) {
        setError("Set NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID to enable decryption.");
        return;
      }

      try {
        setStatus("Loading encrypted bytes from Walrus...");
        const response = await fetch(blob.videoUrl, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load the encrypted Blob bundle.");
        }

        const encryptedBytes = new Uint8Array(await response.arrayBuffer());
        setStatus("Creating a Seal session...");
        const sessionKey = await getSessionKeyForAccount({
          dAppKit,
          client: currentClient,
          address: account.address,
          network: String(network),
          ttlMin: 30,
        });

        const approvalTx = buildSealApprovalTransaction({
          packageId,
          policyObjectId: blob.policyObjectId,
          ownerAddress: blob.creatorAddress ?? account.address,
          nonce: fromHex(blob.policyNonce),
        });
        const txBytes = await approvalTx.build({
          client: currentClient,
          onlyTransactionKind: true,
        });

        setStatus("Decrypting playback...");
        const decryptedBytes = await currentClient.seal.decrypt({
          data: encryptedBytes,
          sessionKey,
          txBytes,
        });

        const url = URL.createObjectURL(
          new Blob([toArrayBuffer(decryptedBytes)], {
            type: blob.contentType || "video/mp4",
          }),
        );
        revokedUrl = url;
        if (!cancelled) {
          setSourceUrl(url);
          setStatus(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Playback failed.");
          setStatus(null);
        }
      }
    }

    void loadPlayback();

    return () => {
      cancelled = true;
      if (revokedUrl) {
        URL.revokeObjectURL(revokedUrl);
      }
    };
  }, [
    account,
    blob.contentType,
    blob.creatorAddress,
    blob.id,
    blob.policyNonce,
    blob.policyObjectId,
    blob.storageMode,
    blob.videoUrl,
    currentClient,
    dAppKit,
    network,
    retryToken,
    shouldLoad,
  ]);

  useEffect(() => {
    if (lastPulseKeyRef.current === likePulseKey) return;
    lastPulseKeyRef.current = likePulseKey;
    let pulseTimer: number | null = null;
    const pulseFrame = window.requestAnimationFrame(() => {
      setHeartPulse(true);
      pulseTimer = window.setTimeout(() => setHeartPulse(false), 640);
    });
    return () => {
      window.cancelAnimationFrame(pulseFrame);
      if (pulseTimer) {
        window.clearTimeout(pulseTimer);
      }
    };
  }, [likePulseKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(orientation: landscape)");
    const updateLandscape = () => {
      const compactMobileLandscape = media.matches && window.innerWidth <= 1024;
      setLandscapeViewport(compactMobileLandscape);
    };

    updateLandscape();
    media.addEventListener("change", updateLandscape);
    window.addEventListener("orientationchange", updateLandscape);
    window.addEventListener("resize", updateLandscape);

    return () => {
      media.removeEventListener("change", updateLandscape);
      window.removeEventListener("orientationchange", updateLandscape);
      window.removeEventListener("resize", updateLandscape);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      const host = fullscreenHostRef.current;
      const activeFullscreen = Boolean(host && document.fullscreenElement && (document.fullscreenElement === host || host.contains(document.fullscreenElement)));
      setFullscreenActive(activeFullscreen);
      if (!activeFullscreen && typeof window !== "undefined") {
        window.scrollTo(0, scrollRestoreRef.current);
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!active || !gestureUnlocked || !sourceUrl) return;
    if (landscapeViewport) {
      void requestLandscapeFullscreen();
      return;
    }
    setShowRotatePrompt(true);
  }, [active, gestureUnlocked, landscapeViewport, requestLandscapeFullscreen, sourceUrl]);

  useEffect(() => {
    if (landscapeViewport) return;
    void exitFullscreenIfNeeded();
  }, [exitFullscreenIfNeeded, landscapeViewport]);

  useEffect(() => {
    if (!active) {
      setShowRotatePrompt(false);
    }
  }, [active]);

  useEffect(() => {
    if (fullscreenActive) {
      setShowRotatePrompt(false);
      setFullscreenHint(null);
    }
  }, [fullscreenActive]);

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        window.clearTimeout(tapTimerRef.current);
      }
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  function clearLongPressTimer() {
    if (!longPressTimerRef.current) return;
    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }

  function resumeHoldPause() {
    if (!holdPauseRef.current) return;
    holdPauseRef.current = false;

    const video = videoRef.current;
    if (!video || !active || paused || !sourceUrl) return;
    void video.play().catch(() => undefined);
  }

  function handleTap(x: number, y: number) {
    const current = touchStartRef.current;
    const now = Date.now();
    const distance = current ? Math.hypot(current.x - x, current.y - y) : 0;
    const duration = current ? now - current.time : 0;
    const isTap = distance < 18 && duration < 420;

    if (!isTap) return;

    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      onLike();
      return;
    }

    tapTimerRef.current = window.setTimeout(() => {
      tapTimerRef.current = null;
      onTogglePlay();
    }, 220);
  }

  return (
    <div ref={playerShellRef} className="relative h-full w-full overflow-hidden bg-[#020617]">
      <PosterFallback blob={blob} />

      <div
        ref={fullscreenHostRef}
        className="absolute inset-0 flex items-center justify-center bg-black"
        style={landscapeViewport ? { height: "100dvh", width: "100vw" } : undefined}
      >
        <div className="relative aspect-video w-full max-h-full">
          {shouldLoad && !error ? (
            <video
              key={`${blob.id}-${retryToken}`}
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-contain"
              loop
              muted={muted}
              onEnded={() => {
                if (active && !paused && videoRef.current) {
                  videoRef.current.currentTime = 0;
                  void videoRef.current.play().catch(() => undefined);
                }
              }}
              onError={() => setError("Could not load this Blob")}
              onLoadedData={() => setError(null)}
              onTimeUpdate={() => {
                const video = videoRef.current;
                if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
                setProgress(Math.min(1, video.currentTime / video.duration));
              }}
              playsInline
              poster={blob.posterUrl ?? blob.thumbnailUrl}
              preload="metadata"
              src={sourceUrl ?? undefined}
            />
          ) : null}
        </div>
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05)_0%,rgba(2,6,23,0.02)_20%,rgba(2,6,23,0.12)_68%,rgba(2,6,23,0.72)_100%)]" />

      <div className="pointer-events-none absolute left-0 right-0 top-0 h-1 bg-white/10">
        <div
          className="h-full bg-[linear-gradient(90deg,rgba(87,221,255,0.95),rgba(99,102,241,0.92))] transition-[width] duration-200"
          style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

      <div className="absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-20 flex items-center gap-2 md:right-6 md:top-6">
        <button
          aria-busy={fullscreenPending}
          aria-label="Enter fullscreen"
          data-blob-interactive="true"
          className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-md transition hover:border-white/20 hover:bg-black/55"
          onClick={handleFullscreenButton}
          title="Fullscreen"
          type="button"
        >
          {fullscreenPending ? <Loader2 className="size-5 animate-spin" /> : <Maximize2 className="size-5" />}
        </button>
        <button
          aria-label={muted ? "Unmute video" : "Mute video"}
          data-blob-interactive="true"
          className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-md transition hover:border-white/20 hover:bg-black/55"
          onClick={onToggleMute}
          title={muted ? "Unmute" : "Mute"}
          type="button"
        >
          {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </button>
      </div>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute left-1/2 top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
          heartPulse ? "scale-100 opacity-100" : "scale-50 opacity-0"
        }`}
      >
        <div className="grid size-24 place-items-center rounded-full border border-rose-300/20 bg-rose-500/20 text-rose-100 shadow-[0_0_60px_rgba(251,113,133,0.35)]">
          <Heart className="size-11 fill-current" />
        </div>
      </div>

      {!sourceUrl && (error || status) ? (
        <div className="absolute inset-0 z-10 grid place-items-center p-6">
          <div className="inline-flex max-w-[22rem] items-center gap-3 rounded-full border border-white/10 bg-black/55 px-4 py-3 text-left text-sm text-white backdrop-blur-xl">
            {error ? (
              error.includes("wallet") || error.includes("Seal metadata") ? (
                <LockKeyhole className="size-4 shrink-0 text-cyan-100" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-amber-300" />
              )
            ) : (
              <Loader2 className="size-4 shrink-0 animate-spin text-cyan-100" />
            )}
            <div className="min-w-0">
              <p className="font-medium text-white">{error ? "Playback unavailable" : "Preparing Blob"}</p>
              <p className="truncate text-xs text-slate-300">{error ?? status ?? "Preparing stream..."}</p>
            </div>
            {error ? (
              <button
                aria-label="Retry playback"
                data-blob-interactive="true"
                className="grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
                onClick={() => {
                  setError(null);
                  setRetryToken((current) => current + 1);
                }}
                title="Retry playback"
                type="button"
              >
                <RotateCcw className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {active && sourceUrl && showRotatePrompt && !fullscreenActive ? (
        <div className="pointer-events-none absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 w-[min(92vw,320px)] -translate-x-1/2">
          <div className="pointer-events-auto rounded-2xl border border-white/15 bg-[rgba(6,10,24,0.72)] px-3 py-2.5 text-xs text-slate-100 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 shrink-0 text-cyan-200" />
              <p className="min-w-0 flex-1 truncate">Rotate to fullscreen</p>
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/18 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-300/24"
                data-blob-interactive="true"
                onClick={handleFullscreenButton}
                type="button"
              >
                Fullscreen
              </button>
            </div>
            {fullscreenHint ? <p className="mt-1 text-[10px] leading-4 text-slate-300">{fullscreenHint}</p> : null}
          </div>
        </div>
      ) : null}

      <div
        className="absolute inset-0 z-10"
        onPointerDown={(event) => {
          touchStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            time: Date.now(),
          };
          clearLongPressTimer();
          longPressTimerRef.current = window.setTimeout(() => {
            const video = videoRef.current;
            if (!video || !active || paused) return;
            holdPauseRef.current = true;
            video.pause();
          }, 280);
        }}
        onPointerUp={(event) => {
          if (!touchStartRef.current) return;
          clearLongPressTimer();
          if (active) {
            setGestureUnlocked(true);
            void tryLockLandscape();
            if (landscapeViewport) {
              void requestLandscapeFullscreen();
            } else {
              setShowRotatePrompt(true);
            }
          }
          handleTap(event.clientX, event.clientY);
          touchStartRef.current = null;
          resumeHoldPause();
        }}
        onPointerLeave={() => {
          clearLongPressTimer();
          touchStartRef.current = null;
          resumeHoldPause();
        }}
        onPointerCancel={() => {
          clearLongPressTimer();
          touchStartRef.current = null;
          resumeHoldPause();
        }}
      />
    </div>
  );
}
