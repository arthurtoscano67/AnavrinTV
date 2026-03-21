import { NextRequest, NextResponse } from "next/server";

import { setBlobLike } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    address?: string;
    liked?: boolean;
  };

  const address = body.address?.trim();
  if (!address) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

  const result = await setBlobLike({
    blobId: id,
    userAddress: address,
    liked: typeof body.liked === "boolean" ? body.liked : undefined,
  });

  if (!result) return NextResponse.json({ error: "Blob not found" }, { status: 404 });
  return NextResponse.json({
    liked: result.liked,
    likes: result.video.likes,
  });
}
