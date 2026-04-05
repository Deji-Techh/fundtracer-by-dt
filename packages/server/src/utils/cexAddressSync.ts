/**
 * CEX Address Sync Utility
 * Syncs CEX addresses from Dune and merges with hardcoded data
 */

import * as fs from 'fs';
import * as path from 'path';
import { ChainId } from '@fundtracer/core';
import { CEX_WALLETS, CEXWalletDatabase, CEXGroup, CEXWallet } from '../data/cexWallets.js';
import { DuneService } from '../services/DuneService.js';

const CACHE_FILE = path.join(process.cwd(), 'data', 'cex_addresses_cache.json');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const CHAIN_ALIASES: Record<string, ChainId> = {
    ethereum: 'ethereum',
    polygon: 'polygon',
    arbitrum: 'arbitrum',
    optimism: 'optimism',
    base: 'base',
    bsc: 'bsc',
    linea: 'linea',
    avalanche_c: 'polygon', // Map avalanche to polygon for now
    solana: 'bsc', // Map solana to bsc for now (not in ChainId)
};

interface CachedCEXData {
    addresses: Array<{ address: string; name: string; blockchain: string }>;
    timestamp: number;
}

class CEXAddressSync {
    private duneService: DuneService;
    private mergedCEX: CEXWalletDatabase = {};
    private initialized = false;

    constructor() {
        this.duneService = new DuneService();
    }

    /**
     * Initialize - load from cache or fetch from Dune
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;

        console.log('[CEXAddressSync] Initializing...');

        try {
            // Try to load from cache first
            const cachedData = this.loadFromCache();

            if (cachedData && this.isCacheValid(cachedData)) {
                console.log('[CEXAddressSync] Using cached CEX addresses');
                this.mergedCEX = this.mergeCEXData(cachedData.addresses);
            } else {
                console.log('[CEXAddressSync] Cache missing or expired, fetching from Dune...');
                await this.refreshFromDune();
            }

            this.initialized = true;
            this.logStats();
        } catch (error) {
            console.error('[CEXAddressSync] Initialization error, using fallback:', error);
            this.mergedCEX = { ...CEX_WALLETS };
            this.initialized = true;
        }
    }

    /**
     * Manually refresh CEX addresses from Dune
     */
    async refreshFromDune(): Promise<void> {
        try {
            console.log('[CEXAddressSync] Fetching CEX addresses from Dune...');
            const duneAddresses = await this.duneService.getCEXAddresses();

            if (duneAddresses.length > 0) {
                console.log(`[CEXAddressSync] Received ${duneAddresses.length} addresses from Dune`);

                // Save to cache
                const cacheData: CachedCEXData = {
                    addresses: duneAddresses,
                    timestamp: Date.now(),
                };
                this.saveToCache(cacheData);

                // Merge with existing
                this.mergedCEX = this.mergeCEXData(duneAddresses);
            } else {
                console.log('[CEXAddressSync] No addresses from Dune, using fallback');
                this.mergedCEX = { ...CEX_WALLETS };
            }
        } catch (error) {
            console.error('[CEXAddressSync] Failed to fetch from Dune:', error);
            this.mergedCEX = { ...CEX_WALLETS };
        }
    }

    /**
     * Merge Dune addresses with hardcoded CEX_WALLETS
     */
    private mergeCEXData(duneAddresses: Array<{ address: string; name: string; blockchain: string }>): CEXWalletDatabase {
        const result: CEXWalletDatabase = { ...CEX_WALLETS };
        const addressMap = new Map<string, CEXGroup>();

        // First, add all hardcoded wallets by exchange name
        for (const [chain, groups] of Object.entries(CEX_WALLETS)) {
            if (groups && Array.isArray(groups)) {
                for (const group of groups) {
                    const key = group.name.toLowerCase();
                    if (!addressMap.has(key)) {
                        addressMap.set(key, { name: group.name, wallets: [] });
                    }
                    // Add hardcoded wallets
                    for (const wallet of group.wallets) {
                        const existing = addressMap.get(key)!;
                        if (!existing.wallets.find(w => w.address.toLowerCase() === wallet.address.toLowerCase())) {
                            existing.wallets.push(wallet);
                        }
                    }
                }
            }
        }

        // Then add Dune addresses
        for (const { address, name, blockchain } of duneAddresses) {
            if (!address || !name) continue;

            const chain = CHAIN_ALIASES[blockchain.toLowerCase()];
            if (!chain) continue;

            // Normalize exchange name
            const exchangeName = this.normalizeExchangeName(name);
            const key = exchangeName.toLowerCase();

            if (!addressMap.has(key)) {
                addressMap.set(key, { name: exchangeName, wallets: [] });
            }

            const group = addressMap.get(key)!;

            // Check if address already exists
            const exists = group.wallets.some(w => w.address.toLowerCase() === address.toLowerCase());
            if (!exists) {
                group.wallets.push({
                    address: address,
                    name: name,
                    chain: chain,
                    type: this.detectWalletType(address, group.wallets),
                    isMain: group.wallets.length === 0,
                    label: 'dune',
                });
            }
        }

        // Convert map to database format
        addressMap.forEach((group) => {
            const chainKey = this.getPrimaryChain(group.name);
            if (!result[chainKey]) {
                result[chainKey] = [];
            }
            result[chainKey]!.push(group);
        });

        return result;
    }

    /**
     * Normalize exchange name from Dune label
     */
    private normalizeExchangeName(name: string): string {
        const lower = name.toLowerCase();

        // Common mappings
        const nameMappings: Record<string, string> = {
            'binance': 'Binance',
            'coinbase': 'Coinbase',
            'kraken': 'Kraken',
            'bybit': 'Bybit',
            'okx': 'OKX',
            'kucoin': 'KuCoin',
            'bitget': 'Bitget',
            'gate': 'Gate.io',
            'gemini': 'Gemini',
            'bitfinex': 'Bitfinex',
            'huobi': 'Huobi',
            'bitstamp': 'Bitstamp',
            'crypto.com': 'Crypto.com',
            'upbit': 'Upbit',
            'bithumb': 'Bithumb',
        };

        for (const [keyword, exchange] of Object.entries(nameMappings)) {
            if (lower.includes(keyword)) {
                return exchange;
            }
        }

        // Capitalize first letter
        return name.charAt(0).toUpperCase() + name.slice(1);
    }

    /**
     * Detect wallet type based on address patterns
     */
    private detectWalletType(address: string, existingWallets: CEXWallet[]): 'deposit' | 'hot' | 'cold' {
        // If this is the first wallet for an exchange, it's likely main
        if (existingWallets.length === 0) return 'hot';

        // Check if address looks like a deposit wallet (commonly used patterns)
        const commonDeposits = ['0x', '0x0', '0x00'];
        if (commonDeposits.some(p => address.startsWith(p))) {
            return 'deposit';
        }

        return 'hot';
    }

    /**
     * Get primary chain for an exchange
     */
    private getPrimaryChain(exchangeName: string): ChainId {
        const lower = exchangeName.toLowerCase();

        // Major exchanges that have multi-chain presence
        if (lower.includes('binance')) return 'ethereum';
        if (lower.includes('coinbase')) return 'ethereum';
        if (lower.includes('kraken')) return 'ethereum';
        if (lower.includes('bybit')) return 'ethereum';
        if (lower.includes('okx')) return 'ethereum';

        return 'ethereum';
    }

    /**
     * Load cached data from file
     */
    private loadFromCache(): CachedCEXData | null {
        try {
            if (!fs.existsSync(CACHE_FILE)) return null;
            const content = fs.readFileSync(CACHE_FILE, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('[CEXAddressSync] Failed to load cache:', error);
            return null;
        }
    }

    /**
     * Save data to cache file
     */
    private saveToCache(data: CachedCEXData): void {
        try {
            const dir = path.dirname(CACHE_FILE);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
            console.log('[CEXAddressSync] Cached data saved');
        } catch (error) {
            console.error('[CEXAddressSync] Failed to save cache:', error);
        }
    }

    /**
     * Check if cache is still valid
     */
    private isCacheValid(data: CachedCEXData): boolean {
        return Date.now() - data.timestamp < CACHE_TTL_MS;
    }

    /**
     * Log statistics
     */
    private logStats(): void {
        let totalWallets = 0;
        let totalExchanges = 0;

        for (const [chain, groups] of Object.entries(this.mergedCEX)) {
            if (groups && Array.isArray(groups)) {
                totalExchanges += groups.length;
                for (const group of groups) {
                    totalWallets += group.wallets.length;
                }
            }
        }

        console.log(`[CEXAddressSync] Stats: ${totalExchanges} exchanges, ${totalWallets} wallets across chains`);
    }

    /**
     * Get merged CEX wallet database
     */
    getCEXDatabase(): CEXWalletDatabase {
        return this.mergedCEX;
    }

    /**
     * Get CEX addresses for a specific chain
     */
    getAddressesForChain(chain: ChainId): string[] {
        const groups = this.mergedCEX[chain] || [];
        const addresses: string[] = [];

        for (const group of groups) {
            for (const wallet of group.wallets) {
                addresses.push(wallet.address.toLowerCase());
            }
        }

        return addresses;
    }
}

export const cexAddressSync = new CEXAddressSync();
