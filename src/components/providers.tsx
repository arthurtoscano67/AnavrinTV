"use client";

import { DAppKitProvider } from "@mysten/dapp-kit-react";
import { useEffect, useState, type ReactNode } from "react";

import type { AnavrinDAppKit } from "@/lib/anavrin-client";
import { installSealFetchProxy } from "@/lib/seal-fetch-proxy";

export function Providers({ children }: { children: ReactNode }) {
  const [dAppKit, setDAppKit] = useState<AnavrinDAppKit | null>(null);

  useEffect(() => {
    let active = true;

    installSealFetchProxy();

    void import("@/lib/anavrin-client").then(({ getAnavrinDAppKit }) => {
      if (active) {
        setDAppKit(getAnavrinDAppKit());
      }
    });

    return () => {
      active = false;
    };
  }, []);

  if (!dAppKit) {
    return <div className="min-h-screen bg-[#040816]" />;
  }

  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>;
}
