import type { ProtocolMessageCertificate } from "@mysten/walrus";

export type RelayUploadProgress = {
  stage: "uploading" | "awaiting_certificate";
  loadedBytes: number;
  totalBytes: number;
  bytesPerSecond: number | null;
  etaSeconds: number | null;
};

type UploadRelayResponse = {
  confirmation_certificate?: {
    signers?: number[];
    serialized_message?: number[];
    signature?: string;
  };
};

function toUrlSafeBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromUrlSafeBase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function readRelayError(status: number, responseText: string) {
  const trimmed = responseText.trim();
  if (!trimmed) {
    return `Walrus relay returned ${status}.`;
  }

  try {
    const parsed = JSON.parse(trimmed) as { error?: string; message?: string };
    if (typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
    if (typeof parsed.message === "string" && parsed.message.trim()) {
      return parsed.message.trim();
    }
  } catch {
    // Fall through to the raw text.
  }

  return `Walrus relay returned ${status}: ${trimmed}`;
}

export function serializeWalrusCertificate(certificate: ProtocolMessageCertificate) {
  return JSON.stringify({
    signers: certificate.signers,
    serializedMessage: Array.from(certificate.serializedMessage),
    signature: Array.from(certificate.signature),
  });
}

export async function uploadBlobToWalrusRelayWithProgress(input: {
  host: string;
  blobId: string;
  blob: Uint8Array;
  nonce: Uint8Array;
  txDigest: string;
  blobObjectId: string;
  deletable: boolean;
  encodingType?: string;
  idleTimeoutMs: number;
  onProgress?: (progress: RelayUploadProgress) => void;
  onRequestReady?: (request: XMLHttpRequest | null) => void;
}) {
  const url = new URL("/v1/blob-upload-relay", input.host);
  url.searchParams.set("blob_id", input.blobId);
  url.searchParams.set("tx_id", input.txDigest);
  url.searchParams.set("nonce", toUrlSafeBase64(input.nonce));
  if (input.deletable) {
    url.searchParams.set("deletable_blob_object", input.blobObjectId);
  }
  if (input.encodingType) {
    url.searchParams.set("encoding_type", input.encodingType);
  }

  return await new Promise<ProtocolMessageCertificate>((resolve, reject) => {
    const request = new XMLHttpRequest();
    let settled = false;
    let stalled = false;
    let stage: RelayUploadProgress["stage"] = "uploading";
    let idleTimer: number | null = null;
    let lastLoaded = 0;
    let lastTimestamp = performance.now();

    const finish = (handler: () => void) => {
      if (settled) return;
      settled = true;
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
      input.onRequestReady?.(null);
      handler();
    };

    const resetIdleTimer = () => {
      if (stage !== "uploading" || input.idleTimeoutMs <= 0) return;
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
      }
      idleTimer = window.setTimeout(() => {
        stalled = true;
        request.abort();
      }, input.idleTimeoutMs);
    };

    request.open("POST", url.toString());
    request.responseType = "text";
    input.onRequestReady?.(request);

    request.upload.onloadstart = () => {
      input.onProgress?.({
        stage: "uploading",
        loadedBytes: 0,
        totalBytes: input.blob.byteLength,
        bytesPerSecond: null,
        etaSeconds: null,
      });
      resetIdleTimer();
    };

    request.upload.onprogress = (event) => {
      const now = performance.now();
      const loadedBytes = event.loaded;
      const totalBytes = event.lengthComputable && event.total > 0 ? event.total : input.blob.byteLength;
      const deltaBytes = Math.max(0, loadedBytes - lastLoaded);
      const deltaSeconds = Math.max(0.001, (now - lastTimestamp) / 1000);
      const bytesPerSecond = deltaBytes > 0 ? deltaBytes / deltaSeconds : null;
      const etaSeconds =
        bytesPerSecond && bytesPerSecond > 0 ? Math.max(0, (totalBytes - loadedBytes) / bytesPerSecond) : null;

      lastLoaded = loadedBytes;
      lastTimestamp = now;

      input.onProgress?.({
        stage: "uploading",
        loadedBytes,
        totalBytes,
        bytesPerSecond,
        etaSeconds,
      });
      resetIdleTimer();
    };

    request.upload.onload = () => {
      stage = "awaiting_certificate";
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
      input.onProgress?.({
        stage: "awaiting_certificate",
        loadedBytes: input.blob.byteLength,
        totalBytes: input.blob.byteLength,
        bytesPerSecond: null,
        etaSeconds: null,
      });
    };

    request.onerror = () => {
      finish(() => {
        reject(new Error("Walrus relay upload failed before the relay responded. Check your connection and retry."));
      });
    };

    request.onabort = () => {
      finish(() => {
        reject(
          new Error(
            stalled
              ? "Walrus relay upload stalled before the relay acknowledged the blob. Check your connection and retry."
              : "Walrus relay upload was cancelled.",
          ),
        );
      });
    };

    request.onload = () => {
      finish(() => {
        if (request.status < 200 || request.status >= 300) {
          reject(new Error(readRelayError(request.status, request.responseText)));
          return;
        }

        try {
          const response = JSON.parse(request.responseText) as UploadRelayResponse;
          const certificate = response.confirmation_certificate;

          if (
            !certificate ||
            !Array.isArray(certificate.signers) ||
            !Array.isArray(certificate.serialized_message) ||
            typeof certificate.signature !== "string"
          ) {
            reject(new Error("Walrus relay returned an invalid confirmation certificate."));
            return;
          }

          resolve({
            signers: certificate.signers,
            serializedMessage: new Uint8Array(certificate.serialized_message),
            signature: fromUrlSafeBase64(certificate.signature),
          });
        } catch (error) {
          reject(
            error instanceof Error ? error : new Error("Walrus relay returned an unreadable confirmation certificate."),
          );
        }
      });
    };

    const requestBody = new Uint8Array(input.blob.byteLength);
    requestBody.set(input.blob);
    request.send(requestBody.buffer);
  });
}
