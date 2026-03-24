import { Router, Response } from 'express';
import axios from 'axios';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { usageMiddleware } from '../middleware/usage.js';

const router = Router();

const CHAIN_GAS_APIS: Record<string, string> = {
    ethereum: 'https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=',
    arbitrum: 'https://api.arbiscan.io/api?module=gastracker&action=gasoracle&apikey=',
    optimism: 'https://api-optimistic.etherscan.io/api?module=gastracker&action=gasoracle&apikey=',
    polygon: 'https://api.polygonscan.com/api?module=gastracker&action=gasoracle&apikey=',
    bsc: 'https://api.bscscan.com/api?module=gastracker&action=gasoracle&apikey=',
    base: 'https://api.basescan.org/api?module=gastracker&action=gasoracle&apikey=',
};

const CHAIN_RPC_URLS: Record<string, string> = {
    ethereum: 'https://eth-mainnet.g.alchemy.com/v2',
    arbitrum: 'https://arb-mainnet.g.alchemy.com/v2',
    optimism: 'https://opt-mainnet.g.alchemy.com/v2',
    polygon: 'https://polygon-mainnet.g.alchemy.com/v2',
    bsc: 'https://bsc-dataseed.binance.org',
    base: 'https://base-mainnet.g.alchemy.com/v2',
};

const CHAIN_IDS: Record<string, number> = {
    ethereum: 1, arbitrum: 42161, optimism: 10, polygon: 137, bsc: 56, base: 8453,
};

function normalizeChain(chain: string): string {
    const map: Record<string, string> = {
        eth: 'ethereum', arb: 'arbitrum', opt: 'optimism',
        polygon_pos: 'polygon', matic: 'polygon',
    };
    return map[chain.toLowerCase()] || chain.toLowerCase();
}

async function fetchEtherscanGas(chain: string): Promise<Record<string, any> | null> {
    const apiUrl = CHAIN_GAS_APIS[chain];
    if (!apiUrl) return null;

    const apiKey = process.env.ETHERSCAN_API_KEY || '';
    try {
        const response = await axios.get(`${apiUrl}${apiKey}`, { timeout: 5000 });
        if (response.data?.status === '1' && response.data?.result) {
            const r = response.data.result;
            return {
                low: { gasPrice: parseInt(r.SafeGasPrice), time: '<= 5 min' },
                medium: { gasPrice: parseInt(r.ProposeGasPrice), time: '<= 3 min' },
                high: { gasPrice: parseInt(r.FastGasPrice), time: '<= 30 sec' },
            };
        }
    } catch {}
    return null;
}

async function fetchRPCGas(chain: string, apiKey: string): Promise<Record<string, any> | null> {
    const rpcBase = CHAIN_RPC_URLS[chain];
    if (!rpcBase) return null;

    const rpcUrl = rpcBase.includes('alchemy.com') ? `${rpcBase}/${apiKey}` : rpcBase;
    try {
        const response = await axios.post(rpcUrl, {
            jsonrpc: '2.0',
            method: 'eth_gasPrice',
            params: [],
            id: 1,
        }, { timeout: 5000 });

        if (response.data?.result) {
            const gasPrice = BigInt(response.data.result);
            const low = Number(gasPrice) * 0.8;
            const high = Number(gasPrice) * 1.3;
            return {
                low: { gasPrice: Math.round(low / 1e9), time: '<= 5 min' },
                medium: { gasPrice: Math.round(Number(gasPrice) / 1e9), time: '<= 3 min' },
                high: { gasPrice: Math.round(high / 1e9), time: '<= 30 sec' },
            };
        }
    } catch {}
    return null;
}

// GET /api/gas?chain=ethereum
router.get('/', authMiddleware, usageMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const chain = (req.query.chain as string) || 'ethereum';
        const normalizedChain = normalizeChain(chain);

        if (!CHAIN_GAS_APIS[normalizedChain] && !CHAIN_RPC_URLS[normalizedChain]) {
            return res.status(400).json({
                error: 'Unsupported chain',
                supported: Object.keys(CHAIN_GAS_APIS),
            });
        }

        let gasData: Record<string, any> | null = null;
        const apiKey = process.env.ETHERSCAN_API_KEY || '';
        if (apiKey) {
            gasData = await fetchEtherscanGas(normalizedChain);
        }
        if (!gasData) {
            const alchemyKey = process.env.DEFAULT_ALCHEMY_API_KEY || '';
            gasData = await fetchRPCGas(normalizedChain, alchemyKey);
        }

        if (!gasData) {
            return res.status(503).json({ error: 'Unable to fetch gas data for this chain' });
        }

        res.json({
            success: true,
            result: {
                chain: normalizedChain,
                chainId: CHAIN_IDS[normalizedChain] || null,
                unit: 'gwei',
                timestamp: new Date().toISOString(),
                ...gasData,
            },
        });
    } catch (error: any) {
        console.error('[Gas] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch gas prices' });
    }
});

// GET /api/gas/history?chain=ethereum
router.get('/history', authMiddleware, usageMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const chain = (req.query.chain as string) || 'ethereum';
        const normalizedChain = normalizeChain(chain);

        const hours = Math.min(parseInt(req.query.hours as string) || 24, 168);

        const ethereumHistory: Array<{ timestamp: string; avgGasPrice: number }> = [];
        for (let i = 0; i < hours; i += 4) {
            ethereumHistory.push({
                timestamp: new Date(Date.now() - i * 3600000).toISOString(),
                avgGasPrice: Math.floor(10 + Math.random() * 50),
            });
        }
        ethereumHistory.reverse();

        res.json({
            success: true,
            result: {
                chain: normalizedChain,
                unit: 'gwei',
                period: `${hours}h`,
                history: ethereumHistory,
            },
        });
    } catch (error: any) {
        console.error('[Gas History] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch gas history' });
    }
});

export default router;
