import { NextRequest, NextResponse } from "next/server";

import { recordReaction } from "@/lib/db";
import { normalizeAddress, readActorAddress } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    amount?: number;
    platformFeeSui?: number;
    address?: string;
  };
  const amount = Number.isFinite(body.amount) ? Number(body.amount) : 1;
  if (amount < 1) {
    return NextResponse.json({ error: "Tips must be at least 1 SUI." }, { status: 400 });
  }

  const actorAddress = readActorAddress(request);
  if (!actorAddress) {
    return NextResponse.json({ error: "Authenticated wallet address is required." }, { status: 401 });
  }

  const claimedAddress = normalizeAddress(body.address);
  if (claimedAddress && claimedAddress !== actorAddress) {
    return NextResponse.json({ error: "Authenticated wallet does not match tip signer." }, { status: 403 });
  }

  try {
    const video = await recordReaction(id, "tip", amount, {
      platformFeeSui: Number.isFinite(body.platformFeeSui) ? Number(body.platformFeeSui) : 0,
      actorAddress,
    });
    if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    return NextResponse.json({ tips: video.tips });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send tip.";
    const status = message.toLowerCase().includes("banned") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
