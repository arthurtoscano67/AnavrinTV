import type { Metadata } from "next";

import { VideoFeed } from "@/components/discovery/video-feed";
import type { DiscoveryFilters } from "@/components/discovery/types";
import { getVideos } from "@/lib/db";
import {
  DISCOVERY_PAGE_SIZE,
  applyDiscoveryFilters,
  collectDiscoveryTopics,
  paginateVideos,
} from "@/lib/discovery-feed";

export const metadata: Metadata = {
  title: "Browse | Anavrin TV",
  description: "Browse the public Anavrin TV feed.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = firstValue(params.q).trim();
  const category = firstValue(params.category).trim();
  const topicParam = firstValue(params.topic).trim();
  const tag = firstValue(params.tag).trim();
  const sort = firstValue(params.sort).trim();
  const topic = topicParam || (category && category !== "All" ? category : "All");

  const allVideos = await getVideos({ publicOnly: true });
  const filteredVideos = applyDiscoveryFilters(allVideos, {
    query: q || null,
    category: category || null,
    topic: topic || null,
    tag: tag || null,
    sort: sort || null,
  });
  const page = paginateVideos(filteredVideos, 0, DISCOVERY_PAGE_SIZE);

  const filters: DiscoveryFilters = {
    q,
    category,
    topic,
    tag,
    sort,
  };

  return (
    <VideoFeed
      description="Explore by category or tag and keep scrolling while new results stream in automatically."
      initialFilters={filters}
      initialPage={{
        offset: page.offset,
        limit: page.limit,
        total: page.total,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
      }}
      initialTopics={collectDiscoveryTopics(allVideos)}
      initialVideos={page.videos}
      label="Browse"
      persistenceKey="browse"
      title={q ? `Search: ${q}` : "Public video feed"}
    />
  );
}
