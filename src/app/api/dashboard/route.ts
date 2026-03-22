import { NextRequest, NextResponse } from "next/server";

import { getDashboardSnapshot } from "@/lib/db";
import { normalizeAddress, readActorAddress, requireAdmin } from "@/lib/request-auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address") ?? undefined;
  const normalizedAddress = normalizeAddress(address);
  const actorAddress = readActorAddress(request);
  const adminCheck = requireAdmin(request);

  if (normalizedAddress && !adminCheck.ok && actorAddress !== normalizedAddress) {
    return NextResponse.json({ error: "Not authorized to view this dashboard." }, { status: 403 });
  }

  const snapshot = await getDashboardSnapshot(address);
  return NextResponse.json(snapshot);
}
