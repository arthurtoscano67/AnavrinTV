import { NextRequest } from "next/server";

import { streamVideo } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await streamVideo(id);

  if (!result) {
    return new Response("Video not available", { status: 404 });
  }

  const contentType = result.contentType || result.video.asset?.contentType || "video/mp4";
  return new Response(Buffer.from(result.bytes), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(result.bytes.length),
      "X-Anavrin-Encrypted": result.encrypted ? "1" : "0",
      "Cache-Control": "no-store",
    },
  });
}
