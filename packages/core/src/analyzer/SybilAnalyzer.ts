// ============================================================
// FundTracer by DT - Sybil Analyzer
// Detects sybil clusters by analyzing common funding sources
// ============================================================

import { ChainId } from '../types.js';
import { ProviderFactory } from '../providers/ProviderFactory.js';
import { AlchemyProvider } from '../providers/AlchemyProvider.js';
import { CovalentProvider } from '../providers/CovalentProvider.js';
import { AlchemyKeyPool, type SybilAlchemyConfig } from '../utils/AlchemyKeyPool.js';

/** Individual wallet with its funding info */
export interface WalletFunding {
    address: string;
    funder: string | null;
    fundingTxHash: string | null;
    fundingTimestamp: number | null;
    fundingAmount: number;
    interactionCount: number;
}

/** A cluster of wallets sharing the same funding source */
export interface SybilCluster {
    fundingSource: string;
    fundingSourceLabel?: string; // CEX name if known
    wallets: WalletFunding[];
    totalWallets: number;
    totalInteractions: number;
    averageFundingAmount: number;
    timeSpan: {
        first: number;
        last: number;
        durationHours: number;
    };
    sybilScore: number; // 0-100, higher = more suspicious
    flags: string[];
}

/** Result of sybil analysis */
export interface SybilAnalysisResult {
    contractAddress: string;
    chain: ChainId;
    analyzedAt: string;
    totalInteractors: number;
    uniqueFundingSources: number;
    clusters: SybilCluster[];
    flaggedClusters: SybilCluster[]; // Score >= threshold
    summary: {
        highRiskWallets: number;
        mediumRiskWallets: number;
        lowRiskWallets: number;
    };
}

/** Known CEX/clean addresses */
const KNOWN_SOURCES: Record<string, string> = {
    '0x21a31ee1afc51d94c2efccaa2092ad1028285549': 'Binance 15',
    '0xdfd5293d8e347dfe59e90efd55b2956a1343963d': 'Binance 16',
    '0x28c6c06298d514db089934071355e5743bf21d60': 'Binance 14',
    '0x56eddb7aa87536c09ccc2793473599fd21a8b17f': 'Coinbase 6',
    '0xa9d1e08c7793af67e9d92fe308d5697fb81d3e43': 'Coinbase 10',
    '0x71660c4005ba85c37ccec55d0c4493e66fe775d3': 'Coinbase 4',
    '0xf89d7b9c864f589bbf53a82105107622b35eaa40': 'Bybit',
    '0x1ab4973a48dc892cd9971ece8e01dcc7688f8f23': 'OKX 7',
};

/** Sybil detection thresholds */
const THRESHOLDS = {
    minClusterSize: 3,          // Min wallets to flag a cluster (lowered for better detection)
    highRiskScore: 60,          // Score threshold for high risk (lowered)
    mediumRiskScore: 30,        // Score threshold for medium risk (lowered)
    shortTimeSpanHours: 48,     // Funding within 48h is suspicious
    veryShortTimeSpanHours: 6,  // Funding within 6h is very suspicious
};

export class SybilAnalyzer {
    private provider: AlchemyProvider;
    private covalentProvider?: CovalentProvider;
    private chain: ChainId;
    private moralisKey: string;
    private keyPool?: AlchemyKeyPool;

    constructor(chain: ChainId, config: SybilAlchemyConfig) {
        this.chain = chain;
        
        // Initialize key pool for parallel requests
        this.keyPool = new AlchemyKeyPool(config, chain);
        this.moralisKey = config.moralisKey || '';
        
        // Create primary provider with default key
        this.provider = new AlchemyProvider(chain, config.defaultKey, this.moralisKey);
    }

    /**
     * Main analysis entry point
     * Takes a contract address and finds all sybil clusters
     */
    async analyzeContract(
        contractAddress: string,
        options: {
            maxInteractors?: number;
            minClusterSize?: number;
        } = {}
    ): Promise<SybilAnalysisResult> {
        const maxInteractors = options.maxInteractors || 500;
        const minClusterSize = options.minClusterSize || THRESHOLDS.minClusterSize;

        console.log(`[SybilAnalyzer] Starting analysis for contract ${contractAddress}`);

        // Step 1: Get all addresses that interacted with the contract
        console.log('[SybilAnalyzer] Step 1: Fetching contract interactors...');
        const interactors = await this.getContractInteractors(contractAddress, maxInteractors);
        console.log(`[SybilAnalyzer] Found ${interactors.length} unique interactors`);

        if (interactors.length === 0) {
            return this.createEmptyResult(contractAddress);
        }

        // Step 2: Find funding source for each interactor
        console.log('[SybilAnalyzer] Step 2: Finding funding sources...');
        const walletFundings = await this.findFundingSources(interactors);
        console.log(`[SybilAnalyzer] Found funding for ${walletFundings.filter(w => w.funder).length} wallets`);

        // Step 3: Cluster by funding source
        console.log('[SybilAnalyzer] Step 3: Clustering by funding source...');
        const clusters = this.clusterByFundingSource(walletFundings, minClusterSize);
        console.log(`[SybilAnalyzer] Created ${clusters.length} clusters`);

        // Step 4: Calculate sybil scores
        console.log('[SybilAnalyzer] Step 4: Calculating sybil scores...');
        const scoredClusters = clusters.map(c => this.calculateSybilScore(c));

        // Sort by score (highest first)
        scoredClusters.sort((a, b) => b.sybilScore - a.sybilScore);

        // Flag suspicious clusters
        const flaggedClusters = scoredClusters.filter(c => c.sybilScore >= THRESHOLDS.mediumRiskScore);

        // Calculate summary
        const summary = this.calculateSummary(scoredClusters);

        return {
            contractAddress: contractAddress.toLowerCase(),
            chain: this.chain,
            analyzedAt: new Date().toISOString(),
            totalInteractors: interactors.length,
            uniqueFundingSources: clusters.length,
            clusters: scoredClusters,
            flaggedClusters,
            summary,
        };
    }

    /**
     * Analyze addresses directly (from Dune/CSV paste)
     * Skips the slow interactor lookup step - much faster!
     */
    async analyzeAddresses(
        addresses: string[],
        options: { minClusterSize?: number } = {}
    ): Promise<SybilAnalysisResult> {
        const minClusterSize = options.minClusterSize || THRESHOLDS.minClusterSize;
        const uniqueAddresses = [...new Set(addresses.map(a => a.toLowerCase()))];

        console.log(`[SybilAnalyzer] Analyzing ${uniqueAddresses.length} provided addresses`);

        if (uniqueAddresses.length === 0) {
            return this.createEmptyResult('direct-input');
        }

        // Step 1: Find funding sources with optimized batch processing
        console.log('[SybilAnalyzer] Finding funding sources with Moralis optimization...');
        const walletFundings = await this.findFundingSourcesFast(uniqueAddresses);
        console.log(`[SybilAnalyzer] Found funding for ${walletFundings.filter(w => w.funder).length}/${uniqueAddresses.length} wallets`);

        // Step 2: Cluster by funding source
        console.log('[SybilAnalyzer] Clustering by funding source...');
        const clusters = this.clusterByFundingSource(walletFundings, minClusterSize);
        console.log(`[SybilAnalyzer] Created ${clusters.length} clusters`);

        // Step 3: Calculate sybil scores
        console.log('[SybilAnalyzer] Calculating sybil scores...');
        const scoredClusters = clusters.map(c => this.calculateSybilScore(c));
        scoredClusters.sort((a, b) => b.sybilScore - a.sybilScore);

        const flaggedClusters = scoredClusters.filter(c => c.sybilScore >= THRESHOLDS.mediumRiskScore);
        const summary = this.calculateSummary(scoredClusters);

        return {
            contractAddress: 'direct-input',
            chain: this.chain,
            analyzedAt: new Date().toISOString(),
            totalInteractors: uniqueAddresses.length,
            uniqueFundingSources: clusters.length,
            clusters: scoredClusters,
            flaggedClusters,
            summary,
        };
    }

    /**
     * Get all unique addresses that have sent transactions to the contract
     * Uses Alchemy with multi-key parallelization (primary) + Moralis (BSC fallback)
     */
    private async getContractInteractors(contractAddress: string, limit: number): Promise<string[]> {
        const interactors = new Set<string>();
        const contractLower = contractAddress.toLowerCase();
        const isBsc = this.chain === 'bsc';

        // BSC: Use Moralis only (Alchemy doesn't support BSC)
        if (isBsc && this.moralisKey) {
            try {
                console.log('[SybilAnalyzer] BSC detected - using Moralis API...');
                const moralisAddresses = await this.getInteractorsFromMoralis(contractAddress, limit);
                for (const addr of moralisAddresses) {
                    interactors.add(addr.toLowerCase());
                }
                console.log(`[SybilAnalyzer] Moralis found ${interactors.size} interactors`);
                return Array.from(interactors).slice(0, limit);
            } catch (e: any) {
                console.log('[SybilAnalyzer] Moralis method failed:', e.message);
            }
        }

        // Non-BSC: Use Alchemy with multi-key parallelization (primary)
        if (this.keyPool && this.keyPool.isChainSupported()) {
            try {
                console.log('[SybilAnalyzer] Using Alchemy with multi-key pool...');
                const alchemyAddresses = await this.getInteractorsFromAlchemyParallel(contractAddress, limit);
                for (const addr of alchemyAddresses) {
                    interactors.add(addr.toLowerCase());
                }
                console.log(`[SybilAnalyzer] Alchemy parallel found ${interactors.size} interactors`);

                if (interactors.size >= limit) {
                    return Array.from(interactors).slice(0, limit);
                }
            } catch (e: any) {
                console.log('[SybilAnalyzer] Alchemy parallel method failed:', e.message);
            }
        }

        // Fallback: Single Alchemy provider
        if (interactors.size < limit) {
            try {
                console.log('[SybilAnalyzer] Trying single Alchemy provider...');
                const transfers = await this.provider.getTransactions(contractAddress);
                for (const tx of transfers) {
                    if (tx.to?.toLowerCase() === contractLower) {
                        interactors.add(tx.from.toLowerCase());
                    }
                    if (tx.from.toLowerCase() === contractLower && tx.to) {
                        interactors.add(tx.to.toLowerCase());
                    }
                    if (interactors.size >= limit) break;
                }
            } catch (e: any) {
                console.log('[SybilAnalyzer] Single Alchemy method failed:', e.message);
            }
        }

        // Last resort: Moralis fallback for non-BSC
        if (interactors.size < limit && this.moralisKey && !isBsc) {
            try {
                console.log('[SybilAnalyzer] Falling back to Moralis...');
                const moralisAddresses = await this.getInteractorsFromMoralis(contractAddress, limit);
                for (const addr of moralisAddresses) {
                    interactors.add(addr.toLowerCase());
                }
            } catch (e: any) {
                console.log('[SybilAnalyzer] Moralis fallback failed:', e.message);
            }
        }

        console.log(`[SybilAnalyzer] Total interactors found: ${interactors.size}`);
        return Array.from(interactors);
    }

    /**
     * Get contract interactors using Alchemy with multi-key parallelization
     */
    private async getInteractorsFromAlchemyParallel(contractAddress: string, limit: number): Promise<string[]> {
        const addresses = new Set<string>();
        
        if (!this.keyPool) {
            return [];
        }

        const keys = this.keyPool.getAllContractKeys();
        const baseUrl = this.keyPool.getRpcUrl(keys[0]).replace(/\/v2\/[^/]+$/, '');
        
        // Use block ranges to query in parallel
        const currentBlock = await this.getCurrentBlockNumber(baseUrl + '/v2/' + keys[0]);
        const chunkSize = 5000;
        const maxBlocksToQuery = 50000;
        
        // Divide block ranges across keys
        const numKeys = keys.length;
        const rangesPerKey = Math.ceil(maxBlocksToQuery / chunkSize / numKeys);
        
        const promises: Promise<void>[] = [];
        
        for (let keyIdx = 0; keyIdx < numKeys; keyIdx++) {
            const key = keys[keyIdx];
            const startOffset = keyIdx * rangesPerKey;
            
            for (let r = 0; r < rangesPerKey; r++) {
                const rangeIdx = startOffset + r;
                const toBlock = currentBlock - (rangeIdx * chunkSize);
                const fromBlock = Math.max(0, toBlock - chunkSize + 1);
                
                if (addresses.size >= limit) break;
                
                const promise = (async () => {
                    await this.queryBlockRange(key, contractAddress, fromBlock, toBlock, addresses, limit);
                    await new Promise(resolve => setTimeout(resolve, 100));
                })();
                promises.push(promise);
            }
        }
        
        await Promise.all(promises);
        return Array.from(addresses);
    }

    private async getCurrentBlockNumber(rpcUrl: string): Promise<number> {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_blockNumber',
                params: []
            })
        });
        const data = await response.json();
        return parseInt(data.result, 16);
    }

    private async queryBlockRange(
        key: string,
        contractAddress: string,
        fromBlock: number,
        toBlock: number,
        addresses: Set<string>,
        limit: number
    ): Promise<void> {
        try {
            const baseUrl = this.keyPool!.getRpcUrl(key).replace(/\/v2\/[^/]+$/, '');
            const response = await fetch(`${baseUrl}/v2/${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_getLogs',
                    params: [{
                        address: contractAddress,
                        fromBlock: '0x' + fromBlock.toString(16),
                        toBlock: '0x' + toBlock.toString(16)
                    }]
                })
            });

            const data = await response.json();

            if (data.result && Array.isArray(data.result)) {
                for (const log of data.result) {
                    if (log.topics && log.topics.length > 1) {
                        for (let i = 1; i < Math.min(log.topics.length, 4); i++) {
                            const topic = log.topics[i];
                            if (topic && topic.length === 66) {
                                const potentialAddr = '0x' + topic.slice(26);
                                if (potentialAddr !== '0x0000000000000000000000000000000000000000' &&
                                    /^0x[a-fA-F0-9]{40}$/.test(potentialAddr)) {
                                    addresses.add(potentialAddr.toLowerCase());
                                }
                            }
                        }
                    }
                    if (addresses.size >= limit) break;
                }
            }
        } catch (e) {
            // Silently fail for individual range queries
            return;
        }
    }

    /**
     * Get interactors using Moralis API
     */
    private async getInteractorsFromMoralis(contractAddress: string, limit: number): Promise<string[]> {
        const addresses = new Set<string>();
        let cursor: string | undefined;
        const contractLower = contractAddress.toLowerCase();

        // Map chain to Moralis chain name
        const chainMap: Record<string, string> = {
            ethereum: 'eth',
            polygon: 'polygon',
            arbitrum: 'arbitrum',
            optimism: 'optimism',
            base: 'base',
            linea: 'linea',
        };
        const moralisChain = chainMap[this.chain] || 'eth';

        do {
            const url = new URL(`https://deep-index.moralis.io/api/v2.2/${contractAddress}`);
            url.searchParams.set('chain', moralisChain);
            url.searchParams.set('limit', '100');
            if (cursor) {
                url.searchParams.set('cursor', cursor);
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'accept': 'application/json',
                    'X-API-Key': this.moralisKey,
                },
            });

            const data = await response.json();

            if (data.result && Array.isArray(data.result)) {
                for (const tx of data.result) {
                    // Get the address that called the contract
                    if (tx.to_address?.toLowerCase() === contractLower && tx.from_address) {
                        addresses.add(tx.from_address.toLowerCase());
                    }
                    // Also track addresses the contract sent to
                    if (tx.from_address?.toLowerCase() === contractLower && tx.to_address) {
                        addresses.add(tx.to_address.toLowerCase());
                    }

                    if (addresses.size >= limit) break;
                }

                console.log(`[SybilAnalyzer] Moralis page: ${data.result.length} txs, ${addresses.size} unique addresses`);
            }

            cursor = data.cursor;

            // Small delay to avoid rate limits
            await new Promise(r => setTimeout(r, 100));

        } while (cursor && addresses.size < limit);

        return Array.from(addresses);
    }

    /**
     * Get addresses from contract event logs using paginated block ranges
     * Alchemy free tier limits block range
     */
    private async getContractLogs(contractAddress: string, limit: number): Promise<string[]> {
        const addresses = new Set<string>();
        const host = this.getAlchemyHost();
        const apiKey = this.getApiKey();

        // First, get the current block number
        const blockNumResponse = await fetch(`https://${host}/v2/${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_blockNumber',
                params: []
            })
        });
        const blockData = await blockNumResponse.json();
        const currentBlock = parseInt(blockData.result, 16);
        console.log(`[SybilAnalyzer] Current block: ${currentBlock}`);

        // Query in chunks (work backwards from latest)
        const chunkSize = 2000;
        const maxBlocksToQuery = 50000;

        for (let toBlock = currentBlock; toBlock > currentBlock - maxBlocksToQuery && addresses.size < limit; toBlock -= chunkSize) {
            const fromBlock = Math.max(0, toBlock - chunkSize + 1);

            try {
                const response = await fetch(`https://${host}/v2/${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'eth_getLogs',
                        params: [{
                            address: contractAddress,
                            fromBlock: '0x' + fromBlock.toString(16),
                            toBlock: '0x' + toBlock.toString(16)
                        }]
                    })
                });

                const data = await response.json();

                if (data.error) {
                    console.log(`[SybilAnalyzer] Log query error: ${data.error.message}`);
                    continue;
                }

                if (data.result && Array.isArray(data.result)) {
                    for (const log of data.result) {
                        if (log.topics && log.topics.length > 1) {
                            for (let i = 1; i < Math.min(log.topics.length, 4); i++) {
                                const topic = log.topics[i];
                                if (topic && topic.length === 66) {
                                    const potentialAddr = '0x' + topic.slice(26);
                                    if (potentialAddr !== '0x0000000000000000000000000000000000000000' &&
                                        /^0x[a-fA-F0-9]{40}$/.test(potentialAddr)) {
                                        addresses.add(potentialAddr.toLowerCase());
                                    }
                                }
                            }
                        }
                        if (addresses.size >= limit) break;
                    }
                    if (data.result.length > 0) {
                        console.log(`[SybilAnalyzer] Blocks ${fromBlock}-${toBlock}: ${data.result.length} logs, ${addresses.size} addresses`);
                    }
                }

                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 20));

            } catch (e: any) {
                console.log(`[SybilAnalyzer] Block range failed: ${e.message}`);
            }

            if (addresses.size >= limit) break;
        }

        return Array.from(addresses);
    }

    private getAlchemyHost(): string {
        const hosts: Record<string, string> = {
            ethereum: 'eth-mainnet.g.alchemy.com',
            polygon: 'polygon-mainnet.g.alchemy.com',
            arbitrum: 'arb-mainnet.g.alchemy.com',
            optimism: 'opt-mainnet.g.alchemy.com',
            base: 'base-mainnet.g.alchemy.com',
            linea: 'linea-mainnet.g.alchemy.com',
        };
        return hosts[this.chain] || 'eth-mainnet.g.alchemy.com';
    }

    private getApiKey(): string {
        // Access the provider's API key
        return (this.provider as any).apiKey || '';
    }

    /**
     * Find the first funder for each wallet
     */
    private async findFundingSources(addresses: string[]): Promise<WalletFunding[]> {
        const results: WalletFunding[] = [];
        const batchSize = 50; // Process 50 at a time for max speed

        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(async (address): Promise<WalletFunding> => {
                    try {
                        const funding = await this.provider.getFirstFunder(address);

                        if (funding) {
                            return {
                                address,
                                funder: funding.address,
                                fundingTxHash: funding.firstTx!.hash,
                                fundingTimestamp: funding.firstTx!.timestamp,
                                fundingAmount: funding.firstTx!.valueInEth,
                                interactionCount: 1, // Will be updated later
                            };
                        }

                        return {
                            address,
                            funder: null,
                            fundingTxHash: null,
                            fundingTimestamp: null,
                            fundingAmount: 0,
                            interactionCount: 1,
                        };
                    } catch (error) {
                        console.error(`[SybilAnalyzer] Error getting funder for ${address}:`, error);
                        return {
                            address,
                            funder: null,
                            fundingTxHash: null,
                            fundingTimestamp: null,
                            fundingAmount: 0,
                            interactionCount: 1,
                        };
                    }
                })
            );

            results.push(...batchResults);

            // Progress log
            console.log(`[SybilAnalyzer] Processed ${Math.min(i + batchSize, addresses.length)}/${addresses.length} wallets`);
        }

        return results;
    }

    /**
     * Optimized funding source lookup using Alchemy with multi-key parallelization
     * BSC uses Moralis fallback (Alchemy doesn't support BSC)
     */
    private fundingCache = new Map<string, WalletFunding>();

    private async findFundingSourcesFast(addresses: string[]): Promise<WalletFunding[]> {
        const results: WalletFunding[] = [];
        const uncachedAddresses: string[] = [];
        const isBsc = this.chain === 'bsc';

        // Check cache first
        for (const address of addresses) {
            const cached = this.fundingCache.get(address.toLowerCase());
            if (cached) {
                results.push(cached);
            } else {
                uncachedAddresses.push(address);
            }
        }

        console.log(`[SybilAnalyzer] Cache hit: ${results.length}/${addresses.length}, fetching ${uncachedAddresses.length} new`);

        // BSC: Use Moralis single-threaded (no parallelization available)
        if (isBsc && this.moralisKey) {
            console.log('[SybilAnalyzer] BSC detected - using Moralis for funding sources');
            return await this.findFundingSourcesMoralisSequential(uncachedAddresses, results);
        }

        // Non-BSC: Use Alchemy with multi-key parallelization
        if (this.keyPool && this.keyPool.isChainSupported()) {
            console.log('[SybilAnalyzer] Using Alchemy multi-key parallelization');
            return await this.findFundingSourcesAlchemyParallel(uncachedAddresses, results);
        }

        // Fallback: Single provider
        console.log('[SybilAnalyzer] Using single provider fallback');
        return await this.findFundingSourcesSingleProvider(uncachedAddresses, results);
    }

    /**
     * Find funding sources using Alchemy with parallel key pool
     */
    private async findFundingSourcesAlchemyParallel(
        uncachedAddresses: string[],
        cachedResults: WalletFunding[]
    ): Promise<WalletFunding[]> {
        const results = [...cachedResults];
        
        if (!this.keyPool || uncachedAddresses.length === 0) {
            return results;
        }

        const allKeys = this.keyPool.getAllWalletKeys();
        // Limit to max 2 keys to avoid rate limiting
        const MAX_PARALLEL_KEYS = 2;
        const numKeys = Math.min(allKeys.length, MAX_PARALLEL_KEYS, uncachedAddresses.length);
        const keys = allKeys.slice(0, numKeys);
        
        console.log(`[SybilAnalyzer] Parallel processing ${uncachedAddresses.length} wallets across ${numKeys} keys (limited from ${allKeys.length})`);

        // Divide addresses across keys and process in parallel
        const batchSize = Math.ceil(uncachedAddresses.length / numKeys);
        
        const promises = [];
        for (let i = 0; i < numKeys; i++) {
            const startIdx = i * batchSize;
            const endIdx = Math.min(startIdx + batchSize, uncachedAddresses.length);
            const batch = uncachedAddresses.slice(startIdx, endIdx);
            const key = keys[i];
            
            const promise = this.processWalletBatchWithKey(batch, key, results);
            promises.push(promise);
        }

        await Promise.all(promises);
        
        console.log(`[SybilAnalyzer] Completed funding lookup for ${results.length} wallets`);
        return results;
    }

    /**
     * Get supported transfer categories per chain
     * 'internal' category is only supported on ETH and MATIC
     */
    private getTransferCategories(): string[] {
        const supportsInternal = ['ethereum', 'polygon'].includes(this.chain);
        return supportsInternal
            ? ['external', 'internal', 'erc20', 'erc721', 'erc1155']
            : ['external', 'erc20', 'erc721', 'erc1155'];
    }

    private async processWalletBatchWithKey(
        batch: string[],
        apiKey: string,
        results: WalletFunding[]
    ): Promise<void> {
        const chain = this.chain;
        const baseUrl = this.keyPool!.getRpcUrl(apiKey).replace(/\/v2\/[^/]+$/, '');
        const categories = this.getTransferCategories();
        
        for (const address of batch) {
            let data: any = null;
            let consecutiveFailures = 0;
            const MAX_CONSECUTIVE_FAILURES = 3;
            
            while (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
                try {
                    // Use Alchemy getAssetTransfers with chain-aware categories
                    const response = await fetch(`${baseUrl}/v2/${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'alchemy_getAssetTransfers',
                            params: [{
                                fromBlock: '0x0',
                                toBlock: 'latest',
                                toAddress: address,
                                category: categories,
                                withMetadata: true,
                                excludeZeroValue: false,
                                maxCount: '0x64', // 100 max
                                order: 'asc'
                            }]
                        })
                    });

                    // Check for non-JSON responses (rate limit HTML pages)
                    const contentType = response.headers.get('content-type') || '';
                    const responseText = await response.text();
                    
                    if (!contentType.includes('application/json')) {
                        console.log(`[SybilAnalyzer] Non-JSON response for ${address}, status: ${response.status}`);
                        consecutiveFailures++;
                        // Wait longer on failures
                        await new Promise(resolve => setTimeout(resolve, 3000 * consecutiveFailures));
                        continue;
                    }
                    
                    // Parse the JSON
                    try {
                        data = JSON.parse(responseText);
                    } catch (parseError) {
                        console.log(`[SybilAnalyzer] JSON parse error for ${address}`);
                        consecutiveFailures++;
                        await new Promise(resolve => setTimeout(resolve, 3000 * consecutiveFailures));
                        continue;
                    }
                    
                    // Handle rate limiting (429)
                    if (response.status === 429 || data?.error?.code === 429) {
                        console.log(`[SybilAnalyzer] Rate limited for ${address}, retrying after delay...`);
                        consecutiveFailures++;
                        await new Promise(resolve => setTimeout(resolve, 2000 * consecutiveFailures));
                        continue;
                    }
                    
                    // Handle Alchemy errors
                    if (data?.error) {
                        console.log(`[SybilAnalyzer] Alchemy error for ${address}: ${JSON.stringify(data.error)}`);
                        consecutiveFailures++;
                        await new Promise(resolve => setTimeout(resolve, 1000 * consecutiveFailures));
                        continue;
                    }
                    
                    // Success - break out of retry loop
                    consecutiveFailures = 0;
                    break;
                    
                } catch (error: any) {
                    console.log(`[SybilAnalyzer] Exception for ${address}: ${error?.message || error}`);
                    consecutiveFailures++;
                    await new Promise(resolve => setTimeout(resolve, 2000 * consecutiveFailures));
                }
            }
            
            // If we hit max consecutive failures, try Moralis fallback
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                console.log(`[SybilAnalyzer] Alchemy failing consistently for ${address}, trying Moralis fallback...`);
                try {
                    if (this.moralisKey) {
                        const funding = await this.getFirstFunderMoralis(address);
                        if (funding) {
                            const result: WalletFunding = {
                                address,
                                funder: funding.funder,
                                fundingTxHash: funding.txHash,
                                fundingTimestamp: funding.timestamp,
                                fundingAmount: funding.amount,
                                interactionCount: 1,
                            };
                            this.fundingCache.set(address.toLowerCase(), result);
                            results.push(result);
                            await new Promise(resolve => setTimeout(resolve, 200));
                            continue;
                        }
                    }
                } catch (e) {
                    // Moralis fallback also failed
                }
                
                // All methods failed
                const emptyResult: WalletFunding = {
                    address,
                    funder: null,
                    fundingTxHash: null,
                    fundingTimestamp: null,
                    fundingAmount: 0,
                    interactionCount: 1,
                };
                this.fundingCache.set(address.toLowerCase(), emptyResult);
                results.push(emptyResult);
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
            
            // Process successful response
            try {
                if (!data?.result?.transfers || data.result.transfers.length === 0) {
                    // Try a different approach - query fromAddress as well
                    const fromResponse = await fetch(`${baseUrl}/v2/${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'alchemy_getAssetTransfers',
                            params: [{
                                fromBlock: '0x0',
                                toBlock: 'latest',
                                toAddress: address,
                                category: ['external', 'erc20'],
                                withMetadata: true,
                                excludeZeroValue: false,
                                maxCount: '0x64',
                                order: 'asc'
                            }]
                        })
                    });
                    
                    const fromData = await fromResponse.json();
                    if (fromData.result?.transfers?.length > 0) {
                        data = fromData;
                    }
                }
                
                if (data?.result?.transfers?.length > 0) {
                    // Sort by block number to find first
                    const transfers = data.result.transfers.sort((a: any, b: any) => 
                        parseInt(a.blockNum, 16) - parseInt(b.blockNum, 16)
                    );
                    
                    const firstTransfer = transfers[0];
                    
                    // Check value - can be number or string, handle both
                    let value: number;
                    if (typeof firstTransfer.value === 'string') {
                        value = parseFloat(firstTransfer.value);
                    } else if (firstTransfer.value !== undefined && firstTransfer.value !== null) {
                        value = Number(firstTransfer.value);
                    } else if (firstTransfer.rawContract?.value) {
                        // Fallback to rawContract value (hex string)
                        value = parseInt(firstTransfer.rawContract.value, 16);
                    } else {
                        value = 0;
                    }
                    
                    // Handle ERC20 transfers with decimals
                    let fundingAmount = value;
                    if (firstTransfer.category === 'erc20' && firstTransfer.rawContract?.decimal) {
                        const decimals = parseInt(firstTransfer.rawContract.decimal, 16);
                        fundingAmount = value / Math.pow(10, decimals);
                    } else if (firstTransfer.category !== 'external') {
                        // For non-ETH, value is already in token units
                        fundingAmount = value;
                    } else {
                        // ETH transfers - divide by 1e18
                        fundingAmount = value / 1e18;
                    }
                    
                    if (fundingAmount > 0 || firstTransfer.category === 'erc20') {
                        const result: WalletFunding = {
                            address,
                            funder: firstTransfer.from,
                            fundingTxHash: firstTransfer.hash,
                            fundingTimestamp: firstTransfer.metadata?.blockTimestamp 
                                ? new Date(firstTransfer.metadata.blockTimestamp).getTime() / 1000 
                                : (firstTransfer.blockNum ? parseInt(firstTransfer.blockNum, 16) * 12 : 0),
                            fundingAmount: fundingAmount,
                            interactionCount: 1,
                        };
                        this.fundingCache.set(address.toLowerCase(), result);
                        results.push(result);
                        await new Promise(resolve => setTimeout(resolve, 150));
                        continue;
                    }
                }

                // No funding found
                const emptyResult: WalletFunding = {
                    address,
                    funder: null,
                    fundingTxHash: null,
                    fundingTimestamp: null,
                    fundingAmount: 0,
                    interactionCount: 1,
                };
                this.fundingCache.set(address.toLowerCase(), emptyResult);
                results.push(emptyResult);
            } catch (error) {
                // Final fallback on any processing error
                const emptyResult: WalletFunding = {
                    address,
                    funder: null,
                    fundingTxHash: null,
                    fundingTimestamp: null,
                    fundingAmount: 0,
                    interactionCount: 1,
                };
                results.push(emptyResult);
            }
            
            // Rate limit between requests
            await new Promise(resolve => setTimeout(resolve, 400));
        }
    }

    /**
     * Find funding sources using Moralis (sequential for BSC)
     */
    private async findFundingSourcesMoralisSequential(
        uncachedAddresses: string[],
        cachedResults: WalletFunding[]
    ): Promise<WalletFunding[]> {
        const results = [...cachedResults];
        const batchSize = 20;

        for (let i = 0; i < uncachedAddresses.length; i += batchSize) {
            const batch = uncachedAddresses.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(async (address): Promise<WalletFunding> => {
                    try {
                        if (this.moralisKey) {
                            const funding = await this.getFirstFunderMoralis(address);
                            if (funding) {
                                const result: WalletFunding = {
                                    address,
                                    funder: funding.funder,
                                    fundingTxHash: funding.txHash,
                                    fundingTimestamp: funding.timestamp,
                                    fundingAmount: funding.amount,
                                    interactionCount: 1,
                                };
                                this.fundingCache.set(address.toLowerCase(), result);
                                return result;
                            }
                        }

                        const emptyResult: WalletFunding = {
                            address,
                            funder: null,
                            fundingTxHash: null,
                            fundingTimestamp: null,
                            fundingAmount: 0,
                            interactionCount: 1,
                        };
                        this.fundingCache.set(address.toLowerCase(), emptyResult);
                        return emptyResult;
                    } catch (error) {
                        return {
                            address,
                            funder: null,
                            fundingTxHash: null,
                            fundingTimestamp: null,
                            fundingAmount: 0,
                            interactionCount: 1,
                        };
                    }
                })
            );

            results.push(...batchResults);
            console.log(`[SybilAnalyzer] Moralis processed ${Math.min(i + batchSize, uncachedAddresses.length)}/${uncachedAddresses.length} wallets`);
            
            // Delay between batches
            if (i + batchSize < uncachedAddresses.length) {
                await new Promise(r => setTimeout(r, 200));
            }
        }

        return results;
    }

    /**
     * Fallback: Single provider (no parallelization)
     */
    private async findFundingSourcesSingleProvider(
        uncachedAddresses: string[],
        cachedResults: WalletFunding[]
    ): Promise<WalletFunding[]> {
        const results = [...cachedResults];
        const batchSize = 20;

        for (let i = 0; i < uncachedAddresses.length; i += batchSize) {
            const batch = uncachedAddresses.slice(i, i + batchSize);

            const batchResults = await Promise.all(
                batch.map(async (address): Promise<WalletFunding> => {
                    try {
                        const funding = await this.provider.getFirstFunder(address);
                        if (funding) {
                            const result: WalletFunding = {
                                address,
                                funder: funding.address,
                                fundingTxHash: funding.firstTx!.hash,
                                fundingTimestamp: funding.firstTx!.timestamp,
                                fundingAmount: funding.firstTx!.valueInEth,
                                interactionCount: 1,
                            };
                            this.fundingCache.set(address.toLowerCase(), result);
                            return result;
                        }
                        return {
                            address,
                            funder: null,
                            fundingTxHash: null,
                            fundingTimestamp: null,
                            fundingAmount: 0,
                            interactionCount: 1,
                        };
                    } catch (error) {
                        return {
                            address,
                            funder: null,
                            fundingTxHash: null,
                            fundingTimestamp: null,
                            fundingAmount: 0,
                            interactionCount: 1,
                        };
                    }
                })
            );

            results.push(...batchResults);
            if (i + batchSize < uncachedAddresses.length) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        return results;
    }

    /**
     * Get first funder using Moralis API (faster than Alchemy)
     */
    private async getFirstFunderMoralis(address: string): Promise<{ funder: string; txHash: string; timestamp: number; amount: number } | null> {
        try {
            // Moralis uses different chain identifiers
            const chainMap: Record<string, string> = {
                ethereum: '0x1',
                polygon: '0x89',
                arbitrum: '0xa4b1',
                optimism: '0xa',
                base: '0x2105',
                linea: '0xe708', // Linea mainnet chain ID
            };
            const moralisChain = chainMap[this.chain] || '0x1';

            const response = await fetch(
                `https://deep-index.moralis.io/api/v2.2/${address}?chain=${moralisChain}&limit=100&order=asc`,
                {
                    method: 'GET',
                    headers: {
                        'accept': 'application/json',
                        'X-API-Key': this.moralisKey,
                    },
                }
            );

            if (!response.ok) {
                // Moralis failed, let Alchemy fallback handle it
                console.warn(`[SybilAnalyzer] Moralis API call failed for ${address} on chain ${this.chain}: ${response.status} ${response.statusText}`);
                return null;
            }

            const data = await response.json();

            if (data.result && Array.isArray(data.result)) {
                // Find first incoming ETH transfer
                for (const tx of data.result) {
                    if (tx.to_address?.toLowerCase() === address.toLowerCase() &&
                        parseFloat(tx.value) > 0) {
                        return {
                            funder: tx.from_address,
                            txHash: tx.hash,
                            timestamp: new Date(tx.block_timestamp).getTime(),
                            amount: parseFloat(tx.value) / 1e18,
                        };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error(`[SybilAnalyzer] Error in getFirstFunderMoralis for ${address}:`, error);
            return null;
        }
    }

    /**
     * Group wallets by their funding source
     */
    private clusterByFundingSource(wallets: WalletFunding[], minSize: number): SybilCluster[] {
        const clusterMap = new Map<string, WalletFunding[]>();

        // First, filter out wallets with null/unknown funders to prevent fake clusters
        const validWallets = wallets.filter(w => w.funder !== null && w.funder !== undefined);

        console.log(`[SybilAnalyzer] Clustering ${validWallets.length} wallets (filtered ${wallets.length - validWallets.length} with null funder)`);

        for (const wallet of validWallets) {
            const source = wallet.funder || 'unknown';
            if (!clusterMap.has(source)) {
                clusterMap.set(source, []);
            }
            clusterMap.get(source)!.push(wallet);
        }

        const clusters: SybilCluster[] = [];

        for (const [source, members] of clusterMap) {
            // Skip unknown sources and small clusters
            if (source === 'unknown') continue;
            if (members.length < minSize) continue;

            // Calculate time span
            const timestamps = members
                .filter(m => m.fundingTimestamp)
                .map(m => m.fundingTimestamp!);

            const first = timestamps.length > 0 ? Math.min(...timestamps) : 0;
            const last = timestamps.length > 0 ? Math.max(...timestamps) : 0;
            const durationHours = (last - first) / 3600;

            // Calculate average funding
            const totalFunding = members.reduce((sum, m) => sum + m.fundingAmount, 0);

            clusters.push({
                fundingSource: source,
                fundingSourceLabel: KNOWN_SOURCES[source.toLowerCase()],
                wallets: members,
                totalWallets: members.length,
                totalInteractions: members.reduce((sum, m) => sum + m.interactionCount, 0),
                averageFundingAmount: totalFunding / members.length,
                timeSpan: {
                    first,
                    last,
                    durationHours,
                },
                sybilScore: 0, // Will be calculated
                flags: [],
            });
        }

        return clusters;
    }

    /**
     * Calculate sybil score for a cluster (0-100)
     */
    private calculateSybilScore(cluster: SybilCluster): SybilCluster {
        let score = 0;
        const flags: string[] = [];

        // 1. Cluster size score (more wallets = more suspicious)
        // 3 wallets = 15 points, 10+ wallets = 40 points, 20+ = 60 points
        const sizeScore = Math.min(60, (cluster.totalWallets / 20) * 60);
        score += sizeScore;
        if (cluster.totalWallets >= 5) {
            flags.push(`Cluster: ${cluster.totalWallets} wallets from same source`);
        }

        // 2. Time clustering score (all funded quickly = suspicious)
        if (cluster.timeSpan.durationHours > 0) {
            if (cluster.timeSpan.durationHours <= THRESHOLDS.veryShortTimeSpanHours) {
                score += 30;
                flags.push(`All funded within ${cluster.timeSpan.durationHours.toFixed(1)}h`);
            } else if (cluster.timeSpan.durationHours <= THRESHOLDS.shortTimeSpanHours) {
                score += 15;
                flags.push(`Funded within 24h window`);
            }
        }

        // 3. Similar funding amounts (bots often use same amounts)
        if (cluster.wallets.length >= 3) {
            const amounts = cluster.wallets.map(w => w.fundingAmount);
            const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
            const variance = amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length;
            const stdDev = Math.sqrt(variance);

            // Low variance in funding amounts is suspicious
            if (stdDev < avgAmount * 0.1 && avgAmount > 0.001) {
                score += 10;
                flags.push(`Similar funding amounts (~${avgAmount.toFixed(4)} ETH)`);
            }
        }

        // 4. Known clean source bonus (reduce score for CEX withdrawals)
        if (cluster.fundingSourceLabel) {
            score = Math.max(0, score - 30);
            flags.push(`Known source: ${cluster.fundingSourceLabel}`);
        }

        // Cap score at 100
        cluster.sybilScore = Math.min(100, Math.round(score));
        cluster.flags = flags;

        return cluster;
    }

    /**
     * Calculate summary statistics
     */
    private calculateSummary(clusters: SybilCluster[]): SybilAnalysisResult['summary'] {
        let highRisk = 0;
        let mediumRisk = 0;
        let lowRisk = 0;

        for (const cluster of clusters) {
            if (cluster.sybilScore >= THRESHOLDS.highRiskScore) {
                highRisk += cluster.totalWallets;
            } else if (cluster.sybilScore >= THRESHOLDS.mediumRiskScore) {
                mediumRisk += cluster.totalWallets;
            } else {
                lowRisk += cluster.totalWallets;
            }
        }

        return { highRiskWallets: highRisk, mediumRiskWallets: mediumRisk, lowRiskWallets: lowRisk };
    }

    /**
     * Create empty result for contracts with no interactors
     */
    private createEmptyResult(contractAddress: string): SybilAnalysisResult {
        return {
            contractAddress: contractAddress.toLowerCase(),
            chain: this.chain,
            analyzedAt: new Date().toISOString(),
            totalInteractors: 0,
            uniqueFundingSources: 0,
            clusters: [],
            flaggedClusters: [],
            summary: { highRiskWallets: 0, mediumRiskWallets: 0, lowRiskWallets: 0 },
        };
    }
}
