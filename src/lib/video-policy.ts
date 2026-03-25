import { fromHex, normalizeSuiAddress, toHex } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";

export const VIDEO_POLICY_MODULE = "policy";
export const VIDEO_POLICY_CREATE_ENTRY = "create_video_policy_entry";
export const VIDEO_POLICY_PUBLISH = "publish";
export const VIDEO_POLICY_UNPUBLISH = "unpublish";
export const VIDEO_POLICY_RENEW = "renew";
export const VIDEO_POLICY_SEAL_APPROVE = "seal_approve";
export const VIDEO_POLICY_SEAL_APPROVE_WITH_LICENSE = "seal_approve_with_license";
export const VIDEO_POLICY_SEAL_APPROVE_WITH_RENTAL = "seal_approve_with_rental";
export const VIDEO_POLICY_SEAL_APPROVE_WITH_KIOSK_LICENSE = "seal_approve_with_kiosk_license";
export const VIDEO_POLICY_SEAL_APPROVE_WITH_KIOSK_RENTAL = "seal_approve_with_kiosk_rental";
export const VIDEO_POLICY_BUY_LICENSE = "buy_license_entry";
export const VIDEO_POLICY_RENT_VIDEO = "rent_video_entry";
export const SUI_KIOSK_OWNER_CAP_TYPE = "0x2::kiosk::KioskOwnerCap";

export const VIDEO_VISIBILITY = {
  draft: 0,
  private: 1,
  public: 2,
} as const;

export type VideoVisibilityValue = keyof typeof VIDEO_VISIBILITY;

export function videoPolicyType(packageId: string) {
  return `${packageId}::${VIDEO_POLICY_MODULE}::VideoPolicy`;
}

export function videoPolicyCapType(packageId: string) {
  return `${packageId}::${VIDEO_POLICY_MODULE}::Cap`;
}

export function videoLicenseType(packageId: string) {
  return `${packageId}::${VIDEO_POLICY_MODULE}::MovieLicense`;
}

export function videoRentalPassType(packageId: string) {
  return `${packageId}::${VIDEO_POLICY_MODULE}::RentalPass`;
}

export function concatBytes(...chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

export function buildVideoIdentityBytes(ownerAddress: string, nonce: Uint8Array) {
  return concatBytes(fromHex(normalizeSuiAddress(ownerAddress)), nonce);
}

export function buildVideoIdentityHex(ownerAddress: string, nonce: Uint8Array) {
  return toHex(buildVideoIdentityBytes(ownerAddress, nonce));
}

export function generateVideoNonce(length = 16) {
  const nonce = new Uint8Array(length);
  crypto.getRandomValues(nonce);
  return nonce;
}

export function buildPolicyInitTransaction(input: {
  packageId: string;
  visibility: VideoVisibilityValue;
  published: boolean;
  nonce: Uint8Array;
  title: string;
  slug: string;
  ttlDays?: number;
  purchasePriceMist?: bigint | number;
  rentalPriceMist?: bigint | number;
  rentalDurationDays?: number;
}) {
  const tx = new Transaction();
  appendPolicyInitCall(tx, input);
  tx.setGasBudgetIfNotSet(100_000_000);
  return tx;
}

export function appendPolicyInitCall(
  tx: Transaction,
  input: {
    packageId: string;
    visibility: VideoVisibilityValue;
    published: boolean;
    nonce: Uint8Array;
    title: string;
    slug: string;
    ttlDays?: number;
    purchasePriceMist?: bigint | number;
    rentalPriceMist?: bigint | number;
    rentalDurationDays?: number;
  },
) {
  tx.moveCall({
    target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_CREATE_ENTRY}`,
    arguments: [
      tx.pure.u8(VIDEO_VISIBILITY[input.visibility]),
      tx.pure.bool(input.published),
      tx.pure.vector("u8", input.nonce),
      tx.pure.u64(BigInt(input.ttlDays ?? 30)),
      tx.pure.u64(BigInt(input.purchasePriceMist ?? 0)),
      tx.pure.u64(BigInt(input.rentalPriceMist ?? 0)),
      tx.pure.u64(BigInt(input.rentalDurationDays ?? 0)),
      tx.pure.vector("u8", new TextEncoder().encode(input.title)),
      tx.pure.vector("u8", new TextEncoder().encode(input.slug)),
      tx.object("0x6"),
    ],
  });
}

export type VideoSealApprovalProof =
  | { kind: "owner_or_public" }
  | { kind: "owned_license"; entitlementObjectId: string }
  | { kind: "owned_rental"; entitlementObjectId: string }
  | {
      kind: "kiosk_license";
      kioskObjectId: string;
      kioskCapObjectId: string;
      entitlementObjectId: string;
    }
  | {
      kind: "kiosk_rental";
      kioskObjectId: string;
      kioskCapObjectId: string;
      entitlementObjectId: string;
    };

export function buildSealApprovalTransaction(input: {
  packageId: string;
  policyObjectId: string;
  ownerAddress: string;
  nonce: Uint8Array;
  proof?: VideoSealApprovalProof;
}) {
  const tx = new Transaction();
  const proof = input.proof ?? { kind: "owner_or_public" };
  const identityBytes = tx.pure.vector("u8", buildVideoIdentityBytes(input.ownerAddress, input.nonce));
  const policy = tx.object(input.policyObjectId);
  const clock = tx.object("0x6");

  if (proof.kind === "owned_license") {
    tx.moveCall({
      target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_SEAL_APPROVE_WITH_LICENSE}`,
      arguments: [identityBytes, policy, tx.object(proof.entitlementObjectId), clock],
    });
    return tx;
  }

  if (proof.kind === "owned_rental") {
    tx.moveCall({
      target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_SEAL_APPROVE_WITH_RENTAL}`,
      arguments: [identityBytes, policy, tx.object(proof.entitlementObjectId), clock],
    });
    return tx;
  }

  if (proof.kind === "kiosk_license") {
    tx.moveCall({
      target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_SEAL_APPROVE_WITH_KIOSK_LICENSE}`,
      arguments: [
        identityBytes,
        policy,
        tx.object(proof.kioskObjectId),
        tx.object(proof.kioskCapObjectId),
        tx.pure.id(proof.entitlementObjectId),
        clock,
      ],
    });
    return tx;
  }

  if (proof.kind === "kiosk_rental") {
    tx.moveCall({
      target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_SEAL_APPROVE_WITH_KIOSK_RENTAL}`,
      arguments: [
        identityBytes,
        policy,
        tx.object(proof.kioskObjectId),
        tx.object(proof.kioskCapObjectId),
        tx.pure.id(proof.entitlementObjectId),
        clock,
      ],
    });
    return tx;
  }

  tx.moveCall({
    target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_SEAL_APPROVE}`,
    arguments: [identityBytes, policy, clock],
  });
  return tx;
}

export function buildPublishTransaction(input: {
  packageId: string;
  policyObjectId: string;
  capObjectId: string;
}) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_PUBLISH}`,
    arguments: [
      tx.object(input.policyObjectId),
      tx.object(input.capObjectId),
      tx.object("0x6"),
    ],
  });
  tx.setGasBudgetIfNotSet(50_000_000);
  return tx;
}

export function buildUnpublishTransaction(input: {
  packageId: string;
  policyObjectId: string;
  capObjectId: string;
}) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_UNPUBLISH}`,
    arguments: [tx.object(input.policyObjectId), tx.object(input.capObjectId)],
  });
  tx.setGasBudgetIfNotSet(50_000_000);
  return tx;
}

export function buildRenewTransaction(input: {
  packageId: string;
  policyObjectId: string;
  capObjectId: string;
  days: number;
}) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_RENEW}`,
    arguments: [
      tx.object(input.policyObjectId),
      tx.object(input.capObjectId),
      tx.pure.u64(BigInt(input.days)),
      tx.object("0x6"),
    ],
  });
  tx.setGasBudgetIfNotSet(50_000_000);
  return tx;
}

export function buildBuyLicenseTransaction(input: {
  packageId: string;
  policyObjectId: string;
  amountMist: bigint;
}) {
  const tx = new Transaction();
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(input.amountMist)]);
  tx.moveCall({
    target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_BUY_LICENSE}`,
    arguments: [tx.object(input.policyObjectId), paymentCoin, tx.object("0x6")],
  });
  tx.setGasBudgetIfNotSet(80_000_000);
  return tx;
}

export function buildRentVideoTransaction(input: {
  packageId: string;
  policyObjectId: string;
  amountMist: bigint;
}) {
  const tx = new Transaction();
  const [paymentCoin] = tx.splitCoins(tx.gas, [tx.pure.u64(input.amountMist)]);
  tx.moveCall({
    target: `${input.packageId}::${VIDEO_POLICY_MODULE}::${VIDEO_POLICY_RENT_VIDEO}`,
    arguments: [tx.object(input.policyObjectId), paymentCoin, tx.object("0x6")],
  });
  tx.setGasBudgetIfNotSet(80_000_000);
  return tx;
}
