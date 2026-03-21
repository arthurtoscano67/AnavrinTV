import { NextRequest, NextResponse } from "next/server";

import { getVideo, removeVideo, updateVideoStatus } from "@/lib/db";
import type { VideoStatus, VideoVisibility } from "@/lib/types";

export const runtime = "nodejs";

function isVisibility(value: unknown): value is VideoVisibility {
  return value === "public" || value === "private" || value === "draft";
}

function isStatus(value: unknown): value is VideoStatus {
  return value === "published" || value === "processing" || value === "draft" || value === "hidden";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  return NextResponse.json({ video });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json().catch(() => ({}))) as {
    visibility?: VideoVisibility;
    status?: VideoStatus;
    title?: string;
    description?: string;
  };

  if (payload.visibility && !isVisibility(payload.visibility)) {
    return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
  }

  if (payload.status && !isStatus(payload.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const video = await updateVideoStatus(id, payload);
  if (!video) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  return NextResponse.json({ video });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await removeVideo(id);
  if (!ok) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

