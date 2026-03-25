import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultFeeProfile } from '../src/defaults.js';
import { applySponsorship, calculateFee, resolveEffectiveConfig } from '../src/fee-engine.js';
import { ConfigRule } from '../src/types.js';

test('resolution precedence is deterministic', () => {
  const rules: ConfigRule[] = [
    {
      id: 'global-1',
      scope: 'GLOBAL',
      priority: 10,
      enabled: true,
      selector: {},
      patch: { uploadFlatMist: 1_000_000n },
      createdAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'tier-1',
      scope: 'CREATOR_TIER',
      priority: 1,
      enabled: true,
      selector: { creatorTier: 'verified' },
      patch: { uploadFlatMist: 500_000n },
      createdAt: new Date('2026-01-01T00:00:01Z'),
    },
    {
      id: 'user-1',
      scope: 'INDIVIDUAL',
      priority: 1,
      enabled: true,
      selector: { userId: 'u1' },
      patch: { uploadFlatMist: 0n },
      createdAt: new Date('2026-01-01T00:00:02Z'),
    },
  ];

  const resolved = resolveEffectiveConfig(defaultFeeProfile, rules, {
    at: new Date('2026-03-25T00:00:00Z'),
    operation: 'UPLOAD',
    selector: { userId: 'u1', creatorTier: 'verified' },
  });

  assert.equal(resolved.effective.uploadFlatMist, 0n);
  assert.deepEqual(
    resolved.trace.map((t) => t.ruleId),
    ['global-1', 'tier-1', 'user-1'],
  );
});

test('upload fee formula uses size and duration', () => {
  const profile = {
    ...defaultFeeProfile,
    uploadFlatMist: 100n,
    uploadPerGbMist: 1_000n,
    uploadPerMinuteMist: 50n,
    uploadPercentBps: 100,
  };

  const fee = calculateFee(
    'UPLOAD',
    {
      sizeBytes: 2_000_000_000n,
      durationSeconds: 120,
      basePriceMist: 10_000n,
      epochs: 1,
    },
    profile,
  );

  assert.equal(fee, 2_300n);
});

test('sponsorship respects coverage and budget cap', () => {
  const result = applySponsorship(10_000n, {
    budgetRemainingMist: 2_000n,
    coverageBps: 5_000,
    capMist: 10_000n,
  });

  assert.equal(result.sponsorCoveredMist, 2_000n);
  assert.equal(result.userPaysMist, 8_000n);
});
