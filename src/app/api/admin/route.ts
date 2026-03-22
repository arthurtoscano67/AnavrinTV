import { NextRequest, NextResponse } from "next/server";

import { getAccounts, getMetrics, getPlatformSettings, getReports, getVideos, updatePlatformSettings } from "@/lib/db";
import { requireAdmin } from "@/lib/request-auth";
import type { PlatformSettings } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const adminCheck = requireAdmin(request);
  if (!adminCheck.ok) return adminCheck.response;

  const [metrics, reports, videos, settings, accounts] = await Promise.all([
    getMetrics(),
    getReports(),
    getVideos({ includeDrafts: true, publicOnly: false }),
    getPlatformSettings(),
    getAccounts(),
  ]);

  return NextResponse.json({
    metrics,
    reports,
    videos,
    accounts,
    moderationQueue: reports.filter((report) => report.status === "open"),
    topVideos: [...videos].sort((a, b) => b.views - a.views).slice(0, 6),
    settings,
  });
}

export async function PATCH(request: NextRequest) {
  const adminCheck = requireAdmin(request);
  if (!adminCheck.ok) return adminCheck.response;

  const body = (await request.json().catch(() => ({}))) as {
    settings?: Partial<PlatformSettings>;
  };

  if (!body.settings) {
    return NextResponse.json({ error: "Settings payload is required." }, { status: 400 });
  }

  const settings = await updatePlatformSettings(body.settings);
  return NextResponse.json({ settings });
}
