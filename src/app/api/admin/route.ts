import { NextResponse } from "next/server";

import { getMetrics, getPlatformSettings, getReports, getVideos, updatePlatformSettings } from "@/lib/db";
import type { PlatformSettings } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const [metrics, reports, videos, settings] = await Promise.all([
    getMetrics(),
    getReports(),
    getVideos({ includeDrafts: true, publicOnly: false }),
    getPlatformSettings(),
  ]);

  return NextResponse.json({
    metrics,
    reports,
    videos,
    moderationQueue: reports.filter((report) => report.status === "open"),
    topVideos: [...videos].sort((a, b) => b.views - a.views).slice(0, 6),
    settings,
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    settings?: Partial<PlatformSettings>;
  };

  if (!body.settings) {
    return NextResponse.json({ error: "Settings payload is required." }, { status: 400 });
  }

  const settings = await updatePlatformSettings(body.settings);
  return NextResponse.json({ settings });
}
