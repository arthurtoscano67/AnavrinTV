export const WALRUS_AGGREGATORS = [
  'https://aggregator.walrus-testnet.walrus.space'
];

export const WALRUS_PUBLISHERS = [
  'https://publisher.walrus-testnet.walrus.space'
];

export const WAL_TOKEN_DECIMALS = 9;
export const WAL_STORAGE_COST_PER_BYTE_PER_EPOCH = 0.0000000035; // Realistic mainnet estimate

export const WALRUS_PACKAGE_ID = '0xfa65cb2d62f4d39e60346fb7d501c12538ca2bbc646eaa37ece2aec5f897814e';
export const WALRUS_STORAGE_OBJECT_ID = '0x6c2547cbbc38025cf3adac45f63cb0a8d12ecf777cdc75a4971612bf97fdf6af';
export const WAL_COIN_TYPE = '0xfa65cb2d62f4d39e60346fb7d501c12538ca2bbc646eaa37ece2aec5f897814e::wal::WAL';

export const EPOCH_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const STORAGE_DURATION_OPTIONS = [
  { label: '1 Week', epochs: 1, description: '1 epoch' },
  { label: '1 Month', epochs: 4, description: '~4 epochs' },
  { label: '3 Months', epochs: 13, description: '~13 epochs' },
  { label: '6 Months', epochs: 26, description: '~26 epochs' },
  { label: '1 Year', epochs: 52, description: '~52 epochs' },
  { label: '2 Years (Max)', epochs: 104, description: '~104 epochs' },
];

export const SEAL_SERVER_OBJECT_IDS = [
  '0x899d21a53139bd4555b05e78e474c85b73ede3990b02b58dcbd32c28ba1e2878', // Seal mainnet server 1
  '0x0e33485eb9af3c46e6f9b5d00c31bc65cde32f9ec0cd37bac3c77a72dc37c8dd', // Seal mainnet server 2
  '0x0000000000000000000000000000000000000000000000000000000000000000', // Placeholder for Testnet Seal (if available)
];
