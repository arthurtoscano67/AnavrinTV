import type { Metadata } from "next";

import { BrowsePageClient } from "@/components/browse/browse-page-client";
import { getMetrics, getVideos } from "@/lib/db";

export const metadata: Metadata = {
  title: "Browse | Anavrin TV",
  description: "Browse the public Anavrin TV feed.",
};

export default async function BrowsePage() {
  const [videos, metrics] = await Promise.all([
    getVideos({ publicOnly: true }),
    getMetrics(),
  ]);

  return <BrowsePageClient initialVideos={videos} initialMetrics={metrics} />;
}
