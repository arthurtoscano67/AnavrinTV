import type { AnavrinClient } from "@/lib/anavrin-client";
import {
  SUI_KIOSK_OWNER_CAP_TYPE,
  type VideoSealApprovalProof,
  videoLicenseType,
  videoRentalPassType,
} from "@/lib/video-policy";

type JsonObject = Record<string, unknown>;

export type ResolvedVideoEntitlement = {
  kind: "license" | "rental";
  ownership: "wallet" | "kiosk";
  entitlementObjectId: string;
  proof: VideoSealApprovalProof;
  expiresAtMs?: number;
};

function normalizeObjectId(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    return trimmed.startsWith("0x") ? trimmed : null;
  }

  if (!value || typeof value !== "object") return null;
  const record = value as JsonObject;
  return (
    normalizeObjectId(record.objectId) ??
    normalizeObjectId(record.id) ??
    normalizeObjectId(record.bytes) ??
    normalizeObjectId(record.value) ??
    null
  );
}

function findValueByKeys(input: unknown, keys: string[]): unknown {
  if (!input || typeof input !== "object") return null;

  if (Array.isArray(input)) {
    for (const item of input) {
      const nested = findValueByKeys(item, keys);
      if (nested != null) return nested;
    }
    return null;
  }

  const record = input as JsonObject;
  for (const [key, value] of Object.entries(record)) {
    if (keys.includes(key)) {
      return value;
    }
  }

  for (const value of Object.values(record)) {
    const nested = findValueByKeys(value, keys);
    if (nested != null) return nested;
  }

  return null;
}

function readObjectIdByKeys(input: unknown, keys: string[]) {
  return normalizeObjectId(findValueByKeys(input, keys));
}

function readNumberByKeys(input: unknown, keys: string[]) {
  const value = findValueByKeys(input, keys);
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function listAllOwnedObjects(
  client: AnavrinClient,
  owner: string,
  type: string,
) {
  const objects: Array<{
    objectId: string;
    type: string;
    json: JsonObject | null | undefined;
  }> = [];
  let cursor: string | null = null;

  for (;;) {
    const response = (await client.core.listOwnedObjects({
      owner,
      type,
      cursor,
      limit: 100,
      include: { json: true },
    })) as {
      objects: Array<{
        objectId: string;
        type: string;
        json: JsonObject | null | undefined;
      }>;
      hasNextPage: boolean;
      cursor: string | null;
    };
    objects.push(
      ...response.objects.map((object) => ({
        objectId: object.objectId,
        type: object.type,
        json: object.json,
      })),
    );
    if (!response.hasNextPage || !response.cursor) break;
    cursor = response.cursor;
  }

  return objects;
}

async function listAllDynamicFieldChildIds(client: AnavrinClient, parentId: string) {
  const childIds: string[] = [];
  let cursor: string | null = null;

  for (;;) {
    const response = (await client.core.listDynamicFields({
      parentId,
      cursor,
      limit: 100,
    })) as {
      dynamicFields: Array<
        | { $kind: "DynamicField"; childId?: never }
        | { $kind: "DynamicObject"; childId: string }
      >;
      hasNextPage: boolean;
      cursor: string | null;
    };
    for (const field of response.dynamicFields) {
      if (field.$kind === "DynamicObject") {
        childIds.push(field.childId);
      }
    }
    if (!response.hasNextPage || !response.cursor) break;
    cursor = response.cursor;
  }

  return childIds;
}

function matchesPolicyObject(json: unknown, policyObjectId: string) {
  const policyId = readObjectIdByKeys(json, ["policy_id", "policyId"]);
  return policyId === policyObjectId.toLowerCase();
}

function resolveRentalExpiry(json: unknown) {
  return readNumberByKeys(json, ["expires_at_ms", "expiresAtMs"]);
}

export async function findOwnedVideoEntitlement(input: {
  client: AnavrinClient;
  ownerAddress: string;
  packageId: string;
  policyObjectId: string;
}) {
  const ownerAddress = input.ownerAddress.trim().toLowerCase();
  const policyObjectId = input.policyObjectId.trim().toLowerCase();
  const licenseType = videoLicenseType(input.packageId);
  const rentalType = videoRentalPassType(input.packageId);

  const [ownedLicenses, ownedRentals, kioskCaps] = await Promise.all([
    listAllOwnedObjects(input.client, ownerAddress, licenseType),
    listAllOwnedObjects(input.client, ownerAddress, rentalType),
    listAllOwnedObjects(input.client, ownerAddress, SUI_KIOSK_OWNER_CAP_TYPE),
  ]);

  const directLicense = ownedLicenses.find((license) => matchesPolicyObject(license.json, policyObjectId));
  if (directLicense) {
    return {
      kind: "license",
      ownership: "wallet",
      entitlementObjectId: directLicense.objectId,
      proof: {
        kind: "owned_license",
        entitlementObjectId: directLicense.objectId,
      },
    } satisfies ResolvedVideoEntitlement;
  }

  const now = Date.now();
  const directRental = ownedRentals
    .map((pass) => ({
      pass,
      expiresAtMs: resolveRentalExpiry(pass.json) ?? 0,
    }))
    .filter(({ pass, expiresAtMs }) => matchesPolicyObject(pass.json, policyObjectId) && expiresAtMs > now)
    .sort((left, right) => right.expiresAtMs - left.expiresAtMs)[0];

  if (directRental) {
    return {
      kind: "rental",
      ownership: "wallet",
      entitlementObjectId: directRental.pass.objectId,
      expiresAtMs: directRental.expiresAtMs,
      proof: {
        kind: "owned_rental",
        entitlementObjectId: directRental.pass.objectId,
      },
    } satisfies ResolvedVideoEntitlement;
  }

  let bestKioskRental: ResolvedVideoEntitlement | null = null;

  for (const kioskCap of kioskCaps) {
    const kioskObjectId = readObjectIdByKeys(kioskCap.json, ["for", "for_", "kiosk", "kiosk_id", "kioskId"]);
    if (!kioskObjectId) continue;

    const childIds = await listAllDynamicFieldChildIds(input.client, kioskObjectId);
    if (!childIds.length) continue;

    const { objects } = await input.client.core.getObjects({
      objectIds: childIds,
      include: { json: true },
    });

    for (const child of objects) {
      if (child instanceof Error) continue;
      if (!matchesPolicyObject(child.json, policyObjectId)) continue;

      if (child.type === licenseType) {
        return {
          kind: "license",
          ownership: "kiosk",
          entitlementObjectId: child.objectId,
          proof: {
            kind: "kiosk_license",
            kioskObjectId,
            kioskCapObjectId: kioskCap.objectId,
            entitlementObjectId: child.objectId,
          },
        } satisfies ResolvedVideoEntitlement;
      }

      if (child.type !== rentalType) continue;
      const expiresAtMs = resolveRentalExpiry(child.json) ?? 0;
      if (expiresAtMs <= now) continue;

      const nextRental = {
        kind: "rental",
        ownership: "kiosk",
        entitlementObjectId: child.objectId,
        expiresAtMs,
        proof: {
          kind: "kiosk_rental",
          kioskObjectId,
          kioskCapObjectId: kioskCap.objectId,
          entitlementObjectId: child.objectId,
        },
      } satisfies ResolvedVideoEntitlement;

      if (!bestKioskRental || expiresAtMs > (bestKioskRental.expiresAtMs ?? 0)) {
        bestKioskRental = nextRental;
      }
    }
  }

  return bestKioskRental;
}
