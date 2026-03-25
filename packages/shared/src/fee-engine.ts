import {
  ConfigRule,
  FeeOperation,
  FeePatch,
  FeeProfile,
  FeeRequest,
  ResolutionContext,
  ResolvedConfig,
  ResolutionTraceItem,
  RuleScope,
  SponsorshipBudget,
  SponsorshipResult,
} from './types.js';

const SCOPE_ORDER: Record<RuleScope, number> = {
  GLOBAL: 0,
  CREATOR_TIER: 1,
  CAMPAIGN: 2,
  INDIVIDUAL: 3,
  MANUAL: 4,
  EMERGENCY: 5,
};

const BPS_DENOMINATOR = 10_000n;
const BYTES_PER_GB = 1_000_000_000n;

function matchesSelector(rule: ConfigRule, context: ResolutionContext): boolean {
  const r = rule.selector;
  const c = context.selector;

  if (r.userId && r.userId !== c.userId) return false;
  if (r.creatorId && r.creatorId !== c.creatorId) return false;
  if (r.creatorTier && r.creatorTier !== c.creatorTier) return false;
  if (r.campaignId && r.campaignId !== c.campaignId) return false;
  if (r.walletAddress && r.walletAddress !== c.walletAddress) return false;
  if (r.channelId && r.channelId !== c.channelId) return false;
  if (r.region && r.region !== c.region) return false;
  return true;
}

function isActive(rule: ConfigRule, at: Date): boolean {
  if (!rule.enabled) return false;
  if (rule.startAt && at < rule.startAt) return false;
  if (rule.endAt && at >= rule.endAt) return false;
  return true;
}

function sortedRules(rules: ConfigRule[]): ConfigRule[] {
  return [...rules].sort((a, b) => {
    const scopeDelta = SCOPE_ORDER[a.scope] - SCOPE_ORDER[b.scope];
    if (scopeDelta !== 0) return scopeDelta;

    const priorityDelta = a.priority - b.priority;
    if (priorityDelta !== 0) return priorityDelta;

    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

function applyPatch(base: FeeProfile, patch: FeePatch): { next: FeeProfile; appliedKeys: string[] } {
  const keys = Object.keys(patch) as (keyof FeePatch)[];
  if (keys.length === 0) {
    return { next: base, appliedKeys: [] };
  }

  const next: FeeProfile = { ...base };
  const appliedKeys: string[] = [];

  for (const key of keys) {
    const value = patch[key];
    if (value !== undefined) {
      (next as Record<string, unknown>)[key] = value;
      appliedKeys.push(String(key));
    }
  }

  return { next, appliedKeys };
}

export function resolveEffectiveConfig(
  baseProfile: FeeProfile,
  rules: ConfigRule[],
  context: ResolutionContext,
): ResolvedConfig {
  let current = { ...baseProfile };
  const trace: ResolutionTraceItem[] = [];

  for (const rule of sortedRules(rules)) {
    if (!isActive(rule, context.at)) continue;
    if (!matchesSelector(rule, context)) continue;

    const { next, appliedKeys } = applyPatch(current, rule.patch);
    if (appliedKeys.length === 0) continue;

    current = next;
    trace.push({
      ruleId: rule.id,
      scope: rule.scope,
      priority: rule.priority,
      appliedKeys,
    });
  }

  return { effective: current, trace };
}

function bps(amount: bigint, bpsValue: number): bigint {
  return (amount * BigInt(bpsValue)) / BPS_DENOMINATOR;
}

export function calculateFee(operation: FeeOperation, request: FeeRequest, profile: FeeProfile): bigint {
  const sizeFee = (request.sizeBytes * profile.uploadPerGbMist) / BYTES_PER_GB;
  const durationMinutes = BigInt(Math.ceil(request.durationSeconds / 60));
  const durationFee = durationMinutes * profile.uploadPerMinuteMist;

  if (operation === 'UPLOAD') {
    return profile.uploadFlatMist + sizeFee + durationFee + bps(request.basePriceMist, profile.uploadPercentBps);
  }

  if (operation === 'RENEWAL') {
    const epochs = BigInt(Math.max(1, request.epochs));
    const renewalBySize = (request.sizeBytes * profile.renewalPerGbPerEpochMist * epochs) / BYTES_PER_GB;
    const renewalByEpoch = profile.renewalPerEpochMist * epochs;
    return profile.renewalFlatMist + renewalBySize + renewalByEpoch;
  }

  if (operation === 'RENTAL') {
    return request.basePriceMist + profile.rentalPlatformFlatMist + bps(request.basePriceMist, profile.rentalPlatformBps);
  }

  if (operation === 'PURCHASE') {
    return request.basePriceMist + profile.purchasePlatformFlatMist + bps(request.basePriceMist, profile.purchasePlatformBps);
  }

  return request.basePriceMist + profile.tipPlatformFlatMist + bps(request.basePriceMist, profile.tipPlatformBps);
}

export function applySponsorship(grossMist: bigint, budget: SponsorshipBudget | null): SponsorshipResult {
  if (!budget || grossMist <= 0n || budget.coverageBps <= 0 || budget.budgetRemainingMist <= 0n) {
    return {
      sponsorCoveredMist: 0n,
      userPaysMist: grossMist,
    };
  }

  const coverage = bps(grossMist, budget.coverageBps);
  const capped = budget.capMist !== undefined ? (coverage > budget.capMist ? budget.capMist : coverage) : coverage;
  const sponsorCoveredMist = capped > budget.budgetRemainingMist ? budget.budgetRemainingMist : capped;

  return {
    sponsorCoveredMist,
    userPaysMist: grossMist - sponsorCoveredMist,
  };
}
