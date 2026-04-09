// ============================================================
// FundTracer by DT - Solana Helius Client
// DAS API for cNFTs and token metadata via Helius (FREE)
// ============================================================

const HELIUS_KEYS = [
    process.env.HELIUS_KEY_1 || '77de5802-5beb-4647-bfbb-0ba215d47c81',
    process.env.HELIUS_KEY_2 || 'b81bcc20-7710-40dc-b0f3-0865c03a8a1d',
    process.env.HELIUS_KEY_3 || 'deae0411-c969-41ff-9420-f1a0f59d5639',
];

let keyIndex = 0;

function getHeliusKey(): string {
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
}

export const solanaHeliusClient = SolanaHeliusClient.getInstance();