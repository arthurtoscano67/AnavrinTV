"use client";

import { createDAppKit } from "@mysten/dapp-kit-core";
import { enokiWalletsInitializer, type AuthProvider } from "@mysten/enoki";
import { type WalrusClient } from "@mysten/walrus";
import { SealClient } from "@mysten/seal";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import type { ClientWithCoreApi } from "@mysten/sui/client";
import type { WalletInitializer } from "@mysten/dapp-kit-core";

import {
  getEnokiApiKey,
  getNetwork,
  getEnokiFacebookClientId,
  getEnokiGoogleClientId,
  getEnokiTwitchClientId,
  getRpcUrl,
  getSealServerConfigs,
  getSealVerifyKeyServers,
} from "@/lib/anavrin-config";
import { buildPublicUrl } from "@/lib/site-url";

export type AnavrinClient = ClientWithCoreApi & {
  seal: SealClient;
  walrus: WalrusClient;
};

function createClientForNetwork(network = getNetwork()) {
  const client = new SuiGrpcClient({
    network,
    baseUrl: getRpcUrl(network),
  }) as ClientWithCoreApi;

  const seal = new SealClient({
    suiClient: client,
    serverConfigs: getSealServerConfigs(network),
    verifyKeyServers: getSealVerifyKeyServers(),
  });

  return Object.assign(client, { seal }) as AnavrinClient;
}

function createWalletInitializers(): WalletInitializer[] {
  const apiKey = getEnokiApiKey();
  if (!apiKey) return [];

  const redirectUrl = process.env.NEXT_PUBLIC_ENOKI_REDIRECT_URL?.trim() || buildPublicUrl("/");
  const providers: Partial<Record<AuthProvider, { clientId: string; redirectUrl?: string }>> = {};

  const googleClientId = getEnokiGoogleClientId();
  if (googleClientId) {
    providers.google = {
      clientId: googleClientId,
      redirectUrl,
    };
  }

  const facebookClientId = getEnokiFacebookClientId();
  if (facebookClientId) {
    providers.facebook = {
      clientId: facebookClientId,
      redirectUrl,
    };
  }

  const twitchClientId = getEnokiTwitchClientId();
  if (twitchClientId) {
    providers.twitch = {
      clientId: twitchClientId,
      redirectUrl,
    };
  }

  if (!Object.keys(providers).length) {
    return [];
  }

  return [
    enokiWalletsInitializer({
      apiKey,
      providers,
    }),
  ];
}

export function createAnavrinDAppKit() {
  const network = getNetwork();
  const dAppKit = createDAppKit({
    autoConnect: true,
    defaultNetwork: network,
    networks: [network],
    createClient: (currentNetwork) => createClientForNetwork(currentNetwork),
    slushWalletConfig: {
      appName: "Anavrin TV",
    },
    walletInitializers: createWalletInitializers(),
    enableBurnerWallet: process.env.NODE_ENV !== "production",
  });

  return dAppKit;
}

let singleton: AnavrinDAppKit | null = null;

export function getAnavrinDAppKit(): AnavrinDAppKit {
  if (!singleton) {
    singleton = createAnavrinDAppKit();
  }
  return singleton ?? (singleton = createAnavrinDAppKit());
}

export type AnavrinDAppKit = ReturnType<typeof createAnavrinDAppKit>;
