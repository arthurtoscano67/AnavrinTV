"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Eye,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import { isAdminAddress } from "@/lib/anavrin-config";
import { formatBytes, formatCompact, formatDate, shortAddress } from "@/lib/format";
import type { AdminSnapshot, ReportRecord, VideoRecord } from "@/lib/types";

function SeverityBadge({ severity }: { severity: ReportRecord["severity"] }) {
  const className =
    severity === "high"
      ? "border-rose-300/20 bg-rose-300/12 text-rose-100"
      : severity === "medium"
        ? "border-amber-300/20 bg-amber-300/12 text-amber-100"
        : "border-cyan-300/20 bg-cyan-300/12 text-cyan-100";
  return <span className={`badge ${className}`}>{severity}</span>;
}

type ModerationTarget = Pick<VideoRecord, "id" | "title">;

async function fetchAdminSnapshot() {
  const response = await fetch("/api/admin");
  if (!response.ok) {
    throw new Error("Could not load the admin dashboard.");
  }

  return (await response.json()) as AdminSnapshot;
}

async function tryRefreshAdminSnapshot(setSnapshot: (snapshot: AdminSnapshot) => void) {
  try {
    const data = await fetchAdminSnapshot();
    setSnapshot(data);
  } catch {
    // Keep the last successful dashboard state if refresh fails.
  }
}

export default function AdminPage() {
  const account = useCurrentAccount();
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isAdminWallet = Boolean(account?.address && isAdminAddress(account.address));

  useEffect(() => {
    if (!isAdminWallet) return;

    let active = true;

    async function loadSnapshot() {
      try {
        const data = await fetchAdminSnapshot();
        if (active) setSnapshot(data);
      } catch {
        if (active) setMessage("Could not load the admin dashboard.");
      }
    }

    void loadSnapshot();

    return () => {
      active = false;
    };
  }, [isAdminWallet]);

  const stats = useMemo(() => {
    const metrics = snapshot?.metrics;
    return [
      { label: "Visitors", value: metrics ? formatCompact(metrics.visitorsToday) : "0", icon: Eye },
      { label: "Uploads", value: metrics ? formatCompact(metrics.uploadsToday) : "0", icon: BarChart3 },
      { label: "Open reports", value: metrics ? metrics.reportsOpen.toString() : "0", icon: AlertTriangle },
      { label: "Treasury", value: metrics ? `${metrics.treasuryCollectedSui.toFixed(1)} SUI` : "0 SUI", icon: Sparkles },
    ];
  }, [snapshot]);

  async function resolveReport(id: string) {
    const response = await fetch(`/api/reports/${id}`, { method: "PATCH" });
    if (!response.ok) {
      setMessage("Could not resolve the report.");
      return;
    }

    setMessage("Report resolved.");
    void tryRefreshAdminSnapshot(setSnapshot);
  }

  async function hideVideoFromPlatform(video: ModerationTarget) {
    const response = await fetch(`/api/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visibility: "private",
        status: "hidden",
      }),
    });

    if (!response.ok) {
      setMessage("Could not remove visibility from the video.");
      return;
    }

    setMessage(`${video.title} removed from public visibility.`);
    void tryRefreshAdminSnapshot(setSnapshot);
  }

  async function deleteVideoFromPlatform(video: ModerationTarget) {
    if (!window.confirm(`Delete "${video.title}" from the platform? This cannot be undone.`)) {
      return;
    }

    const response = await fetch(`/api/videos/${video.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage("Could not delete the video.");
      return;
    }

    setMessage(`${video.title} deleted from the platform.`);
    void tryRefreshAdminSnapshot(setSnapshot);
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <section className="surface p-6 md:p-8">
          <span className="badge border-cyan-300/20 bg-cyan-300/12 text-cyan-100">
            <ShieldAlert className="size-4" />
            Admin console
          </span>
          <h1 className="mt-5 text-4xl font-semibold text-white md:text-5xl">Connect a wallet to open admin.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Only wallets on the admin allowlist can see this page.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ConnectButton className="btn-primary">Connect Wallet</ConnectButton>
            <Link href="/" className="btn-secondary">
              Back to home
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (!isAdminWallet) {
    return (
      <div className="space-y-6">
        <section className="surface p-6 md:p-8">
          <span className="badge border-rose-300/20 bg-rose-300/12 text-rose-100">
            <ShieldAlert className="size-4" />
            Access restricted
          </span>
          <h1 className="mt-5 text-4xl font-semibold text-white md:text-5xl">This wallet cannot access admin.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            Connected wallet: {shortAddress(account.address, 4)}. Add this address to `NEXT_PUBLIC_ADMIN_ADDRESSES` to grant
            access.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ConnectButton className="btn-primary">Switch Wallet</ConnectButton>
            <Link href="/" className="btn-secondary">
              Back to home
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="surface p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <span className="badge border-cyan-300/20 bg-cyan-300/12 text-cyan-100">
              <ShieldAlert className="size-4" />
              Admin console
            </span>
            <h1 className="mt-5 text-4xl font-semibold text-white md:text-5xl">Monitor visitors, reports, and video safety.</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
              This control room keeps the platform healthy with moderation queues, visitor metrics, top videos, and a
              fast unpublish path for anything that needs attention.
            </p>
          </div>
          <Link href="/profile" className="btn-secondary">
            Creator profile
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className="metric-card">
              <div className="flex items-center justify-between gap-4">
                <p className="section-label">{item.label}</p>
                <Icon className="size-5 text-cyan-200" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="surface p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="section-label">Visitors</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Weekly site traffic</h2>
            </div>
            <p className="text-sm text-slate-400">Live snapshot from the admin API</p>
          </div>

          <div className="mt-6 flex h-56 items-end gap-2">
            {(snapshot?.metrics.weeklyVisitors ?? [0, 0, 0, 0, 0, 0, 0]).map((value, index, array) => {
              const max = Math.max(...array, 1);
              const height = Math.max(18, (value / max) * 100);
              return (
                <div key={`${value}-${index}`} className="flex-1">
                  <div
                    className="rounded-t-2xl bg-[linear-gradient(180deg,rgba(87,221,255,0.95),rgba(59,130,246,0.28))]"
                    style={{ height: `${height}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.28em] text-slate-400">
            <span>Mon</span>
            <span>Sun</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="metric-card">
            <p className="section-label">Top actions</p>
            <div className="mt-4 space-y-3 text-sm text-slate-300">
              {[
                "Resolve reports to keep the feed clean.",
                "Unpublish problematic videos with one patch call.",
                "Watch treasury fees and active streams from the same room.",
              ].map((item) => (
                <div key={item} className="rounded-3xl border border-white/8 bg-black/20 p-4">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="metric-card">
            <p className="section-label">Storage health</p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {snapshot?.metrics
                ? `Platform storage currently holds ${formatBytes(snapshot.metrics.storageUsedBytes)} across creators.`
                : "Storage metrics will appear once the admin feed loads."}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <div className="surface p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="section-label">Moderation</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Open report queue</h2>
            </div>
            <TriangleAlert className="size-10 text-amber-300" />
          </div>

          <div className="mt-6 space-y-3">
            {snapshot?.moderationQueue?.length ? (
              snapshot.moderationQueue.map((report) => (
                <div key={report.id} className="rounded-[28px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{report.videoTitle}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {report.reason} · {formatDate(report.createdAt)}
                      </p>
                    </div>
                    <SeverityBadge severity={report.severity} />
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-300">{report.detail}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={() => resolveReport(report.id)} type="button">
                      Resolve
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        hideVideoFromPlatform(
                          snapshot?.videos.find((video) => video.id === report.videoId) ?? {
                            id: report.videoId,
                            title: report.videoTitle,
                          },
                        )
                      }
                      type="button"
                    >
                      Remove visibility
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() =>
                        deleteVideoFromPlatform(
                          snapshot?.videos.find((video) => video.id === report.videoId) ?? {
                            id: report.videoId,
                            title: report.videoTitle,
                          },
                        )
                      }
                      type="button"
                    >
                      Delete video
                    </button>
                    <Link href={`/video/${report.videoId}`} className="btn-secondary">
                      Open video
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-slate-300">
                No open reports at the moment.
              </div>
            )}
          </div>
        </div>

        <div className="surface p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="section-label">Top videos</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Surface or hide content quickly</h2>
            </div>
            <Sparkles className="size-10 text-cyan-200" />
          </div>

          <div className="mt-6 space-y-3">
            {snapshot?.topVideos?.length ? (
              snapshot.topVideos.map((video) => (
                <article key={video.id} className="rounded-[28px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{video.title}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {video.ownerName} · {formatCompact(video.views)} views
                      </p>
                    </div>
                    <span className="badge">{video.visibility}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/video/${video.id}`} className="btn-secondary">
                      Open
                    </Link>
                    <button className="btn-secondary" onClick={() => hideVideoFromPlatform(video)} type="button">
                      Remove visibility
                    </button>
                    <button className="btn-danger" onClick={() => deleteVideoFromPlatform(video)} type="button">
                      Delete video
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-slate-300">
                Top videos will appear here once the admin feed loads.
              </div>
            )}
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-50">
          {message}
        </div>
      ) : null}
    </div>
  );
}
