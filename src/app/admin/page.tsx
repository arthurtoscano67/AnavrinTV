"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Ban,
  Eye,
  Settings2,
  ShieldAlert,
  Sparkles,
  TriangleAlert,
  UserCog,
} from "lucide-react";

import { ModalShell } from "@/components/ui/modal-shell";
import { isAdminAddress } from "@/lib/anavrin-config";
import { formatBytes, formatCompact, formatDate, shortAddress } from "@/lib/format";
import { buildApiUrl } from "@/lib/site-url";
import type { AdminSnapshot, PlatformSettings, ReportRecord, VideoRecord, WalletSession } from "@/lib/types";

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
type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "default";
  onConfirm: () => Promise<boolean | void>;
};

function adminHeaders(adminAddress: string) {
  return {
    "x-anavrin-admin-address": adminAddress,
  };
}

async function fetchAdminSnapshot(adminAddress: string) {
  const response = await fetch(buildApiUrl("/api/admin"), {
    headers: adminHeaders(adminAddress),
  });
  if (!response.ok) {
    throw new Error("Could not load the admin dashboard.");
  }

  return (await response.json()) as AdminSnapshot;
}

async function tryRefreshAdminSnapshot(adminAddress: string, setSnapshot: (snapshot: AdminSnapshot) => void) {
  try {
    const data = await fetchAdminSnapshot(adminAddress);
    setSnapshot(data);
  } catch {
    // Keep the last successful dashboard state if refresh fails.
  }
}

export default function AdminPage() {
  const account = useCurrentAccount();
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<PlatformSettings | null>(null);
  const [pendingAccountAction, setPendingAccountAction] = useState<string | null>(null);
  const [feeDrafts, setFeeDrafts] = useState<Record<string, string>>({});
  const [banDrafts, setBanDrafts] = useState<Record<string, string>>({});
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [managedAccountAddress, setManagedAccountAddress] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmingDialog, setConfirmingDialog] = useState(false);
  const isAdminWallet = Boolean(account?.address && isAdminAddress(account.address));

  useEffect(() => {
    const adminAddress = account?.address ?? "";
    if (!isAdminWallet || !adminAddress) return;

    let active = true;

    async function loadSnapshot() {
      try {
        const data = await fetchAdminSnapshot(adminAddress);
        if (active) setSnapshot(data);
      } catch {
        if (active) setMessage("Could not load the admin dashboard.");
      }
    }

    void loadSnapshot();

    return () => {
      active = false;
    };
  }, [account?.address, isAdminWallet]);

  const stats = useMemo(() => {
    const metrics = snapshot?.metrics;
    return [
      { label: "Visitors", value: metrics ? formatCompact(metrics.visitorsToday) : "0", icon: Eye },
      { label: "Uploads", value: metrics ? formatCompact(metrics.uploadsToday) : "0", icon: BarChart3 },
      { label: "Open reports", value: metrics ? metrics.reportsOpen.toString() : "0", icon: AlertTriangle },
      { label: "Treasury", value: metrics ? `${metrics.treasuryCollectedSui.toFixed(1)} SUI` : "0 SUI", icon: Sparkles },
    ];
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot?.accounts?.length) return;
    setFeeDrafts((current) => {
      const next = { ...current };
      for (const accountRecord of snapshot.accounts) {
        if (next[accountRecord.address] == null) {
          next[accountRecord.address] = String(accountRecord.treasuryFeeBps ?? 0);
        }
      }
      return next;
    });
    setBanDrafts((current) => {
      const next = { ...current };
      for (const accountRecord of snapshot.accounts) {
        if (next[accountRecord.address] == null) {
          next[accountRecord.address] = accountRecord.bannedReason ?? "";
        }
      }
      return next;
    });
  }, [snapshot?.accounts]);

  useEffect(() => {
    if (!snapshot?.settings) return;
    setSettingsDraft(snapshot.settings);
  }, [snapshot?.settings]);

  async function resolveReport(id: string) {
    if (!account?.address) return;

    const response = await fetch(buildApiUrl(`/api/reports/${id}`), {
      method: "PATCH",
      headers: adminHeaders(account.address),
    });
    if (!response.ok) {
      setMessage("Could not resolve the report.");
      return;
    }

    setMessage("Report resolved.");
    void tryRefreshAdminSnapshot(account.address, setSnapshot);
  }

  async function hideVideoFromPlatform(video: ModerationTarget) {
    if (!account?.address) return;

    const response = await fetch(buildApiUrl(`/api/videos/${video.id}`), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...adminHeaders(account.address),
      },
      body: JSON.stringify({
        visibility: "private",
        status: "hidden",
      }),
    });

    if (!response.ok) {
      setMessage("Could not remove visibility from the video.");
      return false;
    }

    setMessage(`${video.title} removed from public visibility.`);
    void tryRefreshAdminSnapshot(account.address, setSnapshot);
    return true;
  }

  async function deleteVideoFromPlatform(video: ModerationTarget) {
    if (!account?.address) return;

    const response = await fetch(buildApiUrl(`/api/videos/${video.id}`), {
      method: "DELETE",
      headers: adminHeaders(account.address),
    });

    if (!response.ok) {
      setMessage("Could not delete the video.");
      return false;
    }

    setMessage(`${video.title} deleted from the platform.`);
    void tryRefreshAdminSnapshot(account.address, setSnapshot);
    return true;
  }

  async function savePlatformSettings(settings: PlatformSettings) {
    if (!account?.address) return;

    setSavingSettings(true);
    try {
      const response = await fetch(buildApiUrl("/api/admin"), {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...adminHeaders(account.address),
        },
        body: JSON.stringify({ settings }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not save settings.");
      }

      setMessage("Platform fees updated.");
      void tryRefreshAdminSnapshot(account.address, setSnapshot);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings.");
      return false;
    } finally {
      setSavingSettings(false);
    }
  }

  function getFeeDraft(accountRecord: WalletSession) {
    return feeDrafts[accountRecord.address] ?? String(accountRecord.treasuryFeeBps ?? 0);
  }

  function getBanReasonDraft(accountRecord: WalletSession) {
    return banDrafts[accountRecord.address] ?? accountRecord.bannedReason ?? "";
  }

  async function updateAccount(
    accountRecord: WalletSession,
    patch: {
      banned?: boolean;
      bannedReason?: string | null;
      treasuryFeeBps?: number;
    },
  ) {
    if (!account?.address) return;

    const key = `${accountRecord.address}:${patch.banned ?? "fee"}`;
    setPendingAccountAction(key);
    try {
      const response = await fetch(buildApiUrl(`/api/admin/accounts/${encodeURIComponent(accountRecord.address)}`), {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          ...adminHeaders(account.address),
        },
        body: JSON.stringify({
          ...patch,
          moderationNotes: accountRecord.moderationNotes ?? null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not update account.");
      }
      void tryRefreshAdminSnapshot(account.address, setSnapshot);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update account.");
      return false;
    } finally {
      setPendingAccountAction(null);
    }
  }

  async function runConfirmDialog() {
    if (!confirmDialog || confirmingDialog) return;

    setConfirmingDialog(true);
    try {
      const succeeded = await confirmDialog.onConfirm();
      if (succeeded !== false) {
        setConfirmDialog(null);
      }
    } finally {
      setConfirmingDialog(false);
    }
  }

  function updateFeeDraft(key: keyof PlatformSettings["fees"], value: number) {
    setSettingsDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        fees: {
          ...current.fees,
          [key]: Number.isFinite(value) ? value : current.fees[key],
        },
      };
    });
  }

  const managedAccount =
    managedAccountAddress
      ? snapshot?.accounts.find((accountRecord) => accountRecord.address === managedAccountAddress) ?? null
      : null;

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
                        {report.reason} · {formatDate(report.createdAt)} · @{report.reporter}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge border-white/10 bg-white/5 text-slate-200">{report.contentType}</span>
                      <SeverityBadge severity={report.severity} />
                    </div>
                  </div>

                  <p className="mt-3 text-sm leading-7 text-slate-300">{report.detail}</p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={() => resolveReport(report.id)} type="button">
                      Resolve
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Remove visibility",
                          description: `Hide "${report.videoTitle}" from public surfaces while keeping the record available for admin review.`,
                          confirmLabel: "Remove visibility",
                          onConfirm: () =>
                            hideVideoFromPlatform(
                              snapshot?.videos.find((video) => video.id === report.videoId) ?? {
                                id: report.videoId,
                                title: report.videoTitle,
                              },
                            ),
                        })
                      }
                      type="button"
                    >
                      Remove visibility
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Delete video",
                          description: `Delete "${report.videoTitle}" from the platform. This cannot be undone.`,
                          confirmLabel: "Delete video",
                          tone: "danger",
                          onConfirm: () =>
                            deleteVideoFromPlatform(
                              snapshot?.videos.find((video) => video.id === report.videoId) ?? {
                                id: report.videoId,
                                title: report.videoTitle,
                              },
                            ),
                        })
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
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Remove visibility",
                          description: `Hide "${video.title}" from public surfaces while keeping the record available for admin review.`,
                          confirmLabel: "Remove visibility",
                          onConfirm: () => hideVideoFromPlatform(video),
                        })
                      }
                      type="button"
                    >
                      Remove visibility
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() =>
                        setConfirmDialog({
                          title: "Delete video",
                          description: `Delete "${video.title}" from the platform. This cannot be undone.`,
                          confirmLabel: "Delete video",
                          tone: "danger",
                          onConfirm: () => deleteVideoFromPlatform(video),
                        })
                      }
                      type="button"
                    >
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

      <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="surface p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="section-label">Fee controls</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Platform fee schedule</h2>
            </div>
            <Settings2 className="size-10 text-cyan-200" />
          </div>

          {settingsDraft ? (
            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Upload fee", value: `${settingsDraft.fees.uploadFeeMist} mist` },
                  { label: "Min tip", value: `${settingsDraft.fees.minimumTipMist} mist` },
                  { label: "Tip fee", value: `${settingsDraft.fees.tipPlatformBps} bps` },
                  { label: "Publish fee", value: `${settingsDraft.fees.videoPublishFeeMist} mist` },
                  { label: "Unpublish fee", value: `${settingsDraft.fees.videoUnpublishFeeMist} mist` },
                  { label: "Storage / day", value: `${settingsDraft.fees.storageExtensionFeeMistPerDay} mist` },
                ].map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button className="btn-primary" onClick={() => setSettingsModalOpen(true)} type="button">
                  Edit fee schedule
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-slate-300">
              Settings unavailable.
            </div>
          )}
        </div>

        <div className="surface p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="section-label">User moderation</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">Ban users and edit creator fee</h2>
            </div>
            <UserCog className="size-10 text-cyan-200" />
          </div>

          <div className="mt-6 space-y-3">
            {snapshot?.accounts?.length ? (
              snapshot.accounts.map((accountRecord) => {
                return (
                  <article key={accountRecord.address} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{accountRecord.displayName}</p>
                        <p className="mt-1 text-xs text-slate-400">{shortAddress(accountRecord.address, 6)}</p>
                      </div>
                      <span
                        className={[
                          "badge",
                          accountRecord.isBanned
                            ? "border-rose-300/30 bg-rose-300/15 text-rose-100"
                            : "border-emerald-300/30 bg-emerald-300/15 text-emerald-100",
                        ].join(" ")}
                      >
                        {accountRecord.isBanned ? "Banned" : "Active"}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Creator fee</p>
                        <p className="mt-2 text-sm font-semibold text-white">{accountRecord.treasuryFeeBps ?? 0} bps</p>
                      </div>
                      <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Ban reason</p>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-300">
                          {accountRecord.bannedReason?.trim() || "No active restriction."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        className="btn-secondary"
                        onClick={() => setManagedAccountAddress(accountRecord.address)}
                        type="button"
                      >
                        Manage creator
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-slate-300">
                No creator accounts found.
              </div>
            )}
          </div>
        </div>
      </section>

      <ModalShell
        bodyClassName="space-y-4 px-4 py-4 md:px-5"
        description="Keep the dashboard readable and open the full fee schedule only when you are actively editing it."
        eyebrow="Fee controls"
        footer={
          settingsDraft ? (
            <div className="flex justify-end">
              <button
                className="btn-primary"
                disabled={savingSettings}
                onClick={() => {
                  void (async () => {
                    const saved = await savePlatformSettings(settingsDraft);
                    if (saved) {
                      setSettingsModalOpen(false);
                    }
                  })();
                }}
                type="button"
              >
                {savingSettings ? "Saving..." : "Save fee settings"}
              </button>
            </div>
          ) : null
        }
        maxWidthClassName="max-w-2xl"
        onClose={() => setSettingsModalOpen(false)}
        open={settingsModalOpen && Boolean(settingsDraft)}
        title="Edit platform fee schedule"
      >
        {settingsDraft ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm text-slate-300">
              Upload fee (mist)
              <input
                className="input"
                min={0}
                onChange={(event) => updateFeeDraft("uploadFeeMist", Number(event.target.value))}
                type="number"
                value={settingsDraft.fees.uploadFeeMist}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-slate-300">
              Min tip (mist)
              <input
                className="input"
                min={0}
                onChange={(event) => updateFeeDraft("minimumTipMist", Number(event.target.value))}
                type="number"
                value={settingsDraft.fees.minimumTipMist}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-slate-300">
              Tip platform fee (bps)
              <input
                className="input"
                max={10000}
                min={0}
                onChange={(event) => updateFeeDraft("tipPlatformBps", Number(event.target.value))}
                type="number"
                value={settingsDraft.fees.tipPlatformBps}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-slate-300">
              Video publish fee (mist)
              <input
                className="input"
                min={0}
                onChange={(event) => updateFeeDraft("videoPublishFeeMist", Number(event.target.value))}
                type="number"
                value={settingsDraft.fees.videoPublishFeeMist}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-slate-300">
              Video unpublish fee (mist)
              <input
                className="input"
                min={0}
                onChange={(event) => updateFeeDraft("videoUnpublishFeeMist", Number(event.target.value))}
                type="number"
                value={settingsDraft.fees.videoUnpublishFeeMist}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-slate-300">
              Storage extension fee/day (mist)
              <input
                className="input"
                min={0}
                onChange={(event) => updateFeeDraft("storageExtensionFeeMistPerDay", Number(event.target.value))}
                type="number"
                value={settingsDraft.fees.storageExtensionFeeMistPerDay}
              />
            </label>
          </div>
        ) : null}
      </ModalShell>

      <ModalShell
        bodyClassName="space-y-4 px-4 py-4 md:px-5"
        description="Creator moderation now lives in one focused popup instead of an always-open grid of inputs."
        maxWidthClassName="max-w-xl"
        onClose={() => setManagedAccountAddress(null)}
        open={Boolean(managedAccount)}
        title={managedAccount?.displayName ?? "Manage creator"}
      >
        {managedAccount ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Wallet</p>
                <p className="mt-2 text-sm font-semibold text-white">{shortAddress(managedAccount.address, 6)}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Status</p>
                <p className="mt-2 text-sm font-semibold text-white">{managedAccount.isBanned ? "Banned" : "Active"}</p>
              </div>
            </div>

            <label className="grid gap-1.5 text-sm text-slate-300">
              Ban reason
              <input
                className="input"
                onChange={(event) =>
                  setBanDrafts((current) => ({
                    ...current,
                    [managedAccount.address]: event.target.value,
                  }))
                }
                placeholder="Policy violation reason"
                value={getBanReasonDraft(managedAccount)}
              />
            </label>

            <label className="grid gap-1.5 text-sm text-slate-300">
              Creator treasury fee (bps)
              <input
                className="input"
                max={10000}
                min={0}
                onChange={(event) =>
                  setFeeDrafts((current) => ({
                    ...current,
                    [managedAccount.address]: event.target.value,
                  }))
                }
                type="number"
                value={getFeeDraft(managedAccount)}
              />
            </label>

            <div className="flex flex-wrap justify-between gap-3">
              {managedAccount.isBanned ? (
                <button
                  className="btn-secondary"
                  disabled={pendingAccountAction === `${managedAccount.address}:false`}
                  onClick={() => {
                    void (async () => {
                      const updated = await updateAccount(managedAccount, { banned: false, bannedReason: null });
                      if (updated) {
                        setManagedAccountAddress(null);
                      }
                    })();
                  }}
                  type="button"
                >
                  {pendingAccountAction === `${managedAccount.address}:false` ? "Updating..." : "Unban"}
                </button>
              ) : (
                <button
                  className="btn-danger"
                  disabled={pendingAccountAction === `${managedAccount.address}:true`}
                  onClick={() => {
                    void (async () => {
                      const updated = await updateAccount(managedAccount, {
                        banned: true,
                        bannedReason: getBanReasonDraft(managedAccount) || "Policy violation",
                      });
                      if (updated) {
                        setManagedAccountAddress(null);
                      }
                    })();
                  }}
                  type="button"
                >
                  <Ban className="size-4" />
                  {pendingAccountAction === `${managedAccount.address}:true` ? "Banning..." : "Ban user"}
                </button>
              )}

              <button
                className="btn-primary"
                disabled={pendingAccountAction === `${managedAccount.address}:fee`}
                onClick={() => {
                  void (async () => {
                    const updated = await updateAccount(managedAccount, {
                      treasuryFeeBps: Number(getFeeDraft(managedAccount)),
                    });
                    if (updated) {
                      setManagedAccountAddress(null);
                    }
                  })();
                }}
                type="button"
              >
                {pendingAccountAction === `${managedAccount.address}:fee` ? "Saving..." : "Save changes"}
              </button>
            </div>
          </>
        ) : null}
      </ModalShell>

      <ModalShell
        bodyClassName="space-y-4 px-4 py-4 md:px-5"
        description={confirmDialog?.description}
        footer={
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setConfirmDialog(null)} type="button">
              Cancel
            </button>
            <button
              className={confirmDialog?.tone === "danger" ? "btn-danger" : "btn-primary"}
              disabled={confirmingDialog}
              onClick={() => void runConfirmDialog()}
              type="button"
            >
              {confirmingDialog ? "Working..." : confirmDialog?.confirmLabel ?? "Confirm"}
            </button>
          </div>
        }
        maxWidthClassName="max-w-lg"
        onClose={() => setConfirmDialog(null)}
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? "Confirm action"}
      >
        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 text-sm leading-7 text-slate-300">
          This action updates platform state immediately.
        </div>
      </ModalShell>

      {message ? (
        <div className="rounded-[24px] border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm leading-7 text-cyan-50">
          {message}
        </div>
      ) : null}
    </div>
  );
}
