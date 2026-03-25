import { z } from 'zod';

export const ruleScopeSchema = z.enum([
  'GLOBAL',
  'CREATOR_TIER',
  'CAMPAIGN',
  'INDIVIDUAL',
  'MANUAL',
  'EMERGENCY',
]);

export type RuleScope = z.infer<typeof ruleScopeSchema>;

export const feeOperationSchema = z.enum([
  'UPLOAD',
  'RENEWAL',
  'RENTAL',
  'PURCHASE',
  'TIP',
]);

export type FeeOperation = z.infer<typeof feeOperationSchema>;

export const sponsorshipModeSchema = z.enum(['NONE', 'GAS_ONLY', 'WALRUS_ONLY', 'BOTH']);
export type SponsorshipMode = z.infer<typeof sponsorshipModeSchema>;

export const selectorSchema = z.object({
  userId: z.string().optional(),
  creatorId: z.string().optional(),
  creatorTier: z.string().optional(),
  campaignId: z.string().optional(),
  walletAddress: z.string().optional(),
  channelId: z.string().optional(),
  region: z.string().optional(),
});

export type RuleSelector = z.infer<typeof selectorSchema>;

export const feeProfileSchema = z.object({
  uploadFlatMist: z.bigint(),
  uploadPercentBps: z.number().int().nonnegative(),
  uploadPerGbMist: z.bigint(),
  uploadPerMinuteMist: z.bigint(),
  renewalFlatMist: z.bigint(),
  renewalPerGbPerEpochMist: z.bigint(),
  renewalPerEpochMist: z.bigint(),
  rentalPlatformFlatMist: z.bigint(),
  rentalPlatformBps: z.number().int().nonnegative(),
  purchasePlatformFlatMist: z.bigint(),
  purchasePlatformBps: z.number().int().nonnegative(),
  tipPlatformFlatMist: z.bigint(),
  tipPlatformBps: z.number().int().nonnegative(),
  adCreatorPayoutBps: z.number().int().nonnegative(),
  payoutMinMist: z.bigint(),
  payoutHoldDays: z.number().int().nonnegative(),
  sponsorshipMode: sponsorshipModeSchema,
  sponsorCoverageBps: z.number().int().nonnegative(),
  maxUploadBytes: z.bigint(),
  maxVideoSeconds: z.number().int().positive(),
  adEligible: z.boolean(),
  monetizationEligible: z.boolean(),
  uploadAllowedMime: z.array(z.string()),
  royaltyBps: z.number().int().nonnegative(),
});

export type FeeProfile = z.infer<typeof feeProfileSchema>;

export const feePatchSchema = feeProfileSchema.partial();
export type FeePatch = z.infer<typeof feePatchSchema>;

export interface ConfigRule {
  id: string;
  scope: RuleScope;
  priority: number;
  enabled: boolean;
  selector: RuleSelector;
  patch: FeePatch;
  startAt?: Date;
  endAt?: Date;
  reason?: string;
  note?: string;
  createdAt: Date;
}

export interface ResolutionContext {
  at: Date;
  operation: FeeOperation;
  selector: RuleSelector;
}

export interface ResolutionTraceItem {
  ruleId: string;
  scope: RuleScope;
  priority: number;
  appliedKeys: string[];
}

export interface ResolvedConfig {
  effective: FeeProfile;
  trace: ResolutionTraceItem[];
}

export interface FeeRequest {
  sizeBytes: bigint;
  durationSeconds: number;
  basePriceMist: bigint;
  epochs: number;
}

export interface SponsorshipBudget {
  budgetRemainingMist: bigint;
  coverageBps: number;
  capMist?: bigint;
}

export interface SponsorshipResult {
  sponsorCoveredMist: bigint;
  userPaysMist: bigint;
}
