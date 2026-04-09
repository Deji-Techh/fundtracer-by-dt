// ============================================================
// FundTracer by DT - Solana Portfolio Service
// Complete wallet analysis - Portfolio, Transactions, NFTs, DeFi, Risk
// ============================================================

import { solanaKeyPool } from './SolanaKeyPoolManager.js';
import { solanaHeliusClient } from './SolanaHeliusClient.js';
import { cache } from '../utils/cache.js';
import fetch from 'node-fetch';

const LAMPORTS_PER_SOL = 1_000_000_000;
const JUPITER_PRICE_API = 'https://price.jup.ag/v6/price';

export interface SolanaToken {
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

export interface SolanaStakeAccount {
    stakePubkey: string;
    delegator: string;
    validator: string;
    activationEpoch: number;
    stake: number;
    active: boolean;
}

export interface SolanaPortfolio {
    address: string;
    sol: {
        lamports: number;
        sol: number;
        usd: number;
    };
    tokens: SolanaToken[];
    staking: SolanaStakeAccount[];
    totalUsd: number;
    fetchedAt: number;
}

export interface SolanaTransaction {
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

export interface SolanaNFT {
    id: string;
    mint: string;
    owner: string;
    name: string;
    symbol?: string;
    imageUrl?: string;
    collection?: string;
    collectionImage?: string;
    attributes?: Record<string, string>;
}

export interface DeFiPosition {
    protocol: string;
    type: string;
    amount: number;
    value: number;
    token: string;
    apy?: number;
}

export interface SolanaRiskAnalysis {
    score: number;
    signals: {
        id: string;
        name: string;
        detected: boolean;
        severity: 'low' | 'medium' | 'high';
    }[];
    factors: {
        label: string;
        value: string;
        risk: number;
    }[];
}

export class SolanaPortfolioService {
    private priceCache = new Map<string, number>();

    async getPortfolio(address: string): Promise<SolanaPortfolio> {
        const cacheKey = `solana:portfolio:${address}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as SolanaPortfolio;

        const [balance, tokenAccounts, stakeAccounts] = await Promise.all([
            this.getBalance(address),
            this.getTokenAccounts(address),
            this.getStakeAccounts(address),
        ]);

        const mints = tokenAccounts.map(t => t.mint).filter(Boolean);
        const prices = await this.getBatchPrices(mints);

        const tokens = tokenAccounts.map(t => {
            const price = prices[t.mint] || 0;
            return {
                ...t,
                price,
                value: t.uiAmount * price,
            };
        }).filter(t => t.uiAmount > 0);

        const solPrice = prices['So11111111111111111111111111111111111111112'] || 0;
        const totalUsd = (balance / LAMPORTS_PER_SOL) * solPrice + tokens.reduce((sum, t) => sum + (t.value || 0), 0);

        const portfolio: SolanaPortfolio = {
            address,
            sol: {
                lamports: balance,
                sol: balance / LAMPORTS_PER_SOL,
                usd: (balance / LAMPORTS_PER_SOL) * solPrice,
            },
            tokens,
            staking: stakeAccounts,
            totalUsd,
            fetchedAt: Date.now(),
        };

        cache.set(cacheKey, portfolio, 60);
        return portfolio;
    }

    private async getBalance(address: string): Promise<number> {
        return solanaKeyPool.execute(async (endpoint) => {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getBalance',
                    params: [address],
                }),
            });
            const data = await res.json();
            return data.result?.value || 0;
        }, 1);
    }

    private async getTokenAccounts(address: string): Promise<SolanaToken[]> {
        const [token2022, token2022Program] = await Promise.all([
            this.getTokensByProgram(address, 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
            this.getTokensByProgram(address, 'TokenzQdBNbLqP5VEhdkAS6dFvwzYqE8hpzEfb9Kh'),
        ]);

        return [...token2022, ...token2022Program];
    }

    private async getTokensByProgram(address: string, programId: string): Promise<SolanaToken[]> {
        try {
            return await solanaKeyPool.execute(async (endpoint) => {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getParsedTokenAccountsByOwner',
                        params: [address, { programId }],
                    }),
                });
                const data = await res.json();
                const accounts = data.result?.value || [];
                return accounts.map((acc: any) => {
                    const info = acc.account.data.parsed.info;
                    return {
                        mint: info.mint,
                        amount: BigInt(info.tokenAmount.amount),
                        decimals: info.tokenAmount.decimals,
                        uiAmount: info.tokenAmount.uiAmount || 0,
                    };
                }).filter((t: SolanaToken) => t.uiAmount > 0);
            }, 10);
        } catch (e) {
            console.error(`[SolanaPortfolio] Error fetching tokens for program ${programId}:`, e);
            return [];
        }
    }

    private async getStakeAccounts(address: string): Promise<SolanaStakeAccount[]> {
        try {
            return await solanaKeyPool.execute(async (endpoint) => {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getStakeAccounts',
                        params: [address],
                    }),
                });
                const data = await res.json();
                return data.result || [];
            }, 5);
        } catch (e) {
            return [];
        }
    }

    async getTransactions(address: string, limit = 100): Promise<SolanaTransaction[]> {
        const cacheKey = `solana:txs:${address}:${limit}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as SolanaTransaction[];

        const signatures = await this.getSignatures(address, limit);
        if (signatures.length === 0) return [];

        const transactions = await Promise.all(
            signatures.map(sig => this.getTransaction(sig))
        );

        const txs = transactions.filter(Boolean);
        cache.set(cacheKey, txs, 300);
        return txs;
    }

    private async getSignatures(address: string, limit: number): Promise<string[]> {
        return solanaKeyPool.execute(async (endpoint) => {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getSignaturesForAddress',
                    params: [address, { limit, commitment: 'confirmed' }],
                }),
            });
            const data = await res.json();
            return data.result?.map((s: any) => s.signature) || [];
        }, 1);
    }

    private async getTransaction(signature: string): Promise<SolanaTransaction | null> {
        try {
            return await solanaKeyPool.execute(async (endpoint) => {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'getTransaction',
                        params: [signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 }],
                    }),
                });
                const data = await res.json();
                if (!data.result) return null;

                const tx = data.result;
                const meta = tx.meta;
                const instructions = tx.transaction.message.instructions;

                let from = '';
                let to = '';
                let amount = 0;
                let token = '';
                let tokenAmount = 0;

                if (tx.transaction.message.accountKeys?.[0]) {
                    from = tx.transaction.message.accountKeys[0].pubkey;
                }

                for (const ix of instructions) {
                    if (ix.parsed) {
                        if (ix.parsed.type === 'transfer') {
                            to = ix.parsed.info.destination;
                            amount = ix.parsed.info.lamports || 0;
                        } else if (ix.parsed.type === 'transferChecked') {
                            to = ix.parsed.info.destination;
                            token = ix.parsed.info.mint;
                            tokenAmount = parseFloat(ix.parsed.info.tokenAmount?.amount || '0');
                        }
                    }
                }

                return {
                    signature,
                    slot: tx.slot,
                    blockTime: tx.blockTime * 1000,
                    fee: meta?.fee || 0,
                    status: meta?.err ? 'failed' : 'success',
                    type: this.inferTransactionType(instructions),
                    from,
                    to,
                    amount: amount > 0 ? amount / LAMPORTS_PER_SOL : undefined,
                    token,
                    tokenAmount: tokenAmount > 0 ? tokenAmount : undefined,
                    instructions: instructions.map((ix: any) => ix.parsed || ix),
                };
            }, 1);
        } catch (e) {
            return null;
        }
    }

    private inferTransactionType(instructions: any[]): string {
        for (const ix of instructions) {
            if (ix.parsed?.type) return ix.parsed.type;
            if (ix.program === 'system') return 'transfer';
            if (ix.program === 'token') return 'token-transfer';
            if (ix.program === 'stake') return 'staking';
            if (ix.program === 'vote') return 'vote';
            if (ix.program === 'sysvar') return 'system';
        }
        return 'unknown';
    }

    async getNFTs(address: string): Promise<SolanaNFT[]> {
        const cacheKey = `solana:nfts:${address}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as SolanaNFT[];

        try {
            const assets = await solanaHeliusClient.getAssetsByOwner({ owner: address, limit: 100 });
            const nfts: SolanaNFT[] = ((assets as any).items || []).map((item: any) => ({
                id: item.id,
                mint: item.id,
                owner: address,
                name: item.content?.metadata?.name || 'Unknown',
                symbol: item.content?.metadata?.symbol,
                imageUrl: item.content?.links?.image,
                collection: item.grouping?.find((g: any) => g.groupKey === 'collection')?.groupValue,
                collectionImage: item.content?.links?.image,
                attributes: item.content?.metadata?.attributes,
            }));

            cache.set(cacheKey, nfts, 300);
            return nfts;
        } catch (e) {
            console.error('[SolanaPortfolio] Error fetching NFTs:', e);
            return [];
        }
    }

    async getDeFiPositions(address: string): Promise<DeFiPosition[]> {
        const positions: DeFiPosition[] = [];

        try {
            const tokens = await this.getTokenAccounts(address);

            const raydiumPools = ['RAYdium', 'Raydium', 'LP'];
            const jupiterTokens = ['JUP', 'jup'];

            for (const token of tokens) {
                if (raydiumPools.some(p => token.name?.includes(p) || token.symbol?.includes(p))) {
                    positions.push({
                        protocol: 'Raydium',
                        type: 'Liquidity Pool',
                        amount: token.uiAmount,
                        value: token.value || 0,
                        token: token.symbol || token.mint.slice(0, 8),
                    });
                }

                if (jupiterTokens.includes(token.symbol || '')) {
                    positions.push({
                        protocol: 'Jupiter',
                        type: 'Token',
                        amount: token.uiAmount,
                        value: token.value || 0,
                        token: token.symbol || '',
                    });
                }
            }
        } catch (e) {
            console.error('[SolanaPortfolio] Error fetching DeFi positions:', e);
        }

        return positions;
    }

    async getRiskAnalysis(address: string): Promise<SolanaRiskAnalysis> {
        const cacheKey = `solana:risk:${address}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as SolanaRiskAnalysis;

        const [balance, signatures, tokens] = await Promise.all([
            this.getBalance(address),
            this.getSignaturesWithTime(address, 100),
            this.getTokenAccounts(address),
        ]);

        const signals: SolanaRiskAnalysis['signals'] = [];
        let score = 0;

        const solBalance = balance / LAMPORTS_PER_SOL;
        if (solBalance < 0.01) {
            score += 20;
            signals.push({ id: 'low_balance', name: 'Near-Zero SOL Balance', detected: true, severity: 'high' });
        }

        if (signatures.length > 0) {
            const firstTx = signatures[0];
            if (firstTx.blockTime) {
                const age = Date.now() - firstTx.blockTime * 1000;
                if (age < 30 * 24 * 60 * 60 * 1000) {
                    score += 15;
                    signals.push({ id: 'new_wallet', name: 'Wallet Created Recently', detected: true, severity: 'medium' });
                }
            }
        }

        const spamTokens = tokens.filter(t => t.uiAmount < 1 && t.decimals > 6);
        if (spamTokens.length > 10) {
            score += 10;
            signals.push({ id: 'spam_tokens', name: 'Many Low-Value Tokens (Potential Dust)', detected: true, severity: 'medium' });
        }

        const unknownTokens = tokens.filter(t => !t.symbol);
        if (unknownTokens.length > 5) {
            score += 5;
            signals.push({ id: 'unknown_tokens', name: 'Many Unidentified Tokens', detected: true, severity: 'low' });
        }

        const result: SolanaRiskAnalysis = {
            score: Math.min(score, 100),
            signals,
            factors: [
                { label: 'SOL Balance', value: `${solBalance.toFixed(2)} SOL`, risk: solBalance < 0.1 ? 30 : 0 },
                { label: 'Transaction Count', value: `${signatures.length} txs`, risk: 0 },
                { label: 'Token Count', value: `${tokens.length} tokens`, risk: tokens.length > 20 ? 10 : 0 },
                { label: 'NFT Count', value: 'Check NFT tab', risk: 0 },
            ],
        };

        cache.set(cacheKey, result, 3600);
        return result;
    }

    private async getSignaturesWithTime(address: string, limit: number): Promise<{ signature: string; blockTime: number }[]> {
        return solanaKeyPool.execute(async (endpoint) => {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getSignaturesForAddress',
                    params: [address, { limit, commitment: 'confirmed' }],
                }),
            });
            const data = await res.json();
            return data.result?.map((s: any) => ({ signature: s.signature, blockTime: s.blockTime || 0 })) || [];
        }, 1);
    }

    async getBatchPrices(mints: string[]): Promise<Record<string, number>> {
        const missing = mints.filter(m => !this.priceCache.has(m));
        
        if (missing.length > 0) {
            const chunks = this.chunk(missing, 100);
            for (const chunk of chunks) {
                try {
                    const ids = chunk.join(',');
                    const res = await fetch(`${JUPITER_PRICE_API}?ids=${ids}`);
                    const data = await res.json();
                    if (data.data) {
                        for (const [mint, info] of Object.entries(data.data)) {
                            this.priceCache.set(mint, (info as any).price || 0);
                        }
                    }
                } catch (e) {
                    console.error('[SolanaPortfolio] Error fetching prices:', e);
                }
            }
        }

        const prices: Record<string, number> = {};
        for (const mint of mints) {
            prices[mint] = this.priceCache.get(mint) || 0;
        }
        return prices;
    }

    private chunk<T>(arr: T[], size: number): T[][] {
        const chunks: T[][] = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }
}

export const solanaPortfolioService = new SolanaPortfolioService();