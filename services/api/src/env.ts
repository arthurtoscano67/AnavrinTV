import { z } from 'zod';

const envSchema = z.object({
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  UPLOAD_TMP_ROOT: z.string().min(1).default('/var/onreel/upload-tmp'),
  CORS_ALLOW_ORIGINS: z
    .string()
    .default('*')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
});

export const env = envSchema.parse(process.env);
