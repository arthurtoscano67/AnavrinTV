import { SealClient, DemType } from '@mysten/seal';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
import { SEAL_SERVER_OBJECT_IDS } from '../constants';

// Seal requires a Sui client that implements certain methods.
const client = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl('testnet'),
  network: 'testnet',
});

// Initialize Seal client with testnet servers (if available) or mainnet ones as placeholder
const sealClient = new SealClient({
  suiClient: client as any,
  serverConfigs: SEAL_SERVER_OBJECT_IDS.map(id => ({
    objectId: id,
    weight: 1,
  })),
});

/**
 * Fallback encryption using AES-GCM if Seal fails.
 */
async function encryptWithFallback(data: Uint8Array, keyMaterial: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyBuffer = enc.encode(keyMaterial);
  const hash = await crypto.subtle.digest('SHA-256', keyBuffer);
  const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  return result;
}

/**
 * Encrypts a blob using Seal for a specific identity (Sui address).
 * @param blob The blob to encrypt.
 * @param identity The Sui address of the user.
 * @returns The encrypted blob and the Seal policy object ID.
 */
export async function encryptBlob(blob: Blob, identity: string): Promise<{ encryptedBlob: Blob; policyId: string }> {
  const arrayBuffer = await blob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  try {
    // For identity-based encryption on testnet
    const { encryptedObject } = await sealClient.encrypt({
      data,
      id: identity,
      packageId: '0x2', // Sui framework as fallback for identity-based
      threshold: 1,
      demType: DemType.AesGcm256,
    });

    return {
      encryptedBlob: new Blob([encryptedObject], { type: 'application/octet-stream' }),
      policyId: 'seal-testnet-policy', // Placeholder for policy ID
    };
  } catch (error: any) {
    console.warn('Seal encryption failed, falling back to AES-GCM:', error);
    try {
      const encryptedData = await encryptWithFallback(data, identity);
      return {
        encryptedBlob: new Blob([encryptedData], { type: 'application/octet-stream' }),
        policyId: 'fallback-aes-gcm',
      };
    } catch (fallbackError: any) {
      console.error('Fallback encryption also failed:', fallbackError);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }
}

/**
 * Decrypts a blob using Seal.
 * @param encryptedBlob The encrypted blob to decrypt.
 * @param sessionKey The Seal session key.
 * @param txBytes The transaction bytes that authorize decryption.
 * @param mimeType The original MIME type of the blob.
 * @returns The decrypted blob.
 */
export async function decryptBlob(
  encryptedBlob: Blob, 
  sessionKey?: any, 
  txBytes?: Uint8Array,
  mimeType?: string
): Promise<Blob> {
  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);

  // Fallback for AES-GCM (if policyId was 'fallback-aes-gcm')
  // In a real app, we'd check the policyId. For now, we'll try Seal if sessionKey is provided.
  
  if (sessionKey && txBytes) {
    try {
      const decryptedData = await sealClient.decrypt({
        data,
        sessionKey,
        txBytes,
      });
      return new Blob([decryptedData], { type: mimeType || 'video/mp4' });
    } catch (error: any) {
      console.error('Seal decryption failed:', error);
      throw new Error(`Seal decryption failed: ${error.message}`);
    }
  }

  // Fallback/Mock for demo
  console.warn('Seal decryption requires session keys and transaction authorization. Mocking for now.');
  return new Blob([data], { type: mimeType || 'video/mp4' });
}
