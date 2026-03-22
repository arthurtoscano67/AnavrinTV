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
    <header className="sticky top-0 z-50 border-b border-white/8 bg-[#0f0f0f]/97 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1800px] items-center gap-2 px-3 py-2.5 lg:gap-4 lg:px-6 lg:py-3">
        {/* Hamburger */}
        <button
          aria-label="Navigation menu"
          className="grid size-9 place-items-center rounded-full text-[#aaa] transition hover:bg-white/6 hover:text-white sm:size-10"
          type="button"
        >
          <Menu className="size-5" />
        </button>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 pr-1">
          <div className="grid size-8 place-items-center rounded-lg bg-[#ff0000] text-[9px] font-black tracking-[0.18em] text-white shadow-[0_0_16px_rgba(255,0,0,0.4)] sm:size-9">
            ATV
          </div>
          <div className="hidden min-[440px]:block">
            <p className="text-sm font-bold leading-none text-white">Anavrin TV</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-[0.32em] text-[#717171]">Sui Creator</p>
          </div>
        </Link>

        {/* Search */}
        <form
          className="ml-1 hidden flex-1 items-center gap-2.5 rounded-full border border-white/8 bg-[#121212] px-4 py-2.5 transition focus-within:border-white/20 focus-within:bg-[#1a1a1a] md:flex"
          onSubmit={onSearchSubmit}
        >
          <Search className="size-4 shrink-0 text-[#717171]" />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-[#717171] focus:outline-none"
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search videos, creators, tags…"
            value={searchValue}
          />
          <button
            className="grid size-7 shrink-0 place-items-center rounded-full border border-white/8 text-[#717171] transition hover:border-white/16 hover:text-white"
            type="button"
          >
            <Mic className="size-3.5" />
          </button>
        </form>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          {/* Create */}
          <Link
            className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/10 md:inline-flex"
            href="/upload"
          >
            <Plus className="size-4" />
            Create
          </Link>

          {/* Bell */}
          <button
            aria-label="Notifications"
            className="grid size-9 place-items-center rounded-full text-[#aaa] transition hover:bg-white/6 hover:text-white sm:size-10"
            type="button"
          >
            <Bell className="size-4.5" />
          </button>

          {/* Network pill */}
          <span className="hidden rounded-full border border-white/8 bg-[#212121] px-3 py-1.5 text-[10px] uppercase tracking-[0.26em] text-[#717171] lg:inline-flex">
            {networkLabel}
          </span>

          {/* Address pill */}
          {addressLabel ? (
            <span className="hidden rounded-full border border-white/8 bg-[#212121] px-3 py-1.5 text-xs text-[#aaa] xl:inline-flex">
              {addressLabel}
            </span>
          ) : null}

          {/* Wallet connect */}
          <ConnectButton className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:border-white/18 hover:bg-white/10 sm:min-h-10 sm:px-3 sm:py-2 sm:text-sm">
            <WalletCards className="size-4" />
            <span className="hidden min-[440px]:inline">{walletLabel ?? "Connect"}</span>
            <span className="min-[440px]:hidden">Wallet</span>
          </ConnectButton>

          {/* Profile */}
          <Link
            aria-label="Profile"
            className="grid size-9 place-items-center rounded-full text-[#aaa] transition hover:bg-white/6 hover:text-white sm:size-10"
            href="/profile"
          >
            <UserCircle2 className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
