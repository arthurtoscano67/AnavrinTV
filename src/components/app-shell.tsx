"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { Clapperboard, Compass, House, ShieldAlert, UserRound } from "lucide-react";
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const network = useCurrentNetwork();
  const isBlobsRoute = pathname.startsWith("/blobs");
  const isWatchRoute = pathname.startsWith("/video/");
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
        pathname={pathname}
        navItems={navItems}
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

        <main className={`min-w-0 flex-1 ${isWatchRoute ? "pb-12" : "pb-20"}`}>
          <div className={isWatchRoute ? "space-y-4" : "space-y-6"}>{children}</div>
        </main>
      </div>
    </div>
  );
}
