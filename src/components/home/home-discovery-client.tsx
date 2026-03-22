"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType } from "react";
import {
  Film,
  Flame,
  Gamepad2,
  Headphones,
  LockKeyhole,
  Play,
  Radio,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Video,
} from "lucide-react";

import { isBlobVideoRecord } from "@/lib/blobs";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import type { SiteMetrics, VideoRecord } from "@/lib/types";

type HomeDiscoveryClientProps = {
  videos: VideoRecord[];
  metrics: SiteMetrics;
};

const FILTERS = ["All", "Gaming", "Movies", "Music", "Sports", "Crypto", "Education", "Comedy", "Live", "Trending", "New"] as const;

type DiscoveryFilter = (typeof FILTERS)[number];

function normalized(text: string) {
  return text.trim().toLowerCase();
}

function searchable(video: VideoRecord) {
  return [video.title, video.description, video.category, video.tags.join(" ")].join(" ").toLowerCase();
}

function pickTop(videos: VideoRecord[], limit: number) {
  return [...videos]
    .sort((a, b) => b.views - a.views || b.likes - a.likes || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

function byTopic(videos: VideoRecord[], topic: string) {
  const needle = normalized(topic);
  if (needle === "all") return videos;
  if (needle === "new") {
    return [...videos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  if (needle === "trending") return pickTop(videos, videos.length);

  return videos.filter((video) => {
    const haystack = searchable(video);
    if (needle === "gaming") return haystack.includes("gaming") || haystack.includes("game");
    if (needle === "movies") return haystack.includes("movie") || haystack.includes("film") || video.category === "Movies";
    if (needle === "music") return haystack.includes("music") || video.category === "Music";
    if (needle === "sports") return haystack.includes("sport") || haystack.includes("nfl") || haystack.includes("nba") || haystack.includes("mlb");
    if (needle === "live") return haystack.includes("live") || video.category === "Live Events";
    if (needle === "crypto") return haystack.includes("crypto") || haystack.includes("sui") || haystack.includes("defi") || haystack.includes("walrus");
    if (needle === "education") return haystack.includes("learn") || haystack.includes("tutorial") || haystack.includes("education") || haystack.includes("course");
    if (needle === "comedy") return haystack.includes("comedy") || haystack.includes("funny") || haystack.includes("meme");
    return haystack.includes(needle);
  });
}

function fallbackPool(videos: VideoRecord[], source: VideoRecord[]) {
  return source.length ? source : pickTop(videos, 12);
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "AT"
  );
}

function DiscoveryCarousel({
  title,
  icon: Icon,
  videos,
  href,
  blobMode = false,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  videos: VideoRecord[];
  href: string;
  blobMode?: boolean;
}) {
  if (!videos.length) return null;

  return (
    <section className="space-y-3" style={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-base font-bold text-white sm:text-lg">
          <span className="grid size-7 place-items-center rounded-full border border-cyan-200/25 bg-cyan-300/10 text-cyan-100">
            <Icon className="size-3.5" />
          </span>
          {title}
        </h2>
        <Link href={href} className="rounded-full border border-white/14 bg-[#101e37]/82 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-200 transition hover:border-cyan-200/35 hover:text-cyan-100">
          View all
        </Link>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {videos.map((video) => {
          const creatorName = video.creatorDisplayName || video.ownerName;
          const watchHref = blobMode ? `/blobs?blob=${encodeURIComponent(video.id)}` : `/video/${video.id}`;
          return (
            <Link
              key={`${title}-${video.id}`}
              href={watchHref}
              className="group min-w-[78vw] snap-start overflow-hidden rounded-2xl border border-white/12 bg-[#0c162d]/88 shadow-[0_12px_30px_rgba(2,6,23,0.34)] transition duration-200 hover:border-cyan-200/32 hover:shadow-[0_14px_34px_rgba(14,116,144,0.24)] sm:min-w-[320px]"
            >
              <div
                className="relative aspect-video overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${video.coverFrom} 0%, ${video.coverVia} 52%, ${video.coverTo} 100%)`,
                }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,22,0.08),rgba(2,8,22,0.76))]" />
                <span className="absolute left-2.5 top-2.5 rounded-full border border-white/22 bg-black/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-100">
                  {video.category}
                </span>
                <span className="absolute bottom-2.5 right-2.5 rounded-md border border-black/20 bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
                  {video.duration}
                </span>
              </div>

              <div className="space-y-2 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold text-white group-hover:text-cyan-100">{video.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-white/14 bg-white/7 text-[10px] font-semibold uppercase text-slate-100">
                    {initials(creatorName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-200">{creatorName}</p>
                    <p className="text-[11px] text-slate-400">
                      {formatCompact(video.views)} views · {formatRelativeTime(video.publishedAt ?? video.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function HomeDiscoveryClient({ videos, metrics }: HomeDiscoveryClientProps) {
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilter>("All");

  const filterPool = useMemo(() => {
    const filtered = byTopic(videos, activeFilter);
    return filtered.length ? filtered : videos;
  }, [activeFilter, videos]);

  const featured = useMemo(() => pickTop(filterPool, 1)[0] ?? pickTop(videos, 1)[0] ?? null, [filterPool, videos]);

  const trendingBlobs = useMemo(() => {
    const blobs = filterPool.filter(isBlobVideoRecord);
    return fallbackPool(filterPool, pickTop(blobs, 12)).slice(0, 12);
  }, [filterPool]);

  const gaming = useMemo(() => fallbackPool(filterPool, byTopic(filterPool, "Gaming")).slice(0, 12), [filterPool]);
  const movies = useMemo(() => fallbackPool(filterPool, byTopic(filterPool, "Movies")).slice(0, 12), [filterPool]);
  const music = useMemo(() => fallbackPool(filterPool, byTopic(filterPool, "Music")).slice(0, 12), [filterPool]);
  const sports = useMemo(() => fallbackPool(filterPool, byTopic(filterPool, "Sports")).slice(0, 12), [filterPool]);
  const live = useMemo(() => fallbackPool(filterPool, byTopic(filterPool, "Live")).slice(0, 12), [filterPool]);

  const vaults = useMemo(() => {
    const pool = filterPool.filter((video) => {
      const haystack = searchable(video);
      return haystack.includes("encrypted") || haystack.includes("seal") || haystack.includes("walrus") || haystack.includes("vault");
    });

    return fallbackPool(filterPool, pool).slice(0, 12);
  }, [filterPool]);

  const statPills = [
    { icon: Users, label: "Visitors", value: formatCompact(metrics.visitorsToday) },
    { icon: Flame, label: "Active", value: formatCompact(metrics.activeStreams) },
    { icon: Video, label: "Uploads", value: formatCompact(metrics.uploadsToday) },
    { icon: Shield, label: "Creators", value: formatCompact(metrics.creatorCount) },
  ];
  const featuredHref = featured ? (isBlobVideoRecord(featured) ? `/blobs?blob=${encodeURIComponent(featured.id)}` : `/video/${featured.id}`) : "/blobs";

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[28px] border border-white/14 bg-[#091427]/82 p-3 shadow-[0_20px_56px_rgba(2,6,23,0.45)] backdrop-blur-2xl sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div
            className="relative overflow-hidden rounded-2xl border border-white/14 p-4 sm:p-5"
            style={{
              background: featured
                ? `linear-gradient(135deg, ${featured.coverFrom} 0%, ${featured.coverVia} 52%, ${featured.coverTo} 100%)`
                : "linear-gradient(135deg, rgba(34,211,238,0.22) 0%, rgba(99,102,241,0.2) 58%, rgba(8,14,30,0.92) 100%)",
            }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,22,0.2),rgba(2,8,22,0.9))]" />
            <div className="pointer-events-none absolute -right-20 -top-24 size-56 rounded-full bg-cyan-200/25 blur-3xl" />
            <div className="relative flex min-h-[230px] flex-col justify-between gap-5">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-white/25 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-50">
                  Public Feed
                </span>
                <span className="rounded-full border border-white/20 bg-black/28 px-2.5 py-1 text-[11px] font-semibold text-slate-100">
                  {featured?.duration ?? "0:00"}
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="line-clamp-2 text-2xl font-semibold text-white sm:text-[1.75rem]">
                  {featured?.title ?? "Discover what to watch next"}
                </h1>
                <p className="line-clamp-2 text-sm text-slate-100/95 sm:text-[15px]">
                  {featured?.description?.trim() || "Fresh blobs, encrypted drops, and creator-first video discovery in one feed."}
                </p>
                <p className="text-[11px] text-slate-200/90">
                  {(featured?.creatorDisplayName || featured?.ownerName || "Anavrin TV")} · {formatCompact(featured?.views ?? 0)} views
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link href={featuredHref} className="btn-primary min-h-10 px-4 text-[11px] uppercase tracking-[0.14em]">
                  <Play className="size-3.5" />
                  Play Now
                </Link>
                <Link href="/blobs" className="btn-secondary min-h-10 px-4 text-[11px] uppercase tracking-[0.14em]">
                  <Sparkles className="size-3.5" />
                  Watch Blobs
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-white/12 bg-[#0e1a32]/86 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/75">Now Trending</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatCompact(metrics.activeStreams)} live sessions</p>
              <p className="mt-1 text-sm text-slate-300">New creators and public drops are accelerating this week.</p>
            </div>

            <div className="rounded-2xl border border-white/12 bg-[#0e1a32]/86 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100/75">Creator Momentum</p>
              <p className="mt-2 text-lg font-semibold text-white">{formatCompact(metrics.uploadsToday)} uploads today</p>
              <p className="mt-1 text-sm text-slate-300">Short-form blobs and long-form vault videos are both active.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {statPills.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-white/12 bg-[#101d36]/85 px-3.5 text-[11px] text-slate-200"
            >
              <span className="grid size-5 place-items-center rounded-full border border-cyan-200/22 bg-cyan-300/10 text-cyan-100">
                <Icon className="size-3" />
              </span>
              <span className="font-semibold text-white">{stat.value}</span>
              <span className="text-slate-400">{stat.label}</span>
            </div>
          );
        })}
      </section>

      <section className="sticky top-[calc(var(--safe-top)+3.25rem)] z-20 rounded-2xl border border-white/10 bg-[#060e1f]/84 p-2 backdrop-blur-2xl">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={["filter-chip", activeFilter === filter ? "filter-chip-active" : ""].join(" ")}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-6 pb-2">
        <DiscoveryCarousel blobMode href="/blobs" icon={Flame} title="Trending Blobs" videos={trendingBlobs} />
        <DiscoveryCarousel href="/browse?category=Gaming" icon={Gamepad2} title="Gaming" videos={gaming} />
        <DiscoveryCarousel href="/browse?category=Movies" icon={Film} title="Movies" videos={movies} />
        <DiscoveryCarousel href="/browse?category=Music" icon={Headphones} title="Music" videos={music} />
        <DiscoveryCarousel href="/browse?category=Sports" icon={Trophy} title="Sports" videos={sports} />
        <DiscoveryCarousel href="/browse?category=Live%20Events" icon={Radio} title="Live Streams" videos={live} />
        <DiscoveryCarousel href="/browse?q=encrypted" icon={LockKeyhole} title="Encrypted Creator Vaults" videos={vaults} />
      </div>
    </div>
  );
}
