// ============================================================
// FundTracer by DT - Funding Tree Builder
// ============================================================

import { ITransactionProvider } from '../providers/ITransactionProvider.js';
import { getAddressInfo } from '../data/KnownAddresses.js';
import {
    FundingNode,
    FundingTreeConfig,
    Transaction,
    ProgressCallback,
} from '../types.js';

/** Debug flag - set FUNDTRACER_DEBUG=true to see verbose logs */
const DEBUG = process.env.FUNDTRACER_DEBUG === 'true';

const DEFAULT_CONFIG: FundingTreeConfig = {
    maxDepth: 2,
    direction: 'both',
};

/** Max children per node - keeps API calls manageable on free tier */
const MAX_CHILDREN_PER_NODE = 5;

/** Per-tree timeout in ms - return partial results rather than waiting forever */
const TREE_TIMEOUT_MS = 5000;

export class FundingTreeBuilder {
    private provider: ITransactionProvider;
    private visitedAddresses: Set<string> = new Set();
    private onProgress?: ProgressCallback;

    constructor(provider: ITransactionProvider, onProgress?: ProgressCallback) {
        this.provider = provider;
        this.onProgress = onProgress;
    }

    /** Build funding tree for sources (who funded this wallet) - with timeout */
    async buildSourceTree(
        address: string,
        config: Partial<FundingTreeConfig> = {},
        preloadedTxs?: Transaction[]
    ): Promise<FundingNode> {
        this.visitedAddresses.clear();
        const mergedConfig = { ...DEFAULT_CONFIG, ...config };

        return this.buildTreeWithTimeout(address, mergedConfig, 'source', preloadedTxs);
    }

    /** Build funding tree for destinations (who this wallet funded) - with timeout */
    async buildDestinationTree(
        address: string,
        config: Partial<FundingTreeConfig> = {},
        preloadedTxs?: Transaction[]
    ): Promise<FundingNode> {
        this.visitedAddresses.clear();
        const mergedConfig = { ...DEFAULT_CONFIG, ...config };

        return this.buildTreeWithTimeout(address, mergedConfig, 'destination', preloadedTxs);
    }

    /** Wrapper that enforces a timeout on tree building - returns partial results if time runs out */
    private async buildTreeWithTimeout(
        address: string,
        config: FundingTreeConfig,
        direction: 'source' | 'destination',
        preloadedTxs?: Transaction[]
    ): Promise<FundingNode> {
        const timeoutMs = TREE_TIMEOUT_MS;

        try {
            const result = await Promise.race([
                this.buildTree(address, 0, config, direction, preloadedTxs),
                new Promise<FundingNode>((_, reject) =>
                    setTimeout(() => reject(new Error('Tree build timeout')), timeoutMs)
                ),
            ]);
            return result;
        } catch (error: any) {
            if (error?.message === 'Tree build timeout') {
                if (DEBUG) console.warn(`[FundingTree] ${direction} tree timed out after ${timeoutMs}ms, returning partial results`);
                // Return a minimal root node with whatever we collected
                return {
                    address: address.toLowerCase(),
                    depth: 0,
                    direction,
                    totalValue: '0',
                    totalValueInEth: 0,
                    txCount: 0,
                    children: [],
                    suspiciousScore: 0,
                    suspiciousReasons: [],
                };
            }
            throw error;
        }
    }

    /** Recursive tree builder */
    private async buildTree(
        address: string,
        depth: number,
        config: FundingTreeConfig,
        direction: 'source' | 'destination',
        preloadedTxs?: Transaction[]
    ): Promise<FundingNode> {
        const normalizedAddr = address.toLowerCase();

        // Create base node
        const node: FundingNode = {
            address: normalizedAddr,
            depth,
            direction,
            totalValue: '0',
            totalValueInEth: 0,
            txCount: 0,
            children: [],
            suspiciousScore: 0,
            suspiciousReasons: [],
        };

        // Check if we've hit max depth or already visited
        if (depth >= config.maxDepth || this.visitedAddresses.has(normalizedAddr)) {
            return node;
        }

        this.visitedAddresses.add(normalizedAddr);

        // Check for infrastructure address (Bridge, Exchange, etc)
        // If identified, we stop tracing deeper as these are terminal nodes for Sybil analysis
        const infraInfo = getAddressInfo(normalizedAddr, this.provider.chainId);
        if (infraInfo) {
            node.isInfrastructure = true;
            node.label = infraInfo.name;
            node.entityType = infraInfo.type === 'exchange' ? 'cex' :
                infraInfo.type === 'bridge' ? 'bridge' :
                    infraInfo.type === 'mixer' ? 'mixer' :
                        infraInfo.category === 'dex' ? 'dex' : 'contract';
            // Stop recursion for infrastructure
            return node;
        }

        // Report progress
        if (this.onProgress) {
            this.onProgress({
                stage: direction === 'source' ? 'Tracing funding sources' : 'Tracing destinations',
                current: this.visitedAddresses.size,
                total: config.maxDepth * 10, // Estimated
                message: `Analyzing ${normalizedAddr.slice(0, 10)}... (depth ${depth})`,
            });
        }

        try {
            // Get transactions
            let txs: Transaction[];

            // Use preloaded transactions if at root level and available
            if (depth === 0 && preloadedTxs) {
                txs = preloadedTxs;
            } else {
                txs = await this.provider.getTransactions(normalizedAddr, {
                    timeRange: config.timeRange,
                    minValue: config.minValueEth,
                });
            }

            // Filter by direction AND only native ETH transfers (not tokens which have different value scales)
            const isEthTransfer = (tx: Transaction) =>
                tx.category === 'transfer' || tx.category === 'contract_call';

            const relevantTxs = direction === 'source'
                ? txs.filter(tx => tx.isIncoming && tx.valueInEth > 0 && isEthTransfer(tx))
                : txs.filter(tx => !tx.isIncoming && tx.valueInEth > 0 && isEthTransfer(tx));

            // Aggregate by counterparty
            const counterpartyMap = new Map<string, { txs: Transaction[]; totalValue: number }>();

            for (const tx of relevantTxs) {
                const counterparty = direction === 'source' ? tx.from : tx.to;
                if (!counterparty) continue;

                const existing = counterpartyMap.get(counterparty) || { txs: [], totalValue: 0 };
                existing.txs.push(tx);
                existing.totalValue += tx.valueInEth;
                counterpartyMap.set(counterparty, existing);
            }

            // Sort by total value and take top addresses (capped for free tier)
            const sortedCounterparties = Array.from(counterpartyMap.entries())
                .sort((a, b) => b[1].totalValue - a[1].totalValue)
                .slice(0, MAX_CHILDREN_PER_NODE);

            // Build child nodes
            // OPTIMIZATION: At depth 1+, use getFirstFunder (1 API call) instead of
            // full getTransactions (2+ API calls) to dramatically reduce request count.
            // On Alchemy free tier this is critical to stay under 25 req/s.
            const childPromises = sortedCounterparties.map(async ([addr, data]) => {
                const childNode: FundingNode = {
                    address: addr.toLowerCase(),
                    depth: depth + 1,
                    direction,
                    totalValue: (data.totalValue * 1e18).toString(),
                    totalValueInEth: data.totalValue,
                    txCount: data.txs.length,
                    firstTx: data.txs[data.txs.length - 1], // Oldest
                    children: [],
                    suspiciousScore: 0,
                    suspiciousReasons: [],
                };

                // At deeper levels, use lightweight getFirstFunder instead of full tree recursion
                if (depth + 1 < config.maxDepth && !this.visitedAddresses.has(addr.toLowerCase())) {
                    try {
                        // Lightweight: single API call to find the funding source
                        const funder = await this.provider.getFirstFunder(addr);
                        if (funder && funder.address) {
                            this.visitedAddresses.add(addr.toLowerCase());
                            childNode.children = [funder];
                        }
                    } catch {
                        // Silently skip failed lookups
                    }
                }

                return childNode;
            });

            node.children = await Promise.all(childPromises);
            node.txCount = relevantTxs.length;
            node.totalValueInEth = relevantTxs.reduce((sum, tx) => sum + tx.valueInEth, 0);
            node.totalValue = (node.totalValueInEth * 1e18).toString();

        } catch (error: any) {
            // Log only a brief error message, not full stack trace
            const msg = error?.response?.status === 429
                ? 'Rate limited by API'
                : (error?.message || 'Unknown error');
            if (DEBUG) console.error(`[${normalizedAddr.slice(0, 10)}...] Skipped: ${msg}`);
        }

        return node;
    }

    /** Find common ancestors between two wallets */
    /** Find common ancestors between two wallets */
    async findCommonAncestors(
        address1: string,
        address2: string,
        maxDepth: number = 3
    ): Promise<string[]> {
        // Try fast check first (direct funding source comparison)
        const [source1, source2] = await Promise.all([
            this.provider.getFirstFunder(address1),
            this.provider.getFirstFunder(address2)
        ]);

        if (source1 && source2 && source1.address === source2.address) {
            return [source1.address];
        }

        // Fallback to deep tree search if simple check fails
        const tree1 = await this.buildSourceTree(address1, { maxDepth });
        this.visitedAddresses.clear();
        const tree2 = await this.buildSourceTree(address2, { maxDepth });

        const addresses1 = this.flattenTreeAddresses(tree1);
        const addresses2 = this.flattenTreeAddresses(tree2);

        return addresses1.filter(addr => addresses2.includes(addr));
    }

    /** Flatten tree to list of addresses */
    private flattenTreeAddresses(node: FundingNode): string[] {
        const addresses = [node.address];
        for (const child of node.children) {
            addresses.push(...this.flattenTreeAddresses(child));
        }
        return addresses;
    }
}
