"use client";

import { ArrowUp } from "lucide-react";

type ScrollToTopButtonProps = {
  visible: boolean;
  onClick: () => void;
};

export function ScrollToTopButton({ visible, onClick }: ScrollToTopButtonProps) {
  return (
    <button
      aria-label="Scroll to top"
      className={[
        "fixed bottom-[calc(var(--safe-bottom)+1rem)] right-[calc(var(--safe-right)+1rem)] z-40 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 bg-[#202020]/96 text-white shadow-[0_10px_26px_rgba(0,0,0,0.42)] backdrop-blur transition hover:bg-[#2b2b2b]",
        visible ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <ArrowUp className="size-4" />
    </button>
  );
}
