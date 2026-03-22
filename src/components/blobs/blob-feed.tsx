"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Loader2,
  LogOut,
  PlusSquare,
  RefreshCcw,
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
import { buildApiUrl, buildPublicUrl } from "@/lib/site-url";
import type { PlatformSettings } from "@/lib/types";

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
  const searchParamsString = searchParams.toString();
  const blobParam = searchParams.get("blob")?.trim() ?? "";

  const [platform, setPlatform] = useState<PlatformSettings>(defaultPlatformSettings());
  const [liveBlobs, setLiveBlobs] = useState<BlobItem[] | null>(null);
  const [feedLimit, setFeedLimit] = useState(24);
  const [hasMore, setHasMore] = useState(true);
  const [loadingPlatform, setLoadingPlatform] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const [userState, setUserState] = useState<BlobUserState>(() => createBlobUserState());
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [likePulseKey, setLikePulseKey] = useState(0);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [engagedBlobId, setEngagedBlobId] = useState<string | null>(null);
  const [topMenuOpen, setTopMenuOpen] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [pendingLike, setPendingLike] = useState(false);
  const [pendingBookmark, setPendingBookmark] = useState(false);
  const [pendingComment, setPendingComment] = useState(false);
  const [pendingShareAction, setPendingShareAction] = useState<BlobShareAction | null>(null);
  const [pendingFollow, setPendingFollow] = useState(false);
  const [pendingReport, setPendingReport] = useState(false);
  const [pendingCreate, setPendingCreate] = useState(false);
  const [pendingWalletAction, setPendingWalletAction] = useState<"copy" | "disconnect" | null>(null);

  const connectModalRef = useRef<DAppKitConnectModal | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const blobRefs = useRef<Map<number, HTMLElement>>(new Map());
  const commentsFetchNonceRef = useRef<Record<string, number>>({});
  const controlsTimerRef = useRef<number | null>(null);
  const initialPositionRef = useRef(false);
  const skipUrlSyncRef = useRef(false);

  const storageKey = blobStateStorageKey(account?.address);
  const actorAddress = account?.address?.trim().toLowerCase() ?? "";
  const actorHeaders = actorAddress
    ? {
        "x-anavrin-actor-address": actorAddress,
      }
    : undefined;
  const homeHref = createBlobsHomeHref(searchParamsString);
  const overlayVisible = controlsVisible || commentsOpen || tipOpen || shareOpen;

  const feedKey = `${account?.address ?? ""}|${searchParams.get("q") ?? ""}|${searchParams.get("tag") ?? ""}`;

  const orderedBlobs = useMemo(
    () => rankBlobFeed(liveBlobs === null ? blobSeed : liveBlobs),
    [liveBlobs],
  );

  const visibleCount = orderedBlobs.length;

  function creatorFollowKey(blob: BlobItem) {
    return (blob.creatorAddress || blob.creatorHandle || blob.id).trim().toLowerCase();
  }

  const applyUserStateToBlob = useCallback(
    (blob: BlobItem) => {
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
    },
    [userState.bookmarkedIds, userState.followedHandles, userState.likedAdjustments, userState.likedIds, userState.shareAdjustments],
  );

  const activeRawBlob = orderedBlobs[activeIndex] ?? null;
  const contextRawBlob = useMemo(() => {
    if (!engagedBlobId) return activeRawBlob;
    return orderedBlobs.find((blob) => blob.id === engagedBlobId) ?? activeRawBlob;
  }, [activeRawBlob, engagedBlobId, orderedBlobs]);
  const currentBlob = contextRawBlob ? applyUserStateToBlob(contextRawBlob) : null;
  const currentComments = useMemo(() => {
    if (!contextRawBlob) return [];
    return userState.commentsByBlobId[contextRawBlob.id] ?? contextRawBlob.comments;
  }, [contextRawBlob, userState.commentsByBlobId]);
  const currentDraft = contextRawBlob ? userState.commentDrafts[contextRawBlob.id] ?? "" : "";

  const setBlobRef = useCallback((index: number, node: HTMLElement | null) => {
    if (node) {
      blobRefs.current.set(index, node);
      return;
    }
    blobRefs.current.delete(index);
  }, []);

  const pingControls = useCallback(
    (hideAfterMs = 2300) => {
      setControlsVisible(true);
      if (controlsTimerRef.current) {
        window.clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      if (commentsOpen || tipOpen || shareOpen) return;
      controlsTimerRef.current = window.setTimeout(() => {
        setControlsVisible(false);
      }, hideAfterMs);
    },
    [commentsOpen, shareOpen, tipOpen],
  );

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

  function requestConnectFlow(message: string) {
    connectModalRef.current?.show?.();
    setToast(message);
  }

  const moveToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    if (!orderedBlobs.length) return;
    const safeIndex = Math.max(0, Math.min(index, orderedBlobs.length - 1));
    const node = blobRefs.current.get(safeIndex);
    if (!node) return;
    node.scrollIntoView({ block: "start", behavior });
    setActiveIndex(safeIndex);
    setPaused(false);
    pingControls();
  }, [orderedBlobs.length, pingControls]);

  function handleBackNavigation() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
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

  function triggerRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshNonce((current) => current + 1);
  }

  async function handleCreateBlob() {
    if (pendingCreate) return;
    if (!account?.address) {
      requestConnectFlow("Connect a wallet to create a Blob.");
      return;
    }

    setPendingCreate(true);
    setTopMenuOpen(false);
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
      setTopMenuOpen(false);
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

  useEffect(() => {
    let active = true;

    async function loadPlatform() {
      try {
        const response = await fetch(buildApiUrl("/api/platform"));
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
    setFeedLimit(24);
    setHasMore(true);
    setLoadingMore(false);
    setActiveIndex(0);
    initialPositionRef.current = false;
  }, [feedKey]);

  useEffect(() => {
    let active = true;

    async function loadBlobs() {
      const address = account?.address?.trim();
      const routeParams = new URLSearchParams(searchParamsString);
      const query = routeParams.get("q")?.trim();
      const tag = routeParams.get("tag")?.trim();
      const feedQuery = query || tag || "";

      try {
        const url = new URL(buildApiUrl("/api/blobs"), window.location.origin);
        url.searchParams.set("limit", String(feedLimit));
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
        if (!active) return;

        const nextBlobs = Array.isArray(data.blobs) ? data.blobs : [];
        setLiveBlobs(nextBlobs);
        setHasMore(nextBlobs.length >= feedLimit);
      } catch {
        if (!active) return;
        setLiveBlobs([]);
        setHasMore(false);
      } finally {
        if (!active) return;
        setLoadingFeed(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    }

    setLoadingFeed(true);
    void loadBlobs();

    return () => {
      active = false;
    };
  }, [account?.address, feedLimit, refreshNonce, searchParamsString]);

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

  useEffect(() => {
    if (!orderedBlobs.length) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((current) => Math.max(0, Math.min(current, orderedBlobs.length - 1)));
  }, [orderedBlobs.length]);

  useEffect(() => {
    if (!orderedBlobs.length || !scrollContainerRef.current) return;

    const targetIndexFromParam = blobParam ? orderedBlobs.findIndex((blob) => blob.id === blobParam) : 0;
    const safeIndex = targetIndexFromParam >= 0 ? targetIndexFromParam : 0;

    if (!initialPositionRef.current) {
      initialPositionRef.current = true;
      setActiveIndex(safeIndex);
      window.requestAnimationFrame(() => {
        const node = blobRefs.current.get(safeIndex);
        node?.scrollIntoView({ block: "start", behavior: "auto" });
      });
      return;
    }

    if (!blobParam) return;
    if (safeIndex === activeIndex) return;

    skipUrlSyncRef.current = true;
    moveToIndex(safeIndex, "smooth");
  }, [activeIndex, blobParam, moveToIndex, orderedBlobs]);

  useEffect(() => {
    if (!orderedBlobs.length) return;
    const nextId = orderedBlobs[activeIndex]?.id;
    if (!nextId) return;

    if (skipUrlSyncRef.current) {
      skipUrlSyncRef.current = false;
      return;
    }

    const params = new URLSearchParams(searchParamsString);
    if (params.get("blob") === nextId) return;

    params.set("blob", nextId);
    const query = params.toString();
    router.replace(query ? `/blobs?${query}` : "/blobs", { scroll: false });
  }, [activeIndex, orderedBlobs, router, searchParamsString]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root || !orderedBlobs.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let best: { index: number; ratio: number } | null = null;

        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const node = entry.target as HTMLElement;
          const index = Number(node.dataset.index);
          if (!Number.isFinite(index)) continue;
          if (!best || entry.intersectionRatio > best.ratio) {
            best = { index, ratio: entry.intersectionRatio };
          }
        }

        if (!best || best.ratio < 0.72) return;

        setActiveIndex((current) => {
          if (current === best?.index) return current;
          return best?.index ?? current;
        });
      },
      {
        root,
        threshold: [0.25, 0.5, 0.72, 0.85],
      },
    );

    blobRefs.current.forEach((node) => {
      observer.observe(node);
    });

    return () => {
      observer.disconnect();
    };
  }, [orderedBlobs.length]);

  useEffect(() => {
    if (!hasMore || loadingFeed || loadingMore || !orderedBlobs.length) return;
    if (activeIndex < orderedBlobs.length - 4) return;

    setLoadingMore(true);
    setFeedLimit((current) => current + 12);
  }, [activeIndex, hasMore, loadingFeed, loadingMore, orderedBlobs.length]);

  useEffect(() => {
    if (!contextRawBlob?.videoId) return;

    let active = true;
    const requestNonce = bumpCommentsFetchNonce(contextRawBlob.id);
    const blobId = contextRawBlob.id;
    const videoId = contextRawBlob.videoId;

    async function loadComments() {
      try {
        const response = await fetch(buildApiUrl(`/api/blobs/${encodeURIComponent(videoId)}/comments?limit=100`), {
          cache: "no-store",
        });
        const data = (await response.json()) as { comments?: BlobComment[] };
        if (!active || commentsFetchNonceRef.current[blobId] !== requestNonce || !Array.isArray(data.comments)) return;

        updateUserState((current) => ({
          ...current,
          commentsByBlobId: {
            ...current.commentsByBlobId,
            [blobId]: data.comments ?? [],
          },
        }));
      } catch {
        // Keep existing cache on comments fetch failure.
      }
    }

    void loadComments();

    return () => {
      active = false;
    };
  }, [contextRawBlob?.id, contextRawBlob?.videoId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!topMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current || !(event.target instanceof Node)) return;
      if (!menuRef.current.contains(event.target)) {
        setTopMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setTopMenuOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [topMenuOpen]);

  useEffect(() => {
    if (controlsTimerRef.current) {
      window.clearTimeout(controlsTimerRef.current);
      controlsTimerRef.current = null;
    }
    pingControls(2600);

    return () => {
      if (controlsTimerRef.current) {
        window.clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
    };
  }, [activeIndex, pingControls]);

  useEffect(() => {
    if (commentsOpen || tipOpen || shareOpen) {
      setControlsVisible(true);
      if (controlsTimerRef.current) {
        window.clearTimeout(controlsTimerRef.current);
        controlsTimerRef.current = null;
      }
      return;
    }

    pingControls(1700);
  }, [commentsOpen, pingControls, shareOpen, tipOpen]);

  useEffect(() => {
    if (commentsOpen || tipOpen || shareOpen) return;
    setEngagedBlobId(null);
  }, [commentsOpen, shareOpen, tipOpen]);

  useEffect(() => {
    setPaused(false);
  }, [activeIndex]);

  function resolveActionBlob(targetBlob?: BlobItem | null) {
    if (targetBlob) return targetBlob;
    return contextRawBlob;
  }

  async function handleLike(targetBlob?: BlobItem | null) {
    const actionBlob = resolveActionBlob(targetBlob);
    if (!actionBlob) return;
    if (pendingLike) return;
    if (actionBlob.videoId && !account?.address) {
      requestConnectFlow("Connect a wallet to like live Blobs.");
      return;
    }

    setPendingLike(true);

    const blobId = actionBlob.id;
    const videoId = actionBlob.videoId ?? null;
    const previousLiked = typeof userState.likedIds[blobId] === "boolean" ? userState.likedIds[blobId] : actionBlob.likedByUser;
    const previousLikesDelta = userState.likedAdjustments[blobId] ?? 0;
    const desiredLiked = !previousLiked;

    updateLiveBlob(blobId, {
      likedByUser: desiredLiked,
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

    if (activeRawBlob?.id === blobId) {
      setLikePulseKey((current) => current + 1);
    }

    try {
      if (!videoId || !account?.address) {
        return;
      }

      const response = await fetch(buildApiUrl(`/api/blobs/${encodeURIComponent(videoId)}/like`), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(actorHeaders ?? {}),
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

      const syncedLiked = typeof data.liked === "boolean" ? data.liked : desiredLiked;
      const syncedLikes = Number.isFinite(data.likes)
        ? Number(data.likes)
        : Math.max(0, actionBlob.likesCount + previousLikesDelta + (desiredLiked ? 1 : -1));

      updateLiveBlob(blobId, {
        likedByUser: syncedLiked,
        likesCount: syncedLikes,
      });
      updateUserState((current) => ({
        ...current,
        likedIds: {
          ...current.likedIds,
          [blobId]: syncedLiked,
        },
        likedAdjustments: {
          ...current.likedAdjustments,
          [blobId]: 0,
        },
      }));
    } catch (error) {
      updateLiveBlob(blobId, {
        likedByUser: previousLiked,
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

  async function handleBookmark(targetBlob?: BlobItem | null) {
    const actionBlob = resolveActionBlob(targetBlob);
    if (!actionBlob) return;
    if (pendingBookmark) return;

    const walletAddress = account?.address ?? null;
    const previousBookmarked =
      typeof userState.bookmarkedIds[actionBlob.id] === "boolean"
        ? userState.bookmarkedIds[actionBlob.id]
        : actionBlob.bookmarkedByUser;
    const desiredBookmarked = !previousBookmarked;

    if (!actionBlob.videoId) {
      updateUserState((current) => ({
        ...current,
        bookmarkedIds: {
          ...current.bookmarkedIds,
          [actionBlob.id]: desiredBookmarked,
        },
      }));
      setToast(desiredBookmarked ? "Saved to watch later." : "Removed from watch later.");
      return;
    }

    if (!walletAddress) {
      requestConnectFlow("Connect a wallet to save Blobs.");
      return;
    }

    setPendingBookmark(true);

    const blobId = actionBlob.id;
    const videoId = actionBlob.videoId;

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
      const response = await fetch(buildApiUrl(`/api/videos/${encodeURIComponent(videoId)}/bookmark`), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(actorHeaders ?? {}),
        },
        body: JSON.stringify({
          address: walletAddress,
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

  function handleShare(targetBlob?: BlobItem | null) {
    const actionBlob = resolveActionBlob(targetBlob);
    if (actionBlob) {
      setEngagedBlobId(actionBlob.id);
    }
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
      setEngagedBlobId(null);
    } catch (error) {
      const fallback = action === "native" ? "Share cancelled." : "Could not share this Blob.";
      setToast(error instanceof Error ? error.message || fallback : fallback);
    } finally {
      setPendingShareAction(null);
    }
  }

  async function handleToggleFollow(targetBlob?: BlobItem | null) {
    const actionBlob = resolveActionBlob(targetBlob);
    if (!actionBlob || !actionBlob.followable) return;
    if (pendingFollow) return;
    const walletAddress = account?.address ?? null;
    const followKey = creatorFollowKey(actionBlob);
    const previousFollowed =
      typeof userState.followedHandles[followKey] === "boolean"
        ? userState.followedHandles[followKey]
        : actionBlob.followedByUser;
    const desiredFollowed = !previousFollowed;

    if (!walletAddress && actionBlob.videoId) {
      requestConnectFlow("Connect a wallet to follow creators.");
      return;
    }

    if (!actionBlob.videoId) {
      updateUserState((current) => ({
        ...current,
        followedHandles: {
          ...current.followedHandles,
          [followKey]: desiredFollowed,
        },
      }));
      setToast(desiredFollowed ? `Following ${actionBlob.creatorName}.` : `Unfollowed ${actionBlob.creatorName}.`);
      return;
    }

    setPendingFollow(true);

    const blobId = actionBlob.id;
    const videoId = actionBlob.videoId;

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
      const response = await fetch(buildApiUrl(`/api/blobs/${encodeURIComponent(videoId)}/follow`), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(actorHeaders ?? {}),
        },
        body: JSON.stringify({
          address: walletAddress,
          followed: desiredFollowed,
        }),
      });
      const data = (await response.json()) as { followed?: boolean; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not update follow state.");
      }
      const syncedFollowed = typeof data.followed === "boolean" ? data.followed : desiredFollowed;
      updateLiveBlob(blobId, {
        followedByUser: syncedFollowed,
      });
      updateUserState((current) => ({
        ...current,
        followedHandles: {
          ...current.followedHandles,
          [followKey]: syncedFollowed,
        },
      }));
      setToast(desiredFollowed ? `Following ${actionBlob.creatorName}.` : `Unfollowed ${actionBlob.creatorName}.`);
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

  async function handleCommentSubmit(targetBlob?: BlobItem | null) {
    const actionBlob = resolveActionBlob(targetBlob);
    if (!actionBlob) return;
    if (pendingComment) return;
    const draft = (userState.commentDrafts[actionBlob.id] ?? "").trim();
    if (!draft) return;

    setPendingComment(true);

    try {
      if (!actionBlob.videoId) {
        const nextComment = createLocalComment({
          blob: actionBlob,
          accountAddress: account?.address,
          walletName: wallet?.name,
          body: draft,
        });

        updateUserState((current) => ({
          ...current,
          commentsByBlobId: {
            ...current.commentsByBlobId,
            [actionBlob.id]: [nextComment, ...(current.commentsByBlobId[actionBlob.id] ?? [])],
          },
          commentDrafts: {
            ...current.commentDrafts,
            [actionBlob.id]: "",
          },
        }));
        setToast("Comment posted.");
        return;
      }

      if (!account?.address) {
        requestConnectFlow("Connect a wallet to comment on live Blobs.");
        return;
      }

      const requestNonce = bumpCommentsFetchNonce(actionBlob.id);
      const previousComments = userState.commentsByBlobId[actionBlob.id] ?? [];
      const previousDraft = userState.commentDrafts[actionBlob.id] ?? "";
      const previousCommentsCount = actionBlob.commentsCount;
      const videoId = actionBlob.videoId;
      const nextLocalComment = createLocalComment({
        blob: actionBlob,
        accountAddress: account.address,
        walletName: wallet?.name,
        body: draft,
      });

      updateUserState((current) => ({
        ...current,
        commentsByBlobId: {
          ...current.commentsByBlobId,
          [actionBlob.id]: [nextLocalComment, ...previousComments],
        },
        commentDrafts: {
          ...current.commentDrafts,
          [actionBlob.id]: "",
        },
      }));
      updateLiveBlob(actionBlob.id, {
        commentsCount: previousCommentsCount + 1,
      });

      try {
        const response = await fetch(buildApiUrl(`/api/blobs/${encodeURIComponent(videoId)}/comments`), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(actorHeaders ?? {}),
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

        if (commentsFetchNonceRef.current[actionBlob.id] !== requestNonce) {
          throw new Error("Comment state changed while posting. Please try again.");
        }

        const persistedComments = Array.isArray(data.comments) && data.comments.length
          ? data.comments
          : [data.comment ?? nextLocalComment, ...previousComments];

        updateUserState((current) => ({
          ...current,
          commentsByBlobId: {
            ...current.commentsByBlobId,
            [actionBlob.id]: persistedComments,
          },
          commentDrafts: {
            ...current.commentDrafts,
            [actionBlob.id]: "",
          },
        }));
        updateLiveBlob(actionBlob.id, {
          commentsCount: Number.isFinite(data.commentsCount) ? Number(data.commentsCount) : previousCommentsCount + 1,
        });
        setToast("Comment posted.");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not post comment.";
        if (message !== "Comment state changed while posting. Please try again.") {
          updateUserState((current) => ({
            ...current,
            commentsByBlobId: {
              ...current.commentsByBlobId,
              [actionBlob.id]: previousComments,
            },
            commentDrafts: {
              ...current.commentDrafts,
              [actionBlob.id]: previousDraft,
            },
          }));
          updateLiveBlob(actionBlob.id, {
            commentsCount: previousCommentsCount,
          });
        }
        setToast(message);
      }
    } finally {
      setPendingComment(false);
    }
  }

  async function handleSendTip(amountSui: number, targetBlob?: BlobItem | null) {
    const tipBlobRaw = resolveActionBlob(targetBlob);
    if (!tipBlobRaw) throw new Error("No Blob is active.");
    if (!account) throw new Error("Connect a wallet to tip.");

    const tipBlob = applyUserStateToBlob(tipBlobRaw);
    if (!tipBlob.creatorAddress) throw new Error("This creator does not have a tip address.");

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
    tx.transferObjects([creatorCoin], tx.pure.address(tipBlob.creatorAddress));
    if (tipPreview.platformFeeMist > 0) {
      tx.transferObjects([platformCoin], tx.pure.address(treasuryAddress));
    }
    tx.setGasBudgetIfNotSet(50_000_000);

    const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
    if (result.$kind === "FailedTransaction") {
      throw new Error(result.FailedTransaction.status.error?.message ?? "Tip transaction failed.");
    }

    let synced = true;
    if (tipBlob.videoId) {
      try {
        const response = await fetch(buildApiUrl(`/api/videos/${encodeURIComponent(tipBlob.videoId)}/tip`), {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(actorHeaders ?? {}),
          },
          body: JSON.stringify({
            address: actorAddress,
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
        ? `Tipped ${tipPreview.amountSui.toFixed(2)} SUI to ${tipBlob.creatorName}.`
        : `Tip sent to ${tipBlob.creatorName}. Feed stats will sync shortly.`,
    );
  }

  async function handleReport(targetBlob?: BlobItem | null) {
    const actionBlob = resolveActionBlob(targetBlob);
    if (!actionBlob?.videoId) {
      setToast("Report is unavailable for this Blob.");
      return;
    }

    if (!actorAddress) {
      requestConnectFlow("Connect a wallet to report Blobs.");
      return;
    }

    if (pendingReport) return;

    const detailInput = window.prompt("Describe the issue:", "Describe the policy issue you are reporting.");
    const detail = detailInput?.trim();
    if (!detail) {
      setToast("Report cancelled.");
      return;
    }

    setPendingReport(true);
    try {
      const response = await fetch(buildApiUrl(`/api/videos/${encodeURIComponent(actionBlob.videoId)}/report`), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(actorHeaders ?? {}),
        },
        body: JSON.stringify({
          reporterAddress: actorAddress,
          reporter: actorAddress,
          reason: "Blob policy review",
          detail,
          severity: "medium",
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Could not submit report.");
      }
      setToast("Report submitted to admin.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not submit report.");
    } finally {
      setPendingReport(false);
    }
  }

  return (
    <section
      aria-label="Blobs"
      className="relative h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-[#030712] text-white"
      onPointerMove={() => pingControls()}
      onPointerDown={() => pingControls()}
      onTouchStart={() => pingControls()}
      onWheel={() => pingControls()}
      onKeyDown={(event) => {
        pingControls();
        if (!orderedBlobs.length) return;

        if (event.key === "ArrowDown" || event.key === "PageDown") {
          event.preventDefault();
          moveToIndex(activeIndex + 1);
        }

        if (event.key === "ArrowUp" || event.key === "PageUp") {
          event.preventDefault();
          moveToIndex(activeIndex - 1);
        }
      }}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      tabIndex={0}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_52%_12%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_88%_3%,rgba(99,102,241,0.2),transparent_38%),linear-gradient(180deg,rgba(2,6,18,0.08),rgba(2,6,18,0.9))]" />

      <header
        className={`pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pb-2 pt-[calc(env(safe-area-inset-top)+0.45rem)] transition-opacity duration-300 md:px-5 ${
          overlayVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="pointer-events-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              aria-label="Back"
              className="grid min-h-11 min-w-11 place-items-center rounded-full border border-white/18 bg-[#081425]/78 backdrop-blur-xl transition hover:border-cyan-200/40"
              data-blob-interactive="true"
              onClick={handleBackNavigation}
              type="button"
            >
              <ArrowLeft className="size-4 text-cyan-100" />
            </button>

            <button
              className="inline-flex min-h-11 items-center rounded-full border border-white/18 bg-[#081425]/78 px-4 text-sm font-semibold text-white backdrop-blur-xl transition hover:border-cyan-200/40"
              data-blob-interactive="true"
              onClick={() => moveToIndex(0)}
              type="button"
            >
              Blobs
            </button>
          </div>

          <div ref={menuRef} className="relative">
            <button
              aria-expanded={topMenuOpen}
              aria-haspopup="menu"
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/18 bg-[#081425]/78 px-4 text-sm font-semibold text-white backdrop-blur-xl transition hover:border-cyan-200/40"
              data-blob-interactive="true"
              onClick={() => {
                pingControls();
                if (!account?.address) {
                  connectModalRef.current?.show?.();
                  return;
                }
                setTopMenuOpen((open) => !open);
              }}
              type="button"
            >
              <span>{account?.address ? shortAddress(account.address, 4) : "Connect"}</span>
              <ChevronDown className={`size-4 transition ${topMenuOpen ? "rotate-180" : ""}`} />
            </button>

            {topMenuOpen && account?.address ? (
              <div
                className="absolute right-0 top-14 z-50 min-w-[220px] rounded-2xl border border-white/14 bg-[#071224]/94 p-1.5 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
                data-blob-interactive="true"
                role="menu"
              >
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                  onClick={() => {
                    setTopMenuOpen(false);
                    handleOpenOwnProfile();
                  }}
                  type="button"
                >
                  <UserRound className="size-4" />
                  View profile
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10 disabled:opacity-45"
                  disabled={pendingCreate}
                  onClick={handleCreateBlob}
                  type="button"
                >
                  {pendingCreate ? <Loader2 className="size-4 animate-spin" /> : <PlusSquare className="size-4" />}
                  Create Blob
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10"
                  onClick={() => {
                    setTopMenuOpen(false);
                    triggerRefresh();
                  }}
                  type="button"
                >
                  <RefreshCcw className="size-4" />
                  Refresh feed
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-100 transition hover:bg-white/10 disabled:opacity-45"
                  disabled={pendingWalletAction === "copy"}
                  onClick={handleCopyWalletAddress}
                  type="button"
                >
                  {pendingWalletAction === "copy" ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
                  Copy wallet address
                </button>
                <button
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-rose-200 transition hover:bg-rose-500/15 disabled:opacity-45"
                  disabled={pendingWalletAction === "disconnect"}
                  onClick={handleDisconnectWallet}
                  type="button"
                >
                  {pendingWalletAction === "disconnect" ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                  Disconnect
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div
        ref={scrollContainerRef}
        className={`relative z-10 h-full w-full snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          commentsOpen || tipOpen || shareOpen ? "overflow-y-hidden" : "overflow-y-auto"
        }`}
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
        }}
      >
        {orderedBlobs.map((blob, index) => {
          const renderBlob = applyUserStateToBlob(blob);
          const isActive = index === activeIndex;
          const shouldLoad = Math.abs(index - activeIndex) <= 1;
          const liked = Boolean(renderBlob.likedByUser);
          const bookmarked = Boolean(renderBlob.bookmarkedByUser);
          const followed = Boolean(renderBlob.followedByUser);
          const isCreatorOwner =
            Boolean(account?.address) &&
            Boolean(renderBlob.creatorAddress) &&
            account?.address.toLowerCase() === renderBlob.creatorAddress?.toLowerCase();

          return (
            <article
              key={blob.id}
              className="relative h-[100dvh] w-full snap-start snap-always"
              data-index={index}
              ref={(node) => setBlobRef(index, node)}
            >
              <div className="absolute inset-0">
                <BlobPlayer
                  active={isActive}
                  blob={blob}
                  controlsVisible={overlayVisible && isActive}
                  likePulseKey={isActive ? likePulseKey : 0}
                  muted={userState.muted}
                  onLike={() => {
                    void handleLike(blob);
                  }}
                  onToggleMute={() => {
                    updateUserState((current) => ({
                      ...current,
                      muted: !current.muted,
                    }));
                    pingControls();
                  }}
                  onTogglePlay={() => {
                    if (!isActive) return;
                    setPaused((current) => !current);
                    pingControls();
                  }}
                  paused={isActive ? paused : false}
                  shouldLoad={shouldLoad}
                />
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-64 bg-gradient-to-t from-black/80 via-black/38 to-transparent" />

              <div
                className={`absolute right-[max(0.5rem,env(safe-area-inset-right))] z-30 transition-opacity duration-300 md:right-4 ${
                  overlayVisible ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.35rem))" }}
              >
                <div className="pointer-events-auto mb-3 flex flex-col items-center gap-1.5">
                  <button
                    className="grid min-h-12 min-w-12 place-items-center rounded-full border border-white/16 bg-[#081425]/76 text-sm font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-xl transition hover:border-cyan-200/45"
                    data-blob-interactive="true"
                    onClick={() => {
                      pingControls();
                      if (isCreatorOwner) {
                        handleOpenOwnProfile();
                        return;
                      }
                      void handleToggleFollow(blob);
                    }}
                    title={isCreatorOwner ? "Open profile" : followed ? "Following" : "Follow creator"}
                    type="button"
                  >
                    {renderBlob.creatorAvatar}
                  </button>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-100">
                    {isCreatorOwner ? "Profile" : followed ? "Following" : "Follow"}
                  </span>
                </div>

                <BlobActions
                  blob={renderBlob}
                  bookmarked={bookmarked}
                  followed={followed}
                  isCreatorOwner={isCreatorOwner}
                  liked={liked}
                  pendingBookmark={isActive ? pendingBookmark : false}
                  pendingComment={isActive ? pendingComment : false}
                  pendingFollow={isActive ? pendingFollow : false}
                  pendingLike={isActive ? pendingLike : false}
                  pendingShare={isActive ? pendingShareAction !== null : false}
                  pendingReport={isActive ? pendingReport : false}
                  onBookmark={() => {
                    void handleBookmark(blob);
                  }}
                  onComment={() => {
                    setEngagedBlobId(blob.id);
                    setCommentsOpen(true);
                    pingControls();
                  }}
                  onLike={() => {
                    void handleLike(blob);
                  }}
                  onOpenOwnProfile={() => handleOpenOwnProfile()}
                  onShare={() => handleShare(blob)}
                  onTip={() => {
                    setEngagedBlobId(blob.id);
                    setTipOpen(true);
                    pingControls();
                  }}
                  onReport={() => {
                    void handleReport(blob);
                  }}
                  onToggleFollow={() => {
                    void handleToggleFollow(blob);
                  }}
                  showFollowAction={false}
                />
              </div>

              <div
                className={`absolute left-[max(0.65rem,env(safe-area-inset-left))] right-[5.15rem] z-30 transition-opacity duration-300 md:left-4 md:right-[6.25rem] ${
                  overlayVisible ? "opacity-100" : "pointer-events-none opacity-0"
                }`}
                style={{ bottom: "max(0.8rem, calc(env(safe-area-inset-bottom) + 0.25rem))" }}
              >
                <BlobCreatorMeta
                  blob={renderBlob}
                  followLoading={isActive ? pendingFollow : false}
                  followed={followed}
                  isCreatorOwner={isCreatorOwner}
                  onOpenOwnProfile={() => handleOpenOwnProfile()}
                  onTagClick={handleTagClick}
                  onToggleFollow={() => {
                    void handleToggleFollow(blob);
                  }}
                  showFollowButton={false}
                />
              </div>
            </article>
          );
        })}
      </div>

      {loadingMore && hasMore ? (
        <div
          className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/14 bg-[#081425]/86 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200 backdrop-blur-xl"
          style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))" }}
        >
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-3.5 animate-spin text-cyan-200" />
            Loading more
          </span>
        </div>
      ) : null}

      <BlobCommentsPanel
        blob={currentBlob}
        comments={currentComments}
        draft={currentDraft}
        onClose={() => setCommentsOpen(false)}
        onDraftChange={(value) => {
          if (!contextRawBlob) return;
          updateUserState((current) => ({
            ...current,
            commentDrafts: {
              ...current.commentDrafts,
              [contextRawBlob.id]: value,
            },
          }));
        }}
        submitting={pendingComment}
        onSubmit={() => {
          void handleCommentSubmit(contextRawBlob);
        }}
        open={commentsOpen}
      />

      <BlobTipModal
        blob={currentBlob}
        open={tipOpen}
        platform={platform}
        onClose={() => setTipOpen(false)}
        onSend={(amountSui) => handleSendTip(amountSui, contextRawBlob)}
      />

      {toast ? (
        <div
          className="pointer-events-none fixed left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/14 bg-[#081425]/88 px-4 py-3 text-sm text-slate-100 shadow-[0_18px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom) + 4.8rem))" }}
        >
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
        <div className="absolute inset-0 z-40 grid place-items-center p-6 text-center">
          <div className="max-w-md rounded-[28px] border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.34em] text-slate-400">Blobs</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">No blob videos yet</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              This feed has no videos right now. Try another tag or upload a new Blob.
            </p>
            <button
              className="btn-primary mt-6 min-h-11"
              data-blob-interactive="true"
              onClick={handleCreateBlob}
              type="button"
            >
              Create Blob
            </button>
          </div>
        </div>
      ) : null}

      {loadingPlatform || (loadingFeed && liveBlobs === null) ? (
        <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center bg-black/25">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/55 px-4 py-3 text-sm text-slate-200 backdrop-blur-xl">
            <Loader2 className="size-4 animate-spin text-cyan-200" />
            Preparing Blobs...
          </div>
        </div>
      ) : null}
    </section>
  );
}
