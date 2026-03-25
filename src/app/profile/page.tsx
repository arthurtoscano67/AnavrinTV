import Link from "next/link";

import { normalizeUsernameInput, usernameFromDisplayName } from "@/lib/creator-identity";
import { formatCompact } from "@/lib/format";
import { loadDb } from "@/lib/db";
import { isPublishedWatchRelease } from "@/lib/video-monetization";

type CreatorSummary = {
  username: string;
  displayName: string;
  address: string;
  avatarUrl?: string;
  subscribers: number;
  videos: number;
};

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export default async function ProfileIndexPage() {
  const db = await loadDb();
  const creators = new Map<string, CreatorSummary>();

  for (const account of db.accounts) {
    const username = normalizeUsernameInput(account.username || account.handle);
    if (!username) continue;

    const publishedCount = db.videos.filter(
      (video) => video.ownerAddress === account.address && isPublishedWatchRelease(video),
    ).length;

    creators.set(username, {
      username,
      displayName: account.displayName,
      address: account.address,
      avatarUrl: account.avatarUrl,
      subscribers: account.followersCount ?? account.followers ?? 0,
      videos: publishedCount,
    });
  }

  for (const video of db.videos) {
    const username =
      normalizeUsernameInput(video.creatorUsername) ||
      usernameFromDisplayName(video.ownerName, video.ownerAddress);
    if (!username) continue;
    if (creators.has(username)) continue;

    const publishedCount = db.videos.filter(
      (item) => item.ownerAddress === video.ownerAddress && isPublishedWatchRelease(item),
    ).length;

    creators.set(username, {
      username,
      displayName: video.creatorDisplayName || video.ownerName,
      address: video.ownerAddress,
      subscribers: video.subscribers,
      videos: publishedCount,
    });
  }

  const list = [...creators.values()].sort((a, b) => b.subscribers - a.subscribers);

  return (
    <div className="mx-auto max-w-[1284px] p-4 sm:p-6 lg:p-8">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">Channels</h1>
        <p className="text-sm text-yt-gray">Open a creator channel page exactly like the SuiTube layout.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((creator) => (
          <Link
            key={creator.username}
            href={`/profile/${creator.username}`}
            className="group flex items-center gap-4 rounded-2xl border border-yt-border bg-yt-dark p-4 transition-colors hover:bg-[#2b2b2b]"
          >
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-yt-border bg-yt-black text-sm font-bold">
              {creator.avatarUrl ? (
                <img src={creator.avatarUrl} alt={creator.displayName} className="h-full w-full object-cover" />
              ) : (
                initials(creator.displayName)
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white group-hover:text-yt-red">{creator.displayName}</p>
              <p className="mt-1 truncate text-xs text-yt-gray">@{creator.username}</p>
              <p className="mt-1 text-xs text-yt-gray">
                {formatCompact(creator.subscribers)} subscribers • {creator.videos} videos
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
