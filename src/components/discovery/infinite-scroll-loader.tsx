"use client";

import { RefreshCw } from "lucide-react";

type InfiniteScrollLoaderProps = {
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadedCount: number;
  totalCount: number;
  onRetry: () => void;
};

export function InfiniteScrollLoader({
  loading,
  hasMore,
  error,
  loadedCount,
  totalCount,
  onRetry,
}: InfiniteScrollLoaderProps) {
  if (error) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-rose-300/20 bg-rose-950/20 px-4 py-5 text-center">
        <p className="text-sm text-rose-100/90">Could not load more videos.</p>
        <button className="btn-secondary min-h-11" onClick={onRetry} type="button">
          <RefreshCw className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-6 space-y-3">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-cyan-200/20 border-t-cyan-300" />
        <p className="text-center text-xs uppercase tracking-[0.25em] text-slate-400">Loading more videos</p>
      </div>
    );
  }

  if (!hasMore) {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center text-sm text-slate-300">
        You’re all caught up
        <span className="ml-2 text-slate-500">({loadedCount} of {totalCount})</span>
      </div>
    );
  }

  return null;
}
