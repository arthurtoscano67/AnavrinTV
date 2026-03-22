export interface WalletBalanceSnapshot {
  suiBalanceMist: bigint;
  walBalanceMist: bigint;
  walCoinType: string | null;
  discoveredCoins: Array<{
    coinType: string;
    totalBalance: bigint;
    symbol?: string | null;
  }>;
}

const balanceCache = new Map<string, WalletBalanceSnapshot>();

export type WalletBalanceClient = {
  network?: unknown;
  core?: unknown;
  getAllBalances?: (input: { owner: string }) => Promise<unknown>;
  listBalances?: (input: { owner: string; cursor?: string | null; limit?: number }) => Promise<unknown>;
  getBalance?: (input: { owner: string; coinType?: string }) => Promise<unknown>;
  getCoinMetadata?: (input: { coinType: string }) => Promise<unknown>;
};

function cacheKey(address: string, network?: string) {
  return `${network ?? "unknown"}:${address.toLowerCase()}`;
}

function toBigInt(value: string | number | bigint | undefined | null) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.max(0, Math.floor(value)));
  if (typeof value === "string" && value.trim()) {
    try {
      return BigInt(value);
    } catch {
      return BigInt(0);
    }
  }
  return BigInt(0);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function extractAmount(value: unknown): string | number | bigint | undefined {
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    return value;
  }

  const record = asRecord(value);
  if (!record) return undefined;

  if ("totalBalance" in record) {
    return record.totalBalance as string | number | bigint | undefined;
  }

  if ("balance" in record) {
    const nested = record.balance;
    if (typeof nested === "string" || typeof nested === "number" || typeof nested === "bigint") {
      return nested;
    }
    const nestedRecord = asRecord(nested);
    if (nestedRecord) {
      if ("totalBalance" in nestedRecord) {
        return nestedRecord.totalBalance as string | number | bigint | undefined;
      }
      if ("balance" in nestedRecord) {
        return nestedRecord.balance as string | number | bigint | undefined;
      }
      if ("coinBalance" in nestedRecord) {
        return nestedRecord.coinBalance as string | number | bigint | undefined;
      }
      if ("addressBalance" in nestedRecord) {
        return nestedRecord.addressBalance as string | number | bigint | undefined;
      }
    }
  }

  if ("coinBalance" in record) {
    return record.coinBalance as string | number | bigint | undefined;
  }
  if ("addressBalance" in record) {
    return record.addressBalance as string | number | bigint | undefined;
  }
  return undefined;
}

function extractCoinType(value: unknown) {
  const record = asRecord(value);
  if (!record) return "";

  if (typeof record.coinType === "string") return record.coinType;
  if (typeof record.coin_type === "string") return record.coin_type;

  const nested = asRecord(record.balance);
  if (nested && typeof nested.coinType === "string") return nested.coinType;
  return "";
}

function extractMetadataSymbol(value: unknown) {
  const record = asRecord(value);
  if (!record) return null;

  if (typeof record.symbol === "string" && record.symbol.trim()) {
    return record.symbol;
  }

  const nested = asRecord(record.coinMetadata);
  if (nested && typeof nested.symbol === "string" && nested.symbol.trim()) {
    return nested.symbol;
  }

  return null;
}

function bindClientMethod<TArgs extends unknown[], TResult>(
  client: WalletBalanceClient,
  name: string,
): ((...args: TArgs) => TResult) | null {
  const direct = (client as Record<string, unknown>)[name];
  if (typeof direct === "function") {
    const method = direct as (...args: TArgs) => TResult;
    return (...args: TArgs) => method.apply(client, args);
  }

  const core = asRecord(client.core);
  const fromCore = core?.[name];
  if (typeof fromCore === "function") {
    const method = fromCore as (...args: TArgs) => TResult;
    return (...args: TArgs) => method.apply(core, args);
  }

  return null;
}

function getClientNetwork(client: WalletBalanceClient) {
  if (typeof client.network === "string" && client.network.trim()) return client.network;

  const core = asRecord(client.core);
  if (core && typeof core.network === "string" && core.network.trim()) {
    return core.network;
  }

  return String(client.network ?? core?.network ?? "unknown");
}

async function fetchAllBalances(client: WalletBalanceClient, owner: string) {
  const getAllBalances = bindClientMethod<[input: { owner: string }], Promise<unknown>>(client, "getAllBalances");
  if (getAllBalances) {
    const result = await getAllBalances({ owner });
    const entries = Array.isArray(result) ? result : [];
    return entries
      .map((entry) => ({
        coinType: extractCoinType(entry),
        totalBalance: toBigInt(extractAmount(entry)),
      }))
      .filter((entry) => Boolean(entry.coinType));
  }

  const listBalances = bindClientMethod<
    [input: { owner: string; cursor?: string | null; limit?: number }],
    Promise<unknown>
  >(client, "listBalances");
  if (!listBalances) {
    throw new Error("Wallet client does not support listBalances/getAllBalances.");
  }

  const balances: Array<{ coinType: string; totalBalance: bigint }> = [];
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = asRecord(await listBalances({ owner, cursor, limit: 100 }));
    const pageBalances = Array.isArray(response?.balances) ? response.balances : [];

    for (const entry of pageBalances) {
      const coinType = extractCoinType(entry);
      if (!coinType) continue;
      balances.push({
        coinType,
        totalBalance: toBigInt(extractAmount(entry)),
      });
    }

    hasNextPage = Boolean(response?.hasNextPage);
    cursor = typeof response?.cursor === "string" ? response.cursor : null;
    if (!hasNextPage) break;
    if (!cursor) break;
  }

  return balances;
}

export async function getWalletBalanceSnapshot(
  client: WalletBalanceClient,
  owner: string,
) {
  const key = cacheKey(owner, getClientNetwork(client));
  const cached = balanceCache.get(key);
  if (cached) return cached;

  const getBalance = bindClientMethod<
    [input: { owner: string; coinType?: string }],
    Promise<unknown>
  >(
    client,
    "getBalance",
  );
  if (!getBalance) {
    throw new Error("Wallet client does not support getBalance.");
  }

  const [suiBalanceRaw, balances] = await Promise.all([getBalance({ owner }), fetchAllBalances(client, owner)]);
  const suiBalanceMist = toBigInt(extractAmount(suiBalanceRaw));
  const getCoinMetadata = bindClientMethod<[input: { coinType: string }], Promise<unknown>>(
    client,
    "getCoinMetadata",
  );

  const discoveredCoins = await Promise.all(
    balances.map(async (balance) => {
      try {
        const metadata = getCoinMetadata ? await getCoinMetadata({ coinType: balance.coinType }) : null;
        return {
          coinType: balance.coinType,
          totalBalance: toBigInt(balance.totalBalance),
          symbol: extractMetadataSymbol(metadata),
        };
      } catch {
        return {
          coinType: balance.coinType,
          totalBalance: toBigInt(balance.totalBalance),
          symbol: null,
        };
      }
    }),
  );

  const walCoinType = discoveredCoins.find((coin) => coin.symbol === "WAL")?.coinType ?? null;
  const walBalanceMist = walCoinType
    ? toBigInt(extractAmount(await getBalance({ owner, coinType: walCoinType })))
    : BigInt(0);

  const snapshot: WalletBalanceSnapshot = {
    suiBalanceMist,
    walBalanceMist,
    walCoinType,
    discoveredCoins,
  };

  balanceCache.set(key, snapshot);
  return snapshot;
}

export function clearWalletBalanceSnapshot(owner?: string) {
  if (!owner) {
    balanceCache.clear();
    return;
  }

  for (const key of balanceCache.keys()) {
    if (key.endsWith(`:${owner.toLowerCase()}`)) {
      balanceCache.delete(key);
    }
  }
}
