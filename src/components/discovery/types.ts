import type { VideoRecord } from "@/lib/types";

export type DiscoveryPageMeta = {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextOffset: number;
};

export type DiscoveryFilters = {
  q: string;
  category: string;
  topic: string;
  tag: string;
  sort: string;
};

export type DiscoveryResponse = {
  videos: VideoRecord[];
  page: DiscoveryPageMeta;
  topics: string[];
  filters?: Partial<DiscoveryFilters>;
};
