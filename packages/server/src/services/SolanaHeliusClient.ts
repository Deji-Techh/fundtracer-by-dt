// ============================================================
// FundTracer by DT - Solana RPC Client
// Dual-pool architecture for max throughput:
//   Pool A (66% of endpoints) → getTransactionsForAddress (paid)
//   Pool B (33%)              → getTransfersByAddress (paid)
// After Pool A finishes, its endpoints are absorbed into Pool B
// to accelerate the remaining transfer scan.
//
// Falls back to standard RPC when Helius paid features are unavailable.
// Also uses Dune SIM when available (faster than RPC pagination).
// ============================================================

import { sigRpcPool, xferRpcPool, RpcKeyPool } from './SolanaHeliusKeyPool.js';
import { duneSimClient } from './DuneSimClient.js';

export class SolanaHeliusClient {
    private static instance: SolanaHeliusClient;
    private LAMPORTS = 1_000_000_000;

    private constructor() {}

    static getInstance(): SolanaHeliusClient {
        if (!SolanaHeliusClient.instance) {
            SolanaHeliusClient.instance = new SolanaHeliusClient();
        }
        return SolanaHeliusClient.instance;
    }

    // ================================================================
    // DAS API methods (general-purpose)
    // ================================================================

    async dasRequest<T>(method: string, params: any[]): Promise<T> {
        return sigRpcPool.rpc(method, params) as Promise<T>;
    }

    async getTokenMetadata(mint: string) {
        return this.dasRequest('getTokenMetadata', [mint]);
    }

    async getAsset({ id }: { id: string }) {
        return this.dasRequest('getAsset', [{ id }]);
    }

    async getAssetsByOwner({ owner, limit = 100 }: { owner: string; limit?: number }) {
        return this.dasRequest('getAssetsByOwner', [{ owner, limit, sortBy: { sortBy: 'updated', descending: true } }]);
    }

    async getAssetsByGroup({ groupKey, groupValue, limit = 100 }: { groupKey: string; groupValue: string; limit?: number }) {
        return this.dasRequest('getAssetsByGroup', [{ groupKey, groupValue, limit, sortBy: { sortBy: 'updated', descending: true } }]);
    }

    async searchAssets({ query, limit = 50 }: { query: string; limit?: number }) {
        return this.dasRequest('searchAssets', [{ query: { $text: query }, limit, sortBy: { sortBy: 'relevant', descending: false } }]);
    }

    // ================================================================
    // Helius-exclusive: getTransactionsForAddress (via sigRpcPool — 66% of endpoints)
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
        const result = await sigRpcPool.rpc('getTransactionsForAddress', [
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
    // Helius-exclusive: getTransfersByAddress (via xferRpcPool — 33% of endpoints)
    // ================================================================

    async getTransfersByAddress(
        address: string,
        options: {
            limit?: number;
            paginationToken?: string;
        } = {},
        poolOverride?: RpcKeyPool,
    ): Promise<{ data: any[]; paginationToken?: string }> {
        const pool = poolOverride || xferRpcPool;
        const result = await pool.rpc('getTransfersByAddress', [
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
    // Full wallet scan: parallel sigs + transfers with lazy absorption
    // ================================================================

    async scanWallet(address: string): Promise<{
        signatures: { signature: string; blockTime: number; err: any }[];
        transfers: any[];
        totalTime: number;
    }> {
        const start = Date.now();
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

    async getAllSignatures(address: string): Promise<{ signature: string; blockTime: number; err: any }[]> {
        const all: { signature: string; blockTime: number; err: any }[] = [];
        let paginationToken: string | undefined;
        do {
            const result = await this.getTransactionsForAddress(address, {
                transactionDetails: 'signatures', limit: 1000, sortOrder: 'desc', paginationToken,
            });
            all.push(...result.data);
            paginationToken = result.paginationToken;
        } while (paginationToken && all.length < 50000);
        return all.sort((a, b) => a.blockTime - b.blockTime);
    }

    private async getAllTransfersWithAbsorb(address: string): Promise<any[]> {
        const all: any[] = [];
        let paginationToken: string | undefined;
        let sigsDone = false;

        const sigsDonePromise = sigRpcPool.size > 0 ? this.watchForSigPoolIdle() : Promise.resolve();
        const sigsDoneRace = sigsDonePromise.then(() => { sigsDone = true; });

        do {
            const result = await this.getTransfersByAddress(address, { limit: 100, paginationToken });
            all.push(...result.data);
            paginationToken = result.paginationToken;
            if (sigsDone && sigRpcPool.healthy > 0) {
                xferRpcPool.absorb(sigRpcPool);
                sigsDone = false;
            }
        } while (paginationToken && all.length < 10000);

        return all;
    }

    private async watchForSigPoolIdle(): Promise<void> {
        let prev = 0;
        let stableCount = 0;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 800));
            const cur = sigRpcPool.stats().totalRequests;
            if (cur === prev) { stableCount++; if (stableCount >= 3) return; }
            else { stableCount = 0; }
            prev = cur;
        }
    }

    async getAllTransfers(address: string): Promise<any[]> {
        const all: any[] = [];
        let paginationToken: string | undefined;
        do {
            const result = await this.getTransfersByAddress(address, { limit: 100, paginationToken });
            all.push(...result.data);
            paginationToken = result.paginationToken;
        } while (paginationToken && all.length < 10000);
        return all;
    }

    getPoolStats() {
        return { signaturesPool: sigRpcPool.stats(), transfersPool: xferRpcPool.stats() };
    }

    // ================================================================
    // STANDARD RPC METHODS — work on free Helius AND Alchemy
    // ================================================================

    async getSignaturesForAddressStdRpc(
        address: string,
        options: { limit?: number; before?: string } = {}
    ): Promise<{ signature: string; blockTime: number; err: any; slot: number }[]> {
        const result = await sigRpcPool.rpc('getSignaturesForAddress', [
            address,
            {
                limit: options.limit || 100,
                commitment: 'confirmed',
                ...(options.before ? { before: options.before } : {}),
            },
        ]);
        return (result || []).map((s: any) => ({
            signature: s.signature, blockTime: s.blockTime || 0, err: s.err, slot: s.slot,
        }));
    }

    async getTransactionStdRpc(signature: string): Promise<any> {
        return sigRpcPool.rpc('getTransaction', [
            signature,
            { commitment: 'confirmed', maxSupportedTransactionVersion: 0 },
        ]);
    }

    async getBalanceStdRpc(address: string): Promise<number> {
        const result = await sigRpcPool.rpc('getBalance', [address]);
        return result?.value || 0;
    }

    // ================================================================
    // FALLBACK SCAN PATH  — tries SIM first, then RPC
    // ================================================================

    async scanWalletFallback(address: string): Promise<{
        signatures: { signature: string; blockTime: number; err: any }[];
        topInteractors: { address: string; count: number }[];
        totalSOLSent: number;
        totalSOLReceived: number;
        totalTime: number;
    }> {
        const start = Date.now();

        // Try SIM first (fast, pre-indexed)
        if (duneSimClient.isEnabled()) {
            try {
                return await this.scanWalletFallbackViaSim(address, start);
            } catch (simErr) {
                console.log('[SolanaHelius] SIM fallback failed, using RPC:', (simErr as Error)?.message);
            }
        }

        return this.scanWalletFallbackViaRpc(address, start);
    }

    private async scanWalletFallbackViaSim(address: string, start: number): Promise<{
        signatures: { signature: string; blockTime: number; err: any }[];
        topInteractors: { address: string; count: number }[];
        totalSOLSent: number;
        totalSOLReceived: number;
        totalTime: number;
    }> {
        const simTxs = await duneSimClient.getTransactions(address, { limit: 1000 });
        const txs = duneSimClient.mapTransactions(simTxs);

        const signatures = txs.map(t => ({
            signature: t.signature,
            blockTime: Math.floor(t.blockTime / 1000),
            err: t.status === 'failed' ? { msg: 'failed' } : null,
        }));

        let totalSOLSent = 0;
        let totalSOLReceived = 0;
        const interactors: Record<string, number> = {};

        for (const tx of txs) {
            if (tx.from === address) {
                totalSOLSent += tx.amount || 0;
                if (tx.to) interactors[tx.to] = (interactors[tx.to] || 0) + 1;
            }
            if (tx.to === address) {
                totalSOLReceived += tx.amount || 0;
                if (tx.from) interactors[tx.from] = (interactors[tx.from] || 0) + 1;
            }
        }

        const topInteractors = Object.entries(interactors)
            .sort((a, b) => b[1] - a[1]).slice(0, 10)
            .map(([address, count]) => ({ address, count }));

        return { signatures, topInteractors, totalSOLSent, totalSOLReceived, totalTime: Date.now() - start };
    }

    private async scanWalletFallbackViaRpc(address: string, start: number): Promise<{
        signatures: { signature: string; blockTime: number; err: any }[];
        topInteractors: { address: string; count: number }[];
        totalSOLSent: number;
        totalSOLReceived: number;
        totalTime: number;
    }> {
        const allSigs: { signature: string; blockTime: number; err: any }[] = [];
        let before: string | undefined;
        while (before !== undefined || allSigs.length === 0) {
            const page = await this.getSignaturesForAddressStdRpc(address, { limit: 1000, before });
            if (page.length === 0) break;
            allSigs.push(...page);
            before = page[page.length - 1].signature;
        }
        allSigs.sort((a, b) => a.blockTime - b.blockTime);

        const parseCount = Math.min(allSigs.length, 50);
        const recentSigs = allSigs.slice(-parseCount).reverse();
        const txResults = await Promise.allSettled(recentSigs.map(s => this.getTransactionStdRpc(s.signature)));

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
            if (preBal.length > 0 && postBal.length > 0) {
                const diff = (preBal[0] - postBal[0]) / this.LAMPORTS;
                if (diff > 0.0001) totalSOLSent += diff;
                else if (diff < -0.0001) totalSOLReceived += Math.abs(diff);
            }
            for (let i = 1; i < accountKeys.length - 1; i++) {
                const pk = accountKeys[i]?.pubkey || accountKeys[i];
                if (pk && typeof pk === 'string' && pk !== address) {
                    interactors[pk] = (interactors[pk] || 0) + 1;
                }
            }
        }

        const topInteractors = Object.entries(interactors)
            .sort((a, b) => b[1] - a[1]).slice(0, 10)
            .map(([address, count]) => ({ address, count }));

        return { signatures: allSigs, topInteractors, totalSOLSent, totalSOLReceived, totalTime: Date.now() - start };
    }

    // ================================================================
    // FALLBACK FUNDING TREE — tries SIM first, then RPC
    // ================================================================

    async getFundingTreeFallback(
        address: string,
        maxTransactions = 200
    ): Promise<{
        sources: Record<string, { total: number; count: number }>;
        destinations: Record<string, { total: number; count: number }>;
    }> {
        // Try SIM first
        if (duneSimClient.isEnabled()) {
            try {
                return await this.getFundingTreeViaSim(address);
            } catch (simErr) {
                console.log('[SolanaHelius] SIM funding tree failed, using RPC:', (simErr as Error)?.message);
            }
        }

        return this.getFundingTreeViaRpc(address, maxTransactions);
    }

    private async getFundingTreeViaSim(address: string): Promise<{
        sources: Record<string, { total: number; count: number }>;
        destinations: Record<string, { total: number; count: number }>;
    }> {
        const simTxs = await duneSimClient.getTransactions(address, { limit: 500 });
        const txs = duneSimClient.mapTransactions(simTxs);

        const sources: Record<string, { total: number; count: number }> = {};
        const destinations: Record<string, { total: number; count: number }> = {};

        for (const tx of txs) {
            if (tx.to === address && tx.from) {
                if (!sources[tx.from]) sources[tx.from] = { total: 0, count: 0 };
                sources[tx.from].total += tx.amount || 0;
                sources[tx.from].count += 1;
            }
            if (tx.from === address && tx.to) {
                if (!destinations[tx.to]) destinations[tx.to] = { total: 0, count: 0 };
                destinations[tx.to].total += tx.amount || 0;
                destinations[tx.to].count += 1;
            }
        }

        return { sources, destinations };
    }

    private async getFundingTreeViaRpc(address: string, maxTransactions = 200): Promise<{
        sources: Record<string, { total: number; count: number }>;
        destinations: Record<string, { total: number; count: number }>;
    }> {
        const sigs = await this.getSignaturesForAddressStdRpc(address, { limit: Math.min(maxTransactions, 1000) });
        if (sigs.length === 0) return { sources: {}, destinations: {} };

        const txResults = await Promise.allSettled(sigs.map(s => this.getTransactionStdRpc(s.signature)));

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

            const diff = (preBal[0] - postBal[0]) / this.LAMPORTS;
            if (Math.abs(diff) < 0.0001) continue;

            const feePayer = accountKeys[0]?.pubkey || accountKeys[0] || '';
            if (feePayer === address) {
                if (accountKeys.length > 1) {
                    const dest = accountKeys[1]?.pubkey || accountKeys[1] || 'unknown';
                    if (!destinations[dest]) destinations[dest] = { total: 0, count: 0 };
                    destinations[dest].total += diff;
                    destinations[dest].count += 1;
                }
            } else if (feePayer) {
                if (!sources[feePayer]) sources[feePayer] = { total: 0, count: 0 };
                sources[feePayer].total += Math.abs(diff);
                sources[feePayer].count += 1;
            }
        }

        return { sources, destinations };
    }
}

export const solanaHeliusClient = SolanaHeliusClient.getInstance();
