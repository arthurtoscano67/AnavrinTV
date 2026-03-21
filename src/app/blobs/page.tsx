import type { Metadata } from "next";

import { BlobFeed } from "@/components/blobs/blob-feed";

export const metadata: Metadata = {
  title: "Blobs | Anavrin TV",
  description: "Swipeable short-form vertical video feed for Anavrin TV.",
};

export default function BlobsPage() {
  return <BlobFeed />;
}

