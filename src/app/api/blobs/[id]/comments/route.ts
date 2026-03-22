import { NextRequest, NextResponse } from "next/server";

import { addBlobComment, getBlobComments } from "@/lib/db";
import { ensureSameActorAddress } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") ?? 100) || 100));
  const comments = await getBlobComments(id, limit);
  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    address?: string;
    body?: string;
  };

  const address = body.address?.trim().toLowerCase();
  const commentBody = body.body?.trim();

  if (!address) {
    return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });
  }

  if (!commentBody) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }

  const actorCheck = ensureSameActorAddress(request, address);
  if (!actorCheck.ok) return actorCheck.response;

  try {
    const result = await addBlobComment({
      blobId: id,
      authorAddress: address,
      body: commentBody,
    });

    if (!result) return NextResponse.json({ error: "Blob not found" }, { status: 404 });

    const comments = await getBlobComments(id, 200);
    return NextResponse.json({
      comment: result.comment,
      comments,
      commentsCount: result.video.comments,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not post comment.";
    const status = message.toLowerCase().includes("banned") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
