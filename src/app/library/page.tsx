"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  LockKeyhole,
  RefreshCcw,
  Search,
  Upload,
} from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount, useCurrentWallet, useDAppKit } from "@mysten/dapp-kit-react";

import { formatBytes, formatCompact, formatDate, formatPercent, shortAddress } from "@/lib/format";
import { getPolicyPackageId } from "@/lib/anavrin-config";
import { usernameFromDisplayName } from "@/lib/creator-identity";
import { calculateStorageHealthSummary } from "@/lib/platform-settings";
import { buildSeedDatabase } from "@/lib/seed";
import { buildRenewTransaction } from "@/lib/video-policy";
import type { DashboardSnapshot, VideoRecord, VideoVisibility, WalletMode } from "@/lib/types";

const dashboardTabs = ["Videos", "Shorts", "Live", "Posts", "Playlists", "Podcasts", "Courses"] as const;
type DashboardTab = (typeof dashboardTabs)[number];
type VisibilityFilter = "all" | VideoVisibility | "hidden" | "review";
type SortField = "title" | "updatedAt" | "views" | "comments" | "likes";
type SortDirection = "asc" | "desc";

const EMPTY_VIDEOS: VideoRecord[] = [];

const sortOptions: Array<{ label: string; field: SortField; direction: SortDirection }> = [
  { label: "Newest", field: "updatedAt", direction: "desc" },
  { label: "Oldest", field: "updatedAt", direction: "asc" },
  { label: "Most views", field: "views", direction: "desc" },
  { label: "Most comments", field: "comments", direction: "desc" },
  { label: "Most likes", field: "likes", direction: "desc" },
  { label: "Title A-Z", field: "title", direction: "asc" },
  { label: "Title Z-A", field: "title", direction: "desc" },
];

const visibilityFilters: Array<{ label: string; value: VisibilityFilter }> = [
  { label: "All videos", value: "all" },
  { label: "Public", value: "public" },
  { label: "Private", value: "private" },
  { label: "Draft", value: "draft" },
  { label: "Hidden", value: "hidden" },
  { label: "Needs review", value: "review" },
];

const rowsPerPage = 6;
const DEFAULT_STORAGE_LIMIT_BYTES = 500 * 1024 * 1024 * 1024;

function inferWalletMode(name?: string | null): WalletMode {
  const normalized = name?.toLowerCase() ?? "";
  if (normalized.includes("slush")) return "slush";
  if (normalized.includes("zk")) return "zklogin";
  if (normalized.includes("wallet")) return "wallet";
  return "guest";
}

function durationToSeconds(duration: string) {
  const [minutes, seconds] = duration.split(":").map((part) => Number(part) || 0);
  return minutes * 60 + seconds;
}

function buildFallbackDashboardSnapshot(address: string, walletName?: string | null): DashboardSnapshot {
  const seeded = buildSeedDatabase();
  const owned = seeded.videos.filter((video) => video.ownerAddress === address);
  const now = new Date();
  const walletMode = inferWalletMode(walletName);
  const fallbackName = walletName?.trim() || "Creator";
  const fallbackUsername = usernameFromDisplayName(fallbackName, address);
  const derivedAccount = {
    id: `acct-${address.slice(2, 10) || "wallet"}`,
    displayName: fallbackName,
    username: fallbackUsername,
    handle: fallbackUsername,
    address,
    mode: walletMode,
    avatarSeed: fallbackName.slice(0, 2).toUpperCase() || "AT",
    storageLimitBytes: DEFAULT_STORAGE_LIMIT_BYTES,
    storageUsedBytes: owned.reduce((sum, video) => sum + (video.asset?.sizeBytes ?? 0), 0),
    treasuryFeeBps: walletMode === "zklogin" ? 90 : walletMode === "slush" ? 75 : 65,
    renewalAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    uploadsPublished: owned.filter((video) => video.status === "published").length,
    totalViews: owned.reduce((sum, video) => sum + video.views, 0),
    totalTips: owned.reduce((sum, video) => sum + video.tips, 0),
    followers: 0,
    followersCount: 0,
    following: 0,
    followingCount: 0,
    totalVideos: owned.length,
    totalBlobs: owned.filter((video) => video.category === "Shorts").length,
  };
  const account = seeded.accounts.find((item) => item.address === address) ?? derivedAccount;
  const openReports = seeded.reports.filter((report) => report.status === "open");

  return {
    metrics: seeded.metrics,
    videos: owned,
    watchLaterVideos: [],
    account,
    reports: openReports,
    settings: seeded.settings,
    storageHealth: calculateStorageHealthSummary({
      videos: owned,
      settings: seeded.settings,
    }),
  };
}

function matchesTab(video: VideoRecord, tab: DashboardTab) {
  const tags = video.tags.map((tag) => tag.toLowerCase());

  switch (tab) {
    case "Videos":
      return true;
    case "Shorts":
      return durationToSeconds(video.duration) <= 120 || video.category === "Shorts" || tags.includes("shorts");
    case "Live":
      return video.category === "Live Events" || tags.includes("live");
    case "Posts":
      return video.category === "Culture" || tags.includes("post") || tags.includes("community");
    case "Playlists":
      return tags.includes("playlist") || tags.includes("dashboard") || tags.includes("publish");
    case "Podcasts":
      return video.category === "Music" || tags.includes("podcast");
    case "Courses":
      return video.category === "AI Labs" || tags.includes("course") || tags.includes("tutorial");
  }
}

function matchesVisibility(video: VideoRecord, filter: VisibilityFilter) {
  if (filter === "all") return true;
  if (filter === "review") return video.reportedCount > 0 || video.status === "hidden";
  if (filter === "hidden") return video.status === "hidden";
  return video.visibility === filter;
}

function sortVideos(videos: VideoRecord[], field: SortField, direction: SortDirection) {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...videos].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "title":
        comparison = a.title.localeCompare(b.title);
        break;
      case "updatedAt":
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      case "views":
        comparison = a.views - b.views;
        break;
      case "comments":
        comparison = a.comments - b.comments;
        break;
      case "likes":
        comparison = a.likes - b.likes;
        break;
    }

    return comparison * multiplier;
  });
}

function getVisibilityMeta(video: VideoRecord) {
  switch (video.visibility) {
    case "public":
      return {
        icon: Eye,
        label: "Public",
        tone: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
      } as const;
    case "private":
      return {
        icon: LockKeyhole,
        label: "Private",
        tone: "border-slate-300/20 bg-slate-300/10 text-slate-100",
      } as const;
    case "draft":
      return {
        icon: Clock3,
        label: "Draft",
        tone: "border-amber-300/20 bg-amber-300/10 text-amber-100",
      } as const;
  }

  return {
    icon: EyeOff,
    label: "Hidden",
    tone: "border-rose-300/20 bg-rose-300/10 text-rose-100",
  } as const;
}

function getRestrictionMeta(video: VideoRecord) {
  if (video.status === "hidden") {
    return {
      label: "Hidden from feed",
      tone: "border-rose-300/20 bg-rose-300/10 text-rose-100",
    } as const;
  }

  if (video.reportedCount > 0) {
    return {
      label: video.reportedCount === 1 ? "1 report" : `${video.reportedCount} reports`,
      tone: "border-amber-300/20 bg-amber-300/10 text-amber-100",
    } as const;
  }

  if (video.visibility === "draft") {
    return {
      label: "Draft only",
      tone: "border-slate-300/20 bg-slate-300/10 text-slate-100",
    } as const;
  }

  if (video.visibility === "private") {
    return {
      label: "Private access",
      tone: "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
    } as const;
  }

  return {
    label: "No restrictions",
    tone: "border-white/10 bg-white/5 text-slate-200",
  } as const;
}

function getLikePercent(video: VideoRecord, maxLikes: number) {
  if (!maxLikes) return 0;
  return Math.max(0, Math.round((video.likes / maxLikes) * 100));
}

function SortHeader({
  label,
  field,
  sortField,
  onSort,
  alignRight = false,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  onSort: (field: SortField) => void;
  alignRight?: boolean;
}) {
  const active = sortField === field;

  return (
    <button
      className={[
        "inline-flex items-center gap-1.5 uppercase tracking-[0.24em] transition",
        alignRight ? "ml-auto justify-end text-right" : "justify-start",
        active ? "text-white" : "text-slate-400 hover:text-white",
      ].join(" ")}
      onClick={() => onSort(field)}
      type="button"
    >
      <span>{label}</span>
      <ArrowUpDown className={`size-3.5 ${active ? "text-cyan-200" : "text-slate-500"}`} />
    </button>
  );
}

export default function LibraryPage() {
  const dAppKit = useDAppKit();
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profileHydrated, setProfileHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("Videos");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [renewing, setRenewing] = useState(false);
  const seededProfileAddress = useRef<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    setPageIndex(1);
    setSelectedIds([]);
    setFilterOpen(false);
  }, [activeTab, visibilityFilter, searchQuery, sortField, sortDirection, account?.address]);

  useEffect(() => {
    let active = true;

    async function loadLibrary() {
      const address = account?.address ?? null;
      if (!address) {
        if (active) {
          setSnapshot(null);
          setProfileHydrated(true);
        }
        return;
      }

      try {
        const response = await fetch(`/api/dashboard?address=${encodeURIComponent(address)}`, {
          headers: {
            "x-anavrin-actor-address": address.toLowerCase(),
          },
        });
        if (!response.ok) {
          throw new Error("Dashboard API unavailable.");
        }
        const data = (await response.json()) as DashboardSnapshot;
        if (active) {
          setSnapshot(data);
          setProfileHydrated(true);
          setMessage(null);
        }
      } catch {
        const fallback = buildFallbackDashboardSnapshot(address, wallet?.name);
        if (active) {
          setSnapshot(fallback);
          setProfileHydrated(true);
          setMessage(null);
        }
      }
    }

    void loadLibrary();

    return () => {
      active = false;
    };
  }, [account?.address, wallet?.name]);

  const accountRecord = snapshot?.account ?? null;
  const activeVideos = snapshot?.videos ?? EMPTY_VIDEOS;
  const watchLaterVideos = snapshot?.watchLaterVideos ?? EMPTY_VIDEOS;

  useEffect(() => {
    if (!account?.address) {
      seededProfileAddress.current = null;
      return;
    }

    if (!profileHydrated || snapshot?.account) {
      if (snapshot?.account) {
        seededProfileAddress.current = account.address;
      }
      return;
    }

    if (seededProfileAddress.current === account.address) return;

    seededProfileAddress.current = account.address;
    let cancelled = false;
    const address = account.address;

    async function seedProfile() {
      const response = await fetch("/api/accounts/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-anavrin-actor-address": address.toLowerCase(),
        },
        body: JSON.stringify({
          address,
          displayName: wallet?.name ?? "Creator",
          mode: inferWalletMode(wallet?.name),
        }),
      });

      if (!response.ok || cancelled) {
        return;
      }

      const refreshResponse = await fetch(`/api/dashboard?address=${encodeURIComponent(address)}`, {
        headers: {
          "x-anavrin-actor-address": address.toLowerCase(),
        },
      });
      const data = (await refreshResponse.json()) as DashboardSnapshot;
      if (cancelled) {
        return;
      }

      setSnapshot(data);
    }

    void seedProfile();

    return () => {
      cancelled = true;
    };
  }, [account?.address, profileHydrated, snapshot?.account, wallet?.name]);

  const filteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const videos = activeVideos.filter((video) => matchesTab(video, activeTab));
    const visibilityScoped = videos.filter((video) => matchesVisibility(video, visibilityFilter));
    const searched = query
      ? visibilityScoped.filter((video) =>
          [video.title, video.description, video.category, video.ownerName, video.tags.join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(query),
        )
      : visibilityScoped;

    return sortVideos(searched, sortField, sortDirection);
  }, [activeVideos, activeTab, searchQuery, sortField, sortDirection, visibilityFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / rowsPerPage));
  const safePageIndex = Math.min(pageIndex, totalPages);
  const pageVideos = filteredVideos.slice((safePageIndex - 1) * rowsPerPage, safePageIndex * rowsPerPage);
  const pageStart = filteredVideos.length ? (safePageIndex - 1) * rowsPerPage + 1 : 0;
  const pageEnd = Math.min(filteredVideos.length, safePageIndex * rowsPerPage);
  const activePolicyVideo = filteredVideos.find((video) => video.policyObjectId && video.capObjectId) ?? null;
  const maxLikes = Math.max(...filteredVideos.map((video) => video.likes), 1);
  const sortValue = `${sortField}-${sortDirection}`;
  const storageSummary = accountRecord
    ? `${formatBytes(accountRecord.storageUsedBytes)} / ${formatBytes(accountRecord.storageLimitBytes)}`
    : account
      ? "Loading storage..."
      : "Connect wallet";

  useEffect(() => {
    if (!selectAllRef.current) return;
    const allSelected = pageVideos.length > 0 && pageVideos.every((video) => selectedIds.includes(video.id));
    const someSelected = pageVideos.some((video) => selectedIds.includes(video.id));
    selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [selectedIds, pageVideos]);

  async function refreshDashboard() {
    const address = account?.address;
    if (!address) return;

    try {
      const response = await fetch(`/api/dashboard?address=${encodeURIComponent(address)}`, {
        headers: {
          "x-anavrin-actor-address": address.toLowerCase(),
        },
      });
      if (!response.ok) {
        throw new Error("Dashboard API unavailable.");
      }

      const data = (await response.json()) as DashboardSnapshot;
      setSnapshot(data);
      return;
    } catch {
      const fallback = buildFallbackDashboardSnapshot(address, wallet?.name);
      setSnapshot(fallback);
    }
  }

  async function renewStorage() {
    if (!account) {
      setMessage("Connect a wallet to renew storage.");
      return;
    }

    if (!activePolicyVideo) {
      setMessage("No policy-backed video is available to renew.");
      return;
    }

    setRenewing(true);
    setMessage("Preparing renewal...");

    try {
      const packageId = getPolicyPackageId();
      if (packageId) {
        const tx = buildRenewTransaction({
          packageId,
          policyObjectId: activePolicyVideo.policyObjectId!,
          capObjectId: activePolicyVideo.capObjectId!,
          days: 30,
        });

        const txResult = await dAppKit.signAndExecuteTransaction({ transaction: tx });
        if (txResult.$kind === "FailedTransaction") {
          throw new Error(txResult.FailedTransaction.status.error?.message ?? "Renewal transaction failed.");
        }
      }

      const response = await fetch("/api/accounts/renew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-anavrin-actor-address": account.address.toLowerCase(),
        },
        body: JSON.stringify({ address: account.address, days: 30 }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Renewal failed.");
      }

      setMessage("Storage renewed.");
      await refreshDashboard();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Renewal failed.");
    } finally {
      setRenewing(false);
    }
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "title" ? "asc" : "desc");
  }

  function setSortFromSelect(value: string) {
    const next = sortOptions.find((option) => `${option.field}-${option.direction}` === value);
    if (!next) return;
    setSortField(next.field);
    setSortDirection(next.direction);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleVisibleSelection(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      pageVideos.forEach((video) => {
        if (checked) {
          next.add(video.id);
        } else {
          next.delete(video.id);
        }
      });
      return [...next];
    });
  }

  const allVisibleSelected = pageVideos.length > 0 && pageVideos.every((video) => selectedIds.includes(video.id));
  const someVisibleSelected = pageVideos.some((video) => selectedIds.includes(video.id));

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected;
  }, [allVisibleSelected, someVisibleSelected]);

  if (!account) {
    return (
      <div className="space-y-4">
        <section className="surface p-5 md:p-6">
          <p className="section-label">Channel content</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Channel content</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">
            Connect a Sui Wallet, Slush, or zkLogin account to manage sealed uploads, storage, and moderation from one
            table.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ConnectButton className="btn-primary">Connect wallet</ConnectButton>
            <Link href="/" className="btn-secondary">
              Back to home
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="surface p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="section-label">Channel content</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Channel content</h1>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Manage sealed uploads, visibility, restrictions, comments, likes, and storage from a single wallet-backed
              table.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/upload" className="btn-primary">
              <Upload className="size-4" />
              Upload video
            </Link>
            {activePolicyVideo ? (
              <button className="btn-secondary" disabled={renewing} onClick={renewStorage} type="button">
                <RefreshCcw className="size-4" />
                {renewing ? "Renewing..." : "Renew storage"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="chip">Wallet {shortAddress(account.address, 5)}</span>
          <span className="chip">Storage {storageSummary}</span>
          <span className="chip">
            Renewal {accountRecord ? formatDate(accountRecord.renewalAt) : "Loading..."}
          </span>
          <span className="chip">{formatCompact(filteredVideos.length)} visible</span>
          <span className="chip">{formatCompact(watchLaterVideos.length)} watch later</span>
        </div>
      </section>

      <section className="surface p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="section-label">Watch later</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Saved videos</h2>
            <p className="mt-2 text-sm text-slate-300">
              Bookmarks are scoped to your connected wallet and follow you across sessions.
            </p>
          </div>
          <span className="chip">{formatCompact(watchLaterVideos.length)} saved</span>
        </div>

        {watchLaterVideos.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {watchLaterVideos.slice(0, 6).map((video) => (
              <Link
                key={video.id}
                href={`/video/${video.id}`}
                className="group rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-cyan-300/35 hover:bg-cyan-300/5"
              >
                <div
                  className="h-28 rounded-xl border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, ${video.coverFrom}, ${video.coverVia} 58%, ${video.coverTo})`,
                  }}
                />
                <p className="mt-3 line-clamp-1 text-sm font-semibold text-white group-hover:text-cyan-100">{video.title}</p>
                <div className="mt-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
                  <span>{video.category}</span>
                  <span>{formatDate(video.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
            Save a video with the bookmark button on the player page to add it here.
          </div>
        )}
      </section>

      <section id="content" className="surface overflow-hidden p-0">
        <div className="border-b border-white/10 px-4 pt-4 md:px-5">
          <div className="flex gap-1 overflow-x-auto pb-3">
            {dashboardTabs.map((tab) => {
              const active = tab === activeTab;
              return (
                <button
                  key={tab}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    active ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white",
                  ].join(" ")}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 pb-4">
            <div className="relative" ref={filterMenuRef}>
              <button className="btn-secondary" onClick={() => setFilterOpen((current) => !current)} type="button">
                <Filter className="size-4" />
                Filter
                <span className="chip border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.24em] text-slate-300">
                  {visibilityFilters.find((item) => item.value === visibilityFilter)?.label ?? "All videos"}
                </span>
              </button>

              {filterOpen ? (
                <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-2xl border border-white/10 bg-[#1a1a1a] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                  {visibilityFilters.map((item) => {
                    const active = item.value === visibilityFilter;
                    return (
                      <button
                        key={item.value}
                        className={[
                          "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition",
                          active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                        ].join(" ")}
                        onClick={() => {
                          setVisibilityFilter(item.value);
                          setFilterOpen(false);
                        }}
                        type="button"
                      >
                        <span>{item.label}</span>
                        {active ? <span className="text-xs uppercase tracking-[0.24em] text-cyan-200">Active</span> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300">
              <Search className="size-4 text-slate-400" />
              <input
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search title, description, tags"
                value={searchQuery}
              />
            </label>

            <select className="select w-auto min-w-[220px]" onChange={(event) => setSortFromSelect(event.target.value)} value={sortValue}>
              {sortOptions.map((option) => (
                <option key={`${option.field}-${option.direction}`} value={`${option.field}-${option.direction}`}>
                  {option.label}
                </option>
              ))}
            </select>

            <p className="ml-auto text-xs uppercase tracking-[0.28em] text-slate-400">
              Showing {pageVideos.length ? pageStart : 0}-{pageEnd} of {filteredVideos.length}
            </p>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-[1320px] w-full border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-[#1a1a1a] text-[11px] uppercase tracking-[0.28em] text-slate-400">
              <tr className="border-b border-white/10">
                <th className="w-12 px-4 py-3">
                  <input
                    aria-label="Select all visible videos"
                    className="size-4 rounded border border-white/20 bg-transparent accent-cyan-300"
                    onChange={(event) => toggleVisibleSelection(event.target.checked)}
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allVisibleSelected}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortHeader
                    field="title"
                    label="Video"
                    onSort={handleSort}
                    sortField={sortField}
                  />
                </th>
                <th className="px-4 py-3">Visibility</th>
                <th className="px-4 py-3">Restrictions</th>
                <th className="px-4 py-3">
                  <SortHeader
                    field="updatedAt"
                    label="Date"
                    onSort={handleSort}
                    sortField={sortField}
                  />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortHeader
                    alignRight
                    field="views"
                    label="Views"
                    onSort={handleSort}
                    sortField={sortField}
                  />
                </th>
                <th className="px-4 py-3 text-right">
                  <SortHeader
                    alignRight
                    field="comments"
                    label="Comments"
                    onSort={handleSort}
                    sortField={sortField}
                  />
                </th>
                <th className="px-4 py-3">
                  <SortHeader
                    field="likes"
                    label="Likes"
                    onSort={handleSort}
                    sortField={sortField}
                  />
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/8">
              {pageVideos.length ? (
                pageVideos.map((video) => {
                  const visibility = getVisibilityMeta(video);
                  const restrictions = getRestrictionMeta(video);
                  const likePercent = getLikePercent(video, maxLikes);
                  const VisibilityIcon = visibility.icon;

                  return (
                    <tr key={video.id} className="group align-top transition hover:bg-white/4">
                      <td className="px-4 py-4">
                        <input
                          aria-label={`Select ${video.title}`}
                          checked={selectedIds.includes(video.id)}
                          className="mt-6 size-4 rounded border border-white/20 bg-transparent accent-cyan-300"
                          onChange={() => toggleSelected(video.id)}
                          type="checkbox"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex min-w-0 gap-4">
                          <div
                            className="relative h-[72px] w-[128px] shrink-0 overflow-hidden rounded-2xl border border-white/10"
                            style={{
                              background: `linear-gradient(135deg, ${video.coverFrom}, ${video.coverVia} 58%, ${video.coverTo})`,
                            }}
                          >
                            <span className="absolute bottom-2 right-2 rounded-lg bg-black/80 px-2 py-1 text-[11px] font-semibold text-white">
                              {video.duration}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <Link href={`/video/${video.id}`} className="block truncate text-sm font-semibold text-white hover:text-cyan-100">
                              {video.title}
                            </Link>
                            <p className="mt-1 line-clamp-2 max-w-2xl text-sm leading-6 text-slate-400">
                              {video.description || "Add a description to help viewers and analytics."}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="badge">{video.category}</span>
                              {video.tags.slice(0, 2).map((tag) => (
                                <span key={tag} className="chip">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-start gap-2">
                          <span className={`grid size-8 place-items-center rounded-full border ${visibility.tone}`}>
                            <VisibilityIcon className="size-4" />
                          </span>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-white">{visibility.label}</p>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{video.status}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${restrictions.tone}`}>{restrictions.label}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-white">
                        <div className="space-y-1">
                          <p className="font-medium text-white">{formatDate(video.updatedAt)}</p>
                          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Updated</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-white">{formatCompact(video.views)}</td>
                      <td className="px-4 py-4 text-right text-sm text-white">{formatCompact(video.comments)}</td>
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                            <span>{formatPercent(likePercent)}</span>
                            <span>{formatCompact(video.likes)} likes</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/8">
                            <div className="h-full rounded-full bg-cyan-300/80" style={{ width: `${likePercent}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-300" colSpan={8}>
                    <p className="text-lg font-semibold text-white">No videos match this view</p>
                    <p className="mt-2 text-slate-400">
                      Change the tab, clear filters, or search a different title to bring content back into view.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <button className="btn-secondary" onClick={() => setVisibilityFilter("all")} type="button">
                        Clear filter
                      </button>
                      <button className="btn-secondary" onClick={() => setSearchQuery("")} type="button">
                        Clear search
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm text-slate-400 md:px-5">
          <div className="flex items-center gap-3">
            <span>{selectedIds.length ? `${selectedIds.length} selected` : `${filteredVideos.length} results`}</span>
            {selectedIds.length ? (
              <button className="btn-ghost px-3 py-1.5 text-xs uppercase tracking-[0.22em]" onClick={() => setSelectedIds([])} type="button">
                Clear selection
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-slate-300">
              {rowsPerPage}
            </span>
            <button
              className="btn-secondary px-3 py-2 text-xs uppercase tracking-[0.22em]"
              disabled={safePageIndex <= 1}
              onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
              type="button"
            >
              Prev
            </button>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-slate-300">
              {safePageIndex} / {totalPages}
            </span>
            <button
              className="btn-secondary px-3 py-2 text-xs uppercase tracking-[0.22em]"
              disabled={safePageIndex >= totalPages}
              onClick={() => setPageIndex((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-[18px] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm leading-7 text-cyan-50">
          {message}
        </div>
      ) : null}

    </div>
  );
}
