import crypto from "node:crypto";

function getSealKeySeed() {
  const seed = process.env.ANAVRIN_SEAL_KEY?.trim();
  if (seed) return seed;

  if (process.env.NODE_ENV === "production") {
    throw new Error("ANAVRIN_SEAL_KEY is required in production.");
  }

  return "anavrin-local-development-seal-key";
}

function getKey() {
  return crypto.createHash("sha256").update(getSealKeySeed()).digest();
}

export function sealBuffer(buffer: Buffer, aad: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  cipher.setAAD(Buffer.from(aad));

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function openBuffer(bundle: Buffer, aad: string) {
  if (bundle.length < 28) {
    throw new Error("Invalid sealed bundle");
  }

  const iv = bundle.subarray(0, 12);
  const tag = bundle.subarray(12, 28);
  const payload = bundle.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(payload), decipher.final()]);
}
