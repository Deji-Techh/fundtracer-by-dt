// ============================================================
// FundTracer by DT - Solana Portfolio Service
// Complete wallet analysis - Portfolio, Transactions, NFTs, DeFi, Risk
// Powered by Dune SIM for portfolio data and Alchemy Solana RPC for activity data
// ============================================================

import { solanaKeyPool } from './SolanaKeyPoolManager.js';
import { duneSimClient } from './DuneSimClient.js';
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

export interface PortfolioFilterOptions {
    excludeSpamTokens?: boolean;
    excludeUnpriced?: boolean;
    minLiquidity?: number;
}

export interface SolanaOverviewResult {
    wallet: string;
    firstTimestamp: string;
    lastTimestamp: string;
    activityPeriodDays: number;
    totalTransactions: number;
    totalSOLSent: string;
    totalSOLReceived: string;
    uniqueAddressCount: number;
    uniqueAddresses: string[];
    topInteractors: { address: string; count: number }[];
    scanTimeMs: number;
}

export class SolanaPortfolioService {
    private priceCache = new Map<string, number>();

    /**
     * Helius-powered signature pagination.
     * Returns newest first and blockTime is Unix seconds.
     */
    async getSignaturesViaAlchemy(
        address: string,
        maxSignatures = 50000
    ): Promise<{ signature: string; blockTime: number; err: any; slot: number }[]> {
        const allSigs: { signature: string; blockTime: number; err: any; slot: number }[] = [];
        let paginationToken: string | undefined;

        try {
            while (allSigs.length < maxSignatures) {
                const limit = Math.min(1000, maxSignatures - allSigs.length);
                const page = await solanaHeliusClient.getTransactionsForAddress(address, {
                    transactionDetails: 'signatures',
                    sortOrder: 'desc',
                    limit,
                    paginationToken,
                });

                const batch = page.data.map((s: any) => ({
                    signature: s.signature || s.transactionSignature || s.txHash || '',
                    blockTime: this.normalizeBlockTime(s.blockTime || s.timestamp || s.block_time || 0),
                    err: s.err || s.error || null,
                    slot: s.slot || s.blockSlot || s.block_slot || 0,
                })).filter((s: { signature: string }) => s.signature);
                if (batch.length === 0) break;
                allSigs.push(...batch);
                paginationToken = page.paginationToken;
                if (!paginationToken || batch.length < limit) break;
            }
        } catch (error: any) {
            console.warn(`[SolanaPortfolio] Helius enhanced history failed for ${address}, using standard RPC:`, error?.message || error);
            return this.getSignaturesViaHeliusRpc(address, maxSignatures);
        }

        return allSigs;
    }

    private async getSignaturesViaHeliusRpc(
        address: string,
        maxSignatures: number
    ): Promise<{ signature: string; blockTime: number; err: any; slot: number }[]> {
        const allSigs: { signature: string; blockTime: number; err: any; slot: number }[] = [];
        let before: string | undefined;

        while (allSigs.length < maxSignatures) {
            const limit = Math.min(1000, maxSignatures - allSigs.length);
            const batch = await solanaHeliusClient.getSignaturesForAddressStdRpc(address, { limit, before });
            if (batch.length === 0) break;
            allSigs.push(...batch.map(sig => ({
                ...sig,
                blockTime: this.normalizeBlockTime(sig.blockTime),
            })));
            before = batch[batch.length - 1].signature;
            if (batch.length < limit) break;
        }

        return allSigs;
    }

    /**
     * Helius-powered overview: uses enhanced history with standard RPC fallback.
     * Timestamps are normalized to Unix seconds.
     */
    async scanOverviewViaAlchemy(address: string): Promise<SolanaOverviewResult> {
        const start = Date.now();
        const allSigs = await this.getSignaturesViaAlchemy(address);

        // Sorted newest-first from RPC. blockTime is Unix seconds.
        const newest = allSigs[0];
        const oldest = allSigs[allSigs.length - 1];
        const firstMs = oldest?.blockTime ? oldest.blockTime * 1000 : 0;
        const lastMs = newest?.blockTime ? newest.blockTime * 1000 : 0;

        // Fetch a subset of recent transactions for interactor analysis
        const recentSigs = allSigs.slice(0, Math.min(50, allSigs.length));
        const interactors: Record<string, number> = {};
        let totalSent = 0;
        let totalReceived = 0;

        const txResults = await Promise.allSettled(
            recentSigs.map(sig => solanaHeliusClient.getTransactionStdRpc(sig.signature))
        );

        for (const result of txResults) {
            if (result.status !== 'fulfilled' || !result.value) continue;
            const tx = result.value;
            const accountKeys = tx.transaction?.message?.accountKeys || [];
            const pre = tx.meta?.preBalances || [];
            const post = tx.meta?.postBalances || [];

            // Track interactors from account keys (skip the wallet itself)
            for (const key of accountKeys) {
                const pubkey = typeof key === 'string' ? key : key?.pubkey;
                if (pubkey && pubkey !== address) {
                    interactors[pubkey] = (interactors[pubkey] || 0) + 1;
                }
            }

            // Compute SOL flow from pre/post balances
            if (accountKeys[0] && pre.length > 0 && post.length > 0) {
                const walletKey = typeof accountKeys[0] === 'string' ? accountKeys[0] : accountKeys[0]?.pubkey;
                if (walletKey === address) {
                    const diff = (pre[0] - post[0]) - (tx.meta?.fee || 0);
                    if (diff > 0) totalSent += diff;
                }
                // Check if wallet is a recipient
                const walletIdx = accountKeys.findIndex((k: any) =>
                    (typeof k === 'string' ? k : k?.pubkey) === address
                );
                if (walletIdx > 0 && pre[walletIdx] !== undefined) {
                    const received = (post[walletIdx] || 0) - (pre[walletIdx] || 0);
                    if (received > 0) totalReceived += received;
                }
            }
        }

        const topInteractors = Object.entries(interactors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([addr, count]) => ({ address: addr, count }));

        console.log(`[SolanaPortfolio] Helius overview: ${allSigs.length} sigs, ${Object.keys(interactors).length} interactors, ${Date.now() - start}ms`);

        return {
            wallet: address,
            firstTimestamp: firstMs ? new Date(firstMs).toISOString() : '',
            lastTimestamp: lastMs ? new Date(lastMs).toISOString() : '',
            activityPeriodDays: firstMs && lastMs ? Math.round((lastMs - firstMs) / 86400000) : 0,
            totalTransactions: allSigs.length,
            totalSOLSent: (totalSent / LAMPORTS_PER_SOL).toFixed(6),
            totalSOLReceived: (totalReceived / LAMPORTS_PER_SOL).toFixed(6),
            uniqueAddressCount: Object.keys(interactors).length,
            uniqueAddresses: Object.keys(interactors).slice(0, 200),
            topInteractors,
            scanTimeMs: Date.now() - start,
        };
    }

    /**
     * Get portfolio from Dune SIM first, with Alchemy-backed RPC as fallback.
     */
    async getPortfolio(address: string, filterOptions?: PortfolioFilterOptions): Promise<SolanaPortfolio> {
        const cacheKey = `solana:portfolio:${address}:${JSON.stringify(filterOptions || {})}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as SolanaPortfolio;

        try {
            const simPortfolio = await duneSimClient.getFilteredPortfolio(address, {
                excludeSpamTokens: filterOptions?.excludeSpamTokens,
                excludeUnpriced: filterOptions?.excludeUnpriced,
                minLiquidity: filterOptions?.minLiquidity,
            });
            const portfolio: SolanaPortfolio = {
                address: simPortfolio.address || address,
                sol: simPortfolio.sol,
                tokens: simPortfolio.tokens || [],
                staking: [],
                totalUsd: simPortfolio.totalUsd || 0,
                fetchedAt: simPortfolio.fetchedAt || Date.now(),
            };
            cache.set(cacheKey, portfolio, 60);
            console.log(`[SolanaPortfolio] SIM portfolio fetched for ${address}`);
            return portfolio;
        } catch (error: any) {
            console.warn(`[SolanaPortfolio] SIM portfolio failed for ${address}, using Alchemy fallback:`, error?.message || error);
        }

        const portfolio = await this.getPortfolioFallback(address);
        cache.set(cacheKey, portfolio, 60);
        return portfolio;
    }

    /**
     * Original RPC-based portfolio (fallback)
     */
    private async getPortfolioFallback(address: string): Promise<SolanaPortfolio> {
        const cacheKey = `solana:portfolio:fallback:${address}`;
        
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

        let solPrice = prices['So11111111111111111111111111111111111111112'] || 0;
        if (solPrice === 0) {
            solPrice = await this.getSolPrice();
        }
        
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
        const tokens: SolanaToken[] = [];

        try {
            const alchemyTokens = await this.getTokensFromAlchemy(address);
            tokens.push(...alchemyTokens);
        } catch (e) {
            console.error('[SolanaPortfolio] Alchemy token fetch failed:', e);
        }

        if (tokens.length === 0) {
            try {
                const [token2022, token2022Program] = await Promise.all([
                    this.getTokensByProgram(address, 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
                    this.getTokensByProgram(address, 'TokenzQdBNbLqP5VEhdkAS6dFvwzYqE8hpzEfb9Kh'),
                ]);
                tokens.push(...token2022, ...token2022Program);
            } catch (e) {
                console.error('[SolanaPortfolio] RPC token fetch failed:', e);
            }
        }

        return tokens;
    }

    private async getTokensFromAlchemy(address: string): Promise<SolanaToken[]> {
        const response = await solanaKeyPool.execute(async (endpoint) => {
            return fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getAssetsByOwner',
                    params: [{
                        owner: address,
                        options: {
                            limit: 100,
                            showMetadata: true,
                            showNativeBalance: true
                        }
                    }]
                })
            });
        }, 3);

        const data = await response.json();
        const items = data?.result?.assets || [];
        
        return items
            .filter((item: any) => item.interface === 'Token' || item.tokenStandard === 'Fungible')
            .map((item: any) => ({
                mint: item.id,
                amount: BigInt(item.tokenInfo?.amount || 0),
                decimals: item.tokenInfo?.decimals || 0,
                uiAmount: item.tokenInfo?.amount ? parseFloat(item.tokenInfo.amount) : 0,
            }))
            .filter((t: SolanaToken) => t.uiAmount > 0);
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

    /**
     * Get transactions from Alchemy-backed Solana RPC.
     */
    async getTransactions(address: string, limit = 100): Promise<SolanaTransaction[]> {
        return this.getTransactionsViaAlchemy(address, limit);
    }

    async getTransactionsViaAlchemy(address: string, limit = 100): Promise<SolanaTransaction[]> {
        const cacheKey = `solana:txs:helius:${address}:${limit}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as SolanaTransaction[];

        const signatures = await this.getSignaturesViaAlchemy(address, limit);
        if (signatures.length === 0) return [];

        const transactions = await Promise.all(
            signatures.map(sig => this.getTransaction(sig.signature))
        );

        const bySignatureMeta = new Map(signatures.map(sig => [sig.signature, sig]));
        const txs = transactions.filter(Boolean).map((tx) => {
            const meta = bySignatureMeta.get(tx!.signature);
            return {
                ...tx!,
                slot: tx!.slot || meta?.slot || 0,
                blockTime: tx!.blockTime || ((meta?.blockTime || 0) * 1000),
                status: meta?.err ? 'failed' : tx!.status,
            };
        });

        cache.set(cacheKey, txs, 300);
        return txs;
    }

    private async getTransaction(signature: string): Promise<SolanaTransaction | null> {
        try {
            const tx = await solanaHeliusClient.getTransactionStdRpc(signature);
            if (!tx) return null;

            const meta = tx.meta;
            const instructions = tx.transaction?.message?.instructions || [];
            const accountKeys = tx.transaction?.message?.accountKeys || [];

            let from = '';
            let to = '';
            let amount = 0;
            let token = '';
            let tokenAmount = 0;

            if (accountKeys[0]) {
                from = typeof accountKeys[0] === 'string' ? accountKeys[0] : accountKeys[0]?.pubkey || '';
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
                blockTime: this.normalizeBlockTime(tx.blockTime) * 1000,
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

        const nfts: SolanaNFT[] = [];

        try {
            nfts.push(...await this.getNFTsFromAlchemy(address));
        } catch (e) {
            console.error('[SolanaPortfolio] Alchemy NFT fetch failed:', e);
        }

        cache.set(cacheKey, nfts, 300);
        return nfts;
    }

    private async getNFTsFromAlchemy(address: string): Promise<SolanaNFT[]> {
        const response = await solanaKeyPool.execute(async (endpoint) => {
            return fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getAssetsByOwner',
                    params: [{
                        owner: address,
                        options: { limit: 100, showMetadata: true }
                    }]
                })
            });
        }, 3);

        const data = await response.json();
        const items = data?.result?.assets || [];
        
        return items.map((item: any) => ({
            id: item.id,
            mint: item.id,
            owner: address,
            name: item.metadata?.name || item.content?.metadata?.name || 'Unknown',
            symbol: item.metadata?.symbol || item.content?.metadata?.symbol,
            imageUrl: item.metadata?.image || item.content?.links?.image,
            collection: item.collection || item.grouping?.find((g: any) => g.groupKey === 'collection')?.groupValue,
            collectionImage: item.metadata?.image || item.content?.links?.image,
            attributes: item.metadata?.attributes || item.content?.metadata?.attributes,
        }));
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
                const age = Date.now() - this.normalizeBlockTime(firstTx.blockTime) * 1000;
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

    private async getSolPrice(): Promise<number> {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await res.json();
            const price = data.solana?.usd || 0;
            this.priceCache.set('So11111111111111111111111111111111111111112', price);
            return price;
        } catch (e) {
            console.error('[SolanaPortfolio] Error fetching SOL price:', e);
            return 0;
        }
    }

    private normalizeBlockTime(blockTime: number): number {
        if (blockTime > 1e15) return Math.floor(blockTime / 1_000_000); // μs → seconds
        if (blockTime > 1e12) return Math.floor(blockTime / 1000);      // ms → seconds
        return blockTime;                                                // already seconds
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
