"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

import { VideoCard } from "@/components/video-card";
import { browseTopics } from "@/lib/seed";
import { formatCompact } from "@/lib/format";
import type { SiteMetrics, VideoRecord } from "@/lib/types";

type BrowsePageClientProps = {
  initialVideos: VideoRecord[];
  initialMetrics: SiteMetrics;
};

function matchesQuery(video: VideoRecord, q: string) {
  if (!q) return true;
  const searchable = [
    video.title,
    video.description,
    video.ownerName,
    video.category,
    video.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();
  return searchable.includes(q);
}

export function BrowsePageClient({ initialVideos, initialMetrics }: BrowsePageClientProps) {
  const searchParams = useSearchParams();
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const category = searchParams.get("category")?.trim() ?? "All";

  const videos = useMemo(() => {
    return initialVideos.filter((video) => {
      if (category !== "All" && video.category !== category) return false;
      return matchesQuery(video, q);
    });
  }, [category, initialVideos, q]);

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-white/12 bg-[#0b172d]/72 p-4 shadow-[0_14px_40px_rgba(2,6,23,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <p className="section-label">Browse</p>
            <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">
              {q ? `Search results for “${q}”` : category === "All" ? "All published videos" : category}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Search by title, creator, tag, or category and scan the feed without leaving the desktop layout.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="kpi">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Results</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatCompact(videos.length)}</p>
            </div>
            <div className="kpi">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Visitors today</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatCompact(initialMetrics.visitorsToday)}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/browse"
            className={`chip transition hover:border-white/15 hover:bg-white/8 hover:text-white ${
              category === "All" ? "border-cyan-200/35 bg-cyan-300/15 text-cyan-100" : ""
            }`}
          >
            <Filter className="size-4" />
            All
          </Link>
          {browseTopics.map((topic) => (
            <Link
              key={topic}
              href={`/browse?category=${encodeURIComponent(topic)}`}
              className={`chip transition hover:border-white/15 hover:bg-white/8 hover:text-white ${
                category === topic ? "border-cyan-200/35 bg-cyan-300/15 text-cyan-100" : ""
              }`}
            >
              {topic}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="section-label">Results</p>
          <p className="text-sm text-slate-400">
            {formatCompact(videos.length)} result{videos.length === 1 ? "" : "s"} available to viewers.
          </p>
        </div>

        {videos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} compact />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
            <h2 className="text-xl font-semibold text-white">No videos matched that filter</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-300">
              Try a different search term or category. Creators can always add new sealed uploads from their profile.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/profile#content" className="btn-primary">
                Upload video
              </Link>
              <Link href="/browse" className="btn-secondary">
                Reset filters
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
