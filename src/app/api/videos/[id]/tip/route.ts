import { NextRequest, NextResponse } from "next/server";

import { recordReaction } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    platformFeeSui?: number;
  };
  const amount = Number.isFinite(body.amount) ? Number(body.amount) : 1;
  if (amount < 1) {
    return NextResponse.json({ error: "Tips must be at least 1 SUI." }, { status: 400 });
  }

  const video = await recordReaction(id, "tip", amount, {
    platformFeeSui: Number.isFinite(body.platformFeeSui) ? Number(body.platformFeeSui) : 0,
  });
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  return NextResponse.json({ tips: video.tips });
}
