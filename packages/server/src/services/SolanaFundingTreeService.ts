import fetch from 'node-fetch';

const ALCHEMY_SOLANA_API = 'https://solana-mainnet.g.alchemy.com/v2/{apiKey}';
const CACHE_TTL = 300; // 5 minutes

interface SolanaFundingNode {
    address: string;
    label?: string;
    depth: number;
    direction: 'source' | 'destination';
    totalValue: string;
    totalValueInSol: number;
    txCount: number;
    firstTx?: { signature: string; timestamp: number };
    children: SolanaFundingNode[];
    suspiciousScore: number;
    suspiciousReasons: string[];
    isInfrastructure?: boolean;
    entityType?: 'cex' | 'dex' | 'bridge' | 'wallet' | 'program' | 'other';
}

interface TransactionEntry {
    signature: string;
    slot: number;
    blockTime: number;
    err: any;
}

// Known program addresses for entity identification
const KNOWN_PROGRAMS: Record<string, { name: string; type: 'cex' | 'dex' | 'bridge' | 'wallet' | 'program' }> = {
    // DEXs
    'jupoK8gEJ4qEfD1k6QzJD7ssgvG5xTLwXgQNZHcPQ3fl': { name: 'Jupiter', type: 'dex' },
    'jup3ZqFqEboGxBw1UnAUoxfXQA5ryiJPq3U5EEiW5eF': { name: 'Jupiter', type: 'dex' },
    'CGkE4wDyY7mTDE7GQPPF2Uk6hK2Qa3x5xUhNYQqGKqBD': { name: 'Raydium', type: 'dex' },
    'RVKdL2gt2zb2wWPXURQPswTUGqH2c6m8PMD3fESqC8H': { name: 'Raydium', type: 'dex' },
    'orcaEKTdKx2wB3BmcSJwds6D3B4RST3JnBZKJx3QkqY9': { name: 'Orca', type: 'dex' },
    // Bridges
    '85VCBFdxR9exr5GtHVELq7uDT1mAc7YMFuq2bLtUMMmT': { name: 'Wormhole', type: 'bridge' },
    'wormE4TGTQEaUMfNFxNA1XqJGMXH9Znk7aqZ3fGXq9p': { name: 'Wormhole (Core)', type: 'bridge' },
    // CEX - common Solana热钱包
    '2rXhuHUNDULrV6YLiPLZmm3xKg4zDqtLuZD8fFPTXw4': { name: 'Coinbase', type: 'cex' },
    'F4vLeT4eq7YfmqNEBYJTdxYqNsuKXPxuPMe9jCBDm3k': { name: 'Binance', type: 'cex' },
    // Known programs
    'metaqbxxUurdFM34NHCNprmdGhDo4SyRQ9Dkjf53TwSp6y': { name: 'Metaplex', type: 'program' },
    'TokenkegQfeZyiNwAJbNbGKPxGnhTNoZfFNYKDNgVEGPh': { name: 'SPL Token', type: 'program' },
    'ATokenGPdCpDNQUxFJpMMzhxrZmLBhNpYY2MSKHvrkK7': { name: 'Associated Token', type: 'program' },
};

export class SolanaFundingTreeService {
    private apiKey: string;
    private cache: Map<string, { data: any; expiresAt: number }> = new Map();

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async rpcCall(method: string, params: any[]): Promise<any> {
        const url = ALCHEMY_SOLANA_API.replace('{apiKey}', this.apiKey);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method,
                params,
            }),
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        return data.result;
    }

    private getCached<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data as T;
        }
        return null;
    }

    private setCached(key: string, data: any): void {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + CACHE_TTL * 1000,
        });
    }

    /**
     * Get entity label for an address
     */
    private getEntityInfo(address: string): { label?: string; type: 'cex' | 'dex' | 'bridge' | 'wallet' | 'program' | 'other' } {
        const known = KNOWN_PROGRAMS[address];
        if (known) {
            return known;
        }
        // If length is 44, it's likely a program or a wallet
        if (address.length === 44) {
            return { type: 'wallet' };
        }
        return { type: 'other' };
    }

    /**
     * Fetch transaction signatures for an address
     */
    async getTransactions(address: string,limit = 100): Promise<TransactionEntry[]> {
        const cacheKey = `txs:${address}:${limit}`;
        const cached = this.getCached<TransactionEntry[]>(cacheKey);
        if (cached) return cached;

        try {
            const result = await this.rpcCall('getTransactionsForAddress', [
                address,
                {
                    transactionDetails: 'signatures',
                    sortOrder: 'desc',
                    limit,
                    filters: {
                        status: 'succeeded',
                    },
                },
            ]);

            const transactions: TransactionEntry[] = (result.data || []).map((entry: any) => ({
                signature: entry.signature,
                slot: entry.slot,
                blockTime: entry.blockTime,
                err: entry.err,
            }));

            this.setCached(cacheKey, transactions);
            return transactions;
        } catch (error) {
            console.error('[SolanaFundingTree] Error fetching transactions:', error);
            return [];
        }
    }

    /**
     * Build funding sources (where funds came from)
     * For Solana, this traces transfers WHERE THE ADDRESS RECEIVED funds
     */
    async buildSourceTree(address: string, maxDepth: number = 3): Promise<SolanaFundingNode> {
        const transactions = await this.getTransactions(address, 100);
        
        return this.constructTree(address, transactions, 'source', maxDepth);
    }

    /**
     * Build funding destinations (where funds went to)
     * For Solana, this traces transfers WHERE THE ADDRESS SENT funds
     */
    async buildDestinationTree(address: string, maxDepth: number = 3): Promise<SolanaFundingNode> {
        // For destination tree, we need to look at transactions where this address is the source
        // Currently getTransactionsForAddress only returns inbound transactions for an address
        // To get destinations, we'd need to track each transaction's sender
        // For now, return empty node - we can enhance this later with full transaction parsing
        const transactions = await this.getTransactions(address, 100);
        
        return this.constructTree(address, transactions, 'destination', maxDepth);
    }

    /**
     * Construct funding tree from transactions
     */
    private constructTree(
        address: string,
        transactions: TransactionEntry[],
        direction: 'source' | 'destination',
        maxDepth: number,
        currentDepth: number = 0
    ): SolanaFundingNode {
        if (currentDepth >= maxDepth || transactions.length === 0) {
            return this.createNode(address, direction, currentDepth, [], 0);
        }

        const nodeMap = new Map<string, { count: number; totalValue: number; firstTx: number; signatures: string[] }>();

        for (const tx of transactions) {
            // For source tree: identify addresses that sent to our target
            // For destination tree: identify addresses that received from our target
            // Note: getTransactionsForAddress returns transactions where the address is involved
            // We need to parse the transaction to identify the counterparty
            
            const counterparty = this.extractCounterparty(tx.signature, address, direction);
            if (!counterparty) continue;

            const existing = nodeMap.get(counterparty) || { count: 0, totalValue: 0, firstTx: tx.blockTime, signatures: [] };
            existing.count += 1;
            existing.signatures.push(tx.signature);
            if (tx.blockTime && tx.blockTime < existing.firstTx) {
                existing.firstTx = tx.blockTime;
            }
            nodeMap.set(counterparty, existing);
        }

        const children: SolanaFundingNode[] = [];
        let totalCount = 0;

        // Iterate over Map entries
        for (const [counterAddr, stats] of Array.from(nodeMap.entries())) {
            const childNode = this.constructTree(
                counterAddr,
                [], // Would need to fetch recursively for full tree
                direction,
                maxDepth,
                currentDepth + 1
            );
            childNode.txCount = stats.count;
            childNode.totalValueInSol = stats.totalValue;
            childNode.firstTx = { signature: stats.signatures[0], timestamp: stats.firstTx };
            children.push(childNode);
            totalCount += stats.count;
        }

        // Sort by transaction count (most active first)
        children.sort((a, b) => b.txCount - a.txCount);

        const totalValue = children.reduce((sum, c) => sum + c.totalValueInSol, 0);

        const entity = this.getEntityInfo(address);
        
        return {
            address,
            depth: currentDepth,
            direction,
            totalValue: totalValue.toFixed(4),
            totalValueInSol: totalValue,
            txCount: totalCount,
            children,
            suspiciousScore: 0,
            suspiciousReasons: [],
            label: entity.label,
            entityType: entity.type,
        };
    }

    /**
     * Create a tree node
     */
    private createNode(
        address: string,
        direction: 'source' | 'destination',
        depth: number,
        children: SolanaFundingNode[],
        totalValue: number
    ): SolanaFundingNode {
        const entity = this.getEntityInfo(address);
        
        return {
            address,
            depth,
            direction,
            totalValue: totalValue.toFixed(4),
            totalValueInSol: totalValue,
            txCount: children.length,
            children,
            suspiciousScore: 0,
            suspiciousReasons: [],
            label: entity.label,
            entityType: entity.type,
        };
    }

    /**
     * Extract counterparty from transaction
     * This is a placeholder - in full implementation we'd parse the transaction
     */
    private extractCounterparty(signature: string, address: string, direction: 'source' | 'destination'): string | null {
        // Placeholder - would need getTransaction with full details to parse counterparty
        // For now, return null to indicate we can't determine
        return null;
    }

    /**
     * Build complete funding tree with both sources and destinations
     */
    async buildFundingTree(address: string, maxDepth: number = 3): Promise<{
        fundingSources: SolanaFundingNode;
        fundingDestinations: SolanaFundingNode;
    }> {
        const [fundingSources, fundingDestinations] = await Promise.all([
            this.buildSourceTree(address, maxDepth),
            this.buildDestinationTree(address, maxDepth),
        ]);

        return { fundingSources, fundingDestinations };
    }
}

export default SolanaFundingTreeService;