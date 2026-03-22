"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-feed";
import { formatCompact } from "@/lib/format";
import { buildApiUrl } from "@/lib/site-url";
import type { VideoRecord } from "@/lib/types";
import { CategoryBar } from "@/components/discovery/category-bar";
import { EmptyFeedState } from "@/components/discovery/empty-feed-state";
import { FeedSkeleton } from "@/components/discovery/feed-skeleton";
import { InfiniteScrollLoader } from "@/components/discovery/infinite-scroll-loader";
import { ScrollToTopButton } from "@/components/discovery/scroll-to-top-button";
import { VideoGrid } from "@/components/discovery/video-grid";
import type { DiscoveryFilters, DiscoveryPageMeta, DiscoveryResponse } from "@/components/discovery/types";

type DiscoveryVideoFeedProps = {
  label: string;
  title: string;
  description: string;
  initialVideos: VideoRecord[];
  initialTopics: string[];
  initialPage: DiscoveryPageMeta;
  initialFilters: DiscoveryFilters;
  persistenceKey: string;
};

type PersistedFeedState = {
  version: 1;
  topic: string;
  page: DiscoveryPageMeta;
  videos: VideoRecord[];
  topics: string[];
  scrollY: number;
  q: string;
  tag: string;
  sort: string;
};

function normalizeTopic(value?: string | null) {
  const topic = value?.trim();
  return topic && topic.length ? topic : "All";
}

function uniqueTopics(values: string[]) {
  const merged = values.map((item) => item.trim()).filter(Boolean);
  if (!merged.includes("All")) merged.unshift("All");
  return [...new Set(merged)];
}

function normalizePageMeta(input: Partial<DiscoveryPageMeta> | undefined, fallbackLimit: number): DiscoveryPageMeta {
  const limit = Number.isFinite(Number(input?.limit)) ? Math.max(1, Number(input?.limit)) : fallbackLimit;
  const offset = Number.isFinite(Number(input?.offset)) ? Math.max(0, Number(input?.offset)) : 0;
  const total = Number.isFinite(Number(input?.total)) ? Math.max(0, Number(input?.total)) : 0;
  const nextOffset = Number.isFinite(Number(input?.nextOffset)) ? Math.max(0, Number(input?.nextOffset)) : offset;

  return {
    offset,
    limit,
    total,
    nextOffset,
    hasMore: Boolean(input?.hasMore) && nextOffset < Math.max(total, nextOffset + 1),
  };
}

function mergeVideoPages(current: VideoRecord[], incoming: VideoRecord[]) {
  if (!incoming.length) return current;
  const seen = new Set(current.map((video) => video.id));
  const merged = [...current];

  for (const video of incoming) {
    if (!video?.id || seen.has(video.id)) continue;
    seen.add(video.id);
    merged.push(video);
  }

  return merged;
}

function parseDiscoveryResponse(input: unknown, fallbackLimit: number): DiscoveryResponse {
  const payload = input as Partial<DiscoveryResponse> | null;
  const videos = Array.isArray(payload?.videos) ? (payload.videos as VideoRecord[]) : [];
  const topics = Array.isArray(payload?.topics) ? payload.topics.filter((topic): topic is string => typeof topic === "string") : [];

  return {
    videos,
    topics,
    page: normalizePageMeta(payload?.page, fallbackLimit),
    filters: payload?.filters,
  };
}

export function VideoFeed({
  label,
  title,
  description,
  initialVideos,
  initialTopics,
  initialPage,
  initialFilters,
  persistenceKey,
}: DiscoveryVideoFeedProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = initialFilters.q.trim();
  const tag = initialFilters.tag.trim();
  const sort = initialFilters.sort.trim();
  const baseLimit = Number.isFinite(initialPage.limit) && initialPage.limit > 0 ? initialPage.limit : DISCOVERY_PAGE_SIZE;

  const [activeCategory, setActiveCategory] = useState(normalizeTopic(initialFilters.topic));
  const [videos, setVideos] = useState(initialVideos);
  const [topics, setTopics] = useState(uniqueTopics(["All", ...initialTopics]));
  const [page, setPage] = useState(normalizePageMeta(initialPage, baseLimit));
  const [loadingInitial, setLoadingInitial] = useState(initialVideos.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const pullDistanceRef = useRef(0);
  const touchStartRef = useRef<number | null>(null);
  const restoringRef = useRef(false);
  const requestLockRef = useRef(false);
  const prefetchCacheRef = useRef<Map<string, DiscoveryResponse>>(new Map());
  const prefetchPendingRef = useRef<Set<string>>(new Set());

  const storageKey = useMemo(
    () => `discovery-feed:${persistenceKey}:${pathname}:q=${query}:tag=${tag}:sort=${sort}`,
    [pathname, persistenceKey, query, sort, tag],
  );

  const cacheKeyFor = useCallback(
    (topic: string, offset: number) => [topic, offset, query, tag, sort, baseLimit].join("|"),
    [baseLimit, query, sort, tag],
  );

  const buildRequestUrl = useCallback(
    (topic: string, offset: number) => {
      const params = new URLSearchParams();
      params.set("paginated", "true");
      params.set("publicOnly", "true");
      params.set("offset", String(Math.max(0, offset)));
      params.set("limit", String(baseLimit));

      if (query) params.set("q", query);
      if (tag) params.set("tag", tag);
      if (sort) params.set("sort", sort);
      if (topic !== "All") params.set("topic", topic);

      return buildApiUrl(`/api/videos?${params.toString()}`);
    },
    [baseLimit, query, sort, tag],
  );

  const persistState = useCallback(
    (scrollY?: number) => {
      if (typeof window === "undefined") return;

      const payload: PersistedFeedState = {
        version: 1,
        topic: activeCategory,
        page,
        videos: videos.slice(0, 180),
        topics: topics.slice(0, 40),
        scrollY: Number.isFinite(scrollY) ? Number(scrollY) : window.scrollY,
        q: query,
        tag,
        sort,
      };

      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(payload));
      } catch {
        // Ignore storage quota failures.
      }
    },
    [activeCategory, page, query, sort, storageKey, tag, topics, videos],
  );

  const requestPage = useCallback(
    async (topic: string, offset: number, allowPrefetchCache = true): Promise<DiscoveryResponse> => {
      const key = cacheKeyFor(topic, offset);
      if (allowPrefetchCache) {
        const cached = prefetchCacheRef.current.get(key);
        if (cached) {
          prefetchCacheRef.current.delete(key);
          return cached;
        }
      }

      const response = await fetch(buildRequestUrl(topic, offset), {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof payload?.error === "string" ? payload.error : "Failed to load videos.";
        throw new Error(message);
      }

      return parseDiscoveryResponse(payload, baseLimit);
    },
    [baseLimit, buildRequestUrl, cacheKeyFor],
  );

  const prefetchNextPage = useCallback(
    (topic: string, offset: number) => {
      if (offset < 0) return;
      const key = cacheKeyFor(topic, offset);

      if (prefetchCacheRef.current.has(key) || prefetchPendingRef.current.has(key)) {
        return;
      }

      prefetchPendingRef.current.add(key);
      requestPage(topic, offset, false)
        .then((result) => {
          prefetchCacheRef.current.set(key, result);
        })
        .catch(() => {
          // Keep prefetch failures silent.
        })
        .finally(() => {
          prefetchPendingRef.current.delete(key);
        });
    },
    [cacheKeyFor, requestPage],
  );

  const loadFirstPage = useCallback(
    async (topic: string, options?: { keepScroll?: boolean }) => {
      if (requestLockRef.current) return;

      requestLockRef.current = true;
      setError(null);
      setLoadingInitial(true);

      try {
        const result = await requestPage(topic, 0);
        setVideos(result.videos);
        setPage(result.page);
        setTopics((current) => uniqueTopics([...current, ...result.topics, ...initialTopics]));

        if (result.page.hasMore) {
          prefetchNextPage(topic, result.page.nextOffset);
        }

        if (!options?.keepScroll && typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "auto" });
        }
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Could not load videos.");
        setVideos([]);
      } finally {
        setLoadingInitial(false);
        setRefreshing(false);
        requestLockRef.current = false;
      }
    },
    [initialTopics, prefetchNextPage, requestPage],
  );

  const loadMore = useCallback(async () => {
    if (requestLockRef.current || loadingInitial || loadingMore || !page.hasMore) {
      return;
    }

    requestLockRef.current = true;
    setError(null);
    setLoadingMore(true);

    try {
      const result = await requestPage(activeCategory, page.nextOffset);
      setVideos((current) => mergeVideoPages(current, result.videos));
      setPage(result.page);
      setTopics((current) => uniqueTopics([...current, ...result.topics]));

      if (result.page.hasMore) {
        prefetchNextPage(activeCategory, result.page.nextOffset);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load more videos.");
    } finally {
      setLoadingMore(false);
      requestLockRef.current = false;
    }
  }, [activeCategory, loadingInitial, loadingMore, page.hasMore, page.nextOffset, prefetchNextPage, requestPage]);

  const updateTopicUrl = useCallback(
    (topic: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (topic === "All") {
        params.delete("topic");
      } else {
        params.set("topic", topic);
      }
      params.delete("category");

      const nextQuery = params.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleCategorySelect = useCallback(
    (topic: string) => {
      if (topic === activeCategory) return;
      setActiveCategory(topic);
      setRefreshing(false);
      setPullDistance(0);
      pullDistanceRef.current = 0;
      updateTopicUrl(topic);
      void loadFirstPage(topic);
    },
    [activeCategory, loadFirstPage, updateTopicUrl],
  );

  const retryLoading = useCallback(() => {
    if (!videos.length) {
      void loadFirstPage(activeCategory, { keepScroll: true });
      return;
    }

    if (page.hasMore) {
      void loadMore();
    }
  }, [activeCategory, loadFirstPage, loadMore, page.hasMore, videos.length]);

  useEffect(() => {
    if (restoringRef.current || typeof window === "undefined") return;
    restoringRef.current = true;

    const saved = window.sessionStorage.getItem(storageKey);
    if (!saved) {
      if (!initialVideos.length) {
        void loadFirstPage(activeCategory, { keepScroll: true });
      }
      return;
    }

    try {
      const parsed = JSON.parse(saved) as PersistedFeedState;
      if (
        parsed?.version !== 1 ||
        parsed.q !== query ||
        parsed.tag !== tag ||
        parsed.sort !== sort
      ) {
        if (!initialVideos.length) {
          void loadFirstPage(activeCategory, { keepScroll: true });
        }
        return;
      }

      const restoredTopic = normalizeTopic(parsed.topic);
      setActiveCategory(restoredTopic);
      setVideos(Array.isArray(parsed.videos) ? parsed.videos : initialVideos);
      setPage(normalizePageMeta(parsed.page, baseLimit));
      setTopics(uniqueTopics([...initialTopics, ...(Array.isArray(parsed.topics) ? parsed.topics : [])]));
      setLoadingInitial(false);

      window.requestAnimationFrame(() => {
        window.scrollTo({ top: Math.max(0, Number(parsed.scrollY) || 0), behavior: "auto" });
      });

      if (parsed.page?.hasMore && Number.isFinite(parsed.page.nextOffset)) {
        prefetchNextPage(restoredTopic, parsed.page.nextOffset);
      }
    } catch {
      if (!initialVideos.length) {
        void loadFirstPage(activeCategory, { keepScroll: true });
      }
    }
  }, [
    activeCategory,
    baseLimit,
    initialTopics,
    initialVideos,
    loadFirstPage,
    prefetchNextPage,
    query,
    sort,
    storageKey,
    tag,
  ]);

  useEffect(() => {
    persistState();
  }, [persistState]);

  useEffect(() => {
    let rafId = 0;

    const syncScrollState = () => {
      const y = window.scrollY;
      setShowScrollTop(y > 700);
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => persistState(y));
    };

    window.addEventListener("scroll", syncScrollState, { passive: true });
    syncScrollState();

    return () => {
      window.removeEventListener("scroll", syncScrollState);
      cancelAnimationFrame(rafId);
    };
  }, [persistState]);

  useEffect(() => {
    const triggerInfiniteLoad = () => {
      if (requestLockRef.current || loadingInitial || loadingMore || !page.hasMore) return;

      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const progress = window.scrollY / scrollable;
      if (progress >= 0.7) {
        void loadMore();
      }
    };

    window.addEventListener("scroll", triggerInfiniteLoad, { passive: true });
    triggerInfiniteLoad();

    return () => {
      window.removeEventListener("scroll", triggerInfiniteLoad);
    };
  }, [loadMore, loadingInitial, loadingMore, page.hasMore]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || loadingInitial || loadingMore || refreshing) return;
      touchStartRef.current = event.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const start = touchStartRef.current;
      if (start === null) return;

      const currentY = event.touches[0]?.clientY ?? start;
      const delta = currentY - start;
      if (delta <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      const damped = Math.min(96, delta * 0.45);
      pullDistanceRef.current = damped;
      setPullDistance(damped);
      if (delta > 12) event.preventDefault();
    };

    const release = () => {
      const shouldRefresh = pullDistanceRef.current >= 70;
      touchStartRef.current = null;
      pullDistanceRef.current = 0;
      setPullDistance(0);

      if (shouldRefresh && !loadingInitial && !loadingMore && !refreshing) {
        setRefreshing(true);
        void loadFirstPage(activeCategory, { keepScroll: true });
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", release, { passive: true });
    window.addEventListener("touchcancel", release, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", release);
      window.removeEventListener("touchcancel", release);
    };
  }, [activeCategory, loadFirstPage, loadingInitial, loadingMore, refreshing]);

  const emptySuggestions = useMemo(
    () => topics.filter((topic) => topic !== activeCategory),
    [activeCategory, topics],
  );

  const showingCount = videos.length;
  const totalCount = Math.max(showingCount, page.total);

  return (
    <div className="space-y-5 pb-24">
      <section className="rounded-2xl border border-white/12 bg-[#0b172d]/72 p-4 shadow-[0_16px_44px_rgba(2,6,23,0.38)] backdrop-blur-xl">
        <div className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-3xl">
            <p className="section-label">{label}</p>
            <h1 className="mt-1 text-2xl font-semibold text-white md:text-3xl">{title}</h1>
            <p className="mt-1.5 text-sm text-slate-300 md:text-base">{description}</p>
          </div>

          <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-[#111f39]/82 px-4 py-2 text-sm">
            <span className="text-slate-400">Showing</span>
            <span className="font-semibold text-white">{formatCompact(showingCount)}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-300">{formatCompact(totalCount)}</span>
          </div>
        </div>

        <div
          className="overflow-hidden transition-[max-height,opacity] duration-200"
          style={{
            maxHeight: pullDistance > 0 || refreshing ? 64 : 0,
            opacity: pullDistance > 0 || refreshing ? 1 : 0,
          }}
        >
          <div className="flex items-center justify-center pt-2 text-xs uppercase tracking-[0.25em] text-cyan-100/85">
            <LoaderCircle className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing" : pullDistance >= 70 ? "Release to refresh" : "Pull to refresh"}
          </div>
        </div>
        </div>
      </section>

      <div className="sticky top-[calc(var(--safe-top)+5.9rem)] z-30 md:top-[calc(var(--safe-top)+4.5rem)]">
        <CategoryBar activeCategory={activeCategory} categories={topics} onCategorySelect={handleCategorySelect} />
      </div>

      <section className="space-y-4">
        {loadingInitial ? (
          <FeedSkeleton count={10} />
        ) : showingCount ? (
          <VideoGrid videos={videos} />
        ) : (
          <EmptyFeedState
            category={activeCategory}
            onSelectSuggestion={handleCategorySelect}
            suggestions={emptySuggestions}
          />
        )}

        <InfiniteScrollLoader
          error={error}
          hasMore={page.hasMore}
          loadedCount={showingCount}
          loading={loadingMore}
          onRetry={retryLoading}
          totalCount={totalCount}
        />
      </section>

      <ScrollToTopButton
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        visible={showScrollTop}
      />
    </div>
  );
}
