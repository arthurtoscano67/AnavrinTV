import { NextRequest, NextResponse } from "next/server";

import { createReport } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
    detail?: string;
    severity?: "low" | "medium" | "high";
    reporter?: string;
  };

  const report = await createReport({
    videoId: id,
    reason: body.reason ?? "Needs review",
    detail: body.detail ?? "Reported from the viewer UI.",
    severity: body.severity ?? "medium",
    reporter: body.reporter ?? "viewer",
  });

  if (!report) return NextResponse.json({ error: "Video not found" }, { status: 404 });
  return NextResponse.json({ report });
}

