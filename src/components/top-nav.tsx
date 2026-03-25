"use client";

import Link from "next/link";
import { Compass, FolderClock, Home, Menu, Play, Plus, Search, TvMinimalPlay, UserCircle2, WalletCards, type LucideIcon } from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { type FormEvent, useState } from "react";

import { ModalShell } from "@/components/ui/modal-shell";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/browse", label: "Browse", icon: Compass },
    { href: "/blobs", label: "Blobs", icon: TvMinimalPlay },
    { href: "/library", label: "Library", icon: FolderClock },
    { href: "/upload", label: "Create", icon: Plus },
  ] satisfies TopNavItem[];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f0f0f]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1880px] items-center gap-2 px-3 py-2.5 sm:gap-3 lg:px-6 lg:py-3">
          <button
            aria-label="Navigation menu"
            className="grid size-10 place-items-center rounded-full border border-white/14 bg-[#1b1b1b] text-[#cdcdcd] transition hover:border-white/25 hover:bg-[#282828] hover:text-white"
            onClick={() => setMenuOpen(true)}
            type="button"
          >
            <Menu className="size-5" />
          </button>

          <Link href="/" className="group flex items-center gap-2.5 pr-0.5">
            <div className="grid size-9 place-items-center rounded-lg bg-[#ff3d3d] text-white shadow-[0_8px_20px_rgba(255,61,61,0.3)] transition group-hover:brightness-110">
              <Play className="size-5 fill-white" />
            </div>
            <div className="hidden min-[460px]:block">
              <p className="text-sm font-extrabold leading-none text-white">Anavrin TV</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.3em] text-[#a8a8a8]">Creator Network</p>
            </div>
          </Link>

          <form
            className="ml-1 hidden flex-1 items-center gap-2 rounded-full border border-white/14 bg-[#181818] px-4 py-2.5 transition focus-within:border-[#ff5757]/70 focus-within:bg-[#202020] md:flex"
            onSubmit={onSearchSubmit}
          >
            <Search className="size-4 shrink-0 text-[#a5a5a5]" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-[#727272] focus:outline-none"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search videos, creators, tags"
              value={searchValue}
            />
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              aria-label="Search"
              className="grid size-10 place-items-center rounded-full border border-white/12 bg-[#1b1b1b] text-[#c9c9c9] transition hover:border-white/25 hover:text-white md:hidden"
              onClick={() => setSearchOpen(true)}
              type="button"
            >
              <Search className="size-4" />
            </button>

            <Link
              className="hidden min-h-10 items-center gap-1.5 rounded-full border border-white/12 bg-[#202020] px-3.5 text-sm font-semibold text-[#efefef] transition hover:border-white/22 hover:bg-[#2a2a2a] md:inline-flex"
              href="/upload"
            >
              <Plus className="size-4" />
              Create
            </Link>

            <span className="hidden rounded-full border border-white/12 bg-[#1d1d1d] px-3 py-1.5 text-[10px] uppercase tracking-[0.26em] text-[#c8c8c8] lg:inline-flex">
              {networkLabel}
            </span>

            {addressLabel ? (
              <span className="hidden rounded-full border border-white/12 bg-[#1d1d1d] px-3 py-1.5 text-xs text-[#c8c8c8] xl:inline-flex">
                {addressLabel}
              </span>
            ) : null}

            <ConnectButton className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#ff5757]/65 bg-[#ff3e3e] px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#ff5b5b] sm:px-3 sm:text-sm">
              <WalletCards className="size-4" />
              <span className="hidden min-[460px]:inline">{walletLabel ?? "Connect"}</span>
              <span className="min-[460px]:hidden">Wallet</span>
            </ConnectButton>

            <Link
              aria-label="Profile"
              className="grid size-10 place-items-center rounded-full border border-white/12 bg-[#1b1b1b] text-[#c9c9c9] transition hover:border-white/25 hover:bg-[#282828] hover:text-white"
              href="/profile"
            >
              <UserCircle2 className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <ModalShell
        bodyClassName="space-y-3 px-4 py-4 md:px-5"
        description="Keep navigation tight: primary destinations live here instead of crowding the top bar."
        eyebrow="Navigate"
        maxWidthClassName="max-w-md"
        onClose={() => setMenuOpen(false)}
        open={menuOpen}
        title="Quick navigation"
      >
        <div className="grid gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#1e1e1e] px-4 py-3 text-sm text-white transition hover:bg-[#272727]"
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="size-4" />
                  {item.label}
                </span>
                <span className="text-xs uppercase tracking-[0.24em] text-[#a7a7a7]">Open</span>
              </Link>
            );
          })}
        </div>
      </ModalShell>

      <ModalShell
        bodyClassName="space-y-4 px-4 py-4 md:px-5"
        description="Mobile search uses the same results flow as desktop without permanently taking space in the header."
        eyebrow="Search"
        maxWidthClassName="max-w-lg"
        onClose={() => setSearchOpen(false)}
        open={searchOpen}
        title="Search Anavrin TV"
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            onSearchSubmit(event);
            setSearchOpen(false);
          }}
        >
          <div className="flex items-center gap-2 rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
            <Search className="size-4 text-[#9f9f9f]" />
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-[#7a7a7a] focus:outline-none"
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search videos, creators, tags"
              value={searchValue}
            />
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" type="submit">
              Search
            </button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
