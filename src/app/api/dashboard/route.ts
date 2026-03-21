import { NextRequest, NextResponse } from "next/server";

import { getDashboardSnapshot } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address") ?? undefined;
  const snapshot = await getDashboardSnapshot(address);
  return NextResponse.json(snapshot);
}

