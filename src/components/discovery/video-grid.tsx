"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { VideoRecord } from "@/lib/types";
import { VideoCard } from "@/components/discovery/video-card";

const ROW_HEIGHT = 316;
const OVERSCAN_ROWS = 3;
const VIRTUALIZE_AFTER = 72;

type VirtualRange = {
  start: number;
  end: number;
  paddingTop: number;
  paddingBottom: number;
};

function columnsFromWidth(width: number) {
  if (width >= 1920) return 5;
  if (width >= 1536) return 4;
  if (width >= 1280) return 3;
  if (width >= 640) return 2;
  return 1;
}

function fullRange(total: number): VirtualRange {
  return {
    start: 0,
    end: total,
    paddingTop: 0,
    paddingBottom: 0,
  };
}

export function VideoGrid({ videos }: { videos: VideoRecord[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [columns, setColumns] = useState(1);
  const [range, setRange] = useState<VirtualRange>(() => fullRange(videos.length));
  const shouldVirtualize = videos.length > VIRTUALIZE_AFTER;

  useEffect(() => {
    const updateColumns = () => {
      setColumns(columnsFromWidth(window.innerWidth));
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  useEffect(() => {
    if (!shouldVirtualize) return;

    let rafId = 0;

    const updateRange = () => {
      if (!containerRef.current) return;

      const containerTop = containerRef.current.getBoundingClientRect().top + window.scrollY;
      const viewportTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const totalRows = Math.ceil(videos.length / columns);
      const safeRelativeTop = Math.max(0, viewportTop - containerTop);
      const startRow = Math.max(0, Math.floor(safeRelativeTop / ROW_HEIGHT) - OVERSCAN_ROWS);
      const visibleRows = Math.ceil(viewportHeight / ROW_HEIGHT) + OVERSCAN_ROWS * 2 + 2;
      const endRow = Math.min(totalRows, startRow + visibleRows);

      const start = startRow * columns;
      const end = Math.min(videos.length, endRow * columns);
      const paddingTop = startRow * ROW_HEIGHT;
      const paddingBottom = Math.max(0, (totalRows - endRow) * ROW_HEIGHT);

      setRange((current) => {
        if (
          current.start === start &&
          current.end === end &&
          current.paddingTop === paddingTop &&
          current.paddingBottom === paddingBottom
        ) {
          return current;
        }
        return {
          start,
          end,
          paddingTop,
          paddingBottom,
        };
      });
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(updateRange);
    };

    updateRange();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      cancelAnimationFrame(rafId);
    };
  }, [columns, shouldVirtualize, videos.length]);

  const visibleVideos = useMemo(() => {
    if (!shouldVirtualize) return videos;
    return videos.slice(range.start, range.end);
  }, [range.end, range.start, shouldVirtualize, videos]);

  return (
    <div ref={containerRef}>
      {shouldVirtualize && range.paddingTop > 0 ? <div style={{ height: range.paddingTop }} /> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1920px]:grid-cols-5">
        {visibleVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {shouldVirtualize && range.paddingBottom > 0 ? <div style={{ height: range.paddingBottom }} /> : null}
    </div>
  );
}
