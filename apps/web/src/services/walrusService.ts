import { WALRUS_AGGREGATORS, WALRUS_PUBLISHERS, WAL_STORAGE_COST_PER_BYTE_PER_EPOCH, WAL_TOKEN_DECIMALS } from '../constants';
import { WalrusClient } from '@mysten/walrus';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      blobId: string;
    };
  };
  alreadyCertified?: {
    blobId: string;
  };
}

/**
 * Calculates the storage cost in WAL tokens using the Walrus SDK.
 * @param sizeInBytes The size of the blob in bytes.
 * @param epochs The number of epochs to store the blob.
 * @param suiClient The Sui client to use for fetching system state.
 * @returns The estimated cost in WAL.
 */
export async function calculateStorageCost(
  sizeInBytes: number, 
  epochs: number = 1,
  suiClient?: any
): Promise<number> {
  if (!suiClient) {
    return sizeInBytes * epochs * WAL_STORAGE_COST_PER_BYTE_PER_EPOCH;
  }

  try {
    const walrusClient = new WalrusClient({
      network: 'testnet',
      suiClient: suiClient,
    });

    const { totalCost } = await walrusClient.storageCost(sizeInBytes, epochs);
    return Number(totalCost) / Math.pow(10, WAL_TOKEN_DECIMALS);
  } catch (err) {
    console.warn('Walrus SDK cost calculation failed, using estimate:', err);
    return sizeInBytes * epochs * WAL_STORAGE_COST_PER_BYTE_PER_EPOCH;
  }
}

/**
 * Uploads a blob to Walrus using the server-side proxy.
 * Includes progress tracking, timeout handling, and retry logic.
 */
export async function uploadToWalrus(
  blob: Blob, 
  epochs: number = 1, 
  onProgress?: (progress: number) => void
): Promise<string> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (onProgress) onProgress(60); // Starting upload phase
      const uploadTargets = [`/api/walrus/store?epochs=${epochs}`, ...WALRUS_PUBLISHERS.map((publisher) => `${publisher}/v1/blobs?epochs=${epochs}`)];

      for (const target of uploadTargets) {
        try {
          const response = await fetch(target, {
            method: 'PUT',
            body: blob,
            headers: {
              'Content-Type': 'application/octet-stream',
            },
            signal: AbortSignal.timeout(600000), // 10 minutes timeout
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error details');
            throw new Error(`Upload target ${target} returned ${response.status}: ${errorText}`);
          }

          if (onProgress) onProgress(90); // Almost done

          const data: WalrusUploadResponse = await response.json();
          const blobId = data.newlyCreated?.blobObject.blobId || data.alreadyCertified?.blobId;
          
          if (blobId) {
            if (onProgress) onProgress(100);
            return blobId;
          }
          
          throw new Error(`Upload target ${target} returned no blobId`);
        } catch (targetError: any) {
          lastError = targetError;
          console.warn(`Walrus target failed (${target}):`, targetError);
        }
      }

      throw new Error(`Walrus upload failed on all targets (attempt ${attempt + 1})`);
    } catch (err: any) {
      console.warn(`Upload attempt ${attempt + 1} failed:`, err);
      lastError = err;
      
      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error('Failed to upload to Walrus after multiple attempts');
}

/**
 * Fetches a blob from Walrus using the server-side retrieve proxy (with failover).
 */
export async function fetchFromWalrus(blobId: string): Promise<Blob> {
  try {
    const response = await fetch(`/api/walrus/retrieve/${blobId}`);
    if (response.ok) {
      return await response.blob();
    }
    throw new Error(`Retrieve proxy returned ${response.status}`);
  } catch (err: any) {
    console.warn(`Failed to retrieve blob ${blobId} via proxy, falling back to direct fetch:`, err);
    
    // Fallback to direct fetch from aggregators if proxy fails
    let lastError: Error | null = null;
    for (const aggregator of WALRUS_AGGREGATORS) {
      try {
        const response = await fetch(`${aggregator}/v1/blobs/${blobId}`);
        if (response.ok) {
          return await response.blob();
        }
        throw new Error(`Aggregator ${aggregator} returned ${response.status}`);
      } catch (fetchErr: any) {
        console.warn(`Failed to fetch from ${aggregator}:`, fetchErr);
        lastError = fetchErr;
      }
    }
    throw lastError || new Error(`Failed to fetch blob ${blobId} from any Walrus aggregator`);
  }
}

/**
 * Gets a reliable Walrus URL by trying aggregators.
 * Note: This doesn't actually "try" them in the URL itself, but provides the primary one.
 * For true failover in <img> or <video> tags, we need a more complex approach or a proxy.
 */
export function getWalrusUrl(blobId: string): string {
  return `${WALRUS_AGGREGATORS[0]}/v1/blobs/${blobId}`;
}
