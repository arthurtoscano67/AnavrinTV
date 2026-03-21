"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { useCurrentAccount, useCurrentWallet } from "@mysten/dapp-kit-react";

import { shortAddress } from "@/lib/format";
import type { DashboardSnapshot, WalletSession } from "@/lib/types";

type ResolverState = {
  loading: boolean;
  error: string | null;
};

function pickDisplayName(walletName: string | null | undefined, address: string) {
  const fromWallet = walletName?.trim();
  if (fromWallet) return fromWallet;
  return `creator_${shortAddress(address.replace(/^0x/, ""), 4).replace(/…/g, "")}`;
}

export default function ProfileResolverPage() {
  const router = useRouter();
  const account = useCurrentAccount();
  const wallet = useCurrentWallet();
  const [state, setState] = useState<ResolverState>({
    loading: false,
    error: null,
  });

  const displayName = useMemo(
    () => (account?.address ? pickDisplayName(wallet?.name, account.address) : ""),
    [account?.address, wallet?.name],
  );

  useEffect(() => {
    if (!account?.address) return;
    const address = account.address;

    let active = true;

    async function resolveProfileRoute() {
      setState({
        loading: true,
        error: null,
      });

      try {
        const dashboardResponse = await fetch(`/api/dashboard?address=${encodeURIComponent(address)}`, {
          cache: "no-store",
        });
        const dashboard = (await dashboardResponse.json().catch(() => ({}))) as DashboardSnapshot;
        const existingUsername = dashboard.account?.username?.trim();
        if (existingUsername) {
          router.replace(`/profile/${existingUsername}`);
          return;
        }

        const profileResponse = await fetch("/api/accounts/profile", {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            address,
            displayName,
          }),
        });
        const payload = (await profileResponse.json().catch(() => ({}))) as {
          account?: WalletSession;
          error?: string;
        };

        if (!profileResponse.ok || !payload.account?.username) {
          throw new Error(payload.error || "Could not resolve profile route.");
        }

        router.replace(`/profile/${payload.account.username}`);
      } catch (cause) {
        if (!active) return;
        setState({
          loading: false,
          error: cause instanceof Error ? cause.message : "Could not load your profile.",
        });
      }
    }

    void resolveProfileRoute();

    return () => {
      active = false;
    };
  }, [account?.address, displayName, router]);

  if (!account?.address) {
    return (
      <section className="mx-auto flex w-full max-w-[720px] flex-col items-center rounded-2xl border border-white/10 bg-[#0b1120] px-6 py-14 text-center">
        <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Profile</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Connect wallet to open your profile</h1>
        <p className="mt-2 max-w-[520px] text-sm text-slate-300">
          Your creator profile is wallet-bound. Connect first, then Anavrin TV routes you to `/profile/:username`.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <ConnectButton className="btn-primary" />
          <Link className="btn-secondary" href="/browse">
            Browse creators
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-[720px] flex-col items-center rounded-2xl border border-white/10 bg-[#0b1120] px-6 py-14 text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Profile</p>
      <h1 className="mt-3 text-2xl font-semibold text-white">Opening your creator profile</h1>
      <p className="mt-2 max-w-[520px] text-sm text-slate-300">
        {state.loading ? "Resolving username and routing..." : state.error || "Preparing profile route..."}
      </p>
      {state.error ? (
        <button
          className="btn-secondary mt-5"
          onClick={() => window.location.reload()}
          type="button"
        >
          Retry
        </button>
      ) : null}
    </section>
  );
}
