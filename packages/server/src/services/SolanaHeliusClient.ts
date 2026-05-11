// ============================================================
// FundTracer by DT - Solana Helius Client
// DAS API for cNFTs and token metadata via Helius (FREE)
// ============================================================

const HELIUS_KEYS = [
    process.env.HELIUS_KEY_1,
    process.env.HELIUS_KEY_2,
    process.env.HELIUS_KEY_3,
].filter(Boolean);

let keyIndex = 0;

function getHeliusKey(): string {
    if (HELIUS_KEYS.length === 0) {
        throw new Error('CRITICAL: No HELIUS_KEY_* environment variables configured');
    }
    const key = HELIUS_KEYS[keyIndex % HELIUS_KEYS.length];
    keyIndex++;
    return key;
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

    private getBaseUrl(): string {
        const key = getHeliusKey();
        return `https://mainnet.helius-rpc.com/?api-key=${key}`;
    }

    async dasRequest<T>(method: string, params: any[]): Promise<T> {
        const res = await fetch(this.getBaseUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        return data.result;
    }

    async getTokenMetadata(mint: string) {
        return this.dasRequest('getTokenMetadata', [mint]);
    }

    async getAsset({ id }: { id: string }) {
        return this.dasRequest('getAsset', [{ id }]);
    }

    async getAssetsByOwner({ owner, limit = 100 }: { owner: string; limit?: number }) {
        return this.dasRequest('getAssetsByOwner', [{
            owner,
            limit,
            sortBy: { sortBy: 'updated', descending: true },
        }]);
    }

    async getAssetsByGroup({ groupKey, groupValue, limit = 100 }: { groupKey: string; groupValue: string; limit?: number }) {
        return this.dasRequest('getAssetsByGroup', [{
            groupKey,
            groupValue,
            limit,
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
    // Helius-exclusive: getTransactionsForAddress
    // Returns signatures + blockTime (fast mode) or full tx details
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
        const key = getHeliusKey();
        const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTransactionsForAddress',
                params: [address, {
                    transactionDetails: options.transactionDetails || 'signatures',
                    limit: options.limit || 1000,
                    sortOrder: options.sortOrder || 'desc',
                    ...(options.paginationToken ? { paginationToken: options.paginationToken } : {}),
                }]
            }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const result = data.result;
        return {
            data: result?.data || [],
            paginationToken: result?.paginationToken || undefined,
        };
    }

    // ================================================================
    // Helius-exclusive: getTransfersByAddress
    // Returns pre-parsed transfer records with source, destination, amount
    // ================================================================

    async getTransfersByAddress(
        address: string,
        options: {
            limit?: number;
            paginationToken?: string;
        } = {}
    ): Promise<{ data: any[]; paginationToken?: string }> {
        const key = getHeliusKey();
        const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTransfersByAddress',
                params: [address, {
                    limit: options.limit || 100,
                    ...(options.paginationToken ? { paginationToken: options.paginationToken } : {}),
                }]
            }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const result = data.result;
        return {
            data: result?.data || [],
            paginationToken: result?.paginationToken || undefined,
        };
    }

    // ================================================================
    // Full wallet scan: runs getAllSignatures + getAllTransfers in parallel
    // ================================================================

    async scanWallet(address: string): Promise<{
        signatures: { signature: string; blockTime: number; err: any }[];
        transfers: any[];
        totalTime: number;
    }> {
        const start = Date.now();

        const [sigsResult, transfersResult] = await Promise.all([
            this.getAllSignatures(address),
            this.getAllTransfers(address),
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
                transactionDetails: 'signatures',
                limit: 1000,
                sortOrder: 'desc',
                paginationToken,
            });
            all.push(...result.data);
            paginationToken = result.paginationToken;
        } while (paginationToken && all.length < 50000);

        // Sort ascending by blockTime for age calculation
        return all.sort((a, b) => a.blockTime - b.blockTime);
    }

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
}

export const solanaHeliusClient = SolanaHeliusClient.getInstance();