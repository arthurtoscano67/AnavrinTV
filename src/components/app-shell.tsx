"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Clapperboard, Compass, House, Menu, Search, ShieldAlert, UserRound, WalletCards, Zap } from "lucide-react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount, useCurrentNetwork, useCurrentWallet } from "@mysten/dapp-kit-react";

import { isAdminAddress } from "@/lib/anavrin-config";
import { shortAddress } from "@/lib/format";

const baseNavItems = [
  { href: "/", label: "Home", icon: House },
  { href: "/browse", label: "Browse", icon: Compass },
  { href: "/blobs", label: "Blobs", icon: Clapperboard },
  { href: "/profile", label: "Profile", icon: UserRound },
  { href: "/admin", label: "Admin", icon: ShieldAlert },
];

function navClass(active: boolean) {
  return [
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
    active ? "bg-white/8 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
  ].join(" ");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const network = useCurrentNetwork();
  const isBlobsRoute = pathname.startsWith("/blobs");
  const [search, setSearch] = useState("");
  const showAdmin = Boolean(account?.address && isAdminAddress(account.address));
  const navItems = showAdmin ? baseNavItems : baseNavItems.filter((item) => item.href !== "/admin");

  if (isBlobsRoute) {
    return <div className="min-h-screen bg-[#02040b] text-slate-50">{children}</div>;
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    router.push(`/browse?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="min-h-screen text-slate-50">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[#040816]" />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050916]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 lg:px-6">
          <button
            aria-label="Toggle menu"
            className="grid size-11 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-100 lg:hidden"
            type="button"
          >
            <Menu className="size-5" />
          </button>

          <Link href="/" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-[11px] font-semibold tracking-[0.24em] text-white">
              ATV
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-white">Anavrin TV</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Sui creator desk</p>
            </div>
          </Link>

          <form
            className="ml-2 hidden flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 lg:flex"
            onSubmit={submitSearch}
          >
            <Search className="size-4 text-slate-400" />
            <input
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search videos, creators, tags"
              value={search}
            />
            <kbd className="rounded-full border border-white/10 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-400">
              Enter
            </kbd>
          </form>

          <Link
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/15 hover:bg-white/10 lg:inline-flex"
            href="/profile#content"
          >
            <Zap className="size-4" />
            Upload
          </Link>

          <div className="ml-auto hidden items-center gap-3 lg:flex">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.28em] text-slate-400">
              {network ? String(network).toUpperCase() : "TESTNET"}
            </span>
            {account ? (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                {shortAddress(account.address, 4)}
              </span>
            ) : null}
            <ConnectButton className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-white/15 hover:bg-white/10">
              <WalletCards className="size-4" />
              <span>{wallet?.name ?? "Connect"}</span>
            </ConnectButton>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1600px] gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link key={item.href} href={item.href} className={navClass(active)}>
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-5 lg:px-6">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-24 space-y-4">
            <nav className="rounded-2xl border border-white/10 bg-[#0b1120] p-2">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href} className={navClass(active)}>
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-20">
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
