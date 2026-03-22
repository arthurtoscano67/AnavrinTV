import { NextRequest, NextResponse } from "next/server";

import { resolveReport } from "@/lib/db";
import { requireAdmin } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = requireAdmin(request);
  if (!adminCheck.ok) return adminCheck.response;

  const { id } = await params;
  const report = await resolveReport(id);
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });
  return NextResponse.json({ report });
}
