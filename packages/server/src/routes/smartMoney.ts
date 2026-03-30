/**
 * Smart Money Discovery Routes
 * Public endpoints for discovering top performing wallets
 */

import { Router } from 'express';
import { GeckoTerminalService } from '../services/GeckoTerminalService.js';
import { cache } from '../utils/cache.js';

const router = Router();
const geckoTerminal = new GeckoTerminalService();

const SUPPORTED_CHAINS = ['ethereum', 'linea', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'];

const CHAIN_TO_GECKO: Record<string, string> = {
    'ethereum': 'eth',
    'linea': 'linea',
    'polygon': 'polygon_pos',
    'arbitrum': 'arbitrum',
    'optimism': 'optimism',
    'base': 'base',
    'bsc': 'bsc'
};

// GET /api/smart-money/discover - Discover top performing wallets across chains
router.get('/discover', async (req, res) => {
    try {
        const { 
            chain = 'all', 
            sortBy = 'pnl', 
            timeframe = '24h',
            limit = '20'
        } = req.query;

        // Check cache first
        const cacheKey = `smart-money:discover:${chain}:${sortBy}:${timeframe}:${limit}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const chains = chain === 'all' 
            ? SUPPORTED_CHAINS.slice(0, 3) 
            : SUPPORTED_CHAINS.includes(chain as string) ? [chain as string] : SUPPORTED_CHAINS.slice(0, 1);

        const sortField = sortBy as string;
        const limitNum = Math.min(parseInt(limit as string) || 20, 50);
        const timeframeHours = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
        const timeframeMs = timeframeHours * 60 * 60 * 1000;
        const cutoffTime = Date.now() - timeframeMs;

        const walletStats: Map<string, {
            address: string;
            chain: string;
            totalVolume: number;
            totalTrades: number;
            profitableTrades: number;
            totalPnL: number;
            lastActive: number;
        }> = new Map();

        const MAX_POOLS_PER_CHAIN = 5;
        const MAX_TRADES_PER_POOL = 10;

        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        for (const chainId of chains) {
            const geckoChain = CHAIN_TO_GECKO[chainId];
            if (!geckoChain) continue;

            try {
                const poolsData = await geckoTerminal.getTrendingPools(geckoChain, MAX_POOLS_PER_CHAIN);
                if (!poolsData?.data) {
                    await delay(1000);
                    continue;
                }
                
                const pools = poolsData.data.slice(0, MAX_POOLS_PER_CHAIN);
                
                for (const pool of pools) {
                    const poolAddress = pool.attributes?.pool_address || pool.attributes?.address;
                    if (!poolAddress) continue;

                    const poolAttributes = pool.attributes;
                    const currentPrice = parseFloat(poolAttributes?.base_token?.price_usd || poolAttributes?.quote_token?.price_usd || '0');
                    
                    try {
                        const tradesData = await geckoTerminal.getPoolTrades(geckoChain, poolAddress, MAX_TRADES_PER_POOL);
                        if (!tradesData?.data) continue;

                        await delay(500);
                        
                        const trades = tradesData.data.slice(0, MAX_TRADES_PER_POOL);

                        for (const trade of trades) {
                            const tradeAttributes = trade.attributes;
                            const trader = tradeAttributes?.maker_address || tradeAttributes?.from;
                            if (!trader || trader === '0x0000000000000000000000000000000000000000') continue;

                            const tradeTime = new Date(tradeAttributes?.trade_timestamp || tradeAttributes?.timestamp).getTime();
                            if (tradeTime < cutoffTime) continue;

                            const tradeType = tradeAttributes?.type;
                            const tradeVolumeUSD = parseFloat(tradeAttributes?.volume_in_usd || tradeAttributes?.trade_volume_usd || '0');
                            const tradePrice = parseFloat(tradeAttributes?.token_price_usd || currentPrice.toString());

                            let existing = walletStats.get(trader.toLowerCase());
                            if (!existing) {
                                existing = {
                                    address: trader.toLowerCase(),
                                    chain: chainId,
                                    totalVolume: 0,
                                    totalTrades: 0,
                                    profitableTrades: 0,
                                    totalPnL: 0,
                                    lastActive: 0
                                };
                                walletStats.set(trader.toLowerCase(), existing);
                            }

                            existing.totalVolume += tradeVolumeUSD;
                            existing.totalTrades += 1;
                            existing.lastActive = Math.max(existing.lastActive, tradeTime);

                            if (tradePrice > 0 && currentPrice > 0) {
                                const pnl = (currentPrice - tradePrice) / tradePrice * tradeVolumeUSD;
                                existing.totalPnL += pnl;
                                if (pnl > 0) existing.profitableTrades += 1;
                            }
                        }
                    } catch (tradeErr) {
                        console.error(`[SmartMoney API] Error fetching trades for pool ${poolAddress}:`, tradeErr);
                    }
                }
            } catch (poolErr) {
                console.error(`[SmartMoney API] Error fetching pools for chain ${chainId}:`, poolErr);
            }
            
            await delay(2000);
        }

        const wallets = Array.from(walletStats.values());

        const sortedWallets = wallets
            .filter(w => w.totalTrades >= 2)
            .map(w => ({
                address: w.address,
                chain: w.chain,
                totalTrades: w.totalTrades,
                totalVolume: Math.round(w.totalVolume * 100) / 100,
                pnl: Math.round(w.totalPnL * 100) / 100,
                winRate: w.totalTrades > 0 ? Math.round((w.profitableTrades / w.totalTrades) * 100) : 0,
                lastActive: w.lastActive
            }))
            .sort((a, b) => {
                if (sortField === 'volume') return b.totalVolume - a.totalVolume;
                if (sortField === 'winRate') return b.winRate - a.winRate;
                return b.pnl - a.pnl;
            })
            .slice(0, limitNum);

        const responseData = { 
            success: true, 
            traders: sortedWallets,
            filters: {
                chain: chain,
                sortBy: sortField,
                timeframe: timeframe,
                count: sortedWallets.length
            }
        };
        
        cache.set(cacheKey, responseData, 600);
        
        res.json(responseData);
    } catch (error: any) {
        console.error('[SmartMoney API] Error discovering smart money:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as smartMoneyRoutes };
