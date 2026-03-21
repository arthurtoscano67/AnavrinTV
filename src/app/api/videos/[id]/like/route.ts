import { NextRequest, NextResponse } from "next/server";

import { recordReaction } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await recordReaction(id, "like", 1);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  return NextResponse.json({ likes: video.likes });
}

