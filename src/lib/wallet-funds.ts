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
  network: unknown;
  getAllBalances(input: { owner: string }): Promise<Array<{ coinType: string; totalBalance: string | number | bigint }>>;
  getBalance(input: { owner: string; coinType?: string }): Promise<{ totalBalance: string | number | bigint }>;
  getCoinMetadata(input: { coinType: string }): Promise<{ symbol?: string | null } | null>;
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

export async function getWalletBalanceSnapshot(
  client: WalletBalanceClient,
  owner: string,
) {
  const key = cacheKey(owner, String(client.network));
  const cached = balanceCache.get(key);
  if (cached) return cached;

  const [suiBalance, balances] = await Promise.all([
    client.getBalance({ owner }),
    client.getAllBalances({ owner }),
  ]);

  const discoveredCoins = await Promise.all(
    balances.map(async (balance) => {
      try {
        const metadata = await client.getCoinMetadata({ coinType: balance.coinType });
        return {
          coinType: balance.coinType,
          totalBalance: toBigInt(balance.totalBalance),
          symbol: metadata?.symbol ?? null,
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
    ? toBigInt((await client.getBalance({ owner, coinType: walCoinType })).totalBalance)
    : BigInt(0);

  const snapshot: WalletBalanceSnapshot = {
    suiBalanceMist: toBigInt(suiBalance.totalBalance),
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
