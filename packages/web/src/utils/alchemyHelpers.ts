// Alchemy API Key Manager with rotation and load balancing
export class AlchemyKeyManager {
  private walletKeys: string[];
  private contractKeys: string[];
  private usageCount: Map<string, number> = new Map();
  private lastRotation: Map<string, number> = new Map();
  private readonly maxCallsPerKey = 100; // Rotate after 100 calls

  constructor() {
    // Wallet operation keys (5 keys)
    this.walletKeys = [
      import.meta.env.VITE_WALLET_KEY_1 || '',
      import.meta.env.VITE_WALLET_KEY_2 || '',
      import.meta.env.VITE_WALLET_KEY_3 || '',
      import.meta.env.VITE_WALLET_KEY_4 || '',
      import.meta.env.VITE_WALLET_KEY_5 || ''
    ].filter(key => key.length > 0);

    // Contract operation keys (5 keys)
    this.contractKeys = [
      import.meta.env.VITE_CONTRACT_KEY_1 || '',
      import.meta.env.VITE_CONTRACT_KEY_2 || '',
      import.meta.env.VITE_CONTRACT_KEY_3 || '',
      import.meta.env.VITE_CONTRACT_KEY_4 || '',
      import.meta.env.VITE_CONTRACT_KEY_5 || ''
    ].filter(key => key.length > 0);

    // Initialize usage counters
    [...this.walletKeys, ...this.contractKeys].forEach(key => {
      this.usageCount.set(key, 0);
      this.lastRotation.set(key, Date.now());
    });
  }

  // Get key for wallet operations (ETH balance, tokens, NFTs)
  getWalletKey(): string {
    return this.getLeastUsedKey(this.walletKeys);
  }

  // Get key for contract operations (transactions, transfers)
  getContractKey(): string {
    return this.getLeastUsedKey(this.contractKeys);
  }

  // Get multiple keys for parallel operations
  getWalletKeys(count: number): string[] {
    return this.getMultipleKeys(this.walletKeys, count);
  }

  getContractKeys(count: number): string[] {
    return this.getMultipleKeys(this.contractKeys, count);
  }

  private getLeastUsedKey(keys: string[]): string {
    if (keys.length === 0) {
      throw new Error('No API keys configured');
    }

    // Sort by usage count
    const sorted = [...keys].sort((a, b) => {
      const usageA = this.usageCount.get(a) || 0;
      const usageB = this.usageCount.get(b) || 0;
      return usageA - usageB;
    });

    const selected = sorted[0];
    this.usageCount.set(selected, (this.usageCount.get(selected) || 0) + 1);

    // Log rotation if needed
    if (this.usageCount.get(selected)! >= this.maxCallsPerKey) {
      console.log(`[Alchemy] Key rotated after ${this.maxCallsPerKey} calls`);
      this.usageCount.set(selected, 0);
      this.lastRotation.set(selected, Date.now());
    }

    return selected;
  }

  private getMultipleKeys(keys: string[], count: number): string[] {
    const sorted = [...keys].sort((a, b) => {
      const usageA = this.usageCount.get(a) || 0;
      const usageB = this.usageCount.get(b) || 0;
      return usageA - usageB;
    });

    return sorted.slice(0, Math.min(count, keys.length));
  }

  // Report failed key (will be deprioritized)
  reportError(key: string) {
    console.warn(`[Alchemy] Key error reported: ${key.slice(0, 10)}...`);
    this.usageCount.set(key, 999999); // Move to end of queue
  }

  // Get usage statistics
  getStats(): { key: string; usage: number }[] {
    return [...this.usageCount.entries()]
      .map(([key, usage]) => ({ key: key.slice(0, 15) + '...', usage }))
      .sort((a, b) => a.usage - b.usage);
  }
}

// Singleton instance
export const keyManager = new AlchemyKeyManager();

// IPFS Image URL Resolver with multiple fallbacks
export function resolveIPFSImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  // If it's already an HTTP URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Handle IPFS URLs
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    // Try Cloudflare first (fastest), then IPFS.io
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }

  // Handle ipfs/ prefix
  if (url.startsWith('ipfs/')) {
    const cid = url.replace('ipfs/', '');
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }

  return url;
}

// Get fallback IPFS URLs for retry
export function getIPFSFallbacks(originalUrl: string): string[] {
  const urls: string[] = [];
  
  if (originalUrl.includes('cloudflare-ipfs.com')) {
    const cid = originalUrl.split('/ipfs/')[1];
    urls.push(`https://ipfs.io/ipfs/${cid}`);
    urls.push(`https://nft-cdn.alchemy.com/ipfs/${cid}`);
  } else if (originalUrl.includes('ipfs.io')) {
    const cid = originalUrl.split('/ipfs/')[1];
    urls.push(`https://cloudflare-ipfs.com/ipfs/${cid}`);
    urls.push(`https://nft-cdn.alchemy.com/ipfs/${cid}`);
  }

  return urls;
}

// Parallel fetch with timeout and error handling
export async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Batch promise executor with concurrency limit
export async function executeBatches<T>(
  items: T[],
  batchSize: number,
  executor: (item: T) => Promise<any>
): Promise<any[]> {
  const results: any[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(executor));
    results.push(...batchResults);
  }
  
  return results;
}
