"use client";

import Link from "next/link";
import { Bell, Menu, Play, Search, User, Video } from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { type FormEvent } from "react";

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
    <nav className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-yt-border bg-yt-black px-4">
      <div className="flex items-center gap-4">
        <button className="rounded-full p-2 transition-colors hover:bg-white/10" type="button" aria-label="Navigation menu">
          <Menu className="h-6 w-6" />
        </button>

        <Link href="/" className="flex items-center gap-1">
          <div className="rounded-lg bg-yt-red p-1">
            <Play className="h-5 w-5 fill-white text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter">Anavrin TV</span>
        </Link>
      </div>

      <form onSubmit={onSearchSubmit} className="mx-4 hidden max-w-2xl flex-1 items-center md:flex">
        <div className="flex flex-1 items-center rounded-l-full border border-yt-border bg-yt-dark px-4 py-1.5 focus-within:border-blue-500">
          <input
            type="text"
            placeholder="Search"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full bg-transparent text-white placeholder-yt-gray outline-none"
          />
        </div>
        <button type="submit" className="rounded-r-full border border-l-0 border-yt-border bg-white/10 px-5 py-1.5 transition-colors hover:bg-white/20">
          <Search className="h-5 w-5 text-yt-gray" />
        </button>
      </form>

      <div className="flex items-center gap-2">
        <button
          className="rounded-full p-2 transition-colors hover:bg-white/10 md:hidden"
          type="button"
          aria-label="Search"
        >
          <Search className="h-6 w-6" />
        </button>

        <Link href="/upload" className="hidden rounded-full p-2 transition-colors hover:bg-white/10 sm:block" aria-label="Upload video">
          <Video className="h-6 w-6" />
        </Link>

        <button className="hidden rounded-full p-2 transition-colors hover:bg-white/10 sm:block" type="button" aria-label="Notifications">
          <Bell className="h-6 w-6" />
        </button>

        <div className="ml-2 flex items-center gap-2.5">
          <span className="hidden rounded-full border border-yt-border bg-yt-dark px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-yt-gray lg:inline-flex">
            {networkLabel}
          </span>

          {addressLabel ? (
            <span className="hidden rounded-full border border-yt-border bg-yt-dark px-3 py-1 text-xs text-yt-gray xl:inline-flex">
              {addressLabel}
            </span>
          ) : null}

          <ConnectButton className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-yt-red/70 bg-yt-red px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-red-500 sm:px-3 sm:text-sm">
            <span className="hidden min-[460px]:inline">{walletLabel ?? "Connect"}</span>
            <span className="min-[460px]:hidden">Wallet</span>
          </ConnectButton>

          <Link href="/profile" className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-yt-border bg-yt-dark" aria-label="Profile">
            <User className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </nav>
  );
}
