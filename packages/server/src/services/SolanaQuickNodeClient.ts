// ============================================================
// FundTracer by DT - Solana QuickNode Client
// DAS API for cNFTs and token metadata
// ============================================================

export class SolanaQuickNodeClient {
    private static instance: SolanaQuickNodeClient;
    public rpcUrl: string;
    public wssUrl: string;

    private constructor() {
        this.rpcUrl = process.env.QUICKNODE_SOLANA || process.env.QUICKNODE_RPC_URL || '';
        this.wssUrl = process.env.QUICKNODE_SOLANA_WSS || '';

        if (!this.rpcUrl) {
            console.warn('[SolanaQuickNode] No RPC URL provided');
        }
    }

    static getInstance(): SolanaQuickNodeClient {
        if (!SolanaQuickNodeClient.instance) {
            SolanaQuickNodeClient.instance = new SolanaQuickNodeClient();
        }
        return SolanaQuickNodeClient.instance;
    }

    async dasRequest<T>(method: string, params: any[]): Promise<T> {
        const res = await fetch(this.rpcUrl, {
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

    async getAssetsByOwner({ owner, limit = 1000 }: { owner: string; limit?: number }) {
        return this.dasRequest('getAssetsByOwner', [{
            owner,
            limit,
            sortBy: { sortBy: 'updated', descending: true },
        }]);
    }

    async getAssetsByGroup({ groupKey, groupValue, limit = 1000 }: { groupKey: string; groupValue: string; limit?: number }) {
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

export const solanaQuickNode = SolanaQuickNodeClient.getInstance();