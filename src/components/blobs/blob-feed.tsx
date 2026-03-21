"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount, useCurrentWallet, useDAppKit } from "@mysten/dapp-kit-react";
import { Transaction } from "@mysten/sui/transactions";

import { BlobActions } from "@/components/blobs/blob-actions";
import { BlobCommentsPanel } from "@/components/blobs/blob-comments-panel";
import { BlobCreatorMeta } from "@/components/blobs/blob-creator-meta";
import { BlobPlayer } from "@/components/blobs/blob-player";
import { BlobTipModal } from "@/components/blobs/blob-tip-modal";
import { getUploadTreasuryAddress } from "@/lib/anavrin-config";
import { shortAddress } from "@/lib/format";
import {
  blobSeed,
  blobStateStorageKey,
  createBlobUserState,
  rankBlobFeed,
  type BlobComment,
  type BlobItem,
  type BlobUserState,
} from "@/lib/blobs";
import { calculateTipPlatformFeeSui, defaultPlatformSettings } from "@/lib/platform-settings";
import { buildPublicUrl } from "@/lib/site-url";
import type { PlatformSettings } from "@/lib/types";

const VIRTUAL_COPIES = 3;

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('[data-blob-interactive="true"]'));
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function createLocalComment({
  blob,
  accountAddress,
  walletName,
  body,
}: {
  blob: BlobItem;
  accountAddress?: string | null;
  walletName?: string | null;
  body: string;
}): BlobComment {
  const displayName = walletName?.trim() || (accountAddress ? shortAddress(accountAddress, 4) : "Guest viewer");
  return {
    id: `user-comment-${blob.id}-${Date.now()}`,
    authorName: displayName,
    authorHandle: accountAddress ? `@${shortAddress(accountAddress.replace(/^0x/, ""), 4)}` : "@guest",
    authorAvatar: initialsFromName(displayName || "GV"),
    authorAddress: accountAddress ?? undefined,
    body,
    createdAt: new Date().toISOString(),
  };
}

export function BlobFeed() {
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const dAppKit = useDAppKit();
  const searchParams = useSearchParams();
  const [platform, setPlatform] = useState<PlatformSettings>(defaultPlatformSettings());
  const [liveBlobs, setLiveBlobs] = useState<BlobItem[] | null>(null);
  const [userState, setUserState] = useState<BlobUserState>(() => createBlobUserState());
  const [activeIndex, setActiveIndex] = useState(blobSeed.length);
  const [transitioning, setTransitioning] = useState(true);
  const [paused, setPaused] = useState(false);
  const [likePulseKey, setLikePulseKey] = useState(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const gestureRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const wheelLockRef = useRef(0);
  const commentsFetchNonceRef = useRef<Record<string, number>>({});
  const storageKey = blobStateStorageKey(account?.address);

  useEffect(() => {
    let active = true;

    async function loadPlatform() {
      try {
        const response = await fetch("/api/platform");
        const data = (await response.json()) as { settings?: PlatformSettings };
        if (active && data.settings) {
          setPlatform(data.settings);
        }
      } catch {
        if (active) {
          setPlatform(defaultPlatformSettings());
        }
      } finally {
        if (active) {
          setLoadingPlatform(false);
        }
      }
    }

    void loadPlatform();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadBlobs() {
      const address = account?.address?.trim();

      try {
        const url = new URL("/api/blobs", window.location.origin);
        url.searchParams.set("limit", "24");
        if (address) {
          url.searchParams.set("address", address);
        }

        const response = await fetch(url.toString(), {
          cache: "no-store",
        });
        const data = (await response.json()) as { blobs?: BlobItem[] };
        if (active && Array.isArray(data.blobs)) {
          setLiveBlobs(data.blobs);
        } else if (active) {
          setLiveBlobs([]);
        }
      } catch {
        if (active) {
          setLiveBlobs([]);
        }
      } finally {
        if (active) {
          setLoadingFeed(false);
        }
      }
    }

    void loadBlobs();

    return () => {
      active = false;
    };
  }, [account?.address]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as Partial<BlobUserState>) : {};
      setUserState({
        ...createBlobUserState(),
        shareAdjustments: parsed.shareAdjustments ?? {},
        commentDrafts: parsed.commentDrafts ?? {},
        commentsByBlobId: parsed.commentsByBlobId ?? {},
        muted: typeof parsed.muted === "boolean" ? parsed.muted : true,
      });
    } catch {
      setUserState(createBlobUserState());
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          muted: userState.muted,
          shareAdjustments: userState.shareAdjustments,
          commentDrafts: userState.commentDrafts,
          commentsByBlobId: userState.commentsByBlobId,
        }),
      );
    } catch {
      // Ignore storage failures in privacy-restricted environments.
    }
  }, [storageKey, userState.commentDrafts, userState.commentsByBlobId, userState.muted, userState.shareAdjustments]);

  const orderedBlobs = useMemo(() => rankBlobFeed(liveBlobs && liveBlobs.length ? liveBlobs : blobSeed), [liveBlobs]);
  const currentBlobId = searchParams.get("blob");

  useEffect(() => {
    const targetIndex = currentBlobId ? orderedBlobs.findIndex((blob) => blob.id === currentBlobId) : 0;
    const safeIndex = targetIndex >= 0 ? targetIndex : 0;

    setTransitioning(false);
    setActiveIndex(orderedBlobs.length + safeIndex);
    setPaused(false);
    window.requestAnimationFrame(() => setTransitioning(true));
    setCommentsOpen(false);
    setTipOpen(false);
    setToast(null);
  }, [currentBlobId, orderedBlobs]);

  const feedWindow = useMemo(() => {
    const copies = Array.from({ length: VIRTUAL_COPIES }, () => orderedBlobs).flat();
    return copies.map((blob, index) => ({
      blob,
      virtualIndex: index,
    }));
  }, [orderedBlobs]);

  const currentLogicalIndex = orderedBlobs.length ? ((activeIndex % orderedBlobs.length) + orderedBlobs.length) % orderedBlobs.length : 0;
  const currentBlob = orderedBlobs[currentLogicalIndex] ?? orderedBlobs[0] ?? null;
  const currentComments = useMemo(() => {
    if (!currentBlob) return [];
    return userState.commentsByBlobId[currentBlob.id] ?? currentBlob.comments;
  }, [currentBlob, userState.commentsByBlobId]);
  const currentDraft = currentBlob ? userState.commentDrafts[currentBlob.id] ?? "" : "";
  const visibleBlob = currentBlob
    ? {
        ...currentBlob,
        sharesCount: Math.max(0, currentBlob.sharesCount + (userState.shareAdjustments[currentBlob.id] ?? 0)),
      }
    : null;

  const visibleCount = orderedBlobs.length;
  const progressPercent = visibleCount ? ((currentLogicalIndex + 1) / visibleCount) * 100 : 0;
  const loading = loadingPlatform || loadingFeed;

  function updateUserState(updater: (current: BlobUserState) => BlobUserState) {
    setUserState((current) => updater(current));
  }

  function updateLiveBlob(blobId: string, patch: Partial<BlobItem>) {
    setLiveBlobs((current) =>
      current?.map((blob) =>
        blob.id === blobId
          ? {
              ...blob,
              ...patch,
            }
          : blob,
      ) ?? current,
    );
  }

  function bumpCommentsFetchNonce(blobId: string) {
    const nextNonce = (commentsFetchNonceRef.current[blobId] ?? 0) + 1;
    commentsFetchNonceRef.current[blobId] = nextNonce;
    return nextNonce;
  }

  useEffect(() => {
    if (!currentBlob?.videoId) return;

    let active = true;
    const requestNonce = bumpCommentsFetchNonce(currentBlob.id);
    const videoId = currentBlob.videoId;

    async function loadComments() {
      try {
        const response = await fetch(`/api/blobs/${encodeURIComponent(videoId)}/comments?limit=100`, {
          cache: "no-store",
        });
        const data = (await response.json()) as { comments?: BlobComment[] };
        if (!active || commentsFetchNonceRef.current[currentBlob.id] !== requestNonce || !Array.isArray(data.comments)) return;

        updateUserState((current) => ({
          ...current,
          commentsByBlobId: {
            ...current.commentsByBlobId,
            [currentBlob.id]: data.comments ?? [],
          },
        }));
      } catch {
        // Keep the existing cache if the comments request fails.
      }
    }

    void loadComments();

    return () => {
      active = false;
    };
  }, [currentBlob?.id, currentBlob?.videoId]);

  function moveFeed(direction: 1 | -1) {
    if (commentsOpen || tipOpen) return;
    if (!orderedBlobs.length) return;
    setTransitioning(true);
    setPaused(false);
    setActiveIndex((current) => current + direction);
  }

  function normalizeVirtualIndex() {
    const length = orderedBlobs.length;
    if (!length) return;

    if (activeIndex >= length * 2) {
      setTransitioning(false);
      setActiveIndex((current) => current - length);
      setPaused(false);
      window.requestAnimationFrame(() => setTransitioning(true));
      return;
    }

    if (activeIndex < length) {
      setTransitioning(false);
      setActiveIndex((current) => current + length);
      setPaused(false);
      window.requestAnimationFrame(() => setTransitioning(true));
    }
  }

  async function handleLike() {
    if (!currentBlob) return;
    if (!account?.address || !currentBlob.videoId) {
      setToast("Connect a wallet to like live Blobs.");
      return;
    }

    const blobId = currentBlob.id;
    const videoId = currentBlob.videoId;
    const desiredLiked = !currentBlob.likedByUser;
    const previousLikes = currentBlob.likesCount;
    const previousLiked = currentBlob.likedByUser;

    updateLiveBlob(blobId, {
      likedByUser: desiredLiked,
      likesCount: Math.max(0, previousLikes + (desiredLiked ? 1 : -1)),
    });
    setLikePulseKey((current) => current + 1);

    try {
      const response = await fetch(`/api/blobs/${encodeURIComponent(videoId)}/like`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          address: account.address,
          liked: desiredLiked,
        }),
      });
      const data = (await response.json()) as { likes?: number; liked?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update like.");
      }

      updateLiveBlob(blobId, {
        likedByUser: typeof data.liked === "boolean" ? data.liked : desiredLiked,
        likesCount: Number.isFinite(data.likes) ? Number(data.likes) : currentBlob.likesCount,
      });
    } catch (error) {
      updateLiveBlob(blobId, {
        likedByUser: previousLiked,
        likesCount: previousLikes,
      });
      setToast(error instanceof Error ? error.message : "Could not update like.");
    }
  }

  async function handleShare() {
    if (!currentBlob) return;
    const shareUrl = buildPublicUrl(`/blobs?blob=${encodeURIComponent(currentBlob.id)}`);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Blobs · ${currentBlob.creatorName}`,
          text: currentBlob.caption,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
      }
      updateUserState((current) => ({
        ...current,
        shareAdjustments: {
          ...current.shareAdjustments,
          [currentBlob.id]: (current.shareAdjustments[currentBlob.id] ?? 0) + 1,
        },
      }));
      setToast("Share link copied.");
    } catch {
      setToast("Share cancelled.");
    }
  }

  function handleToggleFollow() {
    if (!currentBlob || !currentBlob.followable) return;
    if (!account?.address || !currentBlob.videoId) {
      setToast("Connect a wallet to follow creators.");
      return;
    }

    const blobId = currentBlob.id;
    const videoId = currentBlob.videoId;
    const desiredFollowed = !currentBlob.followedByUser;
    const previousFollowed = currentBlob.followedByUser;

    updateLiveBlob(blobId, {
      followedByUser: desiredFollowed,
    });

    void fetch(`/api/blobs/${encodeURIComponent(videoId)}/follow`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        address: account.address,
        followed: desiredFollowed,
      }),
    })
      .then(async (response) => {
        const data = (await response.json()) as { followed?: boolean; error?: string };
        if (!response.ok) {
          throw new Error(data.error ?? "Could not update follow state.");
        }
        updateLiveBlob(blobId, {
          followedByUser: typeof data.followed === "boolean" ? data.followed : desiredFollowed,
        });
      })
      .catch((error) => {
        updateLiveBlob(blobId, {
          followedByUser: previousFollowed,
        });
        setToast(error instanceof Error ? error.message : "Could not update follow state.");
      });
  }

  async function handleCommentSubmit() {
    if (!currentBlob) return;
    const draft = currentDraft.trim();
    if (!draft) return;

    if (!currentBlob.videoId) {
      const nextComment = createLocalComment({
        blob: currentBlob,
        accountAddress: account?.address,
        walletName: wallet?.name,
        body: draft,
      });

      updateUserState((current) => ({
        ...current,
        commentsByBlobId: {
          ...current.commentsByBlobId,
          [currentBlob.id]: [nextComment, ...(current.commentsByBlobId[currentBlob.id] ?? [])],
        },
        commentDrafts: {
          ...current.commentDrafts,
          [currentBlob.id]: "",
        },
      }));
      setToast("Comment posted.");
      return;
    }

    if (!account?.address) {
      setToast("Connect a wallet to comment on live Blobs.");
      return;
    }

    const requestNonce = bumpCommentsFetchNonce(currentBlob.id);
    const previousComments = userState.commentsByBlobId[currentBlob.id] ?? [];
    const previousDraft = currentDraft;
    const previousCommentsCount = currentBlob.commentsCount;
    const videoId = currentBlob.videoId;
    const nextLocalComment = createLocalComment({
      blob: currentBlob,
      accountAddress: account.address,
      walletName: wallet?.name,
      body: draft,
    });

    updateUserState((current) => ({
      ...current,
      commentsByBlobId: {
        ...current.commentsByBlobId,
        [currentBlob.id]: [nextLocalComment, ...previousComments],
      },
      commentDrafts: {
        ...current.commentDrafts,
        [currentBlob.id]: "",
      },
    }));
    updateLiveBlob(currentBlob.id, {
      commentsCount: previousCommentsCount + 1,
    });

    const nextComment = createLocalComment({
      blob: currentBlob,
      accountAddress: account.address,
      walletName: wallet?.name,
      body: draft,
    });

    try {
      const response = await fetch(`/api/blobs/${encodeURIComponent(videoId)}/comments`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          address: account.address,
          body: draft,
        }),
      });
      const data = (await response.json()) as {
        comment?: BlobComment;
        comments?: BlobComment[];
        commentsCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not post comment.");
      }

      if (commentsFetchNonceRef.current[currentBlob.id] !== requestNonce) {
        throw new Error("Comment state changed while posting. Please try again.");
      }

      const persistedComments = Array.isArray(data.comments) && data.comments.length ? data.comments : [data.comment ?? nextComment, ...previousComments];
      updateUserState((current) => ({
        ...current,
        commentsByBlobId: {
          ...current.commentsByBlobId,
          [currentBlob.id]: persistedComments,
        },
        commentDrafts: {
          ...current.commentDrafts,
          [currentBlob.id]: "",
        },
      }));
      updateLiveBlob(currentBlob.id, {
        commentsCount: Number.isFinite(data.commentsCount) ? Number(data.commentsCount) : currentBlob.commentsCount + 1,
      });
      setToast("Comment posted.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not post comment.";
      if (message !== "Comment state changed while posting. Please try again.") {
        updateUserState((current) => ({
          ...current,
          commentsByBlobId: {
            ...current.commentsByBlobId,
            [currentBlob.id]: previousComments,
          },
          commentDrafts: {
            ...current.commentDrafts,
            [currentBlob.id]: previousDraft,
          },
        }));
        updateLiveBlob(currentBlob.id, {
          commentsCount: previousCommentsCount,
        });
      }
      setToast(message);
    }
  }

  async function handleSendTip(amountSui: number) {
    if (!currentBlob) throw new Error("No Blob is active.");
    if (!account) throw new Error("Connect a wallet to tip.");
    if (!currentBlob.creatorAddress) throw new Error("This creator does not have a tip address.");

    const treasuryAddress = getUploadTreasuryAddress();
    if (!treasuryAddress) {
      throw new Error("Set NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS before tipping.");
    }

    const tipPreview = calculateTipPlatformFeeSui(platform, amountSui);
    const tx = new Transaction();
    const [creatorCoin, platformCoin] = tx.splitCoins(tx.gas, [
      tx.pure.u64(tipPreview.creatorMist),
      tx.pure.u64(tipPreview.platformFeeMist),
    ]);
    tx.transferObjects([creatorCoin], tx.pure.address(currentBlob.creatorAddress));
    if (tipPreview.platformFeeMist > 0) {
      tx.transferObjects([platformCoin], tx.pure.address(treasuryAddress));
    }
    tx.setGasBudgetIfNotSet(50_000_000);

    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (result.$kind === "FailedTransaction") {
      throw new Error(result.FailedTransaction.status.error?.message ?? "Tip transaction failed.");
    }

    setToast(`Tipped ${tipPreview.amountSui.toFixed(2)} SUI to ${currentBlob.creatorName}.`);
  }

  const canRender = Boolean(visibleBlob);

  return (
    <section
      aria-label="Blobs"
      className="relative h-[100dvh] overflow-hidden bg-[#02040b] text-white"
      onKeyDown={(event) => {
      if (commentsOpen || tipOpen) {
          if (event.key === "Escape") {
            setCommentsOpen(false);
            setTipOpen(false);
          }
          return;
        }

        if (event.key === "ArrowDown" || event.key === "PageDown") {
          event.preventDefault();
          moveFeed(1);
        }

        if (event.key === "ArrowUp" || event.key === "PageUp") {
          event.preventDefault();
          moveFeed(-1);
        }

        if (event.key === "Escape") {
          setCommentsOpen(false);
          setTipOpen(false);
        }
      }}
      onPointerDown={(event) => {
        if (commentsOpen || tipOpen || isInteractiveTarget(event.target)) return;
        gestureRef.current = {
          x: event.clientX,
          y: event.clientY,
          time: Date.now(),
        };
      }}
      onPointerUp={(event) => {
        if (commentsOpen || tipOpen || !gestureRef.current || isInteractiveTarget(event.target)) return;
        const start = gestureRef.current;
        gestureRef.current = null;
        const deltaX = event.clientX - start.x;
        const deltaY = event.clientY - start.y;
        const moved = Math.hypot(deltaX, deltaY);
        const elapsed = Date.now() - start.time;

        if (moved < 60 || elapsed > 1000) return;
        if (Math.abs(deltaY) <= Math.abs(deltaX)) return;

        event.preventDefault();
        moveFeed(deltaY > 0 ? -1 : 1);
      }}
      onWheel={(event) => {
        if (commentsOpen || tipOpen) return;
        const now = Date.now();
        if (now - wheelLockRef.current < 220) return;
        if (Math.abs(event.deltaY) < 36 || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;

        event.preventDefault();
        wheelLockRef.current = now;
        moveFeed(event.deltaY > 0 ? 1 : -1);
      }}
      tabIndex={0}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(34,211,238,0.08),transparent_32%),linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.82))]" />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 px-4 pt-4 md:px-6 md:pt-6">
        <Link
          href="/browse"
          className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-white backdrop-blur-xl transition hover:border-white/15 hover:bg-black/45"
        >
          <ArrowLeft className="size-4 text-cyan-200" />
          <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/8 text-[10px] font-semibold tracking-[0.28em]">
            B
          </span>
          <span className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Blobs</p>
          </span>
        </Link>

        <div className="pointer-events-auto flex items-center gap-2">
          <span className="hidden rounded-full border border-white/10 bg-black/35 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-400 backdrop-blur-xl md:inline-flex">
            {visibleCount ? `${currentLogicalIndex + 1} / ${visibleCount}` : "0 / 0"}
          </span>
          <Link
            href="/upload?blob=true"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-xl transition hover:border-cyan-300/25 hover:bg-black/45 md:inline-flex"
          >
            Create Blob
          </Link>
          <ConnectButton className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-xl transition hover:border-white/15 hover:bg-black/45" />
        </div>
      </header>

      {canRender ? (
        <div className="absolute inset-x-0 top-[62px] z-20 px-4 md:top-[74px] md:px-6">
          <div className="h-1 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,rgba(87,221,255,0.95),rgba(99,102,241,0.92))]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      ) : null}

      <div
        className={`relative h-full w-full ${transitioning ? "transition-transform duration-300 ease-out" : "transition-none"}`}
        onTransitionEnd={normalizeVirtualIndex}
        style={{
          transform: `translate3d(0, ${-activeIndex * 100}%, 0)`,
        }}
      >
        {feedWindow.map(({ blob, virtualIndex }) => {
          const isActive = virtualIndex === activeIndex;
          const shouldLoad = Math.abs(virtualIndex - activeIndex) <= 2;
          const renderBlob = isActive && visibleBlob ? visibleBlob : blob;
          const liked = Boolean(renderBlob.likedByUser);
          const followed = Boolean(renderBlob.followedByUser);
          const commentDraft = userState.commentDrafts[blob.id] ?? "";
          const comments = isActive ? currentComments : blob.comments;

          return (
            <article key={`${blob.id}-${virtualIndex}`} className="flex h-full w-full items-center justify-center px-0 md:px-6 md:py-6">
              <div className="relative flex h-full w-full items-center justify-center gap-0 md:gap-8">
                <div
                  className={[
                    "relative h-full w-full overflow-hidden bg-[#02040b]",
                    "md:max-h-[calc(100dvh-2.5rem)] md:max-w-[min(92vw,420px)] md:rounded-[30px]",
                  ].join(" ")}
                >
                  <BlobPlayer
                    active={isActive}
                    blob={blob}
                    likePulseKey={isActive ? likePulseKey : 0}
                    muted={userState.muted}
                    onLike={handleLike}
                    onToggleMute={() => {
                      updateUserState((current) => ({
                        ...current,
                        muted: !current.muted,
                      }));
                    }}
                    onTogglePlay={() => {
                      if (!isActive) return;
                      setPaused((current) => !current);
                    }}
                    paused={isActive ? paused : false}
                    shouldLoad={shouldLoad}
                  />

                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute left-4 bottom-6 right-24 md:left-6 md:bottom-6">
                      <BlobCreatorMeta blob={renderBlob} followed={followed} onToggleFollow={handleToggleFollow} />
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 md:hidden">
                      <BlobActions
                        blob={renderBlob}
                        followed={followed}
                        liked={liked}
                        onComment={() => setCommentsOpen(true)}
                        onLike={handleLike}
                        onShare={handleShare}
                        onTip={() => setTipOpen(true)}
                        onToggleFollow={handleToggleFollow}
                      />
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex md:flex-none md:items-center">
                  <BlobActions
                    blob={renderBlob}
                    followed={followed}
                    liked={liked}
                    onComment={() => setCommentsOpen(true)}
                    onLike={handleLike}
                    onShare={handleShare}
                    onTip={() => setTipOpen(true)}
                    onToggleFollow={handleToggleFollow}
                  />
                </div>
              </div>

              {isActive ? (
                <>
                  <BlobCommentsPanel
                    blob={blob}
                    comments={comments}
                    draft={commentDraft}
                    onClose={() => setCommentsOpen(false)}
                    onDraftChange={(value) => {
                      updateUserState((current) => ({
                        ...current,
                        commentDrafts: {
                          ...current.commentDrafts,
                          [blob.id]: value,
                        },
                      }));
                    }}
                    onSubmit={handleCommentSubmit}
                    open={commentsOpen}
                  />

                  <BlobTipModal
                    blob={blob}
                    open={tipOpen}
                    platform={platform}
                    onClose={() => setTipOpen(false)}
                    onSend={handleSendTip}
                  />
                </>
              ) : null}
            </article>
          );
        })}
      </div>

      {toast ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-4 py-3 text-sm text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {toast}
        </div>
      ) : null}

      {!visibleCount ? (
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="max-w-md rounded-[28px] border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.34em] text-slate-400">Blobs</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">No short-form feed yet</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              The Blobs feed is waiting for sample or live short videos. Connect a creator upload next to populate the
              swipe stack.
            </p>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/20">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/45 px-4 py-3 text-sm text-slate-200 backdrop-blur-xl">
            <Loader2 className="size-4 animate-spin text-cyan-200" />
            Preparing Blobs...
          </div>
        </div>
      ) : null}
    </section>
  );
}
