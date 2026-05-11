// ============================================================
// FundTracer by DT - Solana Helius Client
// Dual-pool architecture for max key utilisation:
//   Pool A (keys 1-2) → getTransactionsForAddress (signatures)
//   Pool B (key 3)    → getTransfersByAddress (transfers)
// After Pool A finishes, its keys are absorbed into Pool B
// to accelerate the remaining transfer scan.
// ============================================================

import { sigHeliusPool, xferHeliusPool, HeliusKeyPool } from './SolanaHeliusKeyPool.js';

/** Make a Helius RPC POST through the given pool */
function rpc(pool: HeliusKeyPool, method: string, params: any[]): Promise<any> {
    return pool.fetch(async (key) => {
        const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
    });
}

export class SolanaHeliusClient {
    private static instance: SolanaHeliusClient;

    private constructor() {}

    static getInstance(): SolanaHeliusClient {
        if (!SolanaHeliusClient.instance) {
            SolanaHeliusClient.instance = new SolanaHeliusClient();
        }
        return SolanaHeliusClient.instance;
    }

    // ================================================================
    // DAS API methods (general-purpose, uses sig pool)
    // ================================================================

    async dasRequest<T>(method: string, params: any[]): Promise<T> {
        return sigHeliusPool.fetch(async (key) => {
            const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data.result as T;
        });
    }

    async getTokenMetadata(mint: string) {
        return this.dasRequest('getTokenMetadata', [mint]);
    }

    async getAsset({ id }: { id: string }) {
        return this.dasRequest('getAsset', [{ id }]);
    }

    async getAssetsByOwner({ owner, limit = 100 }: { owner: string; limit?: number }) {
        return this.dasRequest('getAssetsByOwner', [{
            owner, limit,
            sortBy: { sortBy: 'updated', descending: true },
        }]);
    }

    async getAssetsByGroup({ groupKey, groupValue, limit = 100 }: { groupKey: string; groupValue: string; limit?: number }) {
        return this.dasRequest('getAssetsByGroup', [{
            groupKey, groupValue, limit,
            sortBy: { sortBy: 'updated', descending: true },
        }]);
    }

    async searchAssets({ query, limit = 50 }: { query: string; limit?: number }) {
        return this.dasRequest('searchAssets', [{
            query: { $text: query },
            limit,
            sortBy: { sortBy: 'relevant', descending: false },
        }]);
    }

    // ================================================================
    // Helius-exclusive: getTransactionsForAddress (via sigPool — keys 1-2)
    // ================================================================

    async getTransactionsForAddress(
        address: string,
        options: {
            transactionDetails?: 'signatures' | 'full';
            limit?: number;
            sortOrder?: 'asc' | 'desc';
            paginationToken?: string;
        } = {}
    ): Promise<{ data: any[]; paginationToken?: string }> {
        const result = await rpc(sigHeliusPool, 'getTransactionsForAddress', [
            address,
            {
                transactionDetails: options.transactionDetails || 'signatures',
                limit: options.limit || 1000,
                sortOrder: options.sortOrder || 'desc',
                ...(options.paginationToken ? { paginationToken: options.paginationToken } : {}),
            },
        ]);
        return {
            data: result?.data || [],
            paginationToken: result?.paginationToken || undefined,
        };
    }

    // ================================================================
    // Helius-exclusive: getTransfersByAddress (via xferPool — key 3)
    // But accepts an external pool so it can absorb sigPool's keys later
    // ================================================================

    async getTransfersByAddress(
        address: string,
        options: {
            limit?: number;
            paginationToken?: string;
        } = {},
        poolOverride?: HeliusKeyPool,
    ): Promise<{ data: any[]; paginationToken?: string }> {
        const pool = poolOverride || xferHeliusPool;
        const result = await rpc(pool, 'getTransfersByAddress', [
            address,
            {
                limit: options.limit || 100,
                ...(options.paginationToken ? { paginationToken: options.paginationToken } : {}),
            },
        ]);
        return {
            data: result?.data || [],
            paginationToken: result?.paginationToken || undefined,
        };
    }

    // ================================================================
    // Full wallet scan: parallel sigs + transfers with lazy key absorption
    // ================================================================

    async scanWallet(address: string): Promise<{
        signatures: { signature: string; blockTime: number; err: any }[];
        transfers: any[];
        totalTime: number;
    }> {
        const start = Date.now();

        // Fire both in parallel — sigs pool (2 keys) + xfers pool (1 key)
        const [sigsResult, transfersResult] = await Promise.all([
            this.getAllSignatures(address),
            this.getAllTransfersWithAbsorb(address),
        ]);

        return {
            signatures: sigsResult,
            transfers: transfersResult,
            totalTime: Date.now() - start,
        };
    }

    /** Fetch all signatures using sigPool (2 keys round-robin) */
    async getAllSignatures(address: string): Promise<{ signature: string; blockTime: number; err: any }[]> {
        const all: { signature: string; blockTime: number; err: any }[] = [];
        let paginationToken: string | undefined;

        do {
            const result = await this.getTransactionsForAddress(address, {
                transactionDetails: 'signatures',
                limit: 1000,
                sortOrder: 'desc',
                paginationToken,
            });
            all.push(...result.data);
            paginationToken = result.paginationToken;
        } while (paginationToken && all.length < 50000);

        return all.sort((a, b) => a.blockTime - b.blockTime);
    }

    /**
     * Fetch all transfers — starts with xferPool (1 key).
     * Once sigPool finishes (signatures done), absorb its keys into
     * the transfers pool so remaining transfer pages benefit from 3 keys.
     */
    private async getAllTransfersWithAbsorb(address: string): Promise<any[]> {
        const all: any[] = [];
        let paginationToken: string | undefined;
        let sigsDone = false;

        // Start watching for sigPool completion on a separate track
        const sigsDonePromise = sigHeliusPool.size > 0
            ? this.watchForSigPoolIdle()
            : Promise.resolve();

        const sigsDoneRace = sigsDonePromise.then(() => { sigsDone = true; });

        do {
            const result = await this.getTransfersByAddress(
                address,
                { limit: 100, paginationToken },
                undefined, // use xferPool
            );
            all.push(...result.data);
            paginationToken = result.paginationToken;

            // After this page, if sigs just finished, absorb their keys
            if (sigsDone && sigHeliusPool.healthy > 0) {
                xferHeliusPool.absorb(sigHeliusPool);
                sigsDone = false; // prevent re-absorb
            }
        } while (paginationToken && all.length < 10000);

        return all;
    }

    /**
     * Poll sigPool idle state — resolves when sigPool's total
     * requests stop increasing (meaning sig scan is done).
     */
    private async watchForSigPoolIdle(): Promise<void> {
        // Simple heuristic: poll 3 times with 800ms gaps.
        // If totalRequests hasn't changed across all 3 polls, sigs are done.
        const POLL_MS = 800;
        const SAMPLES = 3;

        let prev = 0;
        let stableCount = 0;

        for (let i = 0; i < 30; i++) { // max 24s wait
            await new Promise(r => setTimeout(r, POLL_MS));
            const cur = sigHeliusPool.stats().totalRequests;
            if (cur === prev) {
                stableCount++;
                if (stableCount >= SAMPLES) return;
            } else {
                stableCount = 0;
            }
            prev = cur;
        }
    }

    /** Public: fetch all transfers without absorption (used by non-scan paths) */
    async getAllTransfers(address: string): Promise<any[]> {
        const all: any[] = [];
        let paginationToken: string | undefined;

        do {
            const result = await this.getTransfersByAddress(address, {
                limit: 100,
                paginationToken,
            });
            all.push(...result.data);
            paginationToken = result.paginationToken;
        } while (paginationToken && all.length < 10000);

        return all;
    }

    /** Pool health stats for monitoring */
    getPoolStats() {
        return {
            signaturesPool: sigHeliusPool.stats(),
            transfersPool: xferHeliusPool.stats(),
        };
    }

    // ================================================================
    // FREE-TIER FALLBACK — standard RPC methods
    // Used when Helius paid features are unavailable
    // ================================================================

    /**
     * Standard RPC: getSignaturesForAddress
     * Returns signatures with blockTime (free tier, 1000 per page)
     */
    async getSignaturesForAddressStdRpc(
        address: string,
        options: { limit?: number; before?: string } = {}
    ): Promise<{ signature: string; blockTime: number; err: any; slot: number }[]> {
        return sigHeliusPool.fetch(async (key) => {
            const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getSignaturesForAddress',
                    params: [
                        address,
                        {
                            limit: options.limit || 100,
                            commitment: 'confirmed',
                            ...(options.before ? { before: options.before } : {}),
                        },
                    ],
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return (data.result || []).map((s: any) => ({
                signature: s.signature,
                blockTime: s.blockTime || 0,
                err: s.err,
                slot: s.slot,
            }));
        });
    }

    /**
     * Standard RPC: getTransaction
     * Returns full transaction details (free tier)
     */
    async getTransactionStdRpc(signature: string): Promise<any> {
        return sigHeliusPool.fetch(async (key) => {
            const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'getTransaction',
                    params: [
                        signature,
                        { commitment: 'confirmed', maxSupportedTransactionVersion: 0 },
                    ],
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            return data.result;
        });
    }

    /**
     * Free-tier wallet scan — uses getSignaturesForAddress RPC + batch getTransaction
     * Gets all signatures (paginated), then parses first N txns for SOL transfer info
     */
    async scanWalletFallback(address: string): Promise<{
        signatures: { signature: string; blockTime: number; err: any }[];
        topInteractors: { address: string; count: number }[];
        totalSOLSent: number;
        totalSOLReceived: number;
        totalTime: number;
    }> {
        const start = Date.now();
        const LAMPORTS = 1_000_000_000;

        // Step 1: get all signatures via paginated RPC
        const allSigs: { signature: string; blockTime: number; err: any }[] = [];
        let before: string | undefined;
        let hasMore = true;

        while (hasMore && allSigs.length < 10000) {
            const page = await this.getSignaturesForAddressStdRpc(address, {
                limit: 1000,
                before,
            });
            if (page.length === 0) break;
            allSigs.push(...page);
            before = page[page.length - 1].signature;
            hasMore = page.length === 1000;
        }

        allSigs.sort((a, b) => a.blockTime - b.blockTime);

        // Step 2: parse first 50 transactions in parallel to extract SOL transfers
        const parseCount = Math.min(allSigs.length, 50);
        const recentSigs = allSigs.slice(-parseCount).reverse(); // most recent first

        const txResults = await Promise.allSettled(
            recentSigs.map(s => this.getTransactionStdRpc(s.signature))
        );

        let totalSOLSent = 0;
        let totalSOLReceived = 0;
        const interactors: Record<string, number> = {};

        for (const result of txResults) {
            if (result.status !== 'fulfilled' || !result.value) continue;
            const tx = result.value;
            const meta = tx.meta;
            if (!meta) continue;

            const preBal = meta.preBalances || [];
            const postBal = meta.postBalances || [];
            const accountKeys = tx.transaction?.message?.accountKeys || [];

            // Compute SOL balance change = pre[0] - post[0] (positive = sent, negative = received)
            if (preBal.length > 0 && postBal.length > 0) {
                const diff = (preBal[0] - postBal[0]) / LAMPORTS;
                // First account is always the fee payer (our wallet)
                if (diff > 0.0001) {
                    totalSOLSent += diff;
                } else if (diff < -0.0001) {
                    totalSOLReceived += Math.abs(diff);
                }
            }

            // Extract interactors from account keys (skip first = wallet, last = program)
            for (let i = 1; i < accountKeys.length - 1; i++) {
                const pk = accountKeys[i]?.pubkey || accountKeys[i];
                if (pk && typeof pk === 'string' && pk !== address) {
                    interactors[pk] = (interactors[pk] || 0) + 1;
                }
            }
        }

        const topInteractors = Object.entries(interactors)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([address, count]) => ({ address, count }));

        return {
            signatures: allSigs,
            topInteractors,
            totalSOLSent,
            totalSOLReceived,
            totalTime: Date.now() - start,
        };
    }

    /**
     * Free-tier funding tree — uses batch getTransaction to extract counterparties
     */
    async getFundingTreeFallback(
        address: string,
        maxTransactions = 200
    ): Promise<{
        sources: Record<string, { total: number; count: number }>;
        destinations: Record<string, { total: number; count: number }>;
    }> {
        const LAMPORTS = 1_000_000_000;

        // Get recent signatures
        const sigs = await this.getSignaturesForAddressStdRpc(address, { limit: Math.min(maxTransactions, 1000) });
        if (sigs.length === 0) return { sources: {}, destinations: {} };

        // Get full tx details in parallel
        const txResults = await Promise.allSettled(
            sigs.map(s => this.getTransactionStdRpc(s.signature))
        );

        const sources: Record<string, { total: number; count: number }> = {};
        const destinations: Record<string, { total: number; count: number }> = {};

        for (const result of txResults) {
            if (result.status !== 'fulfilled' || !result.value) continue;
            const tx = result.value;
            const meta = tx.meta;
            if (!meta) continue;

            const preBal = meta.preBalances || [];
            const postBal = meta.postBalances || [];
            const accountKeys = tx.transaction?.message?.accountKeys || [];

            if (preBal.length < 2 || postBal.length < 2) continue;

            const diff = (preBal[0] - postBal[0]) / LAMPORTS;
            if (Math.abs(diff) < 0.0001) continue;

            // First account = fee payer (the wallet in most Solana txs)
            const feePayer = accountKeys[0]?.pubkey || accountKeys[0] || '';

            if (feePayer === address) {
                // Wallet sent funds → find destination
                if (accountKeys.length > 1) {
                    const dest = accountKeys[1]?.pubkey || accountKeys[1] || 'unknown';
                    if (!destinations[dest]) destinations[dest] = { total: 0, count: 0 };
                    destinations[dest].total += diff;
                    destinations[dest].count += 1;
                }
            } else {
                // Some other account paid → treat as source
                if (feePayer !== 'unknown' && feePayer) {
                    if (!sources[feePayer]) sources[feePayer] = { total: 0, count: 0 };
                    sources[feePayer].total += Math.abs(diff);
                    sources[feePayer].count += 1;
                }
            }
        }

        return { sources, destinations };
    }
}

export const solanaHeliusClient = SolanaHeliusClient.getInstance();
