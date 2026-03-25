"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  Clock3,
  Compass,
  History,
  Home,
  Library,
  PlaySquare,
  ShieldAlert,
  ThumbsUp,
  Upload,
  User,
  type LucideIcon,
} from "lucide-react";
import { useCurrentAccount, useCurrentNetwork, useCurrentWallet } from "@mysten/dapp-kit-react";

import { TopNav } from "@/components/top-nav";
import { isAdminAddress } from "@/lib/anavrin-config";
import { shortAddress } from "@/lib/format";

type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

function sidebarItemClass(active: boolean) {
  return [
    "flex items-center gap-5 px-3 py-2.5 rounded-xl transition-all duration-200 group",
    active ? "bg-white/10 text-white font-semibold" : "text-yt-gray hover:bg-white/5 hover:text-white",
  ].join(" ");
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={sidebarItemClass(active)}>
      <Icon className={active ? "h-6 w-6 text-yt-red" : "h-6 w-6 group-hover:text-yt-red"} />
      <span className="text-sm tracking-tight">{item.label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const network = useCurrentNetwork();
  const [search, setSearch] = useState("");

  const showAdmin = Boolean(account?.address && isAdminAddress(account.address));

  const sectionOne = useMemo<NavItem[]>(
    () => [
      { icon: Home, label: "Home", href: "/" },
      { icon: Compass, label: "Explore", href: "/browse" },
      { icon: PlaySquare, label: "Subscriptions", href: "/library" },
    ],
    [],
  );

  const sectionTwo = useMemo<NavItem[]>(
    () => [
      { icon: Library, label: "Library", href: "/library" },
      { icon: History, label: "History", href: "/browse?sort=recent" },
      { icon: Clock3, label: "Watch later", href: "/library?tab=watch-later" },
      { icon: ThumbsUp, label: "Liked videos", href: "/library?tab=liked" },
    ],
    [],
  );

  const sectionThree = useMemo<NavItem[]>(
    () => [
      { icon: Upload, label: "Upload Video", href: "/upload" },
      { icon: User, label: "My Channel", href: "/profile" },
      ...(showAdmin ? [{ icon: ShieldAlert, label: "Admin", href: "/admin" }] : []),
    ],
    [showAdmin],
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    router.push(`/browse?q=${encodeURIComponent(query)}`);
  }

  return (
    <div className="min-h-screen bg-yt-black text-white">
      <TopNav
        addressLabel={account ? shortAddress(account.address, 4) : null}
        networkLabel={network ? String(network).toUpperCase() : "TESTNET"}
        onSearchChange={setSearch}
        onSearchSubmit={submitSearch}
        searchValue={search}
        walletLabel={wallet?.name ?? "Connect"}
      />

      <aside className="fixed bottom-0 left-0 top-14 z-40 hidden w-64 overflow-y-auto border-r border-yt-border bg-yt-black p-3 lg:block">
        <div className="space-y-1">
          {sectionOne.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <SidebarLink key={item.label} active={active} item={item} />;
          })}
        </div>

        <div className="my-4 border-t border-yt-border" />

        <div className="space-y-1">
          {sectionTwo.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <SidebarLink key={item.label} active={active} item={item} />;
          })}
        </div>

        <div className="my-4 border-t border-yt-border" />

        <div className="space-y-1">
          {sectionThree.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return <SidebarLink key={item.label} active={active} item={item} />;
          })}
        </div>
      </aside>

      <main className="min-h-screen pt-14 lg:pl-64">{children}</main>
    </div>
  );
}
