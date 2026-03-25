import { FeePatch, FeeProfile } from '@onreel/shared';

const BIGINT_KEYS = new Set([
  'uploadFlatMist',
  'uploadPerGbMist',
  'uploadPerMinuteMist',
  'renewalFlatMist',
  'renewalPerGbPerEpochMist',
  'renewalPerEpochMist',
  'rentalPlatformFlatMist',
  'purchasePlatformFlatMist',
  'tipPlatformFlatMist',
  'payoutMinMist',
  'maxUploadBytes',
]);

export function deserializePatch(input: Record<string, unknown>): FeePatch {
  const patch: Record<string, unknown> = {};
  for (const [key, rawValue] of Object.entries(input)) {
    if (rawValue === null || rawValue === undefined) {
      continue;
    }

    if (BIGINT_KEYS.has(key)) {
      patch[key] = BigInt(rawValue as string | number | bigint);
      continue;
    }

    patch[key] = rawValue;
  }

  return patch as FeePatch;
}

export function serializeForJson(value: unknown): unknown {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeForJson(item));
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = serializeForJson(nested);
    }
    return out;
  }

  return value;
}

export function serializePatchForDb(patch: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === 'bigint') {
      output[key] = value.toString();
    } else {
      output[key] = value;
    }
  }
  return output;
}

export function sanitizeProfile(profile: FeeProfile): Record<string, unknown> {
  return serializeForJson(profile) as Record<string, unknown>;
}
