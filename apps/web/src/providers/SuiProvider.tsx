import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mysten/dapp-kit/dist/index.css';
import { ReactNode } from 'react';

const { networkConfig } = createNetworkConfig({
  mainnet: { url: 'https://fullnode.mainnet.sui.io:443' } as any,
  testnet: { url: 'https://fullnode.testnet.sui.io:443' } as any,
});

const queryClient = new QueryClient();

export function SuiProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}
