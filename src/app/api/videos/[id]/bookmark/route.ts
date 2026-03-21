import { NextRequest, NextResponse } from "next/server";

import { getVideoBookmarkStatus, setVideoBookmark } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const address = request.nextUrl.searchParams.get("address")?.trim().toLowerCase();
  if (!address) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

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

  const result = await setVideoBookmark({
    videoId: id,
    userAddress: address,
    saved: typeof body.saved === "boolean" ? body.saved : undefined,
  });

  if (!result) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  return NextResponse.json({ saved: result.saved });
}
