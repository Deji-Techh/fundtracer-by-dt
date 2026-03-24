import { Router, Response } from 'express';
import { ethers } from 'ethers';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.js';
import { usageMiddleware } from '../middleware/usage.js';
import { getFirestore } from '../firebase.js';
import contractService, { ContractInfo } from '../services/ContractService.js';

const router = Router();

const CHAIN_RPC_URLS: Record<string, string> = {
    ethereum: 'https://eth-mainnet.g.alchemy.com/v2',
    arbitrum: 'https://arb-mainnet.g.alchemy.com/v2',
    optimism: 'https://opt-mainnet.g.alchemy.com/v2',
    polygon: 'https://polygon-mainnet.g.alchemy.com/v2',
    bsc: 'https://bsc-dataseed.binance.org',
    base: 'https://base-mainnet.g.alchemy.com/v2',
    linea: 'https://rpc.linea.build',
};

const CHAIN_NAMES: Record<string, string> = {
    ethereum: 'eth',
    arbitrum: 'arb',
    optimism: 'opt',
    polygon: 'polygon_pos',
    bsc: 'bsc',
    base: 'base',
    linea: 'linea',
};

function normalizeChain(chain: string): string {
    return CHAIN_NAMES[chain.toLowerCase()] || chain.toLowerCase();
}

function getRpcUrl(chain: string, apiKey: string): string {
    const chainKey = normalizeChain(chain);
    
    if (chainKey === 'eth') {
        return `${CHAIN_RPC_URLS.ethereum}/${apiKey}`;
    }
    if (chainKey === 'arb') {
        return `${CHAIN_RPC_URLS.arbitrum}/${apiKey}`;
    }
    if (chainKey === 'opt') {
        return `${CHAIN_RPC_URLS.optimism}/${apiKey}`;
    }
    if (chainKey === 'polygon_pos' || chainKey === 'matic') {
        return `${CHAIN_RPC_URLS.polygon}/${apiKey}`;
    }
    if (chainKey === 'bsc') {
        return CHAIN_RPC_URLS.bsc;
    }
    if (chainKey === 'base') {
        return `${CHAIN_RPC_URLS.base}/${apiKey}`;
    }
    if (chainKey === 'linea') {
        return CHAIN_RPC_URLS.linea;
    }
    
    return `${CHAIN_RPC_URLS.ethereum}/${apiKey}`;
}

async function getAlchemyKeyForUser(userId: string, apiKeyId?: string): Promise<string> {
    const db = getFirestore();
    
    if (apiKeyId) {
        const keyDoc = await db.collection('users').doc(userId)
            .collection('apiKeys').doc(apiKeyId).get();
        if (keyDoc.exists) {
            return keyDoc.data()?.alchemyApiKey || process.env.DEFAULT_ALCHEMY_API_KEY || '';
        }
    }
    
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    return userData?.alchemyApiKey || process.env.DEFAULT_ALCHEMY_API_KEY || '';
}

async function fetchTransactionWithRetry(
    provider: ethers.JsonRpcProvider,
    txHash: string,
    maxRetries = 3
): Promise<ethers.TransactionResponse | null> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const tx = await provider.getTransaction(txHash);
            if (tx) return tx;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        } catch (e) {
            if (i === maxRetries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    return null;
}

async function fetchReceiptWithRetry(
    provider: ethers.JsonRpcProvider,
    txHash: string,
    maxRetries = 3
): Promise<ethers.TransactionReceipt | null> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const receipt = await provider.getTransactionReceipt(txHash);
            if (receipt) return receipt;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        } catch (e) {
            if (i === maxRetries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    return null;
}

async function fetchBlockWithRetry(
    provider: ethers.JsonRpcProvider,
    blockNumber: number,
    maxRetries = 3
): Promise<ethers.Block | null> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const block = await provider.getBlock(blockNumber);
            if (block) return block;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        } catch (e) {
            if (i === maxRetries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    return null;
}

function parseEventLogs(receipt: ethers.TransactionReceipt, _chain: string) {
    const logs: Array<{
        address: string;
        topics: string[];
        data: string;
        logIndex: number;
        blockNumber: number;
        transactionHash: string;
        blockHash: string;
        decoded?: Record<string, any>;
        contractName?: string;
    }> = [];

    for (const log of receipt.logs) {
        const contractInfo: ContractInfo | null = contractService.getContract(log.address);
        const parsed: Record<string, any> = {};
        
        try {
            const iface = new ethers.Interface([
                'event Transfer(address indexed from, address indexed to, uint256 value)',
                'event Approval(address indexed owner, address indexed spender, uint256 value)',
                'event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)',
                'event Mint(address indexed sender, address indexed owner, uint256 amount0, uint256 amount1)',
                'event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed owner)',
            ]);
            
            for (const topic of log.topics) {
                const fragment = iface.getEvent(topic);
                if (fragment) {
                    parsed[fragment.name] = true;
                    break;
                }
            }
        } catch {}

        logs.push({
            address: log.address,
            topics: log.topics.map(t => t.toString()),
            data: log.data,
            logIndex: log.index,
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            blockHash: log.blockHash,
            decoded: parsed,
            contractName: contractInfo?.name,
        });
    }

    return logs;
}

// GET /api/tx/:chain/:hash
router.get('/:chain/:hash', authMiddleware, usageMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { chain, hash } = req.params;
        const userId = req.user?.uid;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!hash || !hash.match(/^0x[a-fA-F0-9]{64}$/)) {
            return res.status(400).json({ error: 'Invalid transaction hash format' });
        }

        const normalizedChain = normalizeChain(chain);
        const validChains = ['ethereum', 'linea', 'arbitrum', 'base', 'optimism', 'polygon', 'bsc'];
        if (!validChains.includes(normalizedChain)) {
            return res.status(400).json({ error: 'Unsupported chain' });
        }

        const apiKeyId = (req as any).locals?.apiKeyId;
        const alchemyKey = await getAlchemyKeyForUser(userId, apiKeyId);
        const rpcUrl = getRpcUrl(normalizedChain, alchemyKey);
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        const [tx, receipt] = await Promise.all([
            fetchTransactionWithRetry(provider, hash),
            fetchReceiptWithRetry(provider, hash),
        ]);

        if (!tx) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const fromInfo = contractService.getContract(tx.from.toLowerCase());
        const toInfo = tx.to ? contractService.getContract(tx.to.toLowerCase()) : null;

        let txTimestamp: string | null = null;
        if (tx.blockNumber) {
            const block = await fetchBlockWithRetry(provider, tx.blockNumber);
            if (block && block.timestamp) {
                txTimestamp = new Date(Number(block.timestamp) * 1000).toISOString();
            }
        }

        const logs = receipt ? parseEventLogs(receipt, normalizedChain) : [];

        const chainId = tx.chainId || (() => {
            const chainMap: Record<string, number> = {
                ethereum: 1, linea: 59144, arbitrum: 42161,
                optimism: 10, polygon: 137, bsc: 56, base: 8453,
            };
            return chainMap[normalizedChain] || 1;
        })();

        const result = {
            hash: tx.hash,
            blockNumber: tx.blockNumber,
            blockHash: tx.blockHash,
            timestamp: txTimestamp,
            chain: normalizedChain,
            chainId,
            from: {
                address: tx.from,
                label: fromInfo?.name,
                type: fromInfo?.type,
            },
            to: tx.to ? {
                address: tx.to,
                label: toInfo?.name,
                type: toInfo?.type,
            } : null,
            value: tx.value.toString(),
            valueInEth: ethers.formatEther(tx.value),
            gasUsed: receipt?.gasUsed?.toString() || null,
            effectiveGasPrice: receipt?.gasPrice?.toString() || tx.gasPrice?.toString() || null,
            gasCostInEth: receipt?.gasUsed && tx.gasPrice
                ? ethers.formatEther(receipt.gasUsed * tx.gasPrice)
                : null,
            maxFeePerGas: 'maxFeePerGas' in tx ? (tx as any).maxFeePerGas?.toString() || null : null,
            maxPriorityFeePerGas: 'maxPriorityFeePerGas' in tx ? (tx as any).maxPriorityFeePerGas?.toString() || null : null,
            nonce: tx.nonce,
            transactionIndex: tx.index,
            status: receipt?.status === 1 ? 'success' : receipt?.status === 0 ? 'failed' : 'pending',
            type: tx.type,
            input: tx.data,
            inputMethod: tx.data.length > 2 ? tx.data.slice(0, 10) : null,
            logs,
            logsBloom: receipt?.logsBloom,
            gasLimit: tx.gasLimit?.toString() || null,
            rawReceipt: receipt ? {
                status: receipt.status,
                cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
                effectiveGasPrice: receipt.gasPrice?.toString(),
            } : null,
        };

        res.json({ success: true, result });

    } catch (error: any) {
        console.error('[Transaction] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
});

export default router;
