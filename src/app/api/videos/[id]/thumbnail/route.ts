import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest } from "next/server";

import { getVideo } from "@/lib/db";
import { readActorAddress, requireAdmin } from "@/lib/request-auth";
import { isPublishedWatchRelease } from "@/lib/video-monetization";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video?.asset?.thumbnailPath) {
    return new Response("Thumbnail not found", { status: 404 });
  }

  const viewerAddress = readActorAddress(request);
  const isOwner = Boolean(viewerAddress) && viewerAddress === video.ownerAddress.toLowerCase();
  const adminCheck = requireAdmin(request);
  const isAdmin = adminCheck.ok;
  const isVisible = isPublishedWatchRelease(video);

  if (!isVisible && !isOwner && !isAdmin) {
    return new Response("Thumbnail not found", { status: 404 });
  }

  const absolutePath = join(/* turbopackIgnore: true */ process.cwd(), video.asset.thumbnailPath);
  try {
    const bytes = await readFile(absolutePath);
    return new Response(bytes, {
      headers: {
        "Content-Type": video.asset.thumbnailContentType || "application/octet-stream",
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Thumbnail not found", { status: 404 });
  }
}
