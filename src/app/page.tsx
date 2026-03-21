import Link from "next/link";
import { ArrowRight, Filter } from "lucide-react";

import { VideoCard } from "@/components/video-card";
import { browseTopics } from "@/lib/seed";
import { formatBytes, formatCompact } from "@/lib/format";
import { getMetrics, getVideos } from "@/lib/db";

function SectionBlock({
  label,
  title,
  description,
  actionHref,
  actionLabel,
  videos,
}: {
  label: string;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
  videos: Awaited<ReturnType<typeof getVideos>>;
}) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <p className="section-label">{label}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white md:text-3xl">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">{description}</p>
        </div>

        <Link href={actionHref} className="chip transition hover:border-white/15 hover:bg-white/8 hover:text-white">
          {actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {videos.map((video) => (
          <VideoCard key={video.id} video={video} compact />
        ))}
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [videos, metrics] = await Promise.all([getVideos({ publicOnly: true }), getMetrics()]);
  const recommended = videos.slice(0, 8);
  const trending = [...videos].sort((a, b) => b.views - a.views).slice(0, 8);

  const stats = [
    { label: "Visitors today", value: formatCompact(metrics.visitorsToday) },
    { label: "Active streams", value: formatCompact(metrics.activeStreams) },
    { label: "Uploads today", value: formatCompact(metrics.uploadsToday) },
    { label: "Encrypted storage", value: formatBytes(metrics.storageUsedBytes) },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="section-label">Home</p>
            <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Browse the public feed.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Dense rows, familiar cards, and quick access to public uploads, creators, and creator tools.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="kpi">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">{stat.label}</p>
                <p className="mt-2 text-lg font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/browse" className="chip transition hover:border-white/15 hover:bg-white/8 hover:text-white">
            <Filter className="size-4" />
            All videos
          </Link>
          {browseTopics.map((topic) => (
            <Link
              key={topic}
              href={`/browse?category=${encodeURIComponent(topic)}`}
              className="chip transition hover:border-white/15 hover:bg-white/8 hover:text-white"
            >
              {topic}
            </Link>
          ))}
        </div>
      </section>

      <SectionBlock
        label="Recommended"
        title="Watch next"
        description="Fresh public uploads with the same dense browse feel you'd expect from a desktop video app."
        actionHref="/browse"
        actionLabel="Browse all"
        videos={recommended}
      />

      <SectionBlock
        label="Trending"
        title="Most watched right now"
        description="High-view videos from the public catalog, ordered for quick scanning."
        actionHref="/browse"
        actionLabel="View feed"
        videos={trending}
      />
    </div>
  );
}
