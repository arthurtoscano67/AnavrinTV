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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") ?? 24) || 24));
  const q = searchParams.get("q") ?? "";
  const address = searchParams.get("address")?.trim().toLowerCase() ?? "";

  const db = await loadDb();
  const publicVideos = db.videos.filter((video) => {
    if (video.visibility !== "public") return false;
    if (video.status !== "published") return false;
    if (!isBlobVideoRecord(video)) return false;
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

  const blobs = buildBlobFeedFromVideos(publicVideos, accountsByAddress)
    .map((blob) => ({
      ...blob,
      likedByUser: userLikedBlobIds ? userLikedBlobIds.has(blob.id) : blob.likedByUser,
      followedByUser: userFollowedCreatorAddresses
        ? userFollowedCreatorAddresses.has((blob.creatorAddress ?? "").trim().toLowerCase())
        : blob.followedByUser,
    }))
    .slice(0, limit);
  return NextResponse.json({ blobs });
}
