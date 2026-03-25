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
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-[#ff5f5f]" />
        <p className="text-center text-xs uppercase tracking-[0.25em] text-[#9f9f9f]">Loading more videos</p>
      </div>
    );
  }

  if (!hasMore) {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-[#1b1b1b] px-4 py-4 text-center text-sm text-[#cdcdcd]">
        You’re all caught up
        <span className="ml-2 text-[#828282]">({loadedCount} of {totalCount})</span>
      </div>
    );
  }

  return null;
}
