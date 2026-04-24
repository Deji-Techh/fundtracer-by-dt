// ============================================================
// FundTracer - Dune SIM Client
// Real-time blockchain data API (Solana/SVM support)
// ============================================================

import fetch from 'node-fetch';
import { cache } from '../utils/cache.js';

const SIM_API_BASE = 'https://api.sim.dune.com';
const SIM_BETA_BASE = 'https://api.sim.dune.com/beta';

export interface SimBalance {
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
                from = message.accountKeys[0].pubkey || message.accountKeys[0];
            }

            for (const ix of instructions) {
                if (ix.parsed) {
                    if (ix.parsed.type === 'transfer') {
                        to = ix.parsed.info?.destination || '';
                        amount = parseInt(ix.parsed.info?.lamports || '0');
                        type = 'transfer';
                    } else if (ix.parsed.type === 'transferChecked') {
                        to = ix.parsed.info?.destination || '';
                        token = ix.parsed.info?.mint || '';
                        tokenAmount = parseFloat(ix.parsed.info?.tokenAmount?.amount || '0');
                        type = 'token-transfer';
                    }
                } else if (ix.program === 'system') {
                    type = 'transfer';
                } else if (ix.program === 'token') {
                    type = 'token-transfer';
                } else if (ix.program === 'stake') {
                    type = 'staking';
                }
            }

            return {
                signature: tx.raw_transaction?.transaction?.signatures?.[0] || '',
                slot: tx.block_slot,
                blockTime: tx.block_time,
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
}

// Export singleton instance
export const duneSimClient = new DuneSimClient();