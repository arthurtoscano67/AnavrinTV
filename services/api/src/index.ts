import crypto from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import express from 'express';
import pino from 'pino';
import { z } from 'zod';
import cors from 'cors';
import {
  applySponsorship,
  calculateFee,
  defaultFeeProfile,
  feeOperationSchema,
  resolveEffectiveConfig,
  ruleScopeSchema,
  selectorSchema,
} from '@onreel/shared';

import { runMigrations } from './migrate.js';
import { db } from './db.js';
import { env } from './env.js';
import { enqueueJob } from './jobs.js';
import { disableRule, insertRule, listActiveRules } from './rules.js';
import { sanitizeProfile, serializeForJson } from './serialization.js';

const logger = pino({ name: 'onreel-api' });
const app = express();

const allowAllCors = env.CORS_ALLOW_ORIGINS.includes('*');
app.use(
  cors({
    origin: allowAllCors ? true : env.CORS_ALLOW_ORIGINS,
  }),
);
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(
      {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
      },
      'request',
    );
  });
  next();
});

const patchSchema = z.record(z.union([z.string(), z.number(), z.boolean()]));

const ruleInputSchema = z.object({
  scope: ruleScopeSchema,
  priority: z.number().int().default(100),
  selector: selectorSchema.default({}),
  patch: patchSchema,
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  reason: z.string().max(500).optional(),
  note: z.string().max(1000).optional(),
  createdBy: z.string().default('admin'),
});

const simulateSchema = z.object({
  operation: feeOperationSchema,
  selector: selectorSchema.default({}),
  request: z.object({
    sizeBytes: z.string(),
    durationSeconds: z.number().int().nonnegative(),
    basePriceMist: z.string(),
    epochs: z.number().int().positive().default(1),
  }),
  sponsorship: z
    .object({
      budgetRemainingMist: z.string(),
      coverageBps: z.number().int().nonnegative(),
      capMist: z.string().optional(),
    })
    .optional(),
});

const uploadIntentSchema = z.object({
  userId: z.string().min(1),
  walletAddress: z.string().min(1),
  channelId: z.string().optional(),
  title: z.string().max(200).optional(),
  description: z.string().max(4000).optional(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.string(),
  checksumSha256: z.string().optional(),
  uploaderSignature: z.string().optional(),
  selector: selectorSchema.default({}),
});

app.get('/health', async (_req, res) => {
  await db.query('SELECT 1');
  res.send({ ok: true, service: 'api' });
});

function resolveUploadTargetPath(tmpObjectKey: string): string {
  const root = path.resolve(env.UPLOAD_TMP_ROOT);
  const target = path.resolve(root, tmpObjectKey);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
    throw new Error('invalid tmp object key path');
  }
  return target;
}

async function enqueueJobIfMissing(jobType: string, uploadIntentId: string): Promise<void> {
  const { rows } = await db.query<{ id: string }>(
    `
    SELECT id
    FROM workflow_jobs
    WHERE job_type = $1
      AND status IN ('QUEUED','RUNNING')
      AND payload->>'uploadIntentId' = $2
    LIMIT 1
    `,
    [jobType, uploadIntentId],
  );

  if (!rows[0]) {
    await enqueueJob(db, jobType as Parameters<typeof enqueueJob>[1], { uploadIntentId });
  }
}

app.post('/admin/rules', async (req, res) => {
  const input = ruleInputSchema.parse(req.body);
  const inserted = await insertRule(db, {
    scope: input.scope,
    priority: input.priority,
    selector: input.selector,
    patch: input.patch,
    startAt: input.startAt ? new Date(input.startAt) : undefined,
    endAt: input.endAt ? new Date(input.endAt) : undefined,
    reason: input.reason,
    note: input.note,
    createdBy: input.createdBy,
  });

  await db.query(
    `
    INSERT INTO audit_log (actor_id, action_type, target_type, target_id, reason, after_state)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [input.createdBy, 'RULE_CREATED', 'policy_rules', inserted.id, input.reason ?? null, req.body],
  );

  res.status(201).send({ rule: serializeForJson(inserted) });
});

app.post('/admin/overrides', async (req, res) => {
  const input = ruleInputSchema.parse(req.body);
  if (input.scope === 'GLOBAL') {
    return res.status(400).send({ error: 'override scope must not be GLOBAL' });
  }

  const inserted = await insertRule(db, {
    scope: input.scope,
    priority: input.priority,
    selector: input.selector,
    patch: input.patch,
    startAt: input.startAt ? new Date(input.startAt) : undefined,
    endAt: input.endAt ? new Date(input.endAt) : undefined,
    reason: input.reason,
    note: input.note,
    createdBy: input.createdBy,
  });

  await db.query(
    `
    INSERT INTO audit_log (actor_id, action_type, target_type, target_id, reason, after_state)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [input.createdBy, 'OVERRIDE_CREATED', 'policy_rules', inserted.id, input.reason ?? null, req.body],
  );

  res.status(201).send({ override: serializeForJson(inserted) });
});

app.post('/admin/rules/:ruleId/disable', async (req, res) => {
  const ruleId = z.string().uuid().parse(req.params.ruleId);
  await disableRule(db, ruleId);

  await db.query(
    `
    INSERT INTO audit_log (actor_id, action_type, target_type, target_id, reason)
    VALUES ($1, $2, $3, $4, $5)
    `,
    ['admin', 'RULE_DISABLED', 'policy_rules', ruleId, 'manual disable'],
  );

  res.status(204).send();
});

app.get('/admin/rules/effective', async (req, res) => {
  const selector = selectorSchema.parse(req.query);
  const rules = await listActiveRules(db, new Date());
  const resolved = resolveEffectiveConfig(defaultFeeProfile, rules, {
    at: new Date(),
    operation: 'UPLOAD',
    selector,
  });

  res.send({
    effective: sanitizeProfile(resolved.effective),
    trace: resolved.trace,
  });
});

app.post('/fee/simulate', async (req, res) => {
  const input = simulateSchema.parse(req.body);
  const now = new Date();
  const rules = await listActiveRules(db, now);

  const resolved = resolveEffectiveConfig(defaultFeeProfile, rules, {
    at: now,
    operation: input.operation,
    selector: input.selector,
  });

  const grossFee = calculateFee(
    input.operation,
    {
      sizeBytes: BigInt(input.request.sizeBytes),
      durationSeconds: input.request.durationSeconds,
      basePriceMist: BigInt(input.request.basePriceMist),
      epochs: input.request.epochs,
    },
    resolved.effective,
  );

  const sponsored = applySponsorship(
    grossFee,
    input.sponsorship
      ? {
          budgetRemainingMist: BigInt(input.sponsorship.budgetRemainingMist),
          coverageBps: input.sponsorship.coverageBps,
          capMist: input.sponsorship.capMist ? BigInt(input.sponsorship.capMist) : undefined,
        }
      : null,
  );

  res.send({
    effective: sanitizeProfile(resolved.effective),
    trace: resolved.trace,
    operation: input.operation,
    grossFeeMist: grossFee.toString(),
    sponsorCoveredMist: sponsored.sponsorCoveredMist.toString(),
    userPaysMist: sponsored.userPaysMist.toString(),
  });
});

app.post('/admin/sponsor-budgets', async (req, res) => {
  const input = z
    .object({
      targetType: z.string().min(1),
      targetValue: z.string().min(1),
      campaignId: z.string().optional(),
      category: z.string().min(1),
      totalMist: z.string(),
      startAt: z.string().datetime().optional(),
      endAt: z.string().datetime().optional(),
      reason: z.string().optional(),
      createdBy: z.string().default('admin'),
    })
    .parse(req.body);

  const { rows } = await db.query(
    `
    INSERT INTO sponsor_budgets (
      target_type,
      target_value,
      campaign_id,
      category,
      total_mist,
      start_at,
      end_at,
      reason,
      created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      input.targetType,
      input.targetValue,
      input.campaignId ?? null,
      input.category,
      input.totalMist,
      input.startAt ? new Date(input.startAt) : null,
      input.endAt ? new Date(input.endAt) : null,
      input.reason ?? null,
      input.createdBy,
    ],
  );

  res.status(201).send({ budget: rows[0] });
});

app.post('/uploads/intents', async (req, res) => {
  const input = uploadIntentSchema.parse(req.body);
  const now = new Date();

  const rules = await listActiveRules(db, now);
  const resolved = resolveEffectiveConfig(defaultFeeProfile, rules, {
    at: now,
    operation: 'UPLOAD',
    selector: {
      ...input.selector,
      userId: input.userId,
      walletAddress: input.walletAddress,
      channelId: input.channelId,
    },
  });

  const sizeBytes = BigInt(input.sizeBytes);
  if (sizeBytes > resolved.effective.maxUploadBytes) {
    return res.status(400).send({
      error: 'max upload size exceeded',
      maxUploadBytes: resolved.effective.maxUploadBytes.toString(),
    });
  }

  if (!resolved.effective.uploadAllowedMime.includes(input.mimeType)) {
    return res.status(400).send({
      error: 'mime type not allowed',
      allowedMime: resolved.effective.uploadAllowedMime,
    });
  }

  const tmpObjectKey = `uploads/${input.userId}/${crypto.randomUUID()}/${input.fileName}`;
  const resumableUrl = `/upload/resumable/${tmpObjectKey}`;

  const { rows } = await db.query(
    `
    INSERT INTO upload_intents (
      user_id,
      wallet_address,
      channel_id,
      title,
      description,
      file_name,
      mime_type,
      size_bytes,
      checksum_sha256,
      uploader_signature,
      tmp_object_key,
      resumable_url,
      status
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'RECEIVED')
    RETURNING id
    `,
    [
      input.userId,
      input.walletAddress,
      input.channelId ?? null,
      input.title ?? null,
      input.description ?? '',
      input.fileName,
      input.mimeType,
      input.sizeBytes,
      input.checksumSha256 ?? null,
      input.uploaderSignature ?? null,
      tmpObjectKey,
      resumableUrl,
    ],
  );

  const uploadIntentId = String(rows[0].id);
  res.status(201).send({
    uploadIntentId,
    workflowJobId: null,
    resumableUrl,
    tmpObjectKey,
  });
});

app.put('/uploads/intents/:uploadIntentId/file', async (req, res) => {
  const uploadIntentId = z.string().uuid().parse(req.params.uploadIntentId);

  const { rows } = await db.query<{
    id: string;
    tmp_object_key: string;
    size_bytes: string;
    checksum_sha256: string | null;
  }>(
    `
    SELECT id, tmp_object_key, size_bytes, checksum_sha256
    FROM upload_intents
    WHERE id = $1
    LIMIT 1
    `,
    [uploadIntentId],
  );

  const uploadIntent = rows[0];
  if (!uploadIntent) {
    return res.status(404).send({ error: 'upload_intent_not_found' });
  }

  const targetPath = resolveUploadTargetPath(uploadIntent.tmp_object_key);
  const stagingPath = `${targetPath}.part`;
  await mkdir(path.dirname(targetPath), { recursive: true });

  const hasher = crypto.createHash('sha256');
  let bytesWritten = 0n;

  try {
    await pipeline(
      req,
      new Transform({
        transform(chunk, _encoding, callback) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          hasher.update(buffer);
          bytesWritten += BigInt(buffer.length);
          callback(null, buffer);
        },
      }),
      createWriteStream(stagingPath, { flags: 'w' }),
    );
  } catch (error) {
    await rm(stagingPath, { force: true }).catch(() => undefined);
    throw error;
  }

  const expectedBytes = BigInt(uploadIntent.size_bytes);
  if (bytesWritten !== expectedBytes) {
    await rm(stagingPath, { force: true }).catch(() => undefined);
    return res.status(400).send({
      error: 'upload_size_mismatch',
      expectedBytes: expectedBytes.toString(),
      receivedBytes: bytesWritten.toString(),
    });
  }

  const checksumSha256 = hasher.digest('hex');
  if (uploadIntent.checksum_sha256 && uploadIntent.checksum_sha256 !== checksumSha256) {
    await rm(stagingPath, { force: true }).catch(() => undefined);
    return res.status(400).send({
      error: 'checksum_mismatch',
      expectedChecksumSha256: uploadIntent.checksum_sha256,
      receivedChecksumSha256: checksumSha256,
    });
  }

  await rename(stagingPath, targetPath);
  await db.query(
    `
    UPDATE upload_intents
    SET checksum_sha256 = COALESCE(checksum_sha256, $2),
        status = CASE
          WHEN status = 'FAILED' THEN status
          ELSE 'RECEIVED'
        END,
        updated_at = now()
    WHERE id = $1
    `,
    [uploadIntentId, checksumSha256],
  );

  await enqueueJobIfMissing('UPLOAD_PIPELINE', uploadIntentId);

  res.status(201).send({
    uploadIntentId,
    bytesWritten: bytesWritten.toString(),
    checksumSha256,
    status: 'RECEIVED',
  });
});

app.get('/uploads/intents/:uploadIntentId', async (req, res) => {
  const uploadIntentId = z.string().uuid().parse(req.params.uploadIntentId);
  const { rows } = await db.query<{
    id: string;
    status: string;
    failure_reason: string | null;
    walrus_manifest_blob_id: string | null;
    walrus_manifest_object_id: string | null;
    onchain_video_object_id: string | null;
    onchain_mint_tx_digest: string | null;
    published_at: string | null;
    updated_at: string;
  }>(
    `
    SELECT
      id,
      status,
      failure_reason,
      walrus_manifest_blob_id,
      walrus_manifest_object_id,
      onchain_video_object_id,
      onchain_mint_tx_digest,
      published_at,
      updated_at
    FROM upload_intents
    WHERE id = $1
    LIMIT 1
    `,
    [uploadIntentId],
  );

  const uploadIntent = rows[0];
  if (!uploadIntent) {
    return res.status(404).send({ error: 'upload_intent_not_found' });
  }

  return res.send({
    uploadIntentId: uploadIntent.id,
    status: uploadIntent.status,
    failureReason: uploadIntent.failure_reason,
    walrusManifestBlobId: uploadIntent.walrus_manifest_blob_id,
    walrusManifestObjectId: uploadIntent.walrus_manifest_object_id,
    onchainVideoObjectId: uploadIntent.onchain_video_object_id,
    onchainMintTxDigest: uploadIntent.onchain_mint_tx_digest,
    publishedAt: uploadIntent.published_at,
    updatedAt: uploadIntent.updated_at,
  });
});

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error }, 'request failed');
  if (error instanceof z.ZodError) {
    return res.status(400).send({ error: 'validation_failed', details: error.issues });
  }

  const message = error instanceof Error ? error.message : 'internal_error';
  return res.status(500).send({ error: message });
});

runMigrations()
  .then(() => {
        logger.info('database migrations complete');
        app.listen(env.API_PORT, () => {
                logger.info({ port: env.API_PORT }, 'api listening');
        });
  })
  .catch((err) => {
        logger.error({ err }, 'migration failed');
        process.exit(1);
  });
