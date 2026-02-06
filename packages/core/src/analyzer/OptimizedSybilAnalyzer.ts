// ============================================================
// FundTracer by DT - Optimized Sybil Analyzer
// High-performance Sybil detection with 20 API keys, parallel processing,
// Redis caching, and WebSocket streaming
// Target: 5-10 seconds for 1000 wallets
// ============================================================

import { ChainId } from '../types.js';
import { ProviderFactory } from '../providers/ProviderFactory.js';
import { AlchemyProvider } from '../providers/AlchemyProvider.js';
import { CovalentProvider } from '../providers/CovalentProvider.js';

// Types
export interface WalletFunding {
    address: string;
    funder: string | null;
    fundingTxHash: string | null;
    fundingTimestamp: number | null;
    fundingAmount: number;
    interactionCount: number;
}

export interface SybilCluster {
    fundingSource: string;
    fundingSourceLabel?: string;
    wallets: WalletFunding[];
    totalWallets: number;
    totalInteractions: number;
    averageFundingAmount: number;
    timeSpan: {
        first: number;
        last: number;
        durationHours: number;
    };
    sybilScore: number;
    flags: string[];
}

export interface SybilAnalysisResult {
    contractAddress: string;
    chain: ChainId;
    analyzedAt: string;
    totalInteractors: number;
    uniqueFundingSources: number;
    clusters: SybilCluster[];
    flaggedClusters: SybilCluster[];
    summary: {
        highRiskWallets: number;
        mediumRiskWallets: number;
        lowRiskWallets: number;
    };
    progress?: {
        processed: number;
        total: number;
        percentage: number;
    };
}

export interface AnalysisProgress {
    stage: 'dune' | 'funding' | 'clustering' | 'complete';
    processed: number;
    total: number;
    percentage: number;
    currentBatch?: number;
    totalBatches?: number;
    eta?: number;
}

// Known CEX/clean addresses
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

const THRESHOLDS = {
    minClusterSize: 3,
    highRiskScore: 60,
    mediumRiskScore: 30,
    shortTimeSpanHours: 48,
    veryShortTimeSpanHours: 6,
};

// ============================================================
// API Key Manager with Rotation and Load Balancing
// ============================================================

export class ApiKeyManager {
    private keys: string[];
    private currentIndex: number = 0;
    private usageCount: Map<string, number> = new Map();
    private errorCount: Map<string, number> = new Map();
    private readonly maxCallsPerKey: number = 50;
    private readonly maxErrors: number = 5;

    constructor(keys: string[]) {
        this.keys = keys.filter(k => k && k.length > 10);
        if (this.keys.length === 0) {
            throw new Error('No valid API keys provided');
        }
        this.keys.forEach(key => {
            this.usageCount.set(key, 0);
            this.errorCount.set(key, 0);
        });
    }

    getKey(): string {
        // Find key with lowest usage and no errors
        const sortedKeys = [...this.keys].sort((a, b) => {
            const errorsA = this.errorCount.get(a) || 0;
            const errorsB = this.errorCount.get(b) || 0;
            if (errorsA !== errorsB) return errorsA - errorsB;
            
            const usageA = this.usageCount.get(a) || 0;
            const usageB = this.usageCount.get(b) || 0;
            return usageA - usageB;
        });

        const selected = sortedKeys[0];
        const currentUsage = (this.usageCount.get(selected) || 0) + 1;
        this.usageCount.set(selected, currentUsage);

        // Reset if hit limit
        if (currentUsage >= this.maxCallsPerKey) {
            this.usageCount.set(selected, 0);
        }

        return selected;
    }

    getKeys(count: number): string[] {
        const keys: string[] = [];
        for (let i = 0; i < count; i++) {
            keys.push(this.getKey());
        }
        return keys;
    }

    reportError(key: string) {
        const currentErrors = (this.errorCount.get(key) || 0) + 1;
        this.errorCount.set(key, currentErrors);
        
        // Disable key if too many errors
        if (currentErrors >= this.maxErrors) {
            console.warn(`[ApiKeyManager] Key disabled due to errors: ${key.slice(0, 10)}...`);
            this.usageCount.set(key, 999999);
        }
    }

    getStats(): { total: number; available: number; disabled: number } {
        const disabled = [...this.errorCount.entries()].filter(([_, count]) => count >= this.maxErrors).length;
        return {
            total: this.keys.length,
            available: this.keys.length - disabled,
            disabled
        };
    }
}

// ============================================================
// Redis Cache Interface
// ============================================================

interface CacheProvider {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
    getMany(keys: string[]): Promise<Map<string, string>>;
    setMany(entries: Map<string, string>, ttlSeconds?: number): Promise<void>;
}

// In-memory cache fallback
class MemoryCache implements CacheProvider {
    private cache = new Map<string, { value: string; expires: number }>();

    async get(key: string): Promise<string | null> {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }

    async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {
        this.cache.set(key, {
            value,
            expires: Date.now() + (ttlSeconds * 1000)
        });
    }

    async getMany(keys: string[]): Promise<Map<string, string>> {
        const result = new Map<string, string>();
        for (const key of keys) {
            const value = await this.get(key);
            if (value) result.set(key, value);
        }
        return result;
    }

    async setMany(entries: Map<string, string>, ttlSeconds: number = 3600): Promise<void> {
        for (const [key, value] of entries) {
            await this.set(key, value, ttlSeconds);
        }
    }
}

// ============================================================
// Optimized Sybil Analyzer
// ============================================================

export class OptimizedSybilAnalyzer {
    private keyManager: ApiKeyManager;
    private cache: CacheProvider;
    private chain: ChainId;
    private moralisKey: string;
    private covalentKey?: string;
    private progressCallback?: (progress: AnalysisProgress) => void;

    private concurrency: number;

    constructor(
        chain: ChainId,
        apiKeys: string[],
        options: {
            moralisKey?: string;
            covalentKey?: string;
            cache?: CacheProvider;
            progressCallback?: (progress: AnalysisProgress) => void;
            concurrency?: number;
        } = {}
    ) {
        this.chain = chain;
        this.keyManager = new ApiKeyManager(apiKeys);
        this.cache = options.cache || new MemoryCache();
        this.moralisKey = options.moralisKey || '';
        this.covalentKey = options.covalentKey;
        this.progressCallback = options.progressCallback;
        this.concurrency = options.concurrency || 10;
    }

    private reportProgress(progress: AnalysisProgress) {
        if (this.progressCallback) {
            this.progressCallback(progress);
        }
    }

    // ============================================================
    // Main Analysis Entry Point
    // ============================================================

    async analyzeContract(
        contractAddress: string,
        addresses: string[],
        options: {
            maxInteractors?: number;
            minClusterSize?: number;
            concurrency?: number;
        } = {}
    ): Promise<SybilAnalysisResult> {
        const startTime = Date.now();
        const maxInteractors = options.maxInteractors || 1000;
        const minClusterSize = options.minClusterSize || THRESHOLDS.minClusterSize;
        const concurrency = options.concurrency || 10;

        console.log(`[SybilAnalyzer] Starting analysis of ${addresses.length} wallets with ${concurrency}x concurrency`);

        // Limit addresses
        const limitedAddresses = addresses.slice(0, maxInteractors);

        // Report initial progress
        this.reportProgress({
            stage: 'funding',
            processed: 0,
            total: limitedAddresses.length,
            percentage: 0,
            currentBatch: 0,
            totalBatches: Math.ceil(limitedAddresses.length / 20)
        });

        // Find funding sources with aggressive parallelization
        const fundingResults = await this.findFundingSourcesParallel(
            limitedAddresses,
            concurrency
        );

        // Report clustering progress
        this.reportProgress({
            stage: 'clustering',
            processed: fundingResults.length,
            total: fundingResults.length,
            percentage: 80
        });

        // Build clusters
        const clusters = this.buildClusters(fundingResults, minClusterSize);

        // Calculate summary
        const allWallets = fundingResults;
        const highRiskWallets = clusters
            .filter(c => c.sybilScore >= THRESHOLDS.highRiskScore)
            .reduce((sum, c) => sum + c.wallets.length, 0);
        const mediumRiskWallets = clusters
            .filter(c => c.sybilScore >= THRESHOLDS.mediumRiskScore && c.sybilScore < THRESHOLDS.highRiskScore)
            .reduce((sum, c) => sum + c.wallets.length, 0);
        const lowRiskWallets = allWallets.length - highRiskWallets - mediumRiskWallets;

        const duration = (Date.now() - startTime) / 1000;
        console.log(`[SybilAnalyzer] Analysis complete in ${duration}s`);

        // Report completion
        this.reportProgress({
            stage: 'complete',
            processed: fundingResults.length,
            total: fundingResults.length,
            percentage: 100,
            eta: 0
        });

        return {
            contractAddress,
            chain: this.chain,
            analyzedAt: new Date().toISOString(),
            totalInteractors: allWallets.length,
            uniqueFundingSources: clusters.length,
            clusters,
            flaggedClusters: clusters.filter(c => c.sybilScore >= THRESHOLDS.mediumRiskScore),
            summary: {
                highRiskWallets,
                mediumRiskWallets,
                lowRiskWallets
            }
        };
    }

    // ============================================================
    // Parallel Funding Source Discovery
    // ============================================================

    private async findFundingSourcesParallel(
        addresses: string[],
        concurrency: number
    ): Promise<WalletFunding[]> {
        const batchSize = 20;
        const batches: string[][] = [];
        
        for (let i = 0; i < addresses.length; i += batchSize) {
            batches.push(addresses.slice(i, i + batchSize));
        }

        console.log(`[SybilAnalyzer] Processing ${batches.length} batches with ${concurrency}x concurrency`);

        const results: WalletFunding[] = [];
        let processedCount = 0;

        // Process batches in waves of concurrency
        for (let i = 0; i < batches.length; i += concurrency) {
            const wave = batches.slice(i, i + concurrency);
            const waveKeys = this.keyManager.getKeys(wave.length);

            // Process this wave in parallel
            const waveResults = await Promise.all(
                wave.map(async (batch, idx) => {
                    const batchResults = await this.processBatch(batch, waveKeys[idx]);
                    processedCount += batch.length;
                    
                    // Report progress
                    this.reportProgress({
                        stage: 'funding',
                        processed: processedCount,
                        total: addresses.length,
                        percentage: Math.round((processedCount / addresses.length) * 70),
                        currentBatch: Math.floor(i / concurrency) + 1,
                        totalBatches: Math.ceil(batches.length / concurrency)
                    });

                    return batchResults;
                })
            );

            results.push(...waveResults.flat());
        }

        return results;
    }

    private async processBatch(
        addresses: string[],
        apiKey: string
    ): Promise<WalletFunding[]> {
        // Check cache first
        const cacheKeys = addresses.map(addr => `funding:${this.chain}:${addr.toLowerCase()}`);
        const cached = await this.cache.getMany(cacheKeys);

        const results: WalletFunding[] = [];
        const uncachedAddresses: string[] = [];

        for (let i = 0; i < addresses.length; i++) {
            const cachedValue = cached.get(cacheKeys[i]);
            if (cachedValue) {
                results.push(JSON.parse(cachedValue));
            } else {
                uncachedAddresses.push(addresses[i]);
            }
        }

        if (uncachedAddresses.length === 0) {
            return results;
        }

        // Fetch uncached addresses with provider racing
        const fetchPromises = uncachedAddresses.map(addr => 
            this.fetchFundingWithRacing(addr, apiKey)
        );

        const fetchedResults = await Promise.all(fetchPromises);

        // Cache results
        const cacheEntries = new Map<string, string>();
        for (let i = 0; i < uncachedAddresses.length; i++) {
            const result = fetchedResults[i];
            const cacheKey = `funding:${this.chain}:${uncachedAddresses[i].toLowerCase()}`;
            cacheEntries.set(cacheKey, JSON.stringify(result));
            results.push(result);
        }

        // Batch cache write
        await this.cache.setMany(cacheEntries, 86400); // 24 hour TTL

        return results;
    }

    private async fetchFundingWithRacing(
        address: string,
        apiKey: string
    ): Promise<WalletFunding> {
        const providers: Promise<WalletFunding | null>[] = [];

        // Create provider instances
        const alchemyProvider = new AlchemyProvider(this.chain, apiKey);

        // Try Alchemy first (most reliable)
        providers.push(
            this.fetchFromAlchemy(address, alchemyProvider).catch(() => null)
        );

        // Try Moralis if key available
        if (this.moralisKey) {
            providers.push(
                this.fetchFromMoralis(address).catch(() => null)
            );
        }

        // Try Covalent if key available
        if (this.covalentKey) {
            const covalentProvider = new CovalentProvider(this.chain, this.covalentKey);
            providers.push(
                this.fetchFromCovalent(address, covalentProvider).catch(() => null)
            );
        }

        // Race all providers
        const results = await Promise.all(providers);
        const firstSuccess = results.find(r => r !== null);

        if (firstSuccess) {
            return firstSuccess;
        }

        // All providers failed
        return {
            address,
            funder: null,
            fundingTxHash: null,
            fundingTimestamp: null,
            fundingAmount: 0,
            interactionCount: 1
        };
    }

    private async fetchFromAlchemy(
        address: string,
        provider: AlchemyProvider
    ): Promise<WalletFunding | null> {
        try {
            const funding = await Promise.race([
                provider.getFirstFunder(address),
                new Promise<null>((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                )
            ]);

            if (funding && funding.firstTx) {
                return {
                    address,
                    funder: funding.address,
                    fundingTxHash: funding.firstTx.hash,
                    fundingTimestamp: funding.firstTx.timestamp,
                    fundingAmount: funding.firstTx.valueInEth,
                    interactionCount: 1
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    private async fetchFromMoralis(address: string): Promise<WalletFunding | null> {
        // Moralis implementation
        try {
            const response = await fetch(
                `https://deep-index.moralis.io/api/v2.2/${address}/transactions?chain=${this.chain}&limit=100&order=ASC`,
                {
                    headers: {
                        'X-API-Key': this.moralisKey,
                        'Accept': 'application/json'
                    }
                }
            );

            if (!response.ok) return null;

            const data = await response.json();
            const firstTx = data.result?.[0];

            if (firstTx && firstTx.from_address !== address.toLowerCase()) {
                return {
                    address,
                    funder: firstTx.from_address,
                    fundingTxHash: firstTx.hash,
                    fundingTimestamp: new Date(firstTx.block_timestamp).getTime() / 1000,
                    fundingAmount: parseFloat(firstTx.value) / 1e18,
                    interactionCount: 1
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    private async fetchFromCovalent(
        address: string,
        provider: CovalentProvider
    ): Promise<WalletFunding | null> {
        try {
            const funding = await Promise.race([
                provider.getFirstFunder(address),
                new Promise<null>((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 5000)
                )
            ]);

            if (funding && funding.firstTx) {
                return {
                    address,
                    funder: funding.address,
                    fundingTxHash: funding.firstTx.hash,
                    fundingTimestamp: funding.firstTx.timestamp,
                    fundingAmount: funding.firstTx.valueInEth,
                    interactionCount: 1
                };
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    // ============================================================
    // Cluster Building
    // ============================================================

    private buildClusters(
        wallets: WalletFunding[],
        minClusterSize: number
    ): SybilCluster[] {
        // Group by funding source
        const fundingGroups = new Map<string, WalletFunding[]>();

        for (const wallet of wallets) {
            if (!wallet.funder) continue;
            
            const funderLower = wallet.funder.toLowerCase();
            if (!fundingGroups.has(funderLower)) {
                fundingGroups.set(funderLower, []);
            }
            fundingGroups.get(funderLower)!.push(wallet);
        }

        // Build clusters
        const clusters: SybilCluster[] = [];

        for (const [fundingSource, clusterWallets] of fundingGroups) {
            if (clusterWallets.length < minClusterSize) continue;

            // Calculate metrics
            const timestamps = clusterWallets
                .map(w => w.fundingTimestamp)
                .filter((t): t is number => t !== null);

            const first = timestamps.length > 0 ? Math.min(...timestamps) : 0;
            const last = timestamps.length > 0 ? Math.max(...timestamps) : 0;
            const durationHours = (last - first) / 3600;

            const totalFunding = clusterWallets.reduce((sum, w) => sum + w.fundingAmount, 0);
            const avgFunding = totalFunding / clusterWallets.length;

            // Calculate sybil score
            let score = 0;
            const flags: string[] = [];

            // Size score (more wallets = higher score)
            score += Math.min(clusterWallets.length * 2, 40);
            if (clusterWallets.length >= 10) flags.push('large_cluster');

            // Time concentration score
            if (durationHours < THRESHOLDS.veryShortTimeSpanHours) {
                score += 30;
                flags.push('very_short_time_span');
            } else if (durationHours < THRESHOLDS.shortTimeSpanHours) {
                score += 15;
                flags.push('short_time_span');
            }

            // Similar funding amounts
            const fundingVariance = this.calculateVariance(
                clusterWallets.map(w => w.fundingAmount)
            );
            if (fundingVariance < 0.1) {
                score += 10;
                flags.push('similar_amounts');
            }

            clusters.push({
                fundingSource,
                fundingSourceLabel: KNOWN_SOURCES[fundingSource.toLowerCase()],
                wallets: clusterWallets,
                totalWallets: clusterWallets.length,
                totalInteractions: clusterWallets.reduce((sum, w) => sum + w.interactionCount, 0),
                averageFundingAmount: avgFunding,
                timeSpan: {
                    first,
                    last,
                    durationHours
                },
                sybilScore: Math.min(score, 100),
                flags
            });
        }

        // Sort by score (highest first)
        return clusters.sort((a, b) => b.sybilScore - a.sybilScore);
    }

    private calculateVariance(values: number[]): number {
        if (values.length < 2) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
        return Math.sqrt(avgSquaredDiff) / mean; // Coefficient of variation
    }
}

export default OptimizedSybilAnalyzer;
