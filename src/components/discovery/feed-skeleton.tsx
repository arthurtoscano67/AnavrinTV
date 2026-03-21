export function FeedSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1920px]:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="overflow-hidden rounded-2xl border border-white/10 bg-[#081022]"
          key={`feed-skeleton-${index}`}
        >
          <div className="aspect-video animate-pulse bg-white/8" />
          <div className="space-y-2.5 p-3.5">
            <div className="h-4 w-full animate-pulse rounded bg-white/8" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-white/8" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/8" />
          </div>
        </div>
      ))}
    </div>
  );
}
