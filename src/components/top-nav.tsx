"use client";

import Link from "next/link";
import { Bell, Menu, Mic, Plus, Search, UserCircle2, WalletCards, type LucideIcon } from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { type FormEvent } from "react";

export type TopNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type TopNavProps = {
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSearchChange: (value: string) => void;
  searchValue: string;
  networkLabel: string;
  addressLabel?: string | null;
  walletLabel?: string | null;
};

export function TopNav({
  onSearchSubmit,
  onSearchChange,
  searchValue,
  networkLabel,
  addressLabel,
  walletLabel,
}: TopNavProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[linear-gradient(180deg,rgba(6,12,24,0.92)_0%,rgba(6,12,24,0.72)_100%)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1720px] items-center gap-2 px-3 py-2.5 sm:gap-3 lg:px-6 lg:py-3">
        <button
          aria-label="Navigation menu"
          className="grid size-10 place-items-center rounded-full border border-white/14 bg-white/6 text-slate-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
          type="button"
        >
          <Menu className="size-5" />
        </button>

        <Link href="/" className="group flex items-center gap-2.5 pr-0.5">
          <div className="grid size-9 place-items-center rounded-xl border border-cyan-200/35 bg-[linear-gradient(135deg,#22d3ee_0%,#6366f1_52%,#f97316_100%)] text-[9px] font-black tracking-[0.2em] text-white shadow-[0_10px_24px_rgba(34,211,238,0.28)] transition group-hover:brightness-110">
            ATV
          </div>
          <div className="hidden min-[460px]:block">
            <p className="text-sm font-extrabold leading-none text-white">Anavrin TV</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-cyan-100/70">Creator Network</p>
          </div>
        </Link>

        <form
          className="ml-1 hidden flex-1 items-center gap-2 rounded-full border border-white/12 bg-[#0f1b31]/85 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition focus-within:border-cyan-200/45 focus-within:bg-[#132440] md:flex"
          onSubmit={onSearchSubmit}
        >
          <Search className="size-4 shrink-0 text-slate-400" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search videos, creators, tags"
            value={searchValue}
          />
          <button
            className="grid size-7 shrink-0 place-items-center rounded-full border border-white/12 text-slate-400 transition hover:border-white/24 hover:text-white"
            type="button"
          >
            <Mic className="size-3.5" />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            aria-label="Search"
            className="grid size-10 place-items-center rounded-full border border-white/12 bg-white/6 text-slate-300 transition hover:border-white/25 hover:text-white md:hidden"
            type="button"
          >
            <Search className="size-4" />
          </button>

          <Link
            className="hidden min-h-10 items-center gap-1.5 rounded-full border border-cyan-200/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.2)_0%,rgba(99,102,241,0.24)_100%)] px-3.5 text-sm font-semibold text-cyan-50 transition hover:brightness-110 md:inline-flex"
            href="/upload"
          >
            <Plus className="size-4" />
            Create
          </Link>

          <button
            aria-label="Notifications"
            className="grid size-10 place-items-center rounded-full border border-white/12 bg-white/6 text-slate-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            type="button"
          >
            <Bell className="size-4" />
          </button>

          <span className="hidden rounded-full border border-white/12 bg-[#111e36]/85 px-3 py-1.5 text-[10px] uppercase tracking-[0.26em] text-slate-300 lg:inline-flex">
            {networkLabel}
          </span>

          {addressLabel ? (
            <span className="hidden rounded-full border border-white/12 bg-[#111e36]/85 px-3 py-1.5 text-xs text-slate-300 xl:inline-flex">
              {addressLabel}
            </span>
          ) : null}

          <ConnectButton className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-cyan-200/28 bg-[linear-gradient(135deg,rgba(34,211,238,0.18)_0%,rgba(99,102,241,0.2)_100%)] px-2.5 py-1.5 text-[11px] font-semibold text-cyan-50 transition hover:brightness-110 sm:px-3 sm:text-sm">
            <WalletCards className="size-4" />
            <span className="hidden min-[460px]:inline">{walletLabel ?? "Connect"}</span>
            <span className="min-[460px]:hidden">Wallet</span>
          </ConnectButton>

          <Link
            aria-label="Profile"
            className="grid size-10 place-items-center rounded-full border border-white/12 bg-white/6 text-slate-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
            href="/profile"
          >
            <UserCircle2 className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
