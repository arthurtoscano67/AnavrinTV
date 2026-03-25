import type { Metadata } from "next";

import { BrowsePageClient } from "@/components/browse/browse-page-client";
import { getVideos } from "@/lib/db";

export const metadata: Metadata = {
  title: "Browse | Anavrin TV",
  description: "Search and browse videos on Anavrin TV.",
};

export default async function BrowsePage() {
  const videos = await getVideos({ publicOnly: true });
  return <BrowsePageClient videos={videos} />;
}
