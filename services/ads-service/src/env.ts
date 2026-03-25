import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  WORKFLOW_POLL_INTERVAL_MS: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
