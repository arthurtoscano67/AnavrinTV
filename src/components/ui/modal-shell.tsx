"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

type ModalShellProps = {
  open: boolean;
  title: string;
  eyebrow?: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClassName?: string;
  bodyClassName?: string;
  contentClassName?: string;
};

export function ModalShell({
  open,
  title,
  eyebrow,
  description,
  onClose,
  children,
  footer,
  maxWidthClassName = "max-w-xl",
  bodyClassName = "space-y-4 px-4 py-4 md:px-5",
  contentClassName = "bg-[#070b15]",
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/68 p-3 backdrop-blur-sm md:items-center md:p-6">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />

      <section
        className={[
          "pointer-events-auto relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-[28px] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
          maxWidthClassName,
          contentClassName,
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-4 md:px-5">
          <div>
            {eyebrow ? (
              <p className="text-xs uppercase tracking-[0.34em] text-slate-400">{eyebrow}</p>
            ) : null}
            <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
            ) : null}
          </div>

          <button
            className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyClassName}`}>{children}</div>

        {footer ? (
          <footer className="border-t border-white/10 px-4 py-4 md:px-5">{footer}</footer>
        ) : null}
      </section>
    </div>
  );
}
