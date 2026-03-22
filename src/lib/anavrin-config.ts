import { isValidSuiAddress, isValidSuiObjectId } from "@mysten/sui/utils";
import type { KeyServerConfig } from "@mysten/seal";

export type AnavrinNetwork = "testnet" | "mainnet";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const NETWORK_RPC_URLS: Record<AnavrinNetwork, string> = {
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
};

const DEFAULT_TESTNET_SEAL_SERVERS: KeyServerConfig[] = [
  {
    objectId: "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98",
    aggregatorUrl: "https://seal-aggregator-testnet.mystenlabs.com",
    weight: 1,
  },
  {
    objectId: "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
    weight: 1,
  },
];

function readAddressList(value: string | undefined | null) {
  if (!value) return [];

  const addresses = [...new Set(
    value
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  )];

  const invalid = addresses.filter((address) => !isValidSuiAddress(address));
  if (invalid.length) {
    throw new Error(`NEXT_PUBLIC_ADMIN_ADDRESSES contains invalid Sui addresses: ${invalid.join(", ")}`);
  }

  return addresses;
}

const ADMIN_ADDRESSES = readAddressList(process.env.NEXT_PUBLIC_ADMIN_ADDRESSES?.trim() ?? null);

function readDefaultAdminAddresses() {
  const treasuryAddress = process.env.NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS?.trim().toLowerCase();
  if (treasuryAddress && isValidSuiAddress(treasuryAddress)) {
    return [treasuryAddress];
  }

  return [];
}

const DEFAULT_ADMIN_ADDRESSES = readDefaultAdminAddresses();

function getEffectiveAdminAddresses() {
  return ADMIN_ADDRESSES.length ? ADMIN_ADDRESSES : DEFAULT_ADMIN_ADDRESSES;
}

function readNetwork(value: string | undefined | null): AnavrinNetwork | null {
  if (value === "mainnet" || value === "testnet") {
    return value;
  }

  return null;
}

function requireProductionEnv(value: string | undefined | null, name: string) {
  const trimmed = value?.trim() ?? "";
  if (trimmed) return trimmed;

  if (IS_PRODUCTION) {
    throw new Error(`${name} is required in production.`);
  }

  return "";
}

function readNumber(value: string | undefined | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readJsonConfig(value: string | undefined | null): KeyServerConfig[] | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return null;

    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const config = entry as Partial<KeyServerConfig> & Record<string, unknown>;
        if (
          typeof config.objectId !== "string" ||
          !isValidSuiObjectId(config.objectId) ||
          typeof config.weight !== "number" ||
          !Number.isFinite(config.weight) ||
          config.weight <= 0
        ) {
          return null;
        }

        const normalized: KeyServerConfig = {
          objectId: config.objectId,
          weight: config.weight,
        };

        if (typeof config.aggregatorUrl === "string" && config.aggregatorUrl.trim()) {
          normalized.aggregatorUrl = config.aggregatorUrl.trim();
        }

        if (typeof config.apiKeyName === "string" && config.apiKeyName.trim()) {
          normalized.apiKeyName = config.apiKeyName.trim();
        }

        if (typeof config.apiKey === "string" && config.apiKey.trim()) {
          normalized.apiKey = config.apiKey.trim();
        }

        return normalized;
      })
      .filter((config): config is KeyServerConfig => Boolean(config));
  } catch {
    return null;
  }
}

export function getNetwork() {
  const configured = readNetwork(process.env.NEXT_PUBLIC_SUI_NETWORK?.trim() ?? null);
  if (configured) return configured;

  const raw = process.env.NEXT_PUBLIC_SUI_NETWORK?.trim();
  if (raw) {
    throw new Error("NEXT_PUBLIC_SUI_NETWORK must be either 'testnet' or 'mainnet'.");
  }

  if (IS_PRODUCTION) {
    return "mainnet";
  }

  return "testnet";
}

export function getRpcUrl(network = getNetwork()) {
  return NETWORK_RPC_URLS[network];
}

export function getUploadRelayHost(network = getNetwork()) {
  const configured = process.env.NEXT_PUBLIC_WALRUS_UPLOAD_RELAY_URL?.trim();
  if (configured) return configured;

  if (network === "testnet") {
    return "https://upload-relay.testnet.walrus.space";
  }

  return "";
}

export function getWalrusUploadPrivateKey() {
  const secret =
    process.env.ANAVRIN_WALRUS_UPLOAD_PRIVATE_KEY?.trim() ||
    process.env.NEXT_PRIVATE_WALRUS_UPLOAD_PRIVATE_KEY?.trim() ||
    "";

  if (secret) return secret;

  if (IS_PRODUCTION) {
    throw new Error("ANAVRIN_WALRUS_UPLOAD_PRIVATE_KEY is required in production.");
  }

  return null;
}

export function getUploadFeeMist() {
  return readNumber(process.env.NEXT_PUBLIC_UPLOAD_FEE_MIST, 25_000_000);
}

export function getAdminAddresses() {
  return getEffectiveAdminAddresses();
}

export function isAdminAddress(address?: string | null) {
  if (!address) return false;
  return getEffectiveAdminAddresses().includes(address.trim().toLowerCase());
}

export function getUploadTreasuryAddress() {
  const value = requireProductionEnv(process.env.NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS, "NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS");
  if (!value) return null;
  if (!isValidSuiAddress(value)) {
    throw new Error("NEXT_PUBLIC_UPLOAD_TREASURY_ADDRESS is not a valid Sui address.");
  }
  return value;
}

export function getPolicyPackageId() {
  const value = requireProductionEnv(process.env.NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID, "NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID");
  if (!value) return null;
  if (!isValidSuiObjectId(value)) {
    throw new Error("NEXT_PUBLIC_SEAL_POLICY_PACKAGE_ID is not a valid Sui object ID.");
  }
  return value;
}

export function getMvrName() {
  return process.env.NEXT_PUBLIC_SEAL_MVR_NAME?.trim() || null;
}

export function getEnokiApiKey() {
  return process.env.NEXT_PUBLIC_ENOKI_API_KEY?.trim() || null;
}

export function getEnokiGoogleClientId() {
  return process.env.NEXT_PUBLIC_ENOKI_GOOGLE_CLIENT_ID?.trim() || null;
}

export function getEnokiFacebookClientId() {
  return process.env.NEXT_PUBLIC_ENOKI_FACEBOOK_CLIENT_ID?.trim() || null;
}

export function getEnokiTwitchClientId() {
  return process.env.NEXT_PUBLIC_ENOKI_TWITCH_CLIENT_ID?.trim() || null;
}

export function getEnokiRedirectUrl() {
  return process.env.NEXT_PUBLIC_ENOKI_REDIRECT_URL?.trim() || null;
}

export function getSealThreshold(serverCount = getSealServerConfigs().length) {
  const configured = readNumber(process.env.NEXT_PUBLIC_SEAL_THRESHOLD, Math.min(2, serverCount || 1));
  return Math.max(1, Math.min(configured, Math.max(1, serverCount)));
}

export function getSealServerConfigs(network = getNetwork()) {
  const fromEnv = readJsonConfig(process.env.NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON);
  if (fromEnv?.length) return fromEnv;
  if (process.env.NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON?.trim()) {
    throw new Error("NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON is invalid JSON or contains invalid server entries.");
  }
  if (IS_PRODUCTION && network === "mainnet") {
    throw new Error("NEXT_PUBLIC_SEAL_SERVER_CONFIG_JSON is required for mainnet Seal uploads and playback.");
  }
  return network === "testnet" ? DEFAULT_TESTNET_SEAL_SERVERS : [];
}

export function getSealVerifyKeyServers() {
  const value = process.env.NEXT_PUBLIC_SEAL_VERIFY_KEY_SERVERS?.trim();
  if (!value) return true;
  return value !== "false";
}

export function resolveUploadRelayConfig(network = getNetwork()) {
  const host = getUploadRelayHost(network);
  if (!host) return null;

  return {
    host,
    sendTip: {
      max: 10_000_000_000,
    },
  };
}
