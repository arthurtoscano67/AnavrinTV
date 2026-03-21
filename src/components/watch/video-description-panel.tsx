"use client";

import { useMemo, useState } from "react";

import { formatCompact, formatDate } from "@/lib/format";

type VideoDescriptionPanelProps = {
  views: number;
  publishedAt?: string;
  createdAt: string;
  tags: string[];
  description: string;
};

export function VideoDescriptionPanel({
  views,
  publishedAt,
  createdAt,
  tags,
  description,
}: VideoDescriptionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const publishedLabel = formatDate(publishedAt ?? createdAt);
  const hasLongDescription = description.length > 220;

  const body = useMemo(() => {
    if (expanded || !hasLongDescription) return description;
    return `${description.slice(0, 220).trim()}...`;
  }, [description, expanded, hasLongDescription]);

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0b1120] p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-300">
        <span className="font-semibold text-white">{formatCompact(views)} views</span>
        <span>•</span>
        <span>{publishedLabel}</span>
      </div>

      {tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="text-xs font-medium text-cyan-200">
              #{tag.replace(/\s+/g, "")}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{body}</p>

      {hasLongDescription ? (
        <button
          className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-300 transition hover:text-white"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </section>
  );
}
