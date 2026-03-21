import { walrus } from "@mysten/walrus";
import type { ProtocolMessageCertificate } from "@mysten/walrus";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import type { ClientWithCoreApi } from "@mysten/sui/client";

import {
  getNetwork,
  getRpcUrl,
  getWalrusUploadPrivateKey,
  resolveUploadRelayConfig,
} from "@/lib/anavrin-config";

type ServerWalrusClient = ClientWithCoreApi & {
  walrus: ReturnType<ReturnType<typeof walrus>["register"]>;
};

let serverClientPromise: Promise<ServerWalrusClient> | null = null;

export async function getServerWalrusClient(network = getNetwork()) {
  if (!serverClientPromise) {
    serverClientPromise = Promise.resolve(
      new SuiGrpcClient({
        network,
        baseUrl: getRpcUrl(network),
      }).$extend(
        walrus({
          uploadRelay: resolveUploadRelayConfig(network) ?? undefined,
        }),
      ) as ServerWalrusClient,
    );
  }

  return serverClientPromise;
}

function getUploadSigner() {
  const secret = getWalrusUploadPrivateKey();
  if (!secret) {
    throw new Error(
      "Set ANAVRIN_WALRUS_UPLOAD_PRIVATE_KEY to enable server-side Walrus uploads.",
    );
  }

  return Ed25519Keypair.fromSecretKey(secret);
}

export async function uploadEncryptedBlobToWalrus(input: {
  bytes: Uint8Array;
  storageOwnerAddress: string;
  creatorAddress?: string;
  attributes?: Record<string, string | null>;
  deletable?: boolean;
  epochs?: number;
}) {
  const network = getNetwork();
  const client = await getServerWalrusClient(network);
  const signer = getUploadSigner();
  const creatorAddress = input.creatorAddress?.trim() || null;

  let txDigest = "";
  const { blobId, blobObject } = await client.walrus.writeBlob({
    blob: input.bytes,
    signer,
    epochs: input.epochs ?? 1,
    owner: input.storageOwnerAddress,
    deletable: input.deletable ?? false,
    attributes: {
      ...input.attributes,
      creatorAddress,
      storageOwnerAddress: input.storageOwnerAddress,
    },
    onStep(step) {
      if (step.step === "registered") {
        txDigest = step.txDigest;
      }
    },
  });

  return {
    blobId,
    blobObjectId: blobObject.id,
    txDigest,
  };
}

export async function uploadEncryptedBlobToWalrusRelay(input: {
  bytes: Uint8Array;
  blobId: string;
  blobObjectId: string;
  nonce: Uint8Array;
  txDigest: string;
  creatorAddress?: string;
  storageOwnerAddress: string;
  deletable?: boolean;
  encodingType?: string;
}) {
  const client = await getServerWalrusClient();
  const upload = await client.walrus.writeBlobToUploadRelay({
    blobId: input.blobId,
    blob: input.bytes,
    nonce: input.nonce,
    txDigest: input.txDigest,
    blobObjectId: input.blobObjectId,
    deletable: input.deletable ?? false,
    encodingType: input.encodingType,
  });

  return {
    certificate: upload.certificate,
  };
}

export async function certifyWalrusBlob(input: {
  blobId: string;
  blobObjectId: string;
  certificate: ProtocolMessageCertificate | string;
  deletable?: boolean;
}) {
  const client = await getServerWalrusClient();
  const signer = getUploadSigner();
  const transaction = client.walrus.certifyBlobTransaction({
    blobId: input.blobId,
    blobObjectId: input.blobObjectId,
    certificate: input.certificate,
    deletable: input.deletable ?? false,
  });
  const transactionBytes = await transaction.build({ client });
  const result = await client.core.signAndExecuteTransaction({
    transaction: transactionBytes,
    signer,
  });

  if (result.$kind === "FailedTransaction") {
    throw new Error(
      result.FailedTransaction.status.error?.message ?? "Walrus certification failed.",
    );
  }

  return {
    digest: result.Transaction.digest,
  };
}

export async function executeSponsoredTransaction(input: {
  transactionBytes: Uint8Array;
  userSignature: string;
}): Promise<{ digest: string; objectTypes: Record<string, string> }> {
  const client = await getServerWalrusClient();
  const signer = getUploadSigner();

  const result = await client.core.signAndExecuteTransaction({
    transaction: input.transactionBytes,
    signer,
    additionalSignatures: [input.userSignature],
  });

  if (result.$kind === "FailedTransaction") {
    throw new Error(
      result.FailedTransaction.status.error?.message ?? "Sponsored SUI transaction failed.",
    );
  }

  const finalized = await client.core.waitForTransaction({
    digest: result.Transaction.digest,
    include: { effects: true, objectTypes: true },
  });

  if (finalized.$kind === "FailedTransaction") {
    throw new Error(
      finalized.FailedTransaction.status.error?.message ?? "Sponsored SUI transaction failed.",
    );
  }

  return {
    digest: result.Transaction.digest,
    objectTypes: finalized.Transaction.objectTypes ?? {},
  };
}

export async function readWalrusBlob(blobId: string) {
  const client = await getServerWalrusClient();
  return client.walrus.readBlob({ blobId });
}
