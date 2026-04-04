// ============================================================
// FundTracer by DT - Sybil Alchemy Keys Loader
// Loads and validates all Alchemy API keys from environment
// for parallel Sybil analysis operations
// ============================================================

import type { SybilAlchemyConfig } from '@fundtracer/core/utils/AlchemyKeyPool.js';

/**
 * Load all Sybil Alchemy keys from environment variables
 * 
 * Expected env vars:
 * - DEFAULT_ALCHEMY_API_KEY (required)
 * - SYBIL_CONTRACT_KEY_1 through SYBIL_CONTRACT_KEY_10 (optional, for contract interactor fetching)
 * - SYBIL_WALLET_KEY_1 through SYBIL_WALLET_KEY_10 (optional, for wallet funding lookups)
 * - MORALIS_API_KEY (optional, fallback for BSC only)
 */
export function getSybilAlchemyKeys(): SybilAlchemyConfig {
    const defaultKey = process.env.DEFAULT_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY || '';
    
    if (!defaultKey) {
        console.warn('[SybilKeys] WARNING: No DEFAULT_ALCHEMY_API_KEY found in environment');
    }

    // Load contract keys (SYBIL_CONTRACT_KEY_1 through SYBIL_CONTRACT_KEY_10)
    const contractKeys: string[] = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`SYBIL_CONTRACT_KEY_${i}`];
        if (key && key.length > 0) {
            contractKeys.push(key);
        }
    }

    // Load wallet keys (SYBIL_WALLET_KEY_1 through SYBIL_WALLET_KEY_10)
    const walletKeys: string[] = [];
    for (let i = 1; i <= 10; i++) {
        const key = process.env[`SYBIL_WALLET_KEY_${i}`];
        if (key && key.length > 0) {
            walletKeys.push(key);
        }
    }

    // Moralis for BSC fallback
    const moralisKey = process.env.MORALIS_API_KEY || '';

    // Log key counts (don't log actual keys for security)
    console.log(`[SybilKeys] Loaded keys: default=${defaultKey ? '1' : '0'}, contract=${contractKeys.length}, wallet=${walletKeys.length}, moralis=${moralisKey ? '1' : '0'}`);

    // If no dedicated keys, fall back to default key
    if (contractKeys.length === 0 && defaultKey) {
        console.log('[SybilKeys] No SYBIL_CONTRACT_KEY_* found, using default key');
        contractKeys.push(defaultKey);
    }
    if (walletKeys.length === 0 && defaultKey) {
        console.log('[SybilKeys] No SYBIL_WALLET_KEY_* found, using default key');
        walletKeys.push(defaultKey);
    }

    return {
        defaultKey,
        contractKeys,
        walletKeys,
        moralisKey: moralisKey || undefined,
    };
}

/**
 * Validate that we have the minimum required keys for Sybil analysis
 */
export function validateSybilKeys(config: SybilAlchemyConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.defaultKey) {
        errors.push('DEFAULT_ALCHEMY_API_KEY is required');
    }

    if (config.contractKeys.length === 0) {
        errors.push('No contract keys available (need DEFAULT_ALCHEMY_API_KEY or SYBIL_CONTRACT_KEY_*)');
    }

    if (config.walletKeys.length === 0) {
        errors.push('No wallet keys available (need DEFAULT_ALCHEMY_API_KEY or SYBIL_WALLET_KEY_*)');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Get a summary of available keys for logging
 */
export function getSybilKeysSummary(config: SybilAlchemyConfig): string {
    return `Alchemy keys: ${config.contractKeys.length} contract, ${config.walletKeys.length} wallet, moralis=${config.moralisKey ? 'yes' : 'no'}`;
}
