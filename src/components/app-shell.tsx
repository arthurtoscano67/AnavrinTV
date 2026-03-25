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
    "flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
    active
      ? "border-white/18 bg-[#2a2a2a] text-white"
      : "border-transparent text-[#b7b7b7] hover:border-white/14 hover:bg-[#232323] hover:text-white",
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
    return <div className="min-h-screen bg-[#0f0f0f] text-white">{children}</div>;
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    router.push(`/browse?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#0f0f0f] text-white">
      <TopNav
        onSearchChange={setSearch}
        onSearchSubmit={submitSearch}
        searchValue={search}
        networkLabel={network ? String(network).toUpperCase() : "TESTNET"}
        addressLabel={account ? shortAddress(account.address, 4) : null}
        walletLabel={wallet?.name ?? "Connect"}
      />

      <div className={`mx-auto flex w-full max-w-[1880px] gap-4 px-3 pb-6 pt-4 sm:px-4 lg:px-6 ${isWatchRoute ? "" : "xl:gap-5"}`}>
        <aside className={`w-64 shrink-0 ${isWatchRoute ? "hidden" : "hidden lg:block"}`}>
          <div className="sticky top-[4.6rem] rounded-2xl border border-white/10 bg-[#171717] p-3 shadow-[0_8px_22px_rgba(0,0,0,0.35)]">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link key={item.href} href={item.href} className={navClass(active)}>
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mx-1 my-2.5 border-t border-white/10" />

            <Link
              href="/upload"
              className="flex min-h-11 items-center gap-3 rounded-xl border border-white/12 bg-[#202020] px-3 py-2.5 text-sm font-semibold text-[#dfdfdf] transition hover:border-white/25 hover:bg-[#292929] hover:text-white"
            >
              <PlusSquare className="size-4 shrink-0" />
              Upload
            </Link>
          </div>
        </aside>

        <main
          className={`min-w-0 flex-1 ${
            isWatchRoute ? "pb-12" : showMobileBottomNav ? "pb-[7.4rem] md:pb-20" : "pb-20"
          }`}
        >
          <div className={isWatchRoute ? "space-y-4" : "space-y-5"}>{children}</div>
        </main>
      </div>

      {showMobileBottomNav ? (
        <nav className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.45rem)] z-40 px-3 md:hidden">
          <div className="mx-auto max-w-md rounded-2xl border border-white/14 bg-[#141414]/95 p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="grid grid-cols-5 gap-1">
              {mobileTabs.map((tab) => {
                const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                const Icon = tab.icon;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={[
                      "atv-mobile-tab",
                      active ? "atv-mobile-tab-active" : "hover:text-slate-200",
                    ].join(" ")}
                  >
                    <Icon className="size-4" />
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
