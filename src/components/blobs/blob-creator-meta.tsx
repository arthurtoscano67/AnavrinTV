"use client";

import { UserCheck, UserPlus } from "lucide-react";
import type { BlobItem } from "@/lib/blobs";

type BlobCreatorMetaProps = {
  blob: BlobItem;
  followed: boolean;
  onToggleFollow: () => void;
};

export function BlobCreatorMeta({ blob, followed, onToggleFollow }: BlobCreatorMetaProps) {
  return (
    <section
      data-blob-interactive="true"
      className="pointer-events-auto max-w-[min(92vw,26rem)] text-white"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold uppercase tracking-[0.18em] text-white">
          {blob.creatorAvatar}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white md:text-base">{blob.creatorName}</p>
              <p className="truncate text-xs text-white/65">{blob.creatorHandle}</p>
            </div>

            <button
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
              disabled={!blob.followable}
              onClick={onToggleFollow}
              type="button"
            >
              {followed ? <UserCheck className="size-4" /> : <UserPlus className="size-4" />}
              {followed ? "Following" : "Follow"}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 max-w-[22rem] text-sm leading-6 text-white/92">{blob.caption}</p>
    </section>
  );
}
