import { NextRequest, NextResponse } from "next/server";

import { getVideoBookmarkStatus, setVideoBookmark } from "@/lib/db";
import { ensureSameActorAddress } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const address = request.nextUrl.searchParams.get("address")?.trim().toLowerCase();
  if (!address) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

  const actorCheck = ensureSameActorAddress(request, address);
  if (!actorCheck.ok) return actorCheck.response;

  const saved = await getVideoBookmarkStatus({
    videoId: id,
    userAddress: address,
  });

  return NextResponse.json({ saved });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    address?: string;
    saved?: boolean;
  };

  const address = body.address?.trim().toLowerCase();
  if (!address) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

  const actorCheck = ensureSameActorAddress(request, address);
  if (!actorCheck.ok) return actorCheck.response;

  try {
    const result = await setVideoBookmark({
      videoId: id,
      userAddress: address,
      saved: typeof body.saved === "boolean" ? body.saved : undefined,
    });

    if (!result) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    return NextResponse.json({ saved: result.saved });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update bookmark.";
    const status = message.toLowerCase().includes("banned") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
