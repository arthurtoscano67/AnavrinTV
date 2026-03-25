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
  ENABLE_LIVE_CHAIN: booleanFromEnv.default(true),
  SUI_RPC_URL: z.string().url(),
  SUI_CHAIN: z.enum(['mainnet', 'testnet']).default('mainnet'),
  SUI_SPONSOR_PRIVATE_KEY: z.string().min(1),
  SUI_GAS_PAYMENT_COIN_LIMIT: z.coerce.number().int().positive().default(8),
  CHAIN_MINT_GAS_BUDGET: z.coerce.number().int().positive().default(50000000),
  CHAIN_REQUIRE_USER_SIGNATURE: booleanFromEnv.default(false),
  ONREEL_PACKAGE_ID: z.string().min(1),
  ONREEL_POLICY_OBJECT_ID: z.string().min(1).default('0x0'),
});

export const env = envSchema.parse(process.env);
