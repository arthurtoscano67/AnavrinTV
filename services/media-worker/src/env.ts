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
  ENABLE_LIVE_SEAL: booleanFromEnv.default(true),
  SUI_RPC_URL: z.string().url(),
  SUI_CHAIN: z.enum(['mainnet', 'testnet']).default('mainnet'),
  SEAL_PACKAGE_ID: z.string().min(1),
  SEAL_SERVER_OBJECT_IDS: z
    .string()
    .min(1)
    .transform((value) =>
      value
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0),
    ),
  SEAL_THRESHOLD: z.coerce.number().int().min(1).default(2),
  UPLOAD_TMP_ROOT: z.string().min(1).default('/var/onreel/upload-tmp'),
  MEDIA_STORAGE_ROOT: z.string().min(1).default('/var/onreel/media'),
});

export const env = envSchema.parse(process.env);
