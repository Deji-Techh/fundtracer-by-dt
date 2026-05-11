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
}

export const solanaHeliusClient = SolanaHeliusClient.getInstance();
