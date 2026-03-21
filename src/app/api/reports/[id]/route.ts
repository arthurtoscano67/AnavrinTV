import { NextRequest, NextResponse } from "next/server";

import { resolveReport } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await resolveReport(id);
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json({ report });
}

