// ============================================================
// FundTracer by DT - QuickNode + Alchemy Fallback Provider
// Uses chain-specific QuickNode endpoints, falls back to Alchemy key pool
// ============================================================

import { ethers } from 'ethers';

interface CachedKey {
    key: string;
    expiresAt: number;
}

const keyCache = new Map<string, CachedKey>();
const KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Chain to env var mapping
const QUICKNODE_ENV_VARS: Record<string, string> = {
    ethereum: 'ETHEREUM_QUICKNODE',
    linea: 'LINEA_QUICKNODE',
    arbitrum: 'ARBITRUM_QUICKNODE',
    optimism: 'OPTIMISM_QUICKNODE',
    polygon: 'POLYGON_QUICKNODE',
    base: 'BASE_QUICKNODE',
    bsc: 'BSC_QUICKNODE',
};

/**
 * Get QuickNode URL for a specific chain from environment
 */
export function getQuickNodeUrl(chain: string): string | null {
    const envVar = QUICKNODE_ENV_VARS[chain.toLowerCase()];
    if (envVar) {
        return process.env[envVar] || null;
    }
    return null;
}

/**
 * Get Alchemy key pool from environment (supports existing Sybil keys + fallback)
 * Uses existing SYBIL_CONTRACT_KEY_1-10 and SYBIL_WALLET_KEY_1-10
 * Plus DEFAULT_ALCHEMY_API_KEY as final fallback
 */
export function getAlchemyKeyPool(): string[] {
    const keys: string[] = [];
    
    // Load SYBIL_CONTRACT_KEY_1 through SYBIL_CONTRACT_KEY_10
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`SYBIL_CONTRACT_KEY_${i}`];
        if (key && key.length > 0) {
            keys.push(key);
        }
    }
    
    // Load SYBIL_WALLET_KEY_1 through SYBIL_WALLET_KEY_10
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`SYBIL_WALLET_KEY_${i}`];
        if (key && key.length > 0 && !keys.includes(key)) {
            keys.push(key);
        }
    }
    
    // Fallback to DEFAULT_ALCHEMY_API_KEY if no pool keys
    const defaultKey = process.env.DEFAULT_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY;
    if (keys.length === 0 && defaultKey) {
        keys.push(defaultKey);
    }
    
    console.log(`[KeyPool] Loaded ${keys.length} Alchemy keys for fallback`);
    return keys;
}

/**
 * Get a key from the pool (round-robin with caching)
 */
export function getKeyFromPool(keyPool: string[]): string {
    if (keyPool.length === 0) {
        throw new Error('No Alchemy keys available in pool');
    }
    
    const now = Date.now();
    const cacheKey = 'alchemy_pool';
    let cached = keyCache.get(cacheKey);
    
    if (!cached || now >= cached.expiresAt) {
        cached = {
            key: keyPool[0],
            expiresAt: now + KEY_CACHE_TTL_MS,
        };
        keyCache.set(cacheKey, cached);
    }
    
    const currentIndex = keyPool.indexOf(cached.key);
    const nextIndex = (currentIndex + 1) % keyPool.length;
    const nextKey = keyPool[nextIndex];
    
    keyCache.set(cacheKey, {
        key: nextKey,
        expiresAt: now + KEY_CACHE_TTL_MS,
    });
    
    return nextKey;
}

/**
 * Create a QuickNode provider for a specific chain
 */
export function createQuickNodeProvider(chain: string): ethers.JsonRpcProvider | null {
    const quicknodeUrl = getQuickNodeUrl(chain);
    if (!quicknodeUrl) {
        const envVar = QUICKNODE_ENV_VARS[chain.toLowerCase()];
        console.warn(`[QuickNode] No ${envVar} found in environment for ${chain}`);
        return null;
    }
    
    return new ethers.JsonRpcProvider(quicknodeUrl);
}

/**
 * Create an Alchemy provider with fallback key pool
 */
export function createAlchemyProviderWithFallback(chain: string): ethers.JsonRpcProvider {
    const keyPool = getAlchemyKeyPool();
    const key = getKeyFromPool(keyPool);
    
    const chainNetwork: Record<string, string> = {
        ethereum: 'eth-mainnet',
        linea: 'linea',
        arbitrum: 'arb-mainnet',
        optimism: 'opt-mainnet',
        polygon: 'polygon',
        base: 'base',
        bsc: 'bsc',
    };
    
    const network = chainNetwork[chain.toLowerCase()] || 'eth-mainnet';
    const url = `https://${network}.g.alchemy.com/v2/${key}`;
    
    return new ethers.JsonRpcProvider(url);
}

/**
 * Try QuickNode first, fall back to Alchemy on error
 */
export async function withQuickNodeFallback<T>(
    chain: string,
    operation: (provider: ethers.JsonRpcProvider) => Promise<T>
): Promise<T> {
    const quicknodeUrl = getQuickNodeUrl(chain);
    const keyPool = getAlchemyKeyPool();
    
    // Try QuickNode first if available for this chain
    if (quicknodeUrl) {
        try {
            const provider = createQuickNodeProvider(chain);
            if (provider) {
                console.log(`[Provider] Using QuickNode for ${chain}`);
                return await operation(provider);
            }
        } catch (error) {
            console.warn(`[Provider] QuickNode failed for ${chain}, falling back to Alchemy:`, error);
        }
    }
    
    // Fall back to Alchemy
    if (keyPool.length > 0) {
        try {
            const provider = createAlchemyProviderWithFallback(chain);
            console.log(`[Provider] Using Alchemy fallback for ${chain}`);
            return await operation(provider);
        } catch (error) {
            console.error(`[Provider] Alchemy fallback also failed for ${chain}:`, error);
            throw error;
        }
    }
    
    throw new Error(`No providers available for ${chain}`);
}

/**
 * Get block timestamp using any available provider
 */
export async function getBlockTimestamp(chain: string, blockNumber: number): Promise<number> {
    return withQuickNodeFallback(chain, async (provider) => {
        const block = await provider.getBlock(blockNumber);
        return block ? block.timestamp : 0;
    });
}
