// ============================================================
// FundTracer by DT - QuickNode + Alchemy Fallback Provider
// Uses QuickNode as primary, falls back to Alchemy key pool
// ============================================================

import { ethers } from 'ethers';

export interface QuickNodeConfig {
    quicknodeUrl: string;
    chainId: string;
}

export interface AlchemyKeyPoolConfig {
    keys: string[];
    chainId: string;
}

interface CachedKey {
    key: string;
    expiresAt: number;
}

const keyCache = new Map<string, CachedKey>();
const KEY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get QuickNode URL from environment
 */
export function getQuickNodeUrl(): string | null {
    return process.env.NEW_QUICKNODE_API_KEY || null;
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
    
    // Simple round-robin - use current index
    const now = Date.now();
    const cacheKey = 'alchemy_pool';
    let cached = keyCache.get(cacheKey);
    
    if (!cached || now >= cached.expiresAt) {
        // Initialize or refresh
        cached = {
            key: keyPool[0],
            expiresAt: now + KEY_CACHE_TTL_MS,
        };
        keyCache.set(cacheKey, cached);
    }
    
    // Rotate through keys
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
 * Create a QuickNode provider
 */
export function createQuickNodeProvider(chain: string): ethers.JsonRpcProvider | null {
    const quicknodeUrl = getQuickNodeUrl();
    if (!quicknodeUrl) {
        console.warn('[QuickNode] No NEW_QUICKNODE_API_KEY found in environment');
        return null;
    }
    
    // Build QuickNode URL with chain-specific endpoint
    const chainEndpoints: Record<string, string> = {
        ethereum: 'eth-mainnet',
        linea: 'linea-mainnet',
        arbitrum: 'arb-mainnet',
        optimism: 'opt-mainnet',
        polygon: 'polygon-mainnet',
        base: 'base-mainnet',
        bsc: 'bsc-mainnet',
    };
    
    const endpoint = chainEndpoints[chain.toLowerCase()] || 'eth-mainnet';
    const url = quicknodeUrl.replace('{CHAIN}', endpoint).replace('{endpoint}', endpoint);
    
    return new ethers.JsonRpcProvider(url);
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
        optimization: 'opt-mainnet',
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
    const quicknodeUrl = getQuickNodeUrl();
    const keyPool = getAlchemyKeyPool();
    
    // Try QuickNode first if available
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
 * Get block with timestamp - useful for fixing missing timestamps
 */
export async function getBlockTimestamp(provider: ethers.JsonRpcProvider, blockNumber: number): Promise<number> {
    const block = await provider.getBlock(blockNumber);
    if (block) {
        return block.timestamp;
    }
    return 0;
}
