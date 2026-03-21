"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Clapperboard, Compass, House, PlusSquare, ShieldAlert, UserRound } from "lucide-react";
import { useCurrentAccount, useCurrentNetwork, useCurrentWallet } from "@mysten/dapp-kit-react";

import { TopNav, type TopNavItem } from "@/components/top-nav";
import { isAdminAddress } from "@/lib/anavrin-config";
import { shortAddress } from "@/lib/format";

const baseNavItems: TopNavItem[] = [
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

const mobileTabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/browse", label: "Discover", icon: Compass },
  { href: "/blobs", label: "Blobs", icon: Clapperboard },
  { href: "/upload", label: "Create", icon: PlusSquare },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const network = useCurrentNetwork();
  const isBlobsRoute = pathname.startsWith("/blobs");
  const isWatchRoute = pathname.startsWith("/video/");
  const showMobileBottomNav = !isBlobsRoute && !isWatchRoute;
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

      <TopNav
        onSearchChange={setSearch}
        onSearchSubmit={submitSearch}
        searchValue={search}
        networkLabel={network ? String(network).toUpperCase() : "TESTNET"}
        addressLabel={account ? shortAddress(account.address, 4) : null}
        walletLabel={wallet?.name ?? "Connect"}
      />

      <div className={`mx-auto flex gap-6 px-4 py-5 lg:px-6 ${isWatchRoute ? "max-w-[1800px]" : "max-w-[1600px]"}`}>
        <aside className={`w-72 shrink-0 ${isWatchRoute ? "hidden" : "hidden lg:block"}`}>
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

        <main className={`min-w-0 flex-1 ${isWatchRoute ? "pb-12" : showMobileBottomNav ? "pb-28 md:pb-20" : "pb-20"}`}>
          <div className={isWatchRoute ? "space-y-4" : "space-y-6"}>{children}</div>
        </main>
      </div>

      {showMobileBottomNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#050916]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 backdrop-blur-xl md:hidden">
          <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1.5">
            {mobileTabs.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={[
                    "inline-flex min-h-11 flex-col items-center justify-center rounded-xl text-[10px] font-semibold uppercase tracking-[0.18em] transition",
                    active ? "bg-cyan-300/15 text-cyan-100" : "text-slate-300 hover:bg-white/10 hover:text-white",
                  ].join(" ")}
                >
                  <Icon className="mb-1 size-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
