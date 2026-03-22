"use client";

import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { useEffect, useState, type ReactNode } from "react";

import type { AnavrinDAppKit } from "@/lib/anavrin-client";
import { installSealFetchProxy } from "@/lib/seal-fetch-proxy";

export function Providers({ children }: { children: ReactNode }) {
  const [dAppKit, setDAppKit] = useState<AnavrinDAppKit | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    installSealFetchProxy();

    void import("@/lib/anavrin-client")
      .then(({ getAnavrinDAppKit }) => {
        if (!active) return;
        setDAppKit(getAnavrinDAppKit());
      })
      .catch((error) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Unknown startup error";
        setBootError(message);
      });

    return () => {
      active = false;
    };
  }, []);

  if (bootError) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#0f0f0f] p-6 text-white">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0a1326] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Startup error</p>
          <h2 className="mt-2 text-xl font-semibold">Anavrin TV could not initialize.</h2>
          <p className="mt-3 text-sm text-slate-300">
            Runtime configuration is missing or invalid for this deployment.
          </p>
          <p className="mt-3 text-xs text-slate-400">{bootError}</p>
        </div>
      </div>
    );
  }

  if (!dAppKit) {
    return <div className="min-h-screen bg-[#0f0f0f]" />;
  }

  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>;
}
