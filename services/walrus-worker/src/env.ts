import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }
  return value;
}, z.boolean());

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  WORKFLOW_POLL_INTERVAL_MS: z.coerce.number().default(3000),
  ENABLE_LIVE_WALRUS: booleanFromEnv.default(true),
  SUI_RPC_URL: z.string().url(),
  SUI_CHAIN: z.enum(['mainnet', 'testnet']).default('mainnet'),
  WALRUS_NETWORK: z.enum(['mainnet', 'testnet']).default('mainnet'),
  WALRUS_SIGNER_PRIVATE_KEY: z.string().min(1),
  WALRUS_STORAGE_EPOCHS: z.coerce.number().int().positive().default(104),
  WALRUS_DELETABLE: booleanFromEnv.default(false),
  WALRUS_SYSTEM_OBJECT_ID: z.string().optional(),
  WALRUS_STAKING_POOL_ID: z.string().optional(),
  MEDIA_STORAGE_ROOT: z.string().min(1).default('/var/onreel/media'),
  UPLOAD_TMP_ROOT: z.string().min(1).default('/var/onreel/upload-tmp'),
});

export const env = envSchema.parse(process.env);
