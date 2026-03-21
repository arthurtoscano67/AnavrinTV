import { NextResponse } from "next/server";

import { getPlatformSettings } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const settings = await getPlatformSettings();
  return NextResponse.json({ settings });
}
