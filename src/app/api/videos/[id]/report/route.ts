import { NextRequest, NextResponse } from "next/server";

import { createReport } from "@/lib/db";
import { normalizeAddress, readActorAddress } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
    detail?: string;
    severity?: "low" | "medium" | "high";
    reporter?: string;
    reporterAddress?: string;
  };

  const reporterAddress = readActorAddress(request);
  const claimedReporterAddress = normalizeAddress(body.reporterAddress);
  if (claimedReporterAddress && reporterAddress && reporterAddress !== claimedReporterAddress) {
    return NextResponse.json({ error: "Authenticated wallet does not match reporter address." }, { status: 403 });
  }
  const reporterLabel = reporterAddress || body.reporter?.trim() || "viewer";

  try {
    const report = await createReport({
      videoId: id,
      reason: body.reason ?? "Needs review",
      detail: body.detail ?? "Reported from the viewer UI.",
      severity: body.severity ?? "medium",
      reporter: reporterLabel,
      reporterAddress: reporterAddress || undefined,
    });

    if (!report) return NextResponse.json({ error: "Video not found" }, { status: 404 });
    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit report.";
    const status = message.toLowerCase().includes("banned") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
