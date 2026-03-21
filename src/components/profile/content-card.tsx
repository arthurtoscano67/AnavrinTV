import Link from "next/link";

import { formatCompact, formatRelativeTime } from "@/lib/format";

export type ProfileContentItem = {
  id: string;
  href: string;
  title: string;
  creatorName: string;
  views: number;
  createdAt: string;
  durationLabel: string;
  coverFrom: string;
  coverVia: string;
  coverTo: string;
};

type ContentCardProps = {
  item: ProfileContentItem;
};

export function ContentCard({ item }: ContentCardProps) {
  return (
    <Link
      className="group block overflow-hidden rounded-xl border border-white/10 bg-[#0b1120] transition hover:border-white/20 hover:bg-[#0d1528]"
      href={item.href}
    >
      <div
        className="relative aspect-video overflow-hidden"
        style={{
          background: `linear-gradient(145deg, ${item.coverFrom} 0%, ${item.coverVia} 52%, ${item.coverTo} 100%)`,
        }}
      >
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
          {item.durationLabel}
        </span>
      </div>

      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-white group-hover:text-cyan-100">
          {item.title}
        </h3>
        <p className="mt-1 truncate text-xs text-slate-400">{item.creatorName}</p>
        <p className="mt-1 text-xs text-slate-500">
          {formatCompact(item.views)} views • {formatRelativeTime(item.createdAt)}
        </p>
      </div>
    </Link>
  );
}
