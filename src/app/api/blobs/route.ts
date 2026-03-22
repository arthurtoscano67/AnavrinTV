import { NextRequest, NextResponse } from "next/server";

import { buildBlobFeedFromVideos, isBlobVideoRecord } from "@/lib/blobs";
import { loadDb } from "@/lib/db";
import type { VideoRecord } from "@/lib/types";

export const runtime = "nodejs";

function matchesQuery(video: VideoRecord, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  const searchable = [video.title, video.description, video.ownerName, video.category, video.tags.join(" ")]
    .join(" ")
    .toLowerCase();
  return searchable.includes(needle);
}

function isBannedAccount(account?: { isBanned?: boolean; bannedUntil?: string } | null) {
  if (!account?.isBanned) return false;
  if (!account.bannedUntil) return true;
  const bannedUntilMs = new Date(account.bannedUntil).getTime();
  if (!Number.isFinite(bannedUntilMs)) return true;
  return bannedUntilMs > Date.now();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") ?? 24) || 24));
  const q = searchParams.get("q") ?? "";
  const address = searchParams.get("address")?.trim().toLowerCase() ?? "";

  const db = await loadDb();
  const accountByAddress = new Map(db.accounts.map((account) => [account.address.toLowerCase(), account] as const));
  const publicVideos = db.videos.filter((video) => {
    if (video.visibility !== "public") return false;
    if (video.status !== "published") return false;
    if (!isBlobVideoRecord(video)) return false;
    if (isBannedAccount(accountByAddress.get(video.ownerAddress.toLowerCase()))) return false;
    return matchesQuery(video, q);
  });

  const accountsByAddress = new Map(
    db.accounts.map((account) => [
      account.address,
      {
        address: account.address,
        displayName: account.displayName,
        avatarSeed: account.avatarSeed,
        handle: account.handle,
      },
    ]),
  );

  const userLikedBlobIds = address
    ? new Set(
        db.blobLikes
          .filter((record) => record.userAddress.trim().toLowerCase() === address)
          .map((record) => record.blobId),
      )
    : null;
  const userFollowedCreatorAddresses = address
    ? new Set(
        db.blobFollows
          .filter((record) => record.userAddress.trim().toLowerCase() === address)
          .map((record) => record.creatorAddress.trim().toLowerCase()),
      )
    : null;
  const userBookmarkedVideoIds = address
    ? new Set(
        db.videoBookmarks
          .filter((record) => record.userAddress.trim().toLowerCase() === address)
          .map((record) => record.videoId),
      )
    : null;

  const blobs = buildBlobFeedFromVideos(publicVideos, accountsByAddress)
    .map((blob) => ({
      ...blob,
      likedByUser: userLikedBlobIds ? userLikedBlobIds.has(blob.id) : blob.likedByUser,
      bookmarkedByUser:
        userBookmarkedVideoIds && blob.videoId ? userBookmarkedVideoIds.has(blob.videoId) : blob.bookmarkedByUser,
      followedByUser: userFollowedCreatorAddresses
        ? userFollowedCreatorAddresses.has((blob.creatorAddress ?? "").trim().toLowerCase())
        : blob.followedByUser,
    }))
    .slice(0, limit);
  return NextResponse.json({ blobs });
}
