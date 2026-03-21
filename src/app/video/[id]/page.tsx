import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock3,
  Eye,
  Heart,
  Lock,
  PlayCircle,
  Sparkles,
  Tag,
  WalletCards,
} from "lucide-react";

import { VideoActions } from "@/components/video-actions";
import { VideoPlayer } from "@/components/video-player";
import { formatCompact, formatDate } from "@/lib/format";
import { getVideo, getVideos } from "@/lib/db";

export const dynamicParams = false;

export async function generateStaticParams() {
  const videos = await getVideos({ includeDrafts: true });
  const ids = new Set<string>();

  for (const video of videos) {
    if (video.slug) ids.add(video.slug);
    ids.add(video.id);
  }

  return Array.from(ids).map((id) => ({ id }));
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) notFound();

  return (
    <div className="space-y-6">
      <section className="surface p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <span className="badge border-cyan-300/20 bg-cyan-300/12 text-cyan-100">
                <Sparkles className="size-4" />
                Video detail
              </span>
              <span className="badge">
                <Lock className="size-4" />
                {video.visibility}
              </span>
              <span className="badge">{video.category}</span>
            </div>

            <div>
              <h1 className="text-4xl font-semibold text-white md:text-5xl">{video.title}</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">{video.description}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span className="chip">
                <WalletCards className="size-4 text-cyan-200" />
                {video.ownerName}
              </span>
              <span className="chip">
                <Clock3 className="size-4 text-cyan-200" />
                {video.duration}
              </span>
              <span className="chip">
                <Eye className="size-4 text-cyan-200" />
                {formatCompact(video.views)} views
              </span>
              <span className="chip">
                <Heart className="size-4 text-cyan-200" />
                {formatCompact(video.likes)} likes
              </span>
            </div>

            {video.asset ? (
              <VideoPlayer
                contentType={video.asset.contentType}
                ownerAddress={video.ownerAddress}
                policyNonce={video.asset.nonce ?? video.policyNonce}
                policyObjectId={video.policyObjectId}
                storageMode={video.asset.storageMode}
                videoId={video.id}
              />
            ) : (
              <div
                className="overflow-hidden rounded-[32px] border border-white/10 bg-black/20"
                style={{
                  background: `linear-gradient(135deg, ${video.coverFrom} 0%, ${video.coverVia} 52%, ${video.coverTo} 100%)`,
                }}
              >
                <div className="flex aspect-video items-center justify-center p-8 text-center">
                  <div className="max-w-xl rounded-[32px] border border-white/15 bg-black/30 p-8 backdrop-blur">
                    <PlayCircle className="mx-auto size-12 text-cyan-100" />
                    <h2 className="mt-4 text-2xl font-semibold text-white">Preview card only</h2>
                    <p className="mt-3 text-sm leading-7 text-slate-200">
                      This seeded video is a network card without an uploaded file. Real creator uploads stream from the
                      sealed Walrus bundle.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <VideoActions video={video} />
          </div>

          <aside className="space-y-4">
            <div className="metric-card">
              <p className="section-label">Metadata</p>
              <div className="mt-4 grid gap-3">
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Published</p>
                  <p className="mt-2 text-sm font-semibold text-white">
                    {video.publishedAt ? formatDate(video.publishedAt) : "Not published yet"}
                  </p>
                </div>
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Subscribers</p>
                  <p className="mt-2 text-sm font-semibold text-white">{formatCompact(video.subscribers)}</p>
                </div>
                <div className="kpi">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">Tips</p>
                  <p className="mt-2 text-sm font-semibold text-white">{formatCompact(video.tips)}</p>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <p className="section-label">Tags</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {video.tags.map((tag) => (
                  <span key={tag} className="chip">
                    <Tag className="size-4 text-cyan-200" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="metric-card">
              <p className="section-label">Creator</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{video.ownerName}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                The creator dashboard keeps this upload linked to the owner profile, storage usage, and a sealed relay
                bundle.
              </p>
              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Owner address</span>
                  <span className="font-semibold text-white">{video.ownerAddress}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span>Created</span>
                  <span className="font-semibold text-white">
                    {video.createdAt ? formatDate(video.createdAt) : "Unknown"}
                  </span>
                </div>
              </div>
            </div>

            <div className="metric-card">
              <p className="section-label">Actions</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/browse" className="btn-secondary">
                  Back to browse
                </Link>
                <Link href="/profile" className="btn-primary">
                  Profile
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
