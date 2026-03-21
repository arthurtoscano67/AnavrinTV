import { NextRequest, NextResponse } from "next/server";

import { setBlobFollow } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    address?: string;
    followed?: boolean;
  };

  const address = body.address?.trim();
  if (!address) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

  const result = await setBlobFollow({
    blobId: id,
    userAddress: address,
    followed: typeof body.followed === "boolean" ? body.followed : undefined,
  });

  if (!result) return NextResponse.json({ error: "Blob not found" }, { status: 404 });
  return NextResponse.json({
    followed: result.followed,
    followers: result.followers,
  });
}
