// ============================================================
// FundTracer by DT - Main Wallet Analyzer
// ============================================================

import { BaseProvider } from '../providers/BaseProvider.js';
import { FundingTreeBuilder } from './FundingTreeBuilder.js';
import { SuspiciousDetector } from './SuspiciousDetector.js';
import {
    AnalysisResult,
    WalletInfo,
    Transaction,
    FundingNode,
    FundingTreeConfig,
    FilterOptions,
    ProgressCallback,
    ProjectInteraction,
    AnalysisSummary,
    MultiWalletResult,
    ChainId,
    SuspiciousIndicator,
} from '../types.js';
import { ProviderFactory, ApiKeyConfig } from '../providers/ProviderFactory.js';
import { getAddressInfo } from '../data/KnownAddresses.js';

// Known contract addresses for project identification
const KNOWN_PROJECTS: Record<string, { name: string; category: ProjectInteraction['category'] }> = {
    '0x7a250d5630b4cf539739df2c5dacb4c659f2488d': { name: 'Uniswap V2 Router', category: 'defi' },
    '0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45': { name: 'Uniswap V3 Router', category: 'defi' },
    '0xe592427a0aece92de3edee1f18e0157c05861564': { name: 'Uniswap V3 Router', category: 'defi' },
    '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch Router', category: 'defi' },
    '0xdef1c0ded9bec7f1a1670819833240f027b25eff': { name: '0x Exchange Proxy', category: 'defi' },
    '0x881d40237659c251811cec9c364ef91dc08d300c': { name: 'Metamask Swap', category: 'defi' },
    '0x00000000006c3852cbef3e08e8df289169ede581': { name: 'OpenSea Seaport', category: 'nft' },
    '0x74312363e45dcaba76c59ec49a7aa8a65a67eed3': { name: 'X2Y2', category: 'nft' },
    '0x59728544b08ab483533076417fbbb2fd0b17ce3a': { name: 'LooksRare', category: 'nft' },
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad': { name: 'Uniswap Universal Router', category: 'defi' },
};

export class WalletAnalyzer {
    private providerFactory: ProviderFactory;
    private onProgress?: ProgressCallback;

    constructor(apiKeys: ApiKeyConfig, onProgress?: ProgressCallback) {
        this.providerFactory = new ProviderFactory(apiKeys);
        this.onProgress = onProgress;
    }

    /** Analyze a single wallet */
    async analyze(
        address: string,
        chainId: ChainId,
        options: {
            treeConfig?: Partial<FundingTreeConfig>;
            filters?: FilterOptions;
            transactionLimit?: number; // Limit number of transactions fetched
            skipFundingTree?: boolean; // Skip funding tree for fast initial load
        } = {}
    ): Promise<AnalysisResult> {
        const provider = this.providerFactory.getProvider(chainId);
        const normalizedAddr = address.toLowerCase();

        // Progress update
        this.reportProgress('Fetching wallet info & transactions', 1, 6, 'Loading wallet data in parallel...');

        // OPTIMIZATION: Fetch wallet info AND transactions in parallel
        // These are independent API calls - no reason to wait for one before starting the other
        const txLimit = options.transactionLimit || undefined;
        const filterWithLimit = { ...options.filters, limit: txLimit };

        const [walletInfo, normalTxs, internalTxs, tokenTransfers] = await Promise.all([
            provider.getWalletInfo(normalizedAddr),
            provider.getTransactions(normalizedAddr, filterWithLimit),
            provider.getInternalTransactions(normalizedAddr, filterWithLimit),
            provider.getTokenTransfers(normalizedAddr, filterWithLimit),
        ]);

        // Detect if this wallet itself is infrastructure
        const knownInfo = getAddressInfo(normalizedAddr, chainId);
        if (knownInfo) {
            walletInfo.isInfrastructure = true;
            walletInfo.infrastructureType = knownInfo.type;
            walletInfo.label = knownInfo.name;
        } else if (walletInfo.txCount > 50000) {
            walletInfo.isInfrastructure = true;
            walletInfo.infrastructureType = 'high_volume';
            walletInfo.label = 'High Activity (Possible Infrastructure)';
        } else if (walletInfo.isContract && walletInfo.txCount > 10000) {
            walletInfo.isInfrastructure = true;
            walletInfo.infrastructureType = 'high_volume_contract';
            walletInfo.label = 'High Activity Contract';
        }

        // Combine and dedupe transactions
        const allTxs = this.mergeTransactions(normalTxs, internalTxs);

        // OPTIMIZATION: Skip funding tree on initial load — it's the biggest bottleneck.
        // The frontend can request it separately via buildFundingTree() when the user clicks.
        let fundingSources: FundingNode;
        let fundingDestinations: FundingNode;

        if (options.skipFundingTree) {
            // Return empty placeholder trees
            const emptyNode = (direction: 'source' | 'destination'): FundingNode => ({
                address: normalizedAddr,
                depth: 0,
                direction,
                totalValue: '0',
                totalValueInEth: 0,
                txCount: 0,
                children: [],
                suspiciousScore: 0,
                suspiciousReasons: [],
            });
            fundingSources = emptyNode('source');
            fundingDestinations = emptyNode('destination');
        } else {
            // Progress update
            this.reportProgress('Building funding tree', 3, 6, 'Tracing funding sources...');

            // Build funding trees
            const treeBuilder = new FundingTreeBuilder(provider, this.onProgress);
            [fundingSources, fundingDestinations] = await Promise.all([
                treeBuilder.buildSourceTree(normalizedAddr, options.treeConfig, allTxs),
                treeBuilder.buildDestinationTree(normalizedAddr, options.treeConfig, allTxs),
            ]);
        }

        // Progress update
        this.reportProgress('Detecting suspicious activity', 4, 6, 'Analyzing patterns...');

        // Detect suspicious activity
        const detector = new SuspiciousDetector();
        const walletAge = walletInfo.firstTxTimestamp
            ? Math.floor((Date.now() / 1000 - walletInfo.firstTxTimestamp) / 86400)
            : undefined;

        const suspiciousIndicators = detector.detect({
            transactions: allTxs,
            fundingSources,
            fundingDestinations,
            walletAge,
            isInfrastructure: walletInfo.isInfrastructure,
        });

        const overallRiskScore = detector.calculateRiskScore(suspiciousIndicators);
        const riskLevel = detector.getRiskLevel(overallRiskScore);

        // Progress update
        this.reportProgress('Analyzing projects', 5, 6, 'Identifying protocol interactions...');

        // Identify project interactions
        const projectsInteracted = this.identifyProjects(allTxs);

        // Group same-block transactions
        const sameBlockTransactions = detector.groupByBlock(allTxs);

        // Progress update
        this.reportProgress('Generating summary', 6, 6, 'Finalizing analysis...');

        // Generate summary
        const summary = this.generateSummary(allTxs, fundingSources, fundingDestinations, walletInfo.firstTxTimestamp);

        return {
            wallet: walletInfo,
            transactions: allTxs,
            fundingSources,
            fundingDestinations,
            suspiciousIndicators,
            overallRiskScore,
            riskLevel,
            projectsInteracted,
            sameBlockTransactions,
            summary,
        };
    }

    /** Build funding tree separately — called on-demand by frontend */
    async buildFundingTree(
        address: string,
        chainId: ChainId,
        options: {
            treeConfig?: Partial<FundingTreeConfig>;
        } = {}
    ): Promise<{ fundingSources: FundingNode; fundingDestinations: FundingNode }> {
        const provider = this.providerFactory.getProvider(chainId);
        const normalizedAddr = address.toLowerCase();

        this.reportProgress('Fetching transactions', 1, 3, 'Loading transaction data...');

        // Fetch transactions to feed the tree builder
        const txs = await provider.getTransactions(normalizedAddr);

        this.reportProgress('Building funding tree', 2, 3, 'Tracing funding sources and destinations...');

        const treeBuilder = new FundingTreeBuilder(provider, this.onProgress);
        const [fundingSources, fundingDestinations] = await Promise.all([
            treeBuilder.buildSourceTree(normalizedAddr, options.treeConfig, txs),
            treeBuilder.buildDestinationTree(normalizedAddr, options.treeConfig, txs),
        ]);

        this.reportProgress('Done', 3, 3, 'Funding tree complete.');

        return { fundingSources, fundingDestinations };
    }

    /** Compare multiple wallets */
    async compareWallets(
        addresses: string[],
        chainId: ChainId,
        options: {
            treeConfig?: Partial<FundingTreeConfig>;
        } = {}
    ): Promise<MultiWalletResult> {
        // Analyze each wallet
        const analyses = await Promise.all(
            addresses.map(addr => this.analyze(addr, chainId, options))
        );

        // Find common funding sources
        const allSourceAddresses = analyses.map(a =>
            this.flattenTreeAddresses(a.fundingSources)
        );
        const commonFundingSources = this.findCommonElements(allSourceAddresses);

        // Find common destinations
        const allDestAddresses = analyses.map(a =>
            this.flattenTreeAddresses(a.fundingDestinations)
        );
        const commonDestinations = this.findCommonElements(allDestAddresses);

        // Find shared projects
        const allProjects = analyses.flatMap(a => a.projectsInteracted);
        const projectCounts = new Map<string, number>();
        for (const p of allProjects) {
            projectCounts.set(p.contractAddress, (projectCounts.get(p.contractAddress) || 0) + 1);
        }
        const sharedProjects = allProjects.filter(
            p => projectCounts.get(p.contractAddress)! === addresses.length
        );

        // Find direct transfers between wallets
        const normalizedAddrs = addresses.map(a => a.toLowerCase());
        const directTransfers = analyses.flatMap(a =>
            a.transactions.filter(tx =>
                normalizedAddrs.includes(tx.from) && tx.to && normalizedAddrs.includes(tx.to)
            )
        );

        // Calculate correlation score
        const correlationScore = this.calculateCorrelation(
            commonFundingSources.length,
            commonDestinations.length,
            sharedProjects.length,
            directTransfers.length
        );

        return {
            wallets: analyses,
            commonFundingSources,
            commonDestinations,
            sharedProjects: this.dedupeProjects(sharedProjects),
            directTransfers,
            correlationScore,
            isSybilLikely: correlationScore > 60,
        };
    }

    /** Analyze contract interactors */
    async analyzeContract(
        contractAddress: string,
        chainId: ChainId,
        options: {
            maxInteractors?: number;
            analyzeFunding?: boolean;
            // Allow external provider of interactors (like Dune)
            externalInteractors?: string[];
        } = {}
    ): Promise<{
        contractAddress: string;
        chain: ChainId;
        totalInteractors: number;
        interactors: Array<{
            address: string;
            interactionCount: number;
            totalValueInEth: number;
            totalValueOutEth: number;
            firstInteraction: number;
            lastInteraction: number;
            fundingSource?: string;
        }>;
        sharedFundingGroups: Array<{
            fundingSource: string;
            wallets: string[];
            count: number;
        }>;
        suspiciousPatterns: SuspiciousIndicator[];
        riskScore: number;
    }> {
        const provider = this.providerFactory.getProvider(chainId);
        const normalizedAddr = contractAddress.toLowerCase();

        let txs: Transaction[] = [];
        const interactorMap = new Map<string, {
            count: number;
            valueIn: number;
            valueOut: number;
            firstTs: number;
            lastTs: number;
        }>();

        // If external interactors provided (e.g. from Dune), use them directly
        if (options.externalInteractors && options.externalInteractors.length > 0) {
            this.reportProgress('Using provided interactors', 1, 4, `Processing ${options.externalInteractors.length} wallets...`);

            // For external interactors, we only have the address initially
            for (const addr of options.externalInteractors) {
                const normalized = addr.toLowerCase();
                interactorMap.set(normalized, {
                    count: 1, // Assumed at least 1
                    valueIn: 0,
                    valueOut: 0,
                    firstTs: Math.floor(Date.now() / 1000),
                    lastTs: Math.floor(Date.now() / 1000)
                });
            }
        } else {
            this.reportProgress('Fetching contract transactions', 1, 4, 'Getting transactions to contract...');
            // Fallback to slow RPC fetching
            txs = await provider.getTransactions(normalizedAddr);

            for (const tx of txs) {
                // Skip if this is an outgoing tx from contract
                if (tx.from === normalizedAddr) continue;

                const addr = tx.from.toLowerCase();
                const existing = interactorMap.get(addr);

                if (existing) {
                    existing.count++;
                    existing.valueIn += tx.isIncoming ? tx.valueInEth : 0;
                    existing.valueOut += !tx.isIncoming ? tx.valueInEth : 0;
                    existing.firstTs = Math.min(existing.firstTs, tx.timestamp);
                    existing.lastTs = Math.max(existing.lastTs, tx.timestamp);
                } else {
                    interactorMap.set(addr, {
                        count: 1,
                        valueIn: tx.isIncoming ? tx.valueInEth : 0,
                        valueOut: !tx.isIncoming ? tx.valueInEth : 0,
                        firstTs: tx.timestamp,
                        lastTs: tx.timestamp,
                    });
                }
            }
        }

        this.reportProgress('Processing interactors', 2, 4, `Found ${interactorMap.size} unique interactors`);

        const maxInteractors = options.maxInteractors || 100;

        // Convert to array and sort by interaction count
        let interactors = Array.from(interactorMap.entries())
            .map(([address, stats]) => ({
                address,
                interactionCount: stats.count,
                totalValueInEth: stats.valueIn,
                totalValueOutEth: stats.valueOut,
                firstInteraction: stats.firstTs,
                lastInteraction: stats.lastTs,
            }))
            .sort((a, b) => b.interactionCount - a.interactionCount)
            .slice(0, maxInteractors);

        // If getting funding, do it
        const sharedFundingGroups: Array<{
            fundingSource: string;
            wallets: string[];
            count: number;
        }> = [];

        if (options.analyzeFunding !== false) {
            this.reportProgress('Analyzing funding sources', 2, 4, `Tracing funding for ${interactors.length} wallets...`);

            const fundingMap = new Map<string, string[]>();

            // Use batched processing with rate limiting logic
            const BATCH_SIZE = 20;

            for (let i = 0; i < interactors.length; i += BATCH_SIZE) {
                const batch = interactors.slice(i, i + BATCH_SIZE);

                await Promise.all(batch.map(async (interactor) => {
                    try {
                        const funding = await provider.getFirstFunder(interactor.address);
                        if (funding && funding.address) {
                            (interactor as any).fundingSource = funding.address;

                            const existing = fundingMap.get(funding.address) || [];
                            existing.push(interactor.address);
                            fundingMap.set(funding.address, existing);
                        }
                    } catch (e) {
                        // ignore errors
                    }
                }));

                // Small delay to be nice to RPCs
                await new Promise(r => setTimeout(r, 100));
                this.reportProgress('Analyzing funding sources', 2, 4, `Analyzed ${Math.min(i + BATCH_SIZE, interactors.length)}/${interactors.length}...`);
            }


        }


        this.reportProgress('Generating report', 4, 4, 'Analyzing patterns...');

        // Detect suspicious patterns
        const suspiciousPatterns: SuspiciousIndicator[] = [];
        let riskScore = 0;

        // Check for Sybil-like behavior (many wallets from same funder)
        if (sharedFundingGroups.length > 0) {
            const largestGroup = sharedFundingGroups.reduce((a, b) => a.count > b.count ? a : b);
            if (largestGroup.count >= 5) {
                suspiciousPatterns.push({
                    type: 'sybil_farming',
                    severity: 'high',
                    description: `${largestGroup.count} interacting wallets share the same funding source`,
                    evidence: largestGroup.wallets.slice(0, 5),
                    score: 30,
                });
                riskScore += 30;
            } else if (largestGroup.count >= 3) {
                suspiciousPatterns.push({
                    type: 'sybil_farming',
                    severity: 'medium',
                    description: `${largestGroup.count} interacting wallets share the same funding source`,
                    evidence: largestGroup.wallets,
                    score: 15,
                });
                riskScore += 15;
            }
        }

        // Check for fresh wallets
        const now = Math.floor(Date.now() / 1000);
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60);
        const freshWallets = interactors.filter(i => i.firstInteraction > thirtyDaysAgo);
        if (freshWallets.length > interactors.length * 0.5) {
            suspiciousPatterns.push({
                type: 'fresh_wallet',
                severity: 'medium',
                description: `${freshWallets.length} of ${interactors.length} interactors are fresh wallets (<30 days old)`,
                evidence: freshWallets.slice(0, 5).map(w => w.address),
                score: 20,
            });
            riskScore += 20;
        }

        return {
            contractAddress: normalizedAddr,
            chain: chainId,
            totalInteractors: interactorMap.size,
            interactors,
            sharedFundingGroups,
            suspiciousPatterns,
            riskScore: Math.min(100, riskScore),
        };
    }

    /** Merge and dedupe transactions */
    private mergeTransactions(
        normalTxs: Transaction[],
        internalTxs: Transaction[]
    ): Transaction[] {
        const txMap = new Map<string, Transaction>();

        for (const tx of normalTxs) {
            txMap.set(tx.hash, tx);
        }

        for (const tx of internalTxs) {
            if (!txMap.has(tx.hash)) {
                txMap.set(tx.hash, tx);
            }
        }

        return Array.from(txMap.values())
            .sort((a, b) => b.timestamp - a.timestamp);
    }

    /** Identify project interactions */
    private identifyProjects(transactions: Transaction[]): ProjectInteraction[] {
        const projectMap = new Map<string, ProjectInteraction>();

        for (const tx of transactions) {
            if (!tx.to) continue;
            const addr = tx.to.toLowerCase();

            // Check known projects
            const known = KNOWN_PROJECTS[addr];

            // Only track contract interactions
            if (tx.category === 'contract_call' || known) {
                const existing = projectMap.get(addr);

                if (existing) {
                    existing.interactionCount++;
                    existing.totalValueInEth += tx.valueInEth;
                    existing.lastInteraction = Math.max(existing.lastInteraction, tx.timestamp);
                } else {
                    projectMap.set(addr, {
                        contractAddress: addr,
                        projectName: known?.name,
                        category: known?.category || 'unknown',
                        interactionCount: 1,
                        totalValueInEth: tx.valueInEth,
                        firstInteraction: tx.timestamp,
                        lastInteraction: tx.timestamp,
                    });
                }
            }
        }

        return Array.from(projectMap.values())
            .sort((a, b) => b.interactionCount - a.interactionCount);
    }

    /** Generate analysis summary */
    private generateSummary(
        transactions: Transaction[],
        sources: FundingNode,
        destinations: FundingNode,
        firstTxTimestamp?: number
    ): AnalysisSummary {
        const successfulTxs = transactions.filter(tx => tx.status === 'success').length;
        const failedTxs = transactions.filter(tx => tx.status === 'failed').length;

        // Only sum ETH transfers (not token/nft transfers which have different value scales)
        const ethTransfers = transactions.filter(tx =>
            tx.category === 'transfer' || tx.category === 'contract_call'
        );

        const totalSent = ethTransfers
            .filter(tx => !tx.isIncoming)
            .reduce((sum, tx) => sum + tx.valueInEth, 0);

        const totalReceived = ethTransfers
            .filter(tx => tx.isIncoming)
            .reduce((sum, tx) => sum + tx.valueInEth, 0);

        const uniqueAddresses = new Set<string>();
        for (const tx of transactions) {
            uniqueAddresses.add(tx.from);
            if (tx.to) uniqueAddresses.add(tx.to);
        }

        // Calculate activity period - ALWAYS use wallet firstTxTimestamp for consistency
        // This ensures the same result regardless of transaction limit/pagination
        const nowTimestamp = Math.floor(Date.now() / 1000);
        const activityPeriodDays = (firstTxTimestamp && firstTxTimestamp > 0)
            ? Math.max(1, Math.ceil((nowTimestamp - firstTxTimestamp) / 86400))
            : 1;

        console.log(`[ActivityPeriod] Using wallet firstTx: ${firstTxTimestamp}, Now: ${nowTimestamp}, Days: ${activityPeriodDays}`);

        return {
            totalTransactions: transactions.length,
            successfulTxs,
            failedTxs,
            totalValueSentEth: totalSent,
            totalValueReceivedEth: totalReceived,
            uniqueInteractedAddresses: uniqueAddresses.size,
            topFundingSources: sources.children
                .slice(0, 5)
                .map(c => ({ address: c.address, valueEth: c.totalValueInEth })),
            topFundingDestinations: destinations.children
                .slice(0, 5)
                .map(c => ({ address: c.address, valueEth: c.totalValueInEth })),
            activityPeriodDays: Math.max(1, activityPeriodDays),
            averageTxPerDay: transactions.length / Math.max(1, activityPeriodDays),
        };
    }

    /** Flatten tree addresses */
    private flattenTreeAddresses(node: FundingNode): string[] {
        const addresses = [node.address];
        for (const child of node.children) {
            addresses.push(...this.flattenTreeAddresses(child));
        }
        return addresses;
    }

    /** Find common elements across arrays */
    private findCommonElements(arrays: string[][]): string[] {
        if (arrays.length === 0) return [];
        if (arrays.length === 1) return arrays[0];

        return arrays[0].filter(item =>
            arrays.every(arr => arr.includes(item))
        );
    }

    /** Calculate correlation score */
    private calculateCorrelation(
        commonSources: number,
        commonDests: number,
        sharedProjects: number,
        directTransfers: number
    ): number {
        let score = 0;

        score += Math.min(30, commonSources * 10);
        score += Math.min(25, commonDests * 8);
        score += Math.min(25, sharedProjects * 5);
        score += Math.min(20, directTransfers * 4);

        return Math.min(100, score);
    }

    /** Dedupe projects by address */
    private dedupeProjects(projects: ProjectInteraction[]): ProjectInteraction[] {
        const seen = new Set<string>();
        return projects.filter(p => {
            if (seen.has(p.contractAddress)) return false;
            seen.add(p.contractAddress);
            return true;
        });
    }

    // Helper used by other methods
    private reportProgress(stage: string, current: number, total: number, message: string) {
        if (this.onProgress) {
            this.onProgress({
                stage,
                current,
                total,
                message,
            });
        }
    }
}
