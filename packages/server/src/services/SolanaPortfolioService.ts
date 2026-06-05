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
const SOLANA_OVERVIEW_SIGNATURE_LIMIT = 500;
const SOLANA_RPC_BATCH_SIZE = 3;
const SOLANA_OVERVIEW_DETAIL_LIMIT = 25;

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
    description?: string;
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
    oldestSampledTimestamp: string;
    activityPeriodDays: number;
    totalTransactions: number;
    historyLimited: boolean;
    sampleSize: number;
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
     * Helius standard RPC signature pagination.
     * Returns newest first and blockTime is Unix seconds.
     */
    async getSignaturesViaAlchemy(
        address: string,
        maxSignatures = SOLANA_OVERVIEW_SIGNATURE_LIMIT
    ): Promise<{ signature: string; blockTime: number; err: any; slot: number }[]> {
        return this.getSignaturesViaHeliusRpc(address, maxSignatures);
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
     * Helius-powered overview: uses standard RPC history so free keys work.
     * Timestamps are normalized to Unix seconds.
     */
    async scanOverviewViaAlchemy(address: string): Promise<SolanaOverviewResult> {
        const start = Date.now();
        const allSigs = await this.getSignaturesViaAlchemy(address, SOLANA_OVERVIEW_SIGNATURE_LIMIT);
        const hitHistoryCap = allSigs.length >= SOLANA_OVERVIEW_SIGNATURE_LIMIT;

        // Sorted newest-first from RPC. blockTime is Unix seconds.
        const newest = allSigs[0];
        const oldest = allSigs[allSigs.length - 1];
        const firstMs = !hitHistoryCap && oldest?.blockTime ? oldest.blockTime * 1000 : 0;
        const lastMs = newest?.blockTime ? newest.blockTime * 1000 : 0;

        const interactors: Record<string, number> = {};
        let totalSent = 0;
        let totalReceived = 0;

        const recentTxs = await this.getStandardRpcTransactionsFromSignatures(allSigs.slice(0, SOLANA_OVERVIEW_DETAIL_LIMIT));
        for (const { signature, tx } of recentTxs) {
            const transfers = this.extractTransferRowsFromStdTx(address, signature, tx);

            for (const transfer of transfers) {
                const from = transfer.fromUserAccount;
                const to = transfer.toUserAccount;
                const amount = Number(transfer.amount || 0);
                if (from && from !== address) interactors[from] = (interactors[from] || 0) + 1;
                if (to && to !== address) interactors[to] = (interactors[to] || 0) + 1;
                if (from === address && transfer.asset === 'SOL') totalSent += amount;
                if (to === address && transfer.asset === 'SOL') totalReceived += amount;
            }

            for (const acc of this.getAccountKeys(tx)) {
                if (acc && acc !== address) {
                    interactors[acc] = (interactors[acc] || 0) + 1;
                }
            }
        }

        const topInteractors = Object.entries(interactors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([addr, count]) => ({ address: addr, count }));

        console.log(`[SolanaPortfolio] Helius overview: ${allSigs.length}${hitHistoryCap ? '+' : ''} sigs, ${Object.keys(interactors).length} interactors, ${Date.now() - start}ms`);

        return {
            wallet: address,
            firstTimestamp: firstMs ? new Date(firstMs).toISOString() : '',
            lastTimestamp: lastMs ? new Date(lastMs).toISOString() : '',
            oldestSampledTimestamp: oldest?.blockTime ? new Date(oldest.blockTime * 1000).toISOString() : '',
            activityPeriodDays: firstMs && lastMs ? Math.round((lastMs - firstMs) / 86400000) : 0,
            totalTransactions: allSigs.length,
            historyLimited: hitHistoryCap,
            sampleSize: allSigs.length,
            totalSOLSent: totalSent.toFixed(6),
            totalSOLReceived: totalReceived.toFixed(6),
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

    async getTransfersViaAlchemy(address: string, limit = 200): Promise<any[]> {
        const cacheKey = `solana:transfers:rpc:${address}:${limit}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as any[];

        const signatures = await this.getSignaturesViaAlchemy(address, Math.min(Math.max(limit, 1), 1000));
        const txs = await this.getStandardRpcTransactionsFromSignatures(signatures.slice(0, limit));
        const transfers = txs.flatMap(({ signature, tx }) => this.extractTransferRowsFromStdTx(address, signature, tx));
        cache.set(cacheKey, transfers, 300);
        return transfers;
    }

    async getTransactionsViaAlchemy(address: string, limit = 100): Promise<SolanaTransaction[]> {
        const cacheKey = `solana:txs:rpc:${address}:${limit}`;
        const cached = cache.get(cacheKey);
        if (cached) return cached as SolanaTransaction[];

        const signatures = await this.getSignaturesViaAlchemy(address, Math.min(Math.max(limit, 1), 1000));
        const txs = (await this.mapInBatches(signatures.slice(0, limit), SOLANA_RPC_BATCH_SIZE, sig => this.getTransaction(sig.signature)))
            .filter(Boolean) as SolanaTransaction[];

        cache.set(cacheKey, txs, 300);
        return txs;
    }

    private async getStandardRpcTransactionsFromSignatures(
        signatures: { signature: string }[],
        batchSize = SOLANA_RPC_BATCH_SIZE,
    ): Promise<{ signature: string; tx: any }[]> {
        const rows = await this.mapInBatches(signatures, batchSize, async sig => {
            try {
                const tx = await solanaHeliusClient.getTransactionStdRpc(sig.signature);
                return tx ? { signature: sig.signature, tx } : null;
            } catch {
                return null;
            }
        });
        return rows.filter(Boolean) as { signature: string; tx: any }[];
    }

    private async mapInBatches<T, R>(
        items: T[],
        batchSize: number,
        fn: (item: T) => Promise<R>,
    ): Promise<R[]> {
        const results: R[] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            results.push(...await Promise.all(batch.map(fn)));
        }
        return results;
    }

    private normalizeEnhancedTransaction(address: string, tx: any): SolanaTransaction | null {
        if (!tx?.signature) return null;

        const nativeTransfers = Array.isArray(tx.nativeTransfers) ? tx.nativeTransfers : [];
        const tokenTransfers = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];
        const accountData = Array.isArray(tx.accountData) ? tx.accountData : [];
        const instructions = Array.isArray(tx.instructions) ? tx.instructions : [];

        const matchingNative = nativeTransfers.find((t: any) =>
            t?.fromUserAccount === address || t?.toUserAccount === address
        ) || nativeTransfers[0];
        const matchingToken = tokenTransfers.find((t: any) =>
            t?.fromUserAccount === address || t?.toUserAccount === address
        ) || tokenTransfers[0];

        const from = matchingNative?.fromUserAccount
            || matchingToken?.fromUserAccount
            || tx.feePayer
            || accountData.find((a: any) => a?.account === address)?.account
            || '';
        const to = matchingNative?.toUserAccount
            || matchingToken?.toUserAccount
            || undefined;

        const nativeAmount = matchingNative?.amount ? Number(matchingNative.amount) / LAMPORTS_PER_SOL : 0;
        const tokenAmount = matchingToken?.uiAmount != null
            ? Number(matchingToken.uiAmount)
            : matchingToken?.tokenAmount != null
                ? Number(matchingToken.tokenAmount)
                : 0;
        const amount = nativeAmount > 0 ? nativeAmount : 0;

        const type = this.inferEnhancedTransactionType(tx, nativeTransfers, tokenTransfers, instructions);
        const status = tx.transactionError || tx.err ? 'failed' : 'success';

        return {
            signature: tx.signature,
            slot: tx.slot || 0,
            blockTime: this.normalizeBlockTime(tx.timestamp || tx.blockTime || 0) * 1000,
            fee: tx.fee || 0,
            status,
            type,
            from,
            to,
            amount: amount > 0 ? amount : undefined,
            token: matchingToken?.mint,
            tokenAmount: tokenAmount > 0 ? tokenAmount : undefined,
            instructions: instructions.map((ix: any) => ix?.parsed || ix),
            description: tx.description,
        };
    }

    private inferEnhancedTransactionType(tx: any, nativeTransfers: any[], tokenTransfers: any[], instructions: any[]): string {
        const desc = String(tx?.description || '').toLowerCase();
        if (desc.includes('swap')) return 'dex_swap';
        if (desc.includes('stake')) return 'staking';
        if (desc.includes('mint')) return 'mint';
        if (desc.includes('burn')) return 'burn';
        if (desc.includes('transfer')) {
            return tokenTransfers.length > 0 ? 'token_transfer' : 'transfer';
        }
        if (nativeTransfers.length > 0) return 'transfer';
        if (tokenTransfers.length > 0) return 'token_transfer';
        return this.inferTransactionType(instructions);
    }

    private async getTransaction(signature: string): Promise<SolanaTransaction | null> {
        try {
            const tx = await solanaHeliusClient.getTransactionStdRpc(signature);
            if (!tx) return null;

            const meta = tx.meta;
            const instructions = this.getParsedInstructions(tx);
            const accountKeys = this.getAccountKeys(tx);
            const transfers = this.extractTransferRowsFromStdTx('', signature, tx);
            const primaryTransfer = transfers[0];
            const from = primaryTransfer?.fromUserAccount || accountKeys[0] || '';
            const to = primaryTransfer?.toUserAccount || undefined;
            const amount = primaryTransfer?.asset === 'SOL' ? Number(primaryTransfer.amount || 0) : 0;
            const token = primaryTransfer?.mint || '';
            const tokenAmount = primaryTransfer?.asset !== 'SOL' ? Number(primaryTransfer.amount || 0) : 0;

            return {
                signature,
                slot: tx.slot,
                blockTime: this.normalizeBlockTime(tx.blockTime) * 1000,
                fee: meta?.fee || 0,
                status: meta?.err ? 'failed' : 'success',
                type: this.inferTransactionType(instructions),
                from,
                to,
                amount: amount > 0 ? amount : undefined,
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
            if (ix.parsed?.type === 'transfer' || ix.parsed?.type === 'transferChecked') {
                return ix.program === 'spl-token' || ix.program === 'spl-token-2022' ? 'token_transfer' : 'transfer';
            }
            if (ix.parsed?.type) return ix.parsed.type;
            if (ix.program === 'system') return 'transfer';
            if (ix.program === 'token' || ix.program === 'spl-token' || ix.program === 'spl-token-2022') return 'token_transfer';
            if (ix.program === 'stake') return 'staking';
            if (ix.program === 'vote') return 'vote';
            if (ix.program === 'sysvar') return 'system';
        }
        return 'unknown';
    }

    private getParsedInstructions(tx: any): any[] {
        const topLevel = Array.isArray(tx?.transaction?.message?.instructions)
            ? tx.transaction.message.instructions
            : [];
        const inner = Array.isArray(tx?.meta?.innerInstructions)
            ? tx.meta.innerInstructions.flatMap((group: any) => Array.isArray(group?.instructions) ? group.instructions : [])
            : [];
        return [...topLevel, ...inner];
    }

    private getAccountKeys(tx: any): string[] {
        const keys = tx?.transaction?.message?.accountKeys || [];
        return keys.map((key: any) => this.getAccountKeyString(key)).filter(Boolean);
    }

    private getAccountKeyString(key: any): string {
        if (!key) return '';
        if (typeof key === 'string') return key;
        if (typeof key.pubkey === 'string') return key.pubkey;
        if (key.pubkey?.toString) return key.pubkey.toString();
        if (key.toString) return key.toString();
        return '';
    }

    private getTokenAccountOwners(tx: any): Record<string, string> {
        const owners: Record<string, string> = {};
        const accountKeys = this.getAccountKeys(tx);
        const balances = [
            ...(Array.isArray(tx?.meta?.preTokenBalances) ? tx.meta.preTokenBalances : []),
            ...(Array.isArray(tx?.meta?.postTokenBalances) ? tx.meta.postTokenBalances : []),
        ];

        for (const balance of balances) {
            const account = accountKeys[Number(balance?.accountIndex)];
            const owner = balance?.owner;
            if (account && owner) owners[account] = owner;
        }

        return owners;
    }

    private extractTransferRowsFromStdTx(address: string, signature: string, tx: any): any[] {
        const rows: any[] = [];
        const blockTime = this.normalizeBlockTime(tx?.blockTime) * 1000;
        const tokenAccountOwners = this.getTokenAccountOwners(tx);

        for (const ix of this.getParsedInstructions(tx)) {
            const parsed = ix?.parsed;
            const info = parsed?.info;
            if (!parsed?.type || !info) continue;

            const type = String(parsed.type);
            const isTransfer = type === 'transfer'
                || type === 'transferChecked'
                || type === 'transferCheckedWithFee';
            if (!isTransfer) continue;

            const program = String(ix?.program || ix?.programId || '').toLowerCase();
            const isToken = program.includes('token') || info.tokenAmount || info.mint;
            const sourceAccount = info.source || '';
            const destinationAccount = info.destination || info.account || '';
            const from = isToken
                ? (info.sourceOwner || tokenAccountOwners[sourceAccount] || info.owner || info.authority || sourceAccount)
                : sourceAccount;
            const to = isToken
                ? (info.destinationOwner || tokenAccountOwners[destinationAccount] || destinationAccount)
                : destinationAccount;
            if (!from && !to) continue;
            if (address
                && from !== address
                && to !== address
                && sourceAccount !== address
                && destinationAccount !== address
                && info.sourceOwner !== address
                && info.destinationOwner !== address) {
                continue;
            }

            const amount = isToken
                ? this.parseTokenUiAmount(info.tokenAmount, info.amount)
                : Number(info.lamports || info.amount || 0) / LAMPORTS_PER_SOL;

            rows.push({
                signature,
                slot: tx?.slot || 0,
                blockTime,
                timestamp: blockTime,
                fromUserAccount: from,
                toUserAccount: to,
                source: from,
                destination: to,
                sourceAccount,
                destinationAccount,
                amount,
                uiAmount: amount,
                mint: info.mint,
                asset: isToken ? (info.mint || 'TOKEN') : 'SOL',
                type: isToken ? 'token_transfer' : 'transfer',
            });
        }

        return rows;
    }

    private parseTokenUiAmount(tokenAmount: any, fallbackAmount?: any): number {
        if (tokenAmount?.uiAmount != null) return Number(tokenAmount.uiAmount) || 0;
        if (tokenAmount?.uiAmountString != null) return Number(tokenAmount.uiAmountString) || 0;
        if (tokenAmount?.amount != null && tokenAmount?.decimals != null) {
            return Number(tokenAmount.amount) / Math.pow(10, Number(tokenAmount.decimals));
        }
        return Number(fallbackAmount || 0) || 0;
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
