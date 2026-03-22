import { NextRequest, NextResponse } from "next/server";

import { recordReaction } from "@/lib/db";
import { readActorAddress } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actorAddress = readActorAddress(request);

  try {
    const video = await recordReaction(id, "like", 1, {
      actorAddress: actorAddress || undefined,
    });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    return NextResponse.json({ likes: video.likes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not like video.";
    const status = message.toLowerCase().includes("banned") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
