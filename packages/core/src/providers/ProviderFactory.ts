// ============================================================
// FundTracer by DT - Provider Factory
// Alchemy-only provider (fast, reliable)
// ============================================================

import { ChainId } from '../types.js';
import { ITransactionProvider } from './ITransactionProvider.js';
import { AlchemyProvider } from './AlchemyProvider.js';

export interface ApiKeyConfig {
    // Primary RPC provider (recommended)
    alchemy?: string;
    // Optimized funding lookup
    moralis?: string;
    // Fast contract analysis via SQL
    dune?: string;
    // Deep historical scanning (GoldRush)
    covalent?: string;
    // Per-chain explorer APIs (fallback)
    etherscan?: string;     // Ethereum mainnet
    lineascan?: string;     // Linea
    arbiscan?: string;      // Arbitrum
    basescan?: string;      // Base
    optimism?: string;      // Optimism
    polygonscan?: string;   // Polygon
}

/** Factory for creating chain-specific providers with auto-selection */
export class ProviderFactory {
    private apiKeys: ApiKeyConfig;
    private providers: Map<ChainId, ITransactionProvider> = new Map();

    constructor(apiKeys: ApiKeyConfig) {
        this.apiKeys = apiKeys;

        // Validate at least one provider is configured
        const hasAnyKey = apiKeys.alchemy || apiKeys.etherscan || apiKeys.lineascan ||
            apiKeys.arbiscan || apiKeys.basescan;
        if (!hasAnyKey) {
            throw new Error(
                'No API keys configured. Please set at least one provider key.\n' +
                'Run: fundtracer config --set-key alchemy:YOUR_KEY\n' +
                'Or set ALCHEMY_API_KEY environment variable.'
            );
        }
    }

    /** Map chain IDs from new registry format to legacy format */
    private mapToLegacyChainId(chainId: ChainId): string {
        const chainIdMap: Record<string, string> = {
            '1': 'ethereum',
            '59144': 'linea',
            '42161': 'arbitrum',
            '8453': 'base',
            '10': 'optimism',
            '137': 'polygon',
        };
        return chainIdMap[chainId] || chainId;
    }

    /** Get provider for a specific chain */
    getProvider(chainId: ChainId): ITransactionProvider {
        // Return cached provider if exists
        const cached = this.providers.get(chainId);
        if (cached) return cached;

        // BSC is not supported by Alchemy - use Moralis as primary provider
        if (chainId === 'bsc') {
            if (!this.apiKeys.moralis) {
                throw new Error(
                    `BSC requires Moralis API key. Please configure MORALIS_API_KEY.\n` +
                    `Moralis supports BSC natively.`
                );
            }
            const provider = new AlchemyProvider(
                chainId,
                '', // No Alchemy key needed for BSC
                this.apiKeys.moralis,
                undefined // No explorer key needed when using Moralis
            );
            this.providers.set(chainId, provider);
            return provider;
        }

        // Convert chain ID to legacy format if needed
        const legacyChainId = this.mapToLegacyChainId(chainId);

        // Try Alchemy first (fastest, most reliable)
        if (this.apiKeys.alchemy) {
            const provider = new AlchemyProvider(
                legacyChainId as any,
                this.apiKeys.alchemy,
                this.apiKeys.moralis,
                this.getExplorerKeyForChain(chainId)
            );
            this.providers.set(chainId, provider);
            return provider;
        }

        // Fallback to chain-specific explorer API
        const explorerKey = this.getExplorerKeyForChain(chainId);
        if (explorerKey) {
            // For now, create a limited AlchemyProvider - EtherscanProvider will be added
            throw new Error(
                `Etherscan provider not yet implemented. Please configure Alchemy.\n` +
                `Run: fundtracer config --set-key alchemy:YOUR_KEY`
            );
        }

        throw new Error(
            `No provider available for chain: ${chainId}\n` +
            `Configure Alchemy (works for all chains): fundtracer config --set-key alchemy:YOUR_KEY`
        );
    }

    /** Get explorer API key for a specific chain */
    private getExplorerKeyForChain(chainId: ChainId): string | undefined {
        const keyMap: Partial<Record<ChainId, string | undefined>> = {
            ethereum: this.apiKeys.etherscan,
            linea: this.apiKeys.lineascan,
            arbitrum: this.apiKeys.arbiscan,
            base: this.apiKeys.basescan,
            optimism: this.apiKeys.optimism,
            polygon: this.apiKeys.polygonscan,
        };
        return keyMap[chainId];
    }

    /** Check which providers are available */
    getAvailableProviders(): { name: string; available: boolean; recommended: boolean }[] {
        return [
            { name: 'Alchemy', available: !!this.apiKeys.alchemy, recommended: true },
            { name: 'Moralis', available: !!this.apiKeys.moralis, recommended: true },
            { name: 'Dune', available: !!this.apiKeys.dune, recommended: false },
            { name: 'Etherscan', available: !!this.apiKeys.etherscan, recommended: false },
        ];
    }

    /** Get Dune API key if available */
    getDuneKey(): string | undefined {
        return this.apiKeys.dune;
    }

    /** Update API keys */
    setApiKeys(apiKeys: Partial<ApiKeyConfig>): void {
        this.apiKeys = { ...this.apiKeys, ...apiKeys };
        this.providers.clear();
    }

    /** Clear all cached providers */
    clearCache(): void {
        this.providers.forEach(p => {
            if (p.clearCache) {
                p.clearCache();
            }
        });
    }
}

export { AlchemyProvider };


