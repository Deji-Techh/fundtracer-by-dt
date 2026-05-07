// ============================================================
// FundTracer - Dune SIM Client
// Real-time blockchain data API (EVM + Solana/SVM support)
// Docs: https://docs.sim.dune.com/
// ============================================================

import fetch from 'node-fetch';
import { cache } from '../utils/cache.js';

const SIM_API_BASE = 'https://api.sim.dune.com';
const SIM_BETA_BASE = 'https://api.sim.dune.com/beta';
const SIM_V1_BASE = 'https://api.sim.dune.com/v1';

// EVM Chain ID mapping
export const EVM_CHAIN_IDS: Record<string, number> = {
    ethereum: 1,
    eth: 1,
    linea: 59144,
    arbitrum: 42161,
    arb: 42161,
    optimism: 10,
    opt: 10,
    base: 8453,
    polygon: 137,
    matic: 137,
    bsc: 56,
    avalanche: 43114,
    avax: 43114,
};

export const CHAIN_ID_TO_NAME: Record<number, string> = {
    1: 'ethereum',
    59144: 'linea',
    42161: 'arbitrum',
    10: 'optimism',
    8453: 'base',
    137: 'polygon',
    56: 'bsc',
    43114: 'avalanche',
};

export type SimBalance = {
    chain: string;
    address: string;
    amount: string;
    balance: string;
    raw_balance: string;
    value_usd: number;
    program_id: string | null;
    decimals: number;
    total_supply: string;
    name: string;
    symbol: string;
    uri: string | null;
    price_usd: number;
    liquidity_usd: number;
    low_liquidity?: boolean;
    pool_size?: number;
}

export interface SimBalancesResponse {
    processing_time_ms: number;
    wallet_address: string;
    next_offset: string | null;
    balances_count: number;
    balances: SimBalance[];
}

export interface SimTransaction {
    address: string;
    block_slot: number;
    block_time: number;
    chain: string;
    raw_transaction: {
        transaction: any;
        meta: any;
        slot: number;
        blockTime: number;
    };
}

export interface SimTransactionsResponse {
    next_offset: string | null;
    transactions: SimTransaction[];
}

export interface SimToken {
    mint: string;
    amount: number;
    decimals: number;
    uiAmount: number;
    symbol?: string;
    name?: string;
    logoUrl?: string;
    price?: number;
    value?: number;
}

export interface SimPortfolio {
    address: string;
    sol: {
        lamports: number;
        sol: number;
        usd: number;
    };
    tokens: SimToken[];
    totalUsd: number;
    fetchedAt: number;
}

export interface SimTransactionFormatted {
    signature: string;
    slot: number;
    blockTime: number;
    fee: number;
    status: 'success' | 'failed';
    type: string;
    from: string;
    to?: string;
    amount?: number;
    token?: string;
    tokenAmount?: number;
    instructions: any[];
}

const LAMPORTS_PER_SOL = 1_000_000_000;

export class DuneSimClient {
    private apiKey: string;
    private enabled: boolean = true;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.SIM_API_KEY || '';
        this.enabled = !!this.apiKey && process.env.SIM_SOLANA_ENABLED !== 'false';

        if (!this.enabled) {
            console.warn('[DuneSimClient] SIM disabled - no API key or SIM_SOLANA_ENABLED=false');
        } else {
            console.log('[DuneSimClient] Initialized - using SIM for Solana data');
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    private async fetchWithAuth<T>(url: string): Promise<T> {
        if (!this.enabled) {
            throw new Error('SIM client disabled');
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-Sim-Api-Key': this.apiKey,
            },
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`SIM API error ${response.status}: ${error}`);
        }

        return response.json() as Promise<T>;
    }

    /**
     * Get token balances for a Solana address using SIM
     * Endpoint: GET /beta/svm/balances/{address}
     */
    async getBalances(
        address: string,
        options: {
            chains?: string; // 'solana', 'eclipse', or 'all'
            limit?: number;
            excludeSpamTokens?: boolean;
            excludeUnpriced?: boolean;
        } = {}
    ): Promise<SimBalancesResponse> {
        const cacheKey = `sim:balances:${address}:${JSON.stringify(options)}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as SimBalancesResponse;

        const params = new URLSearchParams();
        if (options.chains) params.set('chains', options.chains);
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.excludeSpamTokens) params.set('exclude_spam_tokens', 'true');
        if (options.excludeUnpriced) params.set('exclude_unpriced', 'true');

        const url = `${SIM_BETA_BASE}/svm/balances/${address}${params.toString() ? '?' + params.toString() : ''}`;

        try {
            const data = await this.fetchWithAuth<SimBalancesResponse>(url);
            // Cache for 60 seconds - SIM provides real-time data
            cache.set(cacheKey, data, 60);
            return data;
        } catch (error) {
            console.error('[DuneSimClient] Error fetching balances:', error);
            throw error;
        }
    }

    /**
     * Get transactions for a Solana address using SIM
     * Endpoint: GET /beta/svm/transactions/{address}
     */
    async getTransactions(
        address: string,
        options: {
            limit?: number;
        } = {}
    ): Promise<SimTransactionsResponse> {
        const cacheKey = `sim:txs:${address}:${options.limit || 100}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as SimTransactionsResponse;

        const params = new URLSearchParams();
        if (options.limit) params.set('limit', options.limit.toString());

        const url = `${SIM_BETA_BASE}/svm/transactions/${address}${params.toString() ? '?' + params.toString() : ''}`;

        try {
            const data = await this.fetchWithAuth<SimTransactionsResponse>(url);
            // Cache for 5 minutes - transaction history doesn't change
            cache.set(cacheKey, data, 300);
            return data;
        } catch (error) {
            console.error('[DuneSimClient] Error fetching transactions:', error);
            throw error;
        }
    }

    /**
     * Convert SIM balances response to FundTracer format
     */
    mapBalancesToPortfolio(simResponse: SimBalancesResponse): SimPortfolio {
        const { balances, wallet_address } = simResponse;

        // Find SOL (native token)
        const solBalance = balances.find(b => b.address === 'native');
        const solLamports = solBalance ? parseInt(solBalance.amount) : 0;
        const solUsd = solBalance?.value_usd || 0;
        const solPrice = solBalance?.price_usd || 0;

        // Filter to non-native tokens (SPL tokens)
        const tokens: SimToken[] = balances
            .filter(b => b.address !== 'native')
            .map(token => ({
                mint: token.address,
                amount: parseInt(token.amount),
                decimals: token.decimals,
                uiAmount: parseFloat(token.balance),
                symbol: token.symbol,
                name: token.name,
                logoUrl: token.uri || undefined,
                price: token.price_usd,
                value: token.value_usd,
            }))
            .filter(t => t.uiAmount > 0);

        const totalUsd = solUsd + tokens.reduce((sum, t) => sum + (t.value || 0), 0);

        return {
            address: wallet_address,
            sol: {
                lamports: solLamports,
                sol: solLamports / LAMPORTS_PER_SOL,
                usd: solUsd,
            },
            tokens,
            totalUsd,
            fetchedAt: Date.now(),
        };
    }

    /**
     * Convert SIM transactions to FundTracer format
     */
    mapTransactions(simResponse: SimTransactionsResponse): SimTransactionFormatted[] {
        const { transactions } = simResponse;

        return transactions.map(tx => {
            const rawTx = tx.raw_transaction;
            const meta = rawTx?.meta;
            const message = rawTx?.transaction?.message;
            const instructions = message?.instructions || [];

            // Parse instructions to find transfer details
            let from = '';
            let to = '';
            let amount = 0;
            let token = '';
            let tokenAmount = 0;
            let type = 'unknown';

            if (message?.accountKeys?.[0]) {
                from = typeof message.accountKeys[0] === 'string' 
                    ? message.accountKeys[0] 
                    : (message.accountKeys[0]?.pubkey || '');
            }

            // Parse instructions - check different formats
            for (const ix of instructions) {
                // Check if it's parsed instruction (solana-web3.js format)
                if (ix.parsed) {
                    if (ix.parsed.type === 'transfer') {
                        to = ix.parsed.info?.destination || '';
                        amount = parseInt(ix.parsed.info?.lamports || '0');
                        type = 'transfer';
                        break;
                    } else if (ix.parsed.type === 'transferChecked') {
                        to = ix.parsed.info?.destination || '';
                        token = ix.parsed.info?.mint || '';
                        tokenAmount = parseFloat(ix.parsed.info?.tokenAmount?.amount || '0');
                        type = 'token-transfer';
                        break;
                    }
                } 
                // Check for program-based detection (raw instruction format)
                else if (ix.program) {
                    if (ix.program === 'system' || ix.programIdIndex === 0) {
                        type = 'transfer';
                    } else if (ix.program === 'token' || ix.programIdIndex === 2) {
                        type = 'token-transfer';
                    } else if (ix.program === 'stake') {
                        type = 'staking';
                    }
                }
            }

            // If still unknown, check for token program in accountKeys
            if (type === 'unknown' && message?.accountKeys) {
                const tokenProgramIdx = message.accountKeys.findIndex((k: any) => 
                    k === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' || 
                    (typeof k === 'object' && k?.pubkey === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
                );
                if (tokenProgramIdx > -1) {
                    type = 'token-transfer';
                }
            }

            // Convert block_time from microseconds to milliseconds
            const blockTimeMs = tx.block_time ? Math.floor(tx.block_time / 1000) : Date.now() * 1000;

            return {
                signature: rawTx?.transaction?.signatures?.[0] || '',
                slot: tx.block_slot,
                blockTime: blockTimeMs,
                fee: meta?.fee || 0,
                status: meta?.err ? 'failed' : 'success',
                type,
                from,
                to,
                amount: amount > 0 ? amount / LAMPORTS_PER_SOL : undefined,
                token,
                tokenAmount: tokenAmount > 0 ? tokenAmount : undefined,
                instructions: instructions.map((ix: any) => ix.parsed || ix),
            };
        });
    }

    /**
     * Get portfolio with spam filtering option
     */
    async getFilteredPortfolio(
        address: string,
        filterOptions: {
            excludeSpamTokens?: boolean;
            excludeUnpriced?: boolean;
            minLiquidity?: number;
        } = {}
    ): Promise<SimPortfolio> {
        const simResponse = await this.getBalances(address, {
            excludeSpamTokens: filterOptions.excludeSpamTokens,
            excludeUnpriced: filterOptions.excludeUnpriced,
        });

        let balances = simResponse.balances;

        // Additional liquidity filter if minLiquidity specified
        if (filterOptions.minLiquidity && filterOptions.minLiquidity > 0) {
            balances = balances.filter(b => 
                !b.low_liquidity && (b.pool_size || 0) >= filterOptions.minLiquidity!
            );
        }

        return this.mapBalancesToPortfolio({
            ...simResponse,
            balances,
        });
    }

    // ============================================================
    // EVM METHODS (using /v1/evm/* endpoints)
    // ============================================================

    /**
     * Convert chain name to chain_id
     */
    private getChainId(chainName: string): number {
        return EVM_CHAIN_IDS[chainName.toLowerCase()] || EVM_CHAIN_IDS[chainName] || 1;
    }

    /**
     * Get EVM token balances for a wallet
     * Endpoint: GET /v1/evm/balances/{address}
     */
    async getEvmBalances(
        address: string,
        options: {
            chainIds?: number | number[];  // Chain IDs or 'default'
            filters?: 'erc20' | 'native';
            assetClass?: 'stablecoin';
            excludeSpamTokens?: boolean;
            excludeUnpriced?: boolean;
            metadata?: 'logo' | 'url' | 'pools';
            historicalPrices?: string; // e.g., "168,720,24" for 7d, 30d, 24h ago
            limit?: number;
            offset?: string;
        } = {}
    ): Promise<{
        wallet_address: string;
        balances: Array<{
            chain: string;
            chain_id: number;
            address: string;
            amount: string;
            symbol: string;
            name: string;
            decimals: number;
            price_usd: number;
            value_usd: number;
            pool_size?: number;
            low_liquidity?: boolean;
            token_metadata?: { logo?: string; url?: string };
            pool?: { pool_type: string; address: string; chain_id: number; tokens: string[] };
            historical_prices?: Array<{ offset_hours: number; price_usd: number }>;
        }>;
        next_offset?: string;
        warnings?: Array<{ code: string; message: string; chain_ids?: number[] }>;
        request_time: string;
        response_time: string;
    }> {
        const cacheKey = `sim:evm:balances:${address}:${JSON.stringify(options)}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as ReturnType<typeof this.getEvmBalances> extends (...args: any[]) => Promise<infer R> ? R : never;

        const params = new URLSearchParams();
        
        if (options.chainIds) {
            if (Array.isArray(options.chainIds)) {
                params.set('chain_ids', options.chainIds.join(','));
            } else {
                params.set('chain_ids', options.chainIds.toString());
            }
        }
        if (options.filters) params.set('filters', options.filters);
        if (options.assetClass) params.set('asset_class', options.assetClass);
        if (options.excludeSpamTokens) params.set('exclude_spam_tokens', 'true');
        if (options.excludeUnpriced) params.set('exclude_unpriced', 'true');
        if (options.metadata) params.set('metadata', options.metadata);
        if (options.historicalPrices) params.set('historical_prices', options.historicalPrices);
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.offset) params.set('offset', options.offset);

        const url = `${SIM_V1_BASE}/evm/balances/${address}${params.toString() ? '?' + params.toString() : ''}`;

        try {
            const data = await this.fetchWithAuth<any>(url);
            // Cache for 60 seconds - balances change on-chain
            cache.set(cacheKey, data, 60);
            return data;
        } catch (error) {
            console.error('[DuneSimClient] Error fetching EVM balances:', error);
            throw error;
        }
    }

    /**
     * Get EVM activity for a wallet
     * Endpoint: GET /v1/evm/activity/{address}
     */
    async getEvmActivity(
        address: string,
        options: {
            chainIds?: number | number[];
            activityType?: string; // send,receive,mint,burn,swap,approve,call
            assetType?: string;    // native,erc20,erc721,erc1155
            tokenAddress?: string;
            limit?: number;
            offset?: string;
        } = {}
    ): Promise<{
        wallet_address: string;
        activity: Array<{
            chain_id: number;
            block_number: number;
            block_time: string;
            tx_hash: string;
            type: string;
            asset_type: string;
            token_address?: string;
            from?: string;
            to?: string;
            value: string;
            value_usd: number;
            id?: string;
            spender?: string;
            token_metadata?: { symbol: string; decimals: number; name?: string; price_usd?: number; pool_size?: number };
            function?: { signature: string; name: string; inputs: Array<{ name: string; type: string; value: string }> };
            from_token_address?: string;
            from_token_value?: string;
            from_token_metadata?: { symbol: string; decimals: number };
            to_token_address?: string;
            to_token_value?: string;
            to_token_metadata?: { symbol: string; decimals: number };
        }>;
        next_offset?: string;
        warnings?: Array<{ code: string; message: string; chain_ids?: number[] }>;
        request_time: string;
        response_time: string;
    }> {
        const cacheKey = `sim:evm:activity:${address}:${JSON.stringify(options)}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as ReturnType<typeof this.getEvmActivity> extends (...args: any[]) => Promise<infer R> ? R : never;

        const params = new URLSearchParams();
        if (options.chainIds) {
            params.set('chain_ids', Array.isArray(options.chainIds) ? options.chainIds.join(',') : options.chainIds.toString());
        }
        if (options.activityType) params.set('activity_type', options.activityType);
        if (options.assetType) params.set('asset_type', options.assetType);
        if (options.tokenAddress) params.set('token_address', options.tokenAddress);
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.offset) params.set('offset', options.offset);

        const url = `${SIM_V1_BASE}/evm/activity/${address}${params.toString() ? '?' + params.toString() : ''}`;

        try {
            const data = await this.fetchWithAuth<any>(url);
            cache.set(cacheKey, data, 30); // Cache 30 seconds
            return data;
        } catch (error) {
            console.error('[DuneSimClient] Error fetching EVM activity:', error);
            throw error;
        }
    }

    /**
     * Get EVM transactions for a wallet
     * Endpoint: GET /v1/evm/transactions/{address}
     */
    async getEvmTransactions(
        address: string,
        options: {
            chainIds?: number | number[];
            limit?: number;
            offset?: string;
            decode?: boolean;
        } = {}
    ): Promise<{
        wallet_address: string;
        transactions: Array<{
            address: string;
            block_hash: string;
            block_number: string;
            block_time: string;
            chain: string;
            from: string;
            to: string;
            hash: string;
            data: string;
            gas_price: string;
            value: string;
            transaction_type: string;
            nonce?: string;
            max_fee_per_gas?: string;
            max_priority_fee_per_gas?: string;
            decoded?: { name: string; inputs: Array<{ name: string; type: string; value: string }> };
            logs?: Array<{
                address: string;
                topics: string[];
                data: string;
                decoded?: { name: string; inputs: Array<{ name: string; type: string; value: string }> };
            }>;
        }>;
        next_offset?: string;
        warnings?: Array<{ code: string; message: string; chain_ids?: number[] }>;
        request_time: string;
        response_time: string;
    }> {
        const cacheKey = `sim:evm:txs:${address}:${JSON.stringify(options)}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as ReturnType<typeof this.getEvmTransactions> extends (...args: any[]) => Promise<infer R> ? R : never;

        const params = new URLSearchParams();
        if (options.chainIds) {
            params.set('chain_ids', Array.isArray(options.chainIds) ? options.chainIds.join(',') : options.chainIds.toString());
        }
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.offset) params.set('offset', options.offset);
        if (options.decode) params.set('decode', 'true');

        const url = `${SIM_V1_BASE}/evm/transactions/${address}${params.toString() ? '?' + params.toString() : ''}`;

        try {
            const data = await this.fetchWithAuth<any>(url);
            cache.set(cacheKey, data, 300); // Cache 5 minutes
            return data;
        } catch (error) {
            console.error('[DuneSimClient] Error fetching EVM transactions:', error);
            throw error;
        }
    }

    /**
     * Get EVM collectibles (NFTs) for a wallet
     * Endpoint: GET /v1/evm/collectibles/{address}
     */
    async getEvmCollectibles(
        address: string,
        options: {
            chainIds?: number | number[];
            limit?: number;
            offset?: string;
            filterSpam?: boolean;
            showSpamScores?: boolean;
        } = {}
    ): Promise<{
        wallet_address: string;
        entries: Array<{
            contract_address: string;
            token_standard: 'ERC721' | 'ERC1155';
            token_id: string;
            chain: string;
            chain_id: number;
            name: string;
            symbol?: string;
            description?: string;
            image_url?: string;
            last_sale_price?: string;
            metadata?: {
                uri?: string;
                attributes?: Array<{ key: string; value: string; format?: string }>;
            };
            balance: string;
            last_acquired: string;
            is_spam: boolean;
            spam_score?: number;
            explanations?: Array<{
                feature: string;
                value: any;
                feature_score: number;
                feature_weight: number;
            }>;
        }>;
        next_offset?: string;
        warnings?: Array<{ code: string; message: string; chain_ids?: number[] }>;
        request_time: string;
        response_time: string;
    }> {
        const cacheKey = `sim:evm:collectibles:${address}:${JSON.stringify(options)}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as ReturnType<typeof this.getEvmCollectibles> extends (...args: any[]) => Promise<infer R> ? R : never;

        const params = new URLSearchParams();
        if (options.chainIds) {
            params.set('chain_ids', Array.isArray(options.chainIds) ? options.chainIds.join(',') : options.chainIds.toString());
        }
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.offset) params.set('offset', options.offset);
        if (options.filterSpam === false) params.set('filter_spam', 'false');
        if (options.showSpamScores) params.set('show_spam_scores', 'true');

        const url = `${SIM_V1_BASE}/evm/collectibles/${address}${params.toString() ? '?' + params.toString() : ''}`;

        try {
            const data = await this.fetchWithAuth<any>(url);
            cache.set(cacheKey, data, 300); // Cache 5 minutes
            return data;
        } catch (error) {
            console.error('[DuneSimClient] Error fetching EVM collectibles:', error);
            throw error;
        }
    }

    /**
     * Get token info for an EVM token
     * Endpoint: GET /v1/evm/token-info/{address}
     */
    async getEvmTokenInfo(
        tokenAddress: string,
        chainId: number = 1
    ): Promise<{
        token: {
            address: string;
            chain: string;
            chain_id: number;
            symbol: string;
            name: string;
            decimals: number;
            total_supply: string;
            price_usd: number;
            pool_size?: number;
            low_liquidity?: boolean;
            pool?: { pool_type: string; address: string; chain_id: number; tokens: string[] };
        };
        request_time: string;
        response_time: string;
    }> {
        const cacheKey = `sim:evm:tokeninfo:${tokenAddress}:${chainId}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as ReturnType<typeof this.getEvmTokenInfo> extends (...args: any[]) => Promise<infer R> ? R : never;

        const url = `${SIM_V1_BASE}/evm/token-info/${tokenAddress}?chain_ids=${chainId}`;

        try {
            const data = await this.fetchWithAuth<any>(url);
            cache.set(cacheKey, data, 300); // Cache 5 minutes
            return data;
        } catch (error) {
            console.error('[DuneSimClient] Error fetching token info:', error);
            throw error;
        }
    }

    /**
     * Get stablecoin balances for a wallet
     * Endpoint: GET /v1/evm/stablecoins/{address}
     */
    async getEvmStablecoins(
        address: string,
        options: {
            chainIds?: number | number[];
            excludeUnpriced?: boolean;
            limit?: number;
            offset?: string;
        } = {}
    ): Promise<{
        wallet_address: string;
        balances: Array<{
            chain: string;
            chain_id: number;
            address: string;
            amount: string;
            symbol: string;
            name: string;
            decimals: number;
            price_usd: number;
            value_usd: number;
        }>;
        next_offset?: string;
        warnings?: Array<{ code: string; message: string; chain_ids?: number[] }>;
        request_time: string;
        response_time: string;
    }> {
        const cacheKey = `sim:evm:stablecoins:${address}:${JSON.stringify(options)}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as ReturnType<typeof this.getEvmStablecoins> extends (...args: any[]) => Promise<infer R> ? R : never;

        const params = new URLSearchParams();
        if (options.chainIds) {
            params.set('chain_ids', Array.isArray(options.chainIds) ? options.chainIds.join(',') : options.chainIds.toString());
        }
        if (options.excludeUnpriced) params.set('exclude_unpriced', 'true');
        if (options.limit) params.set('limit', options.limit.toString());
        if (options.offset) params.set('offset', options.offset);

        const url = `${SIM_V1_BASE}/evm/stablecoins/${address}${params.toString() ? '?' + params.toString() : ''}`;

        try {
            const data = await this.fetchWithAuth<any>(url);
            cache.set(cacheKey, data, 60);
            return data;
        } catch (error) {
            console.error('[DuneSimClient] Error fetching stablecoins:', error);
            throw error;
        }
    }

    /**
     * Get full EVM portfolio (tokens + NFTs + activity summary)
     */
    async getEvmPortfolio(
        address: string,
        chainId: number = 1,
        options: {
            includeNfts?: boolean;
            includeActivity?: boolean;
            includeStablecoins?: boolean;
        } = {}
    ): Promise<{
        address: string;
        chain_id: number;
        total_value_usd: number;
        native: { balance: string; value_usd: number; symbol: string };
        tokens: Array<{
            address: string;
            balance: string;
            value_usd: number;
            symbol: string;
            name: string;
            decimals: number;
            price_usd: number;
            pool_size?: number;
            low_liquidity?: boolean;
            logo?: string;
        }>;
        stablecoins: Array<{
            address: string;
            balance: string;
            value_usd: number;
            symbol: string;
        }>;
        nfts?: Array<{
            contract_address: string;
            token_id: string;
            name: string;
            image_url?: string;
            collection: string;
            is_spam: boolean;
        }>;
        activity_summary?: {
            total_sends: number;
            total_receives: number;
            total_volume_usd: number;
        };
        last_updated: string;
    }> {
        // Always fetch balances first
        const balancesResult = await this.getEvmBalances(address, { chainIds: chainId, excludeUnpriced: true, metadata: 'logo' });
        
        // Process tokens and native
        let totalValue = 0;
        const tokens: Array<{
            address: string;
            balance: string;
            value_usd: number;
            symbol: string;
            name: string;
            decimals: number;
            price_usd: number;
            pool_size?: number;
            low_liquidity?: boolean;
            logo?: string;
        }> = [];
        let nativeBalance = '0';
        let nativeValue = 0;

        for (const bal of balancesResult.balances || []) {
            totalValue += bal.value_usd || 0;
            
            if (bal.address === 'native') {
                nativeBalance = bal.amount;
                nativeValue = bal.value_usd || 0;
            } else {
                tokens.push({
                    address: bal.address,
                    balance: bal.amount,
                    value_usd: bal.value_usd || 0,
                    symbol: bal.symbol,
                    name: bal.name,
                    decimals: bal.decimals,
                    price_usd: bal.price_usd || 0,
                    pool_size: bal.pool_size,
                    low_liquidity: bal.low_liquidity,
                    logo: bal.token_metadata?.logo,
                });
            }
        }

        // Stablecoins (optional)
        const stablecoinsList: Array<{
            address: string;
            balance: string;
            value_usd: number;
            symbol: string;
        }> = [];
        if (options.includeStablecoins) {
            try {
                const stableResult = await this.getEvmStablecoins(address, { chainIds: chainId });
                for (const bal of stableResult.balances || []) {
                    stablecoinsList.push({
                        address: bal.address,
                        balance: bal.amount,
                        value_usd: bal.value_usd || 0,
                        symbol: bal.symbol,
                    });
                }
            } catch (e) {
                console.warn('[DuneSimClient] Stablecoins fetch failed:', e);
            }
        }

        // NFTs (optional)
        const nftList: Array<{
            contract_address: string;
            token_id: string;
            name: string;
            image_url?: string;
            collection: string;
            is_spam: boolean;
        }> = [];
        if (options.includeNfts) {
            try {
                const nftResult = await this.getEvmCollectibles(address, { chainIds: chainId, filterSpam: true });
                for (const nft of nftResult.entries || []) {
                    nftList.push({
                        contract_address: nft.contract_address,
                        token_id: nft.token_id,
                        name: nft.name,
                        image_url: nft.image_url,
                        collection: nft.symbol || nft.name,
                        is_spam: nft.is_spam,
                    });
                }
            } catch (e) {
                console.warn('[DuneSimClient] Collectibles fetch failed:', e);
            }
        }

        // Activity summary (optional)
        let activitySummary: { total_sends: number; total_receives: number; total_volume_usd: number } | undefined;
        if (options.includeActivity) {
            try {
                const activityResult = await this.getEvmActivity(address, { chainIds: chainId, limit: 100 });
                let sends = 0, receives = 0, volume = 0;
                
                for (const act of activityResult.activity || []) {
                    if (act.type === 'send') sends++;
                    if (act.type === 'receive') receives++;
                    volume += act.value_usd || 0;
                }
                
                activitySummary = {
                    total_sends: sends,
                    total_receives: receives,
                    total_volume_usd: volume,
                };
            } catch (e) {
                console.warn('[DuneSimClient] Activity fetch failed:', e);
            }
        }

        return {
            address,
            chain_id: chainId,
            total_value_usd: totalValue + nativeValue,
            native: {
                balance: nativeBalance,
                value_usd: nativeValue,
                symbol: 'ETH',
            },
            tokens,
            stablecoins: options.includeStablecoins ? stablecoinsList : [],
            nfts: options.includeNfts ? nftList : undefined,
            activity_summary: options.includeActivity ? activitySummary : undefined,
            last_updated: new Date().toISOString(),
        };
    }
}

// Export singleton instance
export const duneSimClient = new DuneSimClient();