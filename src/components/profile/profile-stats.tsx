import { formatCompact } from "@/lib/format";

type ProfileStatsProps = {
  followers: number;
  following: number;
  totalVideos: number;
  totalBlobs: number;
  totalViews: number;
};

type StatTileProps = {
  label: string;
  value: number;
};

function StatTile({ label, value }: StatTileProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{formatCompact(value)}</p>
    </div>
  );
}

export function ProfileStats({
  followers,
  following,
  totalVideos,
  totalBlobs,
  totalViews,
}: ProfileStatsProps) {
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <StatTile label="Followers" value={followers} />
      <StatTile label="Following" value={following} />
      <StatTile label="Videos" value={totalVideos} />
      <StatTile label="Blobs" value={totalBlobs} />
      <StatTile label="Views" value={totalViews} />
    </section>
  );
}
