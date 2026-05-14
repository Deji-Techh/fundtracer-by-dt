// Alchemy proxy URL builder — keys are kept server-side

import { API_BASE } from '../api';

export function buildAlchemyUrl(chain: string): string {
  const normalized = chain.toLowerCase();
  return `${API_BASE}/api/proxy/alchemy/${normalized}`;
}

export function buildAlchemyNftUrl(chain: string, owner: string): string {
  return `${buildAlchemyUrl(chain)}/nft?owner=${encodeURIComponent(owner)}&pageSize=100&withMetadata=true`;
}

// Key manager compatibility shim — returns proxy URL instead of raw keys
const proxyUrlFor = (chain: string) => buildAlchemyUrl(chain);

export class AlchemyKeyManager {
  getWalletKey(chain: string = 'linea'): string {
    return proxyUrlFor(chain);
  }

  getContractKey(chain: string = 'linea'): string {
    return proxyUrlFor(chain);
  }

  getWalletKeys(count: number, chain: string = 'linea'): string[] {
    return Array(count).fill(proxyUrlFor(chain));
  }

  getContractKeys(count: number, chain: string = 'linea'): string[] {
    return Array(count).fill(proxyUrlFor(chain));
  }

  reportError(_key: string) {}

  getStats(): { key: string; usage: number }[] {
    return [{ key: 'proxy', usage: 0 }];
  }
}

export const keyManager = new AlchemyKeyManager();

// IPFS Image URL Resolver with multiple fallbacks
export function resolveIPFSImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('ipfs://')) {
    const cid = url.replace('ipfs://', '');
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }
  if (url.startsWith('ipfs/')) {
    const cid = url.replace('ipfs/', '');
    return `https://cloudflare-ipfs.com/ipfs/${cid}`;
  }
  return url;
}

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
