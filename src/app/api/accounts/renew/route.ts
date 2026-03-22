import { NextRequest, NextResponse } from "next/server";

import { renewAccount, renewVideoStorage } from "@/lib/db";
import { ensureSameActorAddress, requireAdmin } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    address?: string;
    days?: number;
    videoId?: string;
    platformFeeSui?: number;
  };

  if (!body.address) {
    return NextResponse.json({ error: "Account address is required." }, { status: 400 });
  }

  const adminCheck = requireAdmin(request);
  if (!adminCheck.ok) {
    const actorCheck = ensureSameActorAddress(request, body.address);
    if (!actorCheck.ok) return actorCheck.response;
  }

  try {
    if (body.videoId) {
      const video = await renewVideoStorage({
        videoId: body.videoId,
        days: Number.isFinite(body.days) ? Number(body.days) : 30,
        ownerAddress: body.address,
        platformFeeSui: Number.isFinite(body.platformFeeSui) ? Number(body.platformFeeSui) : 0,
      });

      if (!video) {
        return NextResponse.json({ error: "Video not found." }, { status: 404 });
      }

      return NextResponse.json(video);
    }

    const account = await renewAccount(body.address, Number.isFinite(body.days) ? Number(body.days) : 30);
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });
    return NextResponse.json({ account });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Renewal failed.";
    const status = message.toLowerCase().includes("banned") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
