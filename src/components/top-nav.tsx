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
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050916]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1800px] items-center gap-2 px-3 py-2 lg:gap-3 lg:px-6 lg:py-3">
        <button
          aria-label="Navigation menu"
          className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-100 sm:size-10"
          type="button"
        >
          <Menu className="size-5" />
        </button>

        <Link href="/" className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-[10px] font-semibold tracking-[0.22em] text-white sm:size-10 sm:text-[11px]">
            ATV
          </div>
          <div className="hidden min-[430px]:block">
            <p className="text-sm font-semibold text-white">Anavrin TV</p>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Sui creator desk</p>
          </div>
        </Link>

        <form
          className="ml-2 hidden flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-slate-300 md:flex"
          onSubmit={onSearchSubmit}
        >
          <Search className="size-4 text-slate-400" />
          <input
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search videos, creators, tags"
            value={searchValue}
          />
          <button className="rounded-full border border-white/10 bg-black/20 p-1.5 text-slate-400 hover:text-white" type="button">
            <Mic className="size-3.5" />
          </button>
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <Link className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10 md:inline-flex" href="/upload">
            <Plus className="size-4" />
            Create
          </Link>

          <button
            aria-label="Notifications"
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:text-white sm:size-10"
            type="button"
          >
            <Bell className="size-4.5" />
          </button>

          <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-slate-400 lg:inline-flex">
            {networkLabel}
          </span>

          {addressLabel ? (
            <span className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 xl:inline-flex">
              {addressLabel}
            </span>
          ) : null}

          <ConnectButton className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:border-white/15 hover:bg-white/10 sm:min-h-10 sm:px-3 sm:py-2 sm:text-sm">
            <WalletCards className="size-4" />
            <span className="hidden min-[430px]:inline">{walletLabel ?? "Connect"}</span>
            <span className="min-[430px]:hidden">Wallet</span>
          </ConnectButton>

          <Link
            aria-label="Profile"
            className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:text-white sm:size-10"
            href="/profile"
          >
            <UserCircle2 className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
