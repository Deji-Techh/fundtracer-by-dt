// ============================================================
// FundTracer by DT - Alchemy Key Pool
// Manages multiple Alchemy API keys for parallel Sybil analysis
// Implements round-robin distribution with per-key rate limiting
// ============================================================

import { ChainId } from '../types.js';

/** Alchemy RPC URLs per chain */
const ALCHEMY_URLS: Partial<Record<ChainId, string>> = {
    ethereum: 'https://eth-mainnet.g.alchemy.com/v2/',
    linea: 'https://linea-mainnet.g.alchemy.com/v2/',
    arbitrum: 'https://arb-mainnet.g.alchemy.com/v2/',
    base: 'https://base-mainnet.g.alchemy.com/v2/',
    optimism: 'https://opt-mainnet.g.alchemy.com/v2/',
    polygon: 'https://polygon-mainnet.g.alchemy.com/v2/',
};

/** Rate limiter for a single Alchemy key - conservative for free tier */
class KeyRateLimiter {
    private lastCall = 0;
    // Free tier: 330 CU/sec, getAssetTransfers = 150 CU
    // So ~2 calls/sec per key to stay safe (500ms interval)
    private minInterval = 500;

    async throttle(): Promise<void> {
        const now = Date.now();
        const waitTime = Math.max(0, this.minInterval - (now - this.lastCall));
        if (waitTime > 0) {
            await new Promise(r => setTimeout(r, waitTime));
        }
        this.lastCall = Date.now();
    }
}

/** Single Alchemy key with its own rate limiter */
interface PooledKey {
    key: string;
    rateLimiter: KeyRateLimiter;
    callCount: number;
    errorCount: number;
}

/** Configuration for Sybil Alchemy keys */
export interface SybilAlchemyConfig {
    defaultKey: string;
    contractKeys: string[];  // Keys for fetching contract interactors
    walletKeys: string[];    // Keys for fetching wallet funding sources
    moralisKey?: string;     // Fallback for BSC only
}

/**
 * AlchemyKeyPool - Manages multiple API keys with round-robin distribution
 * 
 * Usage:
 *   const pool = new AlchemyKeyPool(config, 'ethereum');
 *   const key = await pool.getNextContractKey(); // For contract interactor fetching
 *   const key = await pool.getNextWalletKey();   // For wallet funding lookups
 */
export class AlchemyKeyPool {
    private contractPool: PooledKey[] = [];
    private walletPool: PooledKey[] = [];
    private defaultKey: PooledKey;
    private contractIndex = 0;
    private walletIndex = 0;
    private chain: ChainId;
    readonly moralisKey?: string;

    constructor(config: SybilAlchemyConfig, chain: ChainId) {
        this.chain = chain;
        this.moralisKey = config.moralisKey;

        // Initialize default key
        this.defaultKey = {
            key: config.defaultKey,
            rateLimiter: new KeyRateLimiter(),
            callCount: 0,
            errorCount: 0,
        };

        // Initialize contract keys pool
        for (const key of config.contractKeys) {
            if (key && key.length > 0) {
                this.contractPool.push({
                    key,
                    rateLimiter: new KeyRateLimiter(),
                    callCount: 0,
                    errorCount: 0,
                });
            }
        }

        // Initialize wallet keys pool
        for (const key of config.walletKeys) {
            if (key && key.length > 0) {
                this.walletPool.push({
                    key,
                    rateLimiter: new KeyRateLimiter(),
                    callCount: 0,
                    errorCount: 0,
                });
            }
        }

        // If pools are empty, use default key
        if (this.contractPool.length === 0) {
            this.contractPool.push(this.defaultKey);
        }
        if (this.walletPool.length === 0) {
            this.walletPool.push(this.defaultKey);
        }

        console.log(`[AlchemyKeyPool] Initialized for ${chain}: ${this.contractPool.length} contract keys, ${this.walletPool.length} wallet keys`);
    }

    /** Check if this chain is supported by Alchemy */
    isChainSupported(): boolean {
        return this.chain !== 'bsc' && ALCHEMY_URLS[this.chain] !== undefined;
    }

    /** Get the RPC URL for a given key */
    getRpcUrl(key: string): string {
        const baseUrl = ALCHEMY_URLS[this.chain];
        if (!baseUrl) {
            throw new Error(`Alchemy not supported for chain: ${this.chain}`);
        }
        return `${baseUrl}${key}`;
    }

    /**
     * Get next contract key with rate limiting (round-robin)
     * Used for fetching contract interactors
     */
    async getNextContractKey(): Promise<string> {
        const pooled = this.contractPool[this.contractIndex];
        this.contractIndex = (this.contractIndex + 1) % this.contractPool.length;
        
        await pooled.rateLimiter.throttle();
        pooled.callCount++;
        
        return pooled.key;
    }

    /**
     * Get next wallet key with rate limiting (round-robin)
     * Used for fetching wallet funding sources
     */
    async getNextWalletKey(): Promise<string> {
        const pooled = this.walletPool[this.walletIndex];
        this.walletIndex = (this.walletIndex + 1) % this.walletPool.length;
        
        await pooled.rateLimiter.throttle();
        pooled.callCount++;
        
        return pooled.key;
    }

    /** Get default key (for non-parallelized operations) */
    getDefaultKey(): string {
        return this.defaultKey.key;
    }

    /** Get all contract keys (for parallel batch operations) */
    getAllContractKeys(): string[] {
        return this.contractPool.map(p => p.key);
    }

    /** Get all wallet keys (for parallel batch operations) */
    getAllWalletKeys(): string[] {
        return this.walletPool.map(p => p.key);
    }

    /** Get pool statistics */
    getStats(): { contract: { total: number; calls: number }; wallet: { total: number; calls: number } } {
        return {
            contract: {
                total: this.contractPool.length,
                calls: this.contractPool.reduce((sum, p) => sum + p.callCount, 0),
            },
            wallet: {
                total: this.walletPool.length,
                calls: this.walletPool.reduce((sum, p) => sum + p.callCount, 0),
            },
        };
    }

    /** Report an error for a key (for future circuit breaker implementation) */
    reportError(key: string, pool: 'contract' | 'wallet'): void {
        const targetPool = pool === 'contract' ? this.contractPool : this.walletPool;
        const pooled = targetPool.find(p => p.key === key);
        if (pooled) {
            pooled.errorCount++;
        }
    }
}

/**
 * Helper to execute parallel requests across multiple keys
 * Distributes work evenly across the key pool
 */
export async function executeWithKeyPool<T>(
    items: string[],
    keys: string[],
    chain: ChainId,
    processor: (item: string, rpcUrl: string) => Promise<T>,
    options: { delayBetweenBatches?: number } = {}
): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const baseUrl = ALCHEMY_URLS[chain];
    
    if (!baseUrl) {
        throw new Error(`Alchemy not supported for chain: ${chain}`);
    }

    const numKeys = keys.length;
    const batchSize = numKeys; // Process numKeys items in parallel
    const delayBetweenBatches = options.delayBetweenBatches ?? 500; // 500ms between batches

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        const batchPromises = batch.map((item, idx) => {
            const keyIndex = idx % numKeys;
            const rpcUrl = `${baseUrl}${keys[keyIndex]}`;
            
            return processor(item, rpcUrl)
                .then(result => ({ item, result, success: true as const }))
                .catch(error => ({ item, error, success: false as const }));
        });

        const batchResults = await Promise.all(batchPromises);
        
        for (const res of batchResults) {
            if (res.success) {
                results.set(res.item, res.result);
            }
        }

        // Log progress
        const processed = Math.min(i + batchSize, items.length);
        if (processed % 50 === 0 || processed === items.length) {
            console.log(`[AlchemyKeyPool] Processed ${processed}/${items.length} items`);
        }

        // Delay between batches to respect rate limits
        if (i + batchSize < items.length) {
            await new Promise(r => setTimeout(r, delayBetweenBatches));
        }
    }

    return results;
}
