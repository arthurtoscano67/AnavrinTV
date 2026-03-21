import { HomeDiscoveryClient } from "@/components/home/home-discovery-client";
import { getVideos } from "@/lib/db";
import { getMetrics } from "@/lib/db";

export default async function HomePage() {
  const [videos, metrics] = await Promise.all([getVideos({ publicOnly: true }), getMetrics()]);
  return (
    <HomeDiscoveryClient videos={videos} metrics={metrics} />
  );
}
