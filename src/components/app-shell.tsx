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
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
    active
      ? "bg-white/10 text-white"
      : "text-[#aaa] hover:bg-white/6 hover:text-white",
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
    return <div className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1]">{children}</div>;
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    router.push(`/browse?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1]">
      <TopNav
        onSearchChange={setSearch}
        onSearchSubmit={submitSearch}
        searchValue={search}
        networkLabel={network ? String(network).toUpperCase() : "TESTNET"}
        addressLabel={account ? shortAddress(account.address, 4) : null}
        walletLabel={wallet?.name ?? "Connect"}
      />

      <div className={`mx-auto flex gap-4 px-3 py-4 lg:px-6 lg:py-5 ${isWatchRoute ? "max-w-[1800px]" : "max-w-[1600px]"}`}>
        {/* Sidebar */}
        <aside className={`w-56 shrink-0 ${isWatchRoute ? "hidden" : "hidden lg:block"}`}>
          <div className="sticky top-[4.5rem] space-y-1">
            <nav className="space-y-0.5 py-2">
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

            {/* Divider */}
            <div className="mx-3 border-t border-white/6" />

            {/* Upload shortcut */}
            <div className="pt-1">
              <Link
                href="/upload"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#aaa] transition hover:bg-white/6 hover:text-white"
              >
                <PlusSquare className="size-4 shrink-0" />
                Upload
              </Link>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main
          className={`min-w-0 flex-1 ${
            isWatchRoute ? "pb-12" : showMobileBottomNav ? "pb-28 md:pb-20" : "pb-20"
          }`}
        >
          <div className={isWatchRoute ? "space-y-4" : "space-y-5"}>{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {showMobileBottomNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#0f0f0f]/97 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur-xl md:hidden">
          <div className="mx-auto grid max-w-sm grid-cols-5 gap-1">
            {mobileTabs.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={[
                    "inline-flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                    active ? "text-white" : "text-[#717171] hover:text-[#aaa]",
                  ].join(" ")}
                >
                  <Icon className={["size-4 transition", active ? "text-white" : ""].join(" ")} />
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
