"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Loader2,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import { ConnectModal } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount, useCurrentWallet, useDAppKit } from "@mysten/dapp-kit-react";
import type { DAppKitConnectModal } from "@mysten/dapp-kit-core/web";
import { Transaction } from "@mysten/sui/transactions";

import { BlobActions } from "@/components/blobs/blob-actions";
import { BlobCommentsPanel } from "@/components/blobs/blob-comments-panel";
import { BlobCreatorMeta } from "@/components/blobs/blob-creator-meta";
import { BlobPlayer } from "@/components/blobs/blob-player";
import { BlobShareModal, type BlobShareAction } from "@/components/blobs/blob-share-modal";
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
  if (!(target instanceof Element)) return false;
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

function createBlobsHomeHref(searchParamsString: string) {
  const nextParams = new URLSearchParams(searchParamsString);
  nextParams.delete("blob");
  const query = nextParams.toString();
  return query ? `/blobs?${query}` : "/blobs";
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
  const router = useRouter();
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
  const [shareOpen, setShareOpen] = useState(false);
  const [identityMenuOpen, setIdentityMenuOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [loadingPlatform, setLoadingPlatform] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [pendingLike, setPendingLike] = useState(false);
  const [pendingBookmark, setPendingBookmark] = useState(false);
  const [pendingComment, setPendingComment] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<BlobShareAction | null>(null);
  const [pendingFollow, setPendingFollow] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingWalletAction, setPendingWalletAction] = useState<"copy" | "disconnect" | null>(null);
  const gestureRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const wheelLockRef = useRef(0);
  const commentsFetchNonceRef = useRef<Record<string, number>>({});
  const identityMenuRef = useRef<HTMLDivElement | null>(null);
  const walletMenuRef = useRef<HTMLDivElement | null>(null);
  const connectModalRef = useRef<DAppKitConnectModal | null>(null);
  const storageKey = blobStateStorageKey(account?.address);
  const feedQueryString = searchParams.toString();

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
      const routeParams = new URLSearchParams(feedQueryString);
      const query = routeParams.get("q")?.trim();
      const tag = routeParams.get("tag")?.trim();
      const feedQuery = query || tag || "";

      try {
        const url = new URL("/api/blobs", window.location.origin);
        url.searchParams.set("limit", "24");
        if (address) {
          url.searchParams.set("address", address);
        }
        if (feedQuery) {
          url.searchParams.set("q", feedQuery);
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
  }, [account?.address, feedQueryString]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? (JSON.parse(raw) as Partial<BlobUserState>) : {};
      setUserState({
        ...createBlobUserState(),
        likedAdjustments: parsed.likedAdjustments ?? {},
        likedIds: parsed.likedIds ?? {},
        bookmarkedIds: parsed.bookmarkedIds ?? {},
        followedHandles: parsed.followedHandles ?? {},
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
          likedAdjustments: userState.likedAdjustments,
          likedIds: userState.likedIds,
          bookmarkedIds: userState.bookmarkedIds,
          followedHandles: userState.followedHandles,
          shareAdjustments: userState.shareAdjustments,
          commentDrafts: userState.commentDrafts,
          commentsByBlobId: userState.commentsByBlobId,
        }),
      );
    } catch {
      // Ignore storage failures in privacy-restricted environments.
    }
  }, [
    storageKey,
    userState.commentDrafts,
    userState.commentsByBlobId,
    userState.followedHandles,
    userState.bookmarkedIds,
    userState.likedAdjustments,
    userState.likedIds,
    userState.muted,
    userState.shareAdjustments,
  ]);

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
    setShareOpen(false);
    setToast(null);
  }, [currentBlobId, orderedBlobs]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!identityMenuOpen && !walletMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target;
      if (identityMenuOpen && identityMenuRef.current && target instanceof Node && !identityMenuRef.current.contains(target)) {
        setIdentityMenuOpen(false);
      }
      if (walletMenuOpen && walletMenuRef.current && target instanceof Node && !walletMenuRef.current.contains(target)) {
        setWalletMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIdentityMenuOpen(false);
      setWalletMenuOpen(false);
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [identityMenuOpen, walletMenuOpen]);

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

  function creatorFollowKey(blob: BlobItem) {
    return (blob.creatorAddress || blob.creatorHandle || blob.id).trim().toLowerCase();
  }

  function applyUserStateToBlob(blob: BlobItem) {
    const likedOverride = userState.likedIds[blob.id];
    const bookmarkedOverride = userState.bookmarkedIds[blob.id];
    const likesDelta = userState.likedAdjustments[blob.id] ?? 0;
    const followedOverride = userState.followedHandles[creatorFollowKey(blob)];

    return {
      ...blob,
      likedByUser: typeof likedOverride === "boolean" ? likedOverride : blob.likedByUser,
      bookmarkedByUser: typeof bookmarkedOverride === "boolean" ? bookmarkedOverride : blob.bookmarkedByUser,
      followedByUser: typeof followedOverride === "boolean" ? followedOverride : blob.followedByUser,
      likesCount: Math.max(0, blob.likesCount + likesDelta),
      sharesCount: Math.max(0, blob.sharesCount + (userState.shareAdjustments[blob.id] ?? 0)),
    };
  }

  const visibleCount = orderedBlobs.length;
  const progressPercent = visibleCount ? ((currentLogicalIndex + 1) / visibleCount) * 100 : 0;
  const loading = loadingPlatform || loadingFeed;
  const homeHref = createBlobsHomeHref(feedQueryString);
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
    if (commentsOpen || tipOpen || shareOpen) return;
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

  function requestConnectFlow(message: string) {
    connectModalRef.current?.show?.();
    setToast(message);
  }

  function handleBackNavigation() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(homeHref);
  }

  function handleGoHome() {
    router.push(homeHref);
  }

  function handleOpenOwnProfile(tab?: string) {
    const route = tab ? `/profile?tab=${encodeURIComponent(tab)}` : "/profile";
    router.push(route);
  }

  function handleTagClick(tag: string) {
    const normalizedTag = tag.replace(/^#/, "").trim();
    if (!normalizedTag) return;
    router.push(`/blobs?q=${encodeURIComponent(normalizedTag)}`);
  }

  function openTipModal() {
    setTipOpen(true);
  }

  async function handleCreateBlob() {
    if (pendingCreate) return;
    if (!account?.address) {
      requestConnectFlow("Connect a wallet to create a Blob.");
      return;
    }

    setPendingCreate(true);
    setIdentityMenuOpen(false);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      router.push("/upload?blob=true");
    } finally {
      setPendingCreate(false);
    }
  }

  async function handleCopyWalletAddress() {
    if (!account?.address || pendingWalletAction === "copy") return;
    setPendingWalletAction("copy");
    try {
      await navigator.clipboard.writeText(account.address);
      setToast("Address copied.");
    } catch {
      setToast("Could not copy wallet address.");
    } finally {
      setPendingWalletAction(null);
    }
  }

  async function handleDisconnectWallet() {
    if (pendingWalletAction === "disconnect") return;
    setPendingWalletAction("disconnect");
    try {
      await dAppKit.disconnectWallet();
      setWalletMenuOpen(false);
      setToast("Wallet disconnected.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not disconnect wallet.");
    } finally {
      setPendingWalletAction(null);
    }
  }

  function registerShareSuccess(blobId: string, message: string) {
    updateUserState((current) => ({
      ...current,
      shareAdjustments: {
        ...current.shareAdjustments,
        [blobId]: (current.shareAdjustments[blobId] ?? 0) + 1,
      },
    }));
    setToast(message);
  }

  async function handleLike() {
    if (!currentBlob) return;
    if (pendingLike) return;
    if (currentBlob.videoId && !account?.address) {
      requestConnectFlow("Connect a wallet to like live Blobs.");
      return;
    }

    setPendingLike(true);

    const blobId = currentBlob.id;
    const videoId = currentBlob.videoId ?? null;
    const previousLiked = typeof userState.likedIds[blobId] === "boolean" ? userState.likedIds[blobId] : currentBlob.likedByUser;
    const previousLikesDelta = userState.likedAdjustments[blobId] ?? 0;
    const previousLikes = Math.max(0, currentBlob.likesCount + previousLikesDelta);
    const desiredLiked = !previousLiked;

    updateLiveBlob(blobId, {
      likedByUser: desiredLiked,
      likesCount: Math.max(0, previousLikes + (desiredLiked ? 1 : -1)),
    });
    updateUserState((current) => ({
      ...current,
      likedIds: {
        ...current.likedIds,
        [blobId]: desiredLiked,
      },
      likedAdjustments: {
        ...current.likedAdjustments,
        [blobId]: (current.likedAdjustments[blobId] ?? 0) + (desiredLiked ? 1 : -1),
      },
    }));
    setLikePulseKey((current) => current + 1);

    try {
      if (!videoId || !account?.address) {
        return;
      }

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
        likesCount: Number.isFinite(data.likes) ? Number(data.likes) : Math.max(0, previousLikes + (desiredLiked ? 1 : -1)),
      });
      updateUserState((current) => {
        const next = {
          ...current,
          likedIds: {
            ...current.likedIds,
            [blobId]: typeof data.liked === "boolean" ? data.liked : desiredLiked,
          },
          likedAdjustments: {
            ...current.likedAdjustments,
            [blobId]: 0,
          },
        };
        return next;
      });
    } catch (error) {
      updateLiveBlob(blobId, {
        likedByUser: previousLiked,
        likesCount: Math.max(0, currentBlob.likesCount + previousLikesDelta),
      });
      updateUserState((current) => ({
        ...current,
        likedIds: {
          ...current.likedIds,
          [blobId]: previousLiked,
        },
        likedAdjustments: {
          ...current.likedAdjustments,
          [blobId]: previousLikesDelta,
        },
      }));
      setToast(error instanceof Error ? error.message : "Could not update like.");
    } finally {
      setPendingLike(false);
    }
  }

  async function handleBookmark() {
    if (!currentBlob) return;
    if (pendingBookmark) return;

    const actorAddress = account?.address ?? null;
    const previousBookmarked =
      typeof userState.bookmarkedIds[currentBlob.id] === "boolean"
        ? userState.bookmarkedIds[currentBlob.id]
        : currentBlob.bookmarkedByUser;
    const desiredBookmarked = !previousBookmarked;

    if (!currentBlob.videoId) {
      updateUserState((current) => ({
        ...current,
        bookmarkedIds: {
          ...current.bookmarkedIds,
          [currentBlob.id]: desiredBookmarked,
        },
      }));
      setToast(desiredBookmarked ? "Saved to watch later." : "Removed from watch later.");
      return;
    }

    if (!actorAddress) {
      requestConnectFlow("Connect a wallet to save Blobs.");
      return;
    }

    setPendingBookmark(true);

    const blobId = currentBlob.id;
    const videoId = currentBlob.videoId;

    updateLiveBlob(blobId, {
      bookmarkedByUser: desiredBookmarked,
    });
    updateUserState((current) => ({
      ...current,
      bookmarkedIds: {
        ...current.bookmarkedIds,
        [blobId]: desiredBookmarked,
      },
    }));

    try {
      const response = await fetch(`/api/videos/${encodeURIComponent(videoId)}/bookmark`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          address: actorAddress,
          saved: desiredBookmarked,
        }),
      });
      const data = (await response.json()) as { saved?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update bookmark.");
      }

      const syncedBookmarked = typeof data.saved === "boolean" ? data.saved : desiredBookmarked;
      updateLiveBlob(blobId, {
        bookmarkedByUser: syncedBookmarked,
      });
      updateUserState((current) => ({
        ...current,
        bookmarkedIds: {
          ...current.bookmarkedIds,
          [blobId]: syncedBookmarked,
        },
      }));
      setToast(syncedBookmarked ? "Saved to watch later." : "Removed from watch later.");
    } catch (error) {
      updateLiveBlob(blobId, {
        bookmarkedByUser: previousBookmarked,
      });
      updateUserState((current) => ({
        ...current,
        bookmarkedIds: {
          ...current.bookmarkedIds,
          [blobId]: previousBookmarked,
        },
      }));
      setToast(error instanceof Error ? error.message : "Could not update bookmark.");
    } finally {
      setPendingBookmark(false);
    }
  }

  function handleShare() {
    setShareOpen(true);
  }

  async function handleShareAction(action: BlobShareAction) {
    if (!currentBlob || pendingShareAction) return;
    const shareUrl = buildPublicUrl(`/blobs?blob=${encodeURIComponent(currentBlob.id)}`);
    const shareTitle = `Blobs · ${currentBlob.creatorName}`;
    const shareText = currentBlob.caption;

    setPendingShareAction(action);
    try {
      if (action === "copy") {
        await navigator.clipboard.writeText(shareUrl);
        registerShareSuccess(currentBlob.id, "Link copied.");
      } else if (action === "native") {
        if (!navigator.share) {
          throw new Error("Native share is unavailable.");
        }
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        registerShareSuccess(currentBlob.id, "Shared.");
      } else if (action === "x") {
        const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        window.open(xUrl, "_blank", "noopener,noreferrer");
        registerShareSuccess(currentBlob.id, "Opened X share.");
      } else if (action === "telegram") {
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        window.open(telegramUrl, "_blank", "noopener,noreferrer");
        registerShareSuccess(currentBlob.id, "Opened Telegram share.");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        window.open("https://discord.com/app", "_blank", "noopener,noreferrer");
        registerShareSuccess(currentBlob.id, "Link copied for Discord.");
      }
      setShareOpen(false);
    } catch (error) {
      const fallback = action === "native" ? "Share cancelled." : "Could not share this Blob.";
      setToast(error instanceof Error ? error.message || fallback : fallback);
    } finally {
      setPendingShareAction(null);
    }
  }

  async function handleToggleFollow() {
    if (!currentBlob || !currentBlob.followable) return;
    if (pendingFollow) return;
    const actorAddress = account?.address ?? null;
    const followKey = creatorFollowKey(currentBlob);
    const previousFollowed =
      typeof userState.followedHandles[followKey] === "boolean"
        ? userState.followedHandles[followKey]
        : currentBlob.followedByUser;
    const desiredFollowed = !previousFollowed;

    if (!actorAddress && currentBlob.videoId) {
      requestConnectFlow("Connect a wallet to follow creators.");
      return;
    }

    if (!currentBlob.videoId) {
      updateUserState((current) => ({
        ...current,
        followedHandles: {
          ...current.followedHandles,
          [followKey]: desiredFollowed,
        },
      }));
      setToast(desiredFollowed ? `Following ${currentBlob.creatorName}.` : `Unfollowed ${currentBlob.creatorName}.`);
      return;
    }

    setPendingFollow(true);

    const blobId = currentBlob.id;
    const videoId = currentBlob.videoId;

    updateLiveBlob(blobId, {
      followedByUser: desiredFollowed,
    });
    updateUserState((current) => ({
      ...current,
      followedHandles: {
        ...current.followedHandles,
        [followKey]: desiredFollowed,
      },
    }));

    try {
      const response = await fetch(`/api/blobs/${encodeURIComponent(videoId)}/follow`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          address: actorAddress,
          followed: desiredFollowed,
        }),
      });
      const data = (await response.json()) as { followed?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update follow state.");
      }
      updateLiveBlob(blobId, {
        followedByUser: typeof data.followed === "boolean" ? data.followed : desiredFollowed,
      });
      updateUserState((current) => ({
        ...current,
        followedHandles: {
          ...current.followedHandles,
          [followKey]: typeof data.followed === "boolean" ? data.followed : desiredFollowed,
        },
      }));
      setToast(desiredFollowed ? `Following ${currentBlob.creatorName}.` : `Unfollowed ${currentBlob.creatorName}.`);
    } catch (error) {
      updateLiveBlob(blobId, {
        followedByUser: previousFollowed,
      });
      updateUserState((current) => ({
        ...current,
        followedHandles: {
          ...current.followedHandles,
          [followKey]: previousFollowed,
        },
      }));
      setToast(error instanceof Error ? error.message : "Could not update follow state.");
    } finally {
      setPendingFollow(false);
    }
  }

  async function handleCommentSubmit() {
    if (!currentBlob) return;
    if (pendingComment) return;
    const draft = currentDraft.trim();
    if (!draft) return;

    setPendingComment(true);

    try {
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
        requestConnectFlow("Connect a wallet to comment on live Blobs.");
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
    } finally {
      setPendingComment(false);
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

    let synced = true;
    if (currentBlob.videoId) {
      try {
        const response = await fetch(`/api/videos/${encodeURIComponent(currentBlob.videoId)}/tip`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            amount: tipPreview.amountSui,
            platformFeeSui: tipPreview.platformFeeSui,
          }),
        });
        if (!response.ok) {
          synced = false;
        }
      } catch {
        synced = false;
      }
    }

    setToast(
      synced
        ? `Tipped ${tipPreview.amountSui.toFixed(2)} SUI to ${currentBlob.creatorName}.`
        : `Tip sent to ${currentBlob.creatorName}. Feed stats will sync shortly.`,
    );
  }

  const canRender = Boolean(currentBlob);

  return (
    <section
      aria-label="Blobs"
      className="relative h-[100dvh] overflow-hidden bg-[#02040b] text-white"
      onKeyDown={(event) => {
      if (commentsOpen || tipOpen || shareOpen) {
          if (event.key === "Escape") {
            setCommentsOpen(false);
            setTipOpen(false);
            setShareOpen(false);
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
          setShareOpen(false);
          setIdentityMenuOpen(false);
          setWalletMenuOpen(false);
        }
      }}
      onPointerDown={(event) => {
        if (commentsOpen || tipOpen || shareOpen || isInteractiveTarget(event.target)) return;
        gestureRef.current = {
          x: event.clientX,
          y: event.clientY,
          time: Date.now(),
        };
      }}
      onPointerUp={(event) => {
        if (commentsOpen || tipOpen || shareOpen || !gestureRef.current || isInteractiveTarget(event.target)) return;
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
        if (commentsOpen || tipOpen || shareOpen) return;
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
        <div ref={identityMenuRef} className="pointer-events-auto relative flex items-center gap-2">
          <button
            aria-label="Back"
            data-blob-interactive="true"
            className="grid size-11 place-items-center rounded-full border border-white/10 bg-black/35 text-white backdrop-blur-xl transition hover:border-white/20 hover:bg-black/45 active:scale-[0.98]"
            onClick={handleBackNavigation}
            title="Back"
            type="button"
          >
            <ArrowLeft className="size-4 text-cyan-200" />
          </button>

          <button
            aria-expanded={identityMenuOpen}
            aria-haspopup="menu"
            aria-label="Profile"
            data-blob-interactive="true"
            className="grid size-11 place-items-center rounded-full border border-white/10 bg-white/8 text-[10px] font-semibold tracking-[0.28em] text-white backdrop-blur-xl transition hover:border-white/20 hover:bg-white/15 active:scale-[0.98]"
            onClick={() => setIdentityMenuOpen((open) => !open)}
            title="Profile"
            type="button"
          >
            B
          </button>

          <button
            data-blob-interactive="true"
            className="inline-flex items-center rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-xl transition hover:border-white/20 hover:bg-black/45 active:scale-[0.98]"
            onClick={handleGoHome}
            title="Blobs feed"
            type="button"
          >
            Blobs
          </button>

          {identityMenuOpen ? (
            <div
              data-blob-interactive="true"
              className="absolute left-0 top-14 z-40 min-w-[190px] rounded-2xl border border-white/10 bg-[#060b17] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl"
              role="menu"
            >
              <button
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                onClick={() => {
                  setIdentityMenuOpen(false);
                  handleOpenOwnProfile();
                }}
                title="View my profile"
                type="button"
              >
                View my profile
              </button>
              <button
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                onClick={() => {
                  setIdentityMenuOpen(false);
                  handleOpenOwnProfile("Blobs");
                }}
                title="My blobs"
                type="button"
              >
                My blobs
              </button>
              <button
                className="flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                onClick={() => {
                  setIdentityMenuOpen(false);
                  handleOpenOwnProfile("About");
                }}
                title="Settings"
                type="button"
              >
                Settings
              </button>
            </div>
          ) : null}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <span
            className="hidden rounded-full border border-white/10 bg-black/35 px-3 py-2 text-[10px] uppercase tracking-[0.3em] text-slate-300 backdrop-blur-xl md:inline-flex"
            title="Current position in feed"
          >
            {visibleCount ? `${currentLogicalIndex + 1} / ${visibleCount}` : "0 / 0"}
          </span>

          <button
            aria-busy={pendingCreate}
            data-blob-interactive="true"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-xl transition hover:border-cyan-300/25 hover:bg-black/45 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 md:inline-flex"
            disabled={pendingCreate}
            onClick={handleCreateBlob}
            title="Create Blob"
            type="button"
          >
            {pendingCreate ? <Loader2 className="size-4 animate-spin" /> : null}
            Create Blob
          </button>

          <div ref={walletMenuRef} className="relative">
            <button
              aria-expanded={walletMenuOpen}
              aria-haspopup="menu"
              data-blob-interactive="true"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-xl transition hover:border-white/15 hover:bg-black/45 active:scale-[0.98]"
              onClick={() => {
                if (!account?.address) {
                  connectModalRef.current?.show?.();
                  return;
                }
                setWalletMenuOpen((open) => !open);
              }}
              title={account?.address ? "Wallet account menu" : "Connect wallet"}
              type="button"
            >
              <span>{account?.address ? shortAddress(account.address, 4) : "Connect"}</span>
              <ChevronDown className={`size-4 transition ${walletMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {walletMenuOpen && account?.address ? (
              <div
                data-blob-interactive="true"
                className="absolute right-0 top-14 z-40 min-w-[220px] rounded-2xl border border-white/10 bg-[#060b17] p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl"
                role="menu"
              >
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                  onClick={() => {
                    setWalletMenuOpen(false);
                    handleOpenOwnProfile();
                  }}
                  type="button"
                >
                  <UserRound className="size-4" />
                  View profile
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10 disabled:opacity-45"
                  disabled={pendingWalletAction === "copy"}
                  onClick={async () => {
                    await handleCopyWalletAddress();
                  }}
                  type="button"
                >
                  {pendingWalletAction === "copy" ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                  Copy wallet address
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                  onClick={() => {
                    setWalletMenuOpen(false);
                    connectModalRef.current?.show?.();
                    setToast("Open wallet settings in your wallet app.");
                  }}
                  type="button"
                >
                  <Settings className="size-4" />
                  Open wallet settings
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                  onClick={() => {
                    setWalletMenuOpen(false);
                    connectModalRef.current?.show?.();
                  }}
                  type="button"
                >
                  <UserRound className="size-4" />
                  Switch account
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-45"
                  disabled={pendingWalletAction === "disconnect"}
                  onClick={async () => {
                    await handleDisconnectWallet();
                  }}
                  type="button"
                >
                  {pendingWalletAction === "disconnect" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <LogOut className="size-4" />
                  )}
                  Disconnect wallet
                </button>
              </div>
            ) : null}
          </div>
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
          const baseBlob = isActive && currentBlob ? currentBlob : blob;
          const renderBlob = applyUserStateToBlob(baseBlob);
          const liked = Boolean(renderBlob.likedByUser);
          const bookmarked = Boolean(renderBlob.bookmarkedByUser);
          const followed = Boolean(renderBlob.followedByUser);
          const isCreatorOwner =
            Boolean(account?.address) &&
            Boolean(renderBlob.creatorAddress) &&
            account?.address.toLowerCase() === renderBlob.creatorAddress?.toLowerCase();

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

                  <div className="pointer-events-none absolute inset-0 z-20">
                    <div className="absolute left-4 bottom-6 right-24 md:left-6 md:bottom-6">
                      <BlobCreatorMeta
                        key={renderBlob.id}
                        blob={renderBlob}
                        followLoading={isActive ? pendingFollow : false}
                        followed={followed}
                        isCreatorOwner={isCreatorOwner}
                        onOpenOwnProfile={() => handleOpenOwnProfile()}
                        onTagClick={handleTagClick}
                        onToggleFollow={handleToggleFollow}
                      />
                    </div>

                    <div className="absolute right-4 top-1/2 -translate-y-1/2 md:hidden">
                      <BlobActions
                        blob={renderBlob}
                        bookmarked={bookmarked}
                        isCreatorOwner={isCreatorOwner}
                        followed={followed}
                        liked={liked}
                        pendingBookmark={isActive ? pendingBookmark : false}
                        pendingComment={isActive ? pendingComment : false}
                        pendingFollow={isActive ? pendingFollow : false}
                        pendingLike={isActive ? pendingLike : false}
                        pendingShare={isActive ? pendingShareAction !== null : false}
                        onBookmark={handleBookmark}
                        onComment={() => setCommentsOpen(true)}
                        onLike={handleLike}
                        onOpenOwnProfile={() => handleOpenOwnProfile()}
                        onShare={handleShare}
                        onTip={openTipModal}
                        onToggleFollow={handleToggleFollow}
                      />
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex md:flex-none md:items-center">
                  <BlobActions
                    blob={renderBlob}
                    bookmarked={bookmarked}
                    isCreatorOwner={isCreatorOwner}
                    followed={followed}
                    liked={liked}
                    pendingBookmark={isActive ? pendingBookmark : false}
                    pendingComment={isActive ? pendingComment : false}
                    pendingFollow={isActive ? pendingFollow : false}
                    pendingLike={isActive ? pendingLike : false}
                    pendingShare={isActive ? pendingShareAction !== null : false}
                    onBookmark={handleBookmark}
                    onComment={() => setCommentsOpen(true)}
                    onLike={handleLike}
                    onOpenOwnProfile={() => handleOpenOwnProfile()}
                    onShare={handleShare}
                    onTip={openTipModal}
                    onToggleFollow={handleToggleFollow}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <BlobCommentsPanel
        blob={currentBlob}
        comments={currentComments}
        draft={currentDraft}
        onClose={() => setCommentsOpen(false)}
        onDraftChange={(value) => {
          if (!currentBlob) return;
          updateUserState((current) => ({
            ...current,
            commentDrafts: {
              ...current.commentDrafts,
              [currentBlob.id]: value,
            },
          }));
        }}
        submitting={pendingComment}
        onSubmit={handleCommentSubmit}
        open={commentsOpen}
      />

      <BlobTipModal
        blob={currentBlob}
        open={tipOpen}
        platform={platform}
        onClose={() => setTipOpen(false)}
        onSend={handleSendTip}
      />

      {toast ? (
        <div className="pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-4 py-3 text-sm text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          {toast}
        </div>
      ) : null}

      <ConnectModal ref={connectModalRef} />

      <BlobShareModal
        blob={currentBlob}
        loadingAction={pendingShareAction}
        onClose={() => setShareOpen(false)}
        onShare={handleShareAction}
        open={shareOpen}
      />

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
