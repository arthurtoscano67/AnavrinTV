"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";
import { MoreHorizontal, Share2, ThumbsDown, ThumbsUp } from "lucide-react";

import { MainVideoPlayer } from "@/components/watch/main-video-player";
import { VideoAccessPanel } from "@/components/watch/video-access-panel";
import { formatCompact, formatRelativeTime } from "@/lib/format";
import { buildApiUrl } from "@/lib/site-url";
import type { VideoRecord } from "@/lib/types";

type WatchPageProps = {
  video: VideoRecord;
  recommendations: VideoRecord[];
};

type CommentItem = {
  id: string;
  authorName: string;
  authorHandle: string;
  authorAvatar?: string;
  body: string;
  likes: number;
  createdAt: string;
};

function creatorHref(video: VideoRecord) {
  return video.creatorUsername ? `/profile/${video.creatorUsername}` : "/profile";
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function buildSampleComments(video: VideoRecord): CommentItem[] {
  const now = Date.now();
  const tags = video.tags.slice(0, 3);

  return [
    {
      id: `${video.id}-c1`,
      authorName: "Sui Builder",
      authorHandle: "@suibuilder",
      body: `Great breakdown, especially around ${tags[0] ?? "the upload flow"}.`,
      likes: 84,
      createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: `${video.id}-c2`,
      authorName: "Walrus Dev",
      authorHandle: "@walrusdev",
      body: "The pacing and examples made this easy to follow. Please do a part 2.",
      likes: 46,
      createdAt: new Date(now - 1000 * 60 * 60 * 8).toISOString(),
    },
    {
      id: `${video.id}-c3`,
      authorName: "Creator Loop",
      authorHandle: "@creatorloop",
      body: `Publishing workflow + ${tags[1] ?? "analytics"} in one place is exactly what we needed.`,
      likes: 21,
      createdAt: new Date(now - 1000 * 60 * 60 * 14).toISOString(),
    },
  ];
}

function RecommendedItem({ item }: { item: VideoRecord }) {
  const href = `/video/${item.id}`;
  const thumb = item.thumbnailUrl?.trim() ? buildApiUrl(item.thumbnailUrl) : null;
  const creatorName = item.creatorDisplayName || item.ownerName;

  return (
    <Link href={href} className="group flex gap-2">
      <div className="relative h-auto w-40 flex-shrink-0 overflow-hidden rounded-lg border border-yt-border bg-yt-dark" style={{ aspectRatio: "16 / 9" }}>
        {thumb ? (
          <img src={thumb} alt={item.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(145deg, ${item.coverFrom} 0%, ${item.coverVia} 48%, ${item.coverTo} 100%)` }}
          />
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-1 overflow-hidden">
        <h4 className="line-clamp-2 text-sm font-bold leading-tight transition-colors group-hover:text-yt-red">{item.title}</h4>
        <div className="flex flex-col text-[10px] text-yt-gray">
          <span>{creatorName}</span>
          <div className="flex items-center gap-1">
            <span>{formatCompact(item.views)} views</span>
            <span>•</span>
            <span>{formatRelativeTime(item.publishedAt ?? item.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function WatchPage({ video, recommendations }: WatchPageProps) {
  const [entitlementRefreshKey, setEntitlementRefreshKey] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<CommentItem[]>(() => buildSampleComments(video));
  const [likes, setLikes] = useState(video.likes);

  const creatorName = video.creatorDisplayName || video.ownerName;
  const creatorLink = creatorHref(video);
  const creatorAvatar = video.creatorAvatarUrl;

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentText.trim();
    if (!body) return;

    setComments((current) => [
      {
        id: `local-${Date.now()}`,
        authorName: "You",
        authorHandle: "@you",
        body,
        likes: 0,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setCommentText("");
  }

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:p-8">
      <div className="flex flex-1 flex-col gap-4">
        <MainVideoPlayer refreshToken={entitlementRefreshKey} video={video} />

        <div className="mt-2">
          <VideoAccessPanel onUnlocked={() => setEntitlementRefreshKey((value) => value + 1)} video={video} />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold leading-tight">{video.title}</h1>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href={creatorLink} className="h-10 w-10 overflow-hidden rounded-full border border-yt-border bg-yt-dark">
                {creatorAvatar ? (
                  <img src={creatorAvatar} alt={creatorName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm">{initials(creatorName)}</div>
                )}
              </Link>

              <div className="flex flex-col">
                <Link href={creatorLink} className="text-sm font-bold transition-colors hover:text-yt-red">
                  {creatorName}
                </Link>
                <span className="text-xs text-yt-gray">{formatCompact(video.subscribers)} subscribers</span>
              </div>

              <button className="ml-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-white/90" type="button">
                Subscribe
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center overflow-hidden rounded-full bg-white/10">
                <button
                  onClick={() => setLikes((current) => current + 1)}
                  className="flex items-center gap-2 border-r border-white/10 px-4 py-2 transition-colors hover:bg-white/10"
                  type="button"
                >
                  <ThumbsUp className="h-5 w-5" />
                  <span className="text-sm font-bold">{formatCompact(likes)}</span>
                </button>
                <button className="px-4 py-2 transition-colors hover:bg-white/10" type="button">
                  <ThumbsDown className="h-5 w-5" />
                </button>
              </div>

              <button className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 transition-colors hover:bg-white/20" type="button">
                <Share2 className="h-5 w-5" />
                <span className="text-sm font-bold">Share</span>
              </button>

              <button className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20" type="button">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-2 rounded-xl bg-white/5 p-4">
          <div className="mb-1 flex items-center gap-2 text-sm font-bold">
            <span>{formatCompact(video.views)} views</span>
            <span>{formatRelativeTime(video.publishedAt ?? video.createdAt)}</span>
          </div>

          <p className="whitespace-pre-wrap text-sm leading-relaxed">{video.description}</p>

          {video.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {video.tags.map((tag) => (
                <span key={tag} className="cursor-pointer text-xs font-medium text-blue-400 hover:underline">#{tag.replace(/\s+/g, "")}</span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold">{formatCompact(Math.max(video.comments, comments.length))} Comments</h3>
            <div className="flex cursor-pointer items-center gap-2 text-sm font-bold">
              <MoreHorizontal className="h-4 w-4" />
              Sort by
            </div>
          </div>

          <form onSubmit={submitComment} className="flex gap-4">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-yt-border bg-yt-dark text-xs font-semibold">
              YOU
            </div>

            <div className="flex flex-1 flex-col gap-2">
              <input
                type="text"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                className="border-b border-yt-border bg-transparent py-2 text-sm outline-none transition-colors focus:border-white"
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setCommentText("")} className="rounded-full px-4 py-2 text-sm font-bold transition-colors hover:bg-white/10">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="rounded-full bg-blue-500 px-4 py-2 text-sm font-bold text-white transition-colors disabled:bg-white/10 disabled:text-yt-gray"
                >
                  Comment
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-col gap-6">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-yt-border bg-yt-dark text-xs">
                  {comment.authorAvatar ? <img src={comment.authorAvatar} alt={comment.authorName} className="h-full w-full object-cover" /> : initials(comment.authorName)}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{comment.authorHandle}</span>
                    <span className="text-[10px] text-yt-gray">{formatRelativeTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-sm leading-snug">{comment.body}</p>
                  <div className="mt-1 flex items-center gap-4">
                    <button className="flex items-center gap-1 text-yt-gray transition-colors hover:text-white" type="button">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="text-[10px]">{formatCompact(comment.likes)}</span>
                    </button>
                    <button className="text-yt-gray transition-colors hover:text-white" type="button">
                      <ThumbsDown className="h-4 w-4" />
                    </button>
                    <button className="text-[10px] font-bold text-yt-gray transition-colors hover:text-white" type="button">
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-4 lg:w-[400px]">
        <h3 className="text-lg font-bold">Up next</h3>
        <div className="flex flex-col gap-3">
          {recommendations.slice(0, 14).map((item) => (
            <RecommendedItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
