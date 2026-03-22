import { NextRequest, NextResponse } from "next/server";

import { setBlobFollow } from "@/lib/db";
import { ensureSameActorAddress } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    address?: string;
    followed?: boolean;
  };

  const address = body.address?.trim().toLowerCase();
  if (!address) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

  const actorCheck = ensureSameActorAddress(request, address);
  if (!actorCheck.ok) return actorCheck.response;

  try {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update follow.";
    const status = message.toLowerCase().includes("banned") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
