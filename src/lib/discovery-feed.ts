import type { VideoRecord } from "@/lib/types";

export const DISCOVERY_PAGE_SIZE = 20;
export const DISCOVERY_BASE_TOPICS = [
  "All",
  "Gaming",
  "Movies",
  "Music",
  "Sports",
  "Crypto",
  "Education",
  "Comedy",
  "Live",
  "Trending",
  "New",
] as const;

export type DiscoverySort = "fresh" | "trending" | "views" | "likes";

export type DiscoveryFilterInput = {
  query?: string | null;
  category?: string | null;
  tag?: string | null;
  topic?: string | null;
  sort?: string | null;
};

function normalize(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function includesNormalized(source: string, pattern: string) {
  return source.toLowerCase().includes(pattern);
}

function matchesTag(video: VideoRecord, tag: string) {
  const normalizedTag = normalize(tag).replace(/^#/, "");
  if (!normalizedTag) return true;
  return video.tags.some((videoTag) => includesNormalized(videoTag, normalizedTag));
}

function matchesTopic(video: VideoRecord, topic: string) {
  const normalizedTopic = normalize(topic);
  if (!normalizedTopic || normalizedTopic === "all") return true;

  const haystack = [
    video.title,
    video.description,
    video.category,
    video.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  if (normalizedTopic === "trending" || normalizedTopic === "new") return true;
  if (normalizedTopic === "gaming") return video.category === "Gaming" || haystack.includes("gaming");
  if (normalizedTopic === "movies") return video.category === "Culture" || haystack.includes("movie") || haystack.includes("film");
  if (normalizedTopic === "music") return video.category === "Music" || haystack.includes("music");
  if (normalizedTopic === "sports") return haystack.includes("sport");
  if (normalizedTopic === "crypto") {
    return (
      haystack.includes("crypto") ||
      haystack.includes("sui") ||
      haystack.includes("defi") ||
      haystack.includes("walrus")
    );
  }
  if (normalizedTopic === "education") {
    return (
      video.category === "AI Labs" ||
      haystack.includes("tutorial") ||
      haystack.includes("course") ||
      haystack.includes("education") ||
      haystack.includes("learn")
    );
  }
  if (normalizedTopic === "comedy") {
    return haystack.includes("comedy") || haystack.includes("funny") || haystack.includes("meme");
  }
  if (normalizedTopic === "live") {
    return video.category === "Live Events" || haystack.includes("live");
  }

  return video.category.toLowerCase() === normalizedTopic || haystack.includes(normalizedTopic);
}

function defaultSortFromTopic(topic?: string | null): DiscoverySort {
  const normalizedTopic = normalize(topic);
  if (normalizedTopic === "trending") return "trending";
  if (normalizedTopic === "new") return "fresh";
  return "fresh";
}

function normalizeSort(sort?: string | null, topic?: string | null): DiscoverySort {
  if (sort === "fresh" || sort === "trending" || sort === "views" || sort === "likes") {
    return sort;
  }
  return defaultSortFromTopic(topic);
}

function recencyHours(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp) || timestamp <= 0) return 24 * 7;
  return Math.max(0, (Date.now() - timestamp) / 3_600_000);
}

function trendingScore(video: VideoRecord) {
  const freshnessBoost = Math.max(0, 48 - recencyHours(video.createdAt)) * 90;
  return (
    video.views * 3 +
    video.likes * 18 +
    video.comments * 24 +
    video.subscribers * 14 +
    freshnessBoost
  );
}

function sortFeed(videos: VideoRecord[], sort: DiscoverySort) {
  const list = [...videos];
  if (sort === "views") {
    return list.sort((a, b) => b.views - a.views || b.createdAt.localeCompare(a.createdAt));
  }
  if (sort === "likes") {
    return list.sort((a, b) => b.likes - a.likes || b.createdAt.localeCompare(a.createdAt));
  }
  if (sort === "trending") {
    return list.sort((a, b) => trendingScore(b) - trendingScore(a) || b.createdAt.localeCompare(a.createdAt));
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function collectDiscoveryTopics(videos: VideoRecord[]) {
  const dynamicCategories = [...new Set(videos.map((video) => video.category).filter(Boolean))];
  const ordered = [...DISCOVERY_BASE_TOPICS, ...dynamicCategories];
  return [...new Set(ordered)];
}

export function applyDiscoveryFilters(videos: VideoRecord[], input: DiscoveryFilterInput) {
  const q = normalize(input.query);
  const category = normalize(input.category);
  const tag = normalize(input.tag);
  const topic = input.topic?.trim() ?? "";
  const sort = normalizeSort(input.sort, topic);

  const filtered = videos.filter((video) => {
    if (category && category !== "all" && video.category.toLowerCase() !== category) return false;
    if (!matchesTag(video, tag)) return false;
    if (!matchesTopic(video, topic)) return false;

    if (!q) return true;
    const searchable = [
      video.title,
      video.description,
      video.ownerName,
      video.creatorDisplayName,
      video.creatorUsername,
      video.category,
      video.tags.join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(q);
  });

  return sortFeed(filtered, sort);
}

export function paginateVideos(videos: VideoRecord[], offset = 0, limit = DISCOVERY_PAGE_SIZE) {
  const safeOffset = Math.max(0, Number.isFinite(offset) ? Math.floor(offset) : 0);
  const safeLimit = Math.max(1, Math.min(60, Number.isFinite(limit) ? Math.floor(limit) : DISCOVERY_PAGE_SIZE));
  const slice = videos.slice(safeOffset, safeOffset + safeLimit);
  const nextOffset = safeOffset + slice.length;
  return {
    videos: slice,
    total: videos.length,
    offset: safeOffset,
    limit: safeLimit,
    hasMore: nextOffset < videos.length,
    nextOffset,
  };
}

