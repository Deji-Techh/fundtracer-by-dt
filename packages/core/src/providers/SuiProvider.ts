// ============================================================
// FundTracer by DT - Sui Provider
// Full Sui blockchain analysis using Alchemy RPC
// ============================================================

import {
    ChainId,
    Transaction,
    WalletInfo,
    TokenTransfer,
    FilterOptions,
    FundingNode,
    TxStatus,
    TxCategory,
} from '../types.js';
import { ITransactionProvider } from './ITransactionProvider.js';

const SUI_RPC_URL = process.env.SUI_RPC_URL || 'https://sui-mainnet.g.alchemy.com/v2/demo';

interface SuiTransactionBlock {
    digest: string;
    timestampMs: string;
    transaction: {
        data: {
            sender: string;
            gasConfig: {
                budget: string;
            };
        };
    };
    effects: {
        status: { status: string };
        gasUsed: string;
        events?: Array<{
            type: string;
            parsedJson?: any;
            moveEvent?: {
                type: string;
                fields: any;
            };
        }>;
    };
}

interface SuiCoin {
    coinType: string;
    balance: string;
    objectId: string;
}

export class SuiProvider implements ITransactionProvider {
    readonly chainId: ChainId = 'sui';
    readonly chainName: string = 'Sui';
    private rpcUrl: string;
    private cache: Map<string, { data: any; timestamp: number }> = new Map();
    private cacheDuration = 30000; // 30 seconds

    constructor(rpcUrl?: string) {
        this.rpcUrl = rpcUrl || SUI_RPC_URL;
    }

    private async rpcCall(method: string, params: any = []): Promise<any> {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method,
                params,
            }),
        });

        const data = await response.json();
        if (data.error) {
            console.error(`[SuiProvider] RPC error:`, data.error);
            throw new Error(`Sui RPC error: ${data.error.message}`);
        }
        return data.result;
    }

    private getCached<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            return cached.data as T;
        }
        return null;
    }

    private setCache(key: string, data: any): void {
        this.cache.set(key, { data, timestamp: Date.now() });
    }

    async getWalletInfo(address: string): Promise<WalletInfo> {
        const cacheKey = `walletInfo:${address}`;
        const cached = this.getCached<WalletInfo>(cacheKey);
        if (cached) return cached;

        try {
            // Get balance
            const balanceResult = await this.rpcCall('suix_getBalance', [address]);
            const balance = balanceResult?.totalBalance || '0';
            const balanceInSui = parseInt(balance) / 1e9;

            // Get coins (token holdings) - using just address and limit
            const coinsResult = await this.rpcCall('suix_getCoins', {
                owner: address,
                limit: 100
            });

            // Get first tx timestamp using correct Sui query format
            const allTxs = await this.rpcCall('suix_queryTransactionBlocks', {
                query: { sender: address },
                limit: 1
            });

            const firstTxTimestamp = allTxs?.data?.[0]?.timestampMs 
                ? parseInt(allTxs.data[0].timestampMs) 
                : undefined;

            // Get last activity
            const lastTxs = await this.rpcCall('suix_queryTransactionBlocks', {
                query: { sender: address },
                limit: 1
            });

            const lastTxTimestamp = lastTxs?.data?.[0]?.timestampMs 
                ? parseInt(lastTxs.data[0].timestampMs) 
                : firstTxTimestamp;

            // Get total transaction count
            const txCountResult = await this.rpcCall('suix_queryTransactionBlocks', {
                query: { sender: address },
                limit: 1000
            });

            const txCount = txCountResult?.data?.length || 0;

            const walletInfo: WalletInfo = {
                address: address.toLowerCase(),
                chain: 'sui',
                balance: balance,
                balanceInEth: balanceInSui,
                txCount: txCount,
                firstTxTimestamp,
                lastTxTimestamp,
                isContract: false, // Sui addresses are always wallet addresses
            };

            this.setCache(cacheKey, walletInfo);
            return walletInfo;
        } catch (error) {
            console.error('[SuiProvider] Error fetching wallet info:', error);
            return {
                address: address.toLowerCase(),
                chain: 'sui',
                balance: '0',
                balanceInEth: 0,
                txCount: 0,
                isContract: false,
            };
        }
    }

    async getTransactions(address: string, filters?: FilterOptions): Promise<Transaction[]> {
        const cacheKey = `txs:${address}:${JSON.stringify(filters)}`;
        const cached = this.getCached<Transaction[]>(cacheKey);
        if (cached) return cached;

        try {
            const limit = filters?.limit || 100;
            
            // Query transaction blocks where address is sender
            const senderTxs = await this.rpcCall('suix_queryTransactionBlocks', {
                query: { sender: address },
                limit: limit
            });

            // Query transaction blocks where address is recipient
            const recipientTxs = await this.rpcCall('suix_queryTransactionBlocks', {
                query: { recipients: [address] },
                limit: limit
            });

            // Combine and deduplicate
            const txMap = new Map<string, SuiTransactionBlock>();
            
            for (const tx of (senderTxs?.data || [])) {
                txMap.set(tx.digest, tx);
            }
            for (const tx of (recipientTxs?.data || [])) {
                if (!txMap.has(tx.digest)) {
                    txMap.set(tx.digest, tx);
                }
            }

            const transactions: Transaction[] = Array.from(txMap.values()).map((tx) => {
                const status: TxStatus = tx.effects?.status?.status === 'success' ? 'success' : 'failed';
                const timestamp = tx.timestampMs ? parseInt(tx.timestampMs) : Date.now();

                // Determine category based on transaction effects
                let category: TxCategory = 'unknown';
                const events = tx.effects?.events || [];
                
                for (const event of events) {
                    if (event.type?.includes('Transfer')) {
                        category = 'transfer';
                        break;
                    }
                    if (event.type?.includes('Swap') || event.type?.includes('Dex')) {
                        category = 'dex_swap';
                        break;
                    }
                }

                // Extract value from balance changes
                let value = '0';
                let valueInEth = 0;
                
                // Calculate value based on gas and transfers
                const gasUsed = tx.effects?.gasUsed ? parseInt(tx.effects.gasUsed) : 0;
                valueInEth = gasUsed / 1e9; // Convert to SUI
                value = (gasUsed).toString();

                return {
                    hash: tx.digest,
                    blockNumber: 0, // Sui doesn't have block numbers in the same way
                    timestamp: timestamp,
                    from: tx.transaction?.data?.sender || '',
                    to: this.extractRecipient(tx),
                    value: value,
                    valueInEth: valueInEth,
                    gasUsed: tx.effects?.gasUsed || '0',
                    gasPrice: '0',
                    gasCostInEth: 0,
                    status: status,
                    category: category,
                    isIncoming: tx.transaction?.data?.sender !== address,
                    tokenTransfers: [],
                };
            });

            // Sort by timestamp descending
            transactions.sort((a, b) => b.timestamp - a.timestamp);

            this.setCache(cacheKey, transactions);
            return transactions;
        } catch (error) {
            console.error('[SuiProvider] Error fetching transactions:', error);
            return [];
        }
    }

    private extractRecipient(tx: SuiTransactionBlock): string | null {
        // Try to extract recipient from events
        const events = tx.effects?.events || [];
        for (const event of events) {
            if (event.moveEvent?.type?.includes('Transfer') || event.type?.includes('Transfer')) {
                const fields = event.moveEvent?.fields || event.parsedJson || {};
                return fields.recipient || fields.to_address || fields.recipientAddress || null;
            }
        }
        return null;
    }

    async getInternalTransactions(address: string, filters?: FilterOptions): Promise<Transaction[]> {
        // Sui doesn't have "internal transactions" like EVM - return empty
        return [];
    }

    async getTokenTransfers(address: string, filters?: FilterOptions): Promise<TokenTransfer[]> {
        const cacheKey = `tokens:${address}`;
        const cached = this.getCached<TokenTransfer[]>(cacheKey);
        if (cached) return cached;

        try {
            // Get all coins for the address
            const coinsResult = await this.rpcCall('suix_getCoins', {
                owner: address,
                limit: 100
            });
            const coins: SuiCoin[] = coinsResult?.data || [];

            const tokenTransfers: TokenTransfer[] = coins.map((coin) => {
                const [_, coinType] = coin.coinType.split('::');
                return {
                    tokenAddress: coin.coinType,
                    tokenName: coinType || coin.coinType,
                    tokenSymbol: coinType?.slice(0, 10) || 'SUI',
                    tokenDecimals: 9,
                    from: address,
                    to: address,
                    value: coin.balance,
                    valueFormatted: parseInt(coin.balance) / 1e9,
                };
            });

            this.setCache(cacheKey, tokenTransfers);
            return tokenTransfers;
        } catch (error) {
            console.error('[SuiProvider] Error fetching token transfers:', error);
            return [];
        }
    }

    async getFirstFunder(address: string): Promise<FundingNode | null> {
        try {
            // Get earliest transaction
            const txs = await this.rpcCall('suix_queryTransactionBlocks', {
                query: { recipient: address },
                limit: 1
            });

            if (!txs?.data?.[0]) return null;

            const firstTx = txs.data[0];
            const sender = firstTx.transaction?.data?.sender;

            if (!sender) return null;

            return {
                address: sender,
                depth: 1,
                direction: 'source',
                totalValue: '0',
                totalValueInEth: 0,
                txCount: 1,
                children: [],
                suspiciousScore: 0,
                suspiciousReasons: [],
            };
        } catch (error) {
            console.error('[SuiProvider] Error fetching first funder:', error);
            return null;
        }
    }

    async getCode(address: string): Promise<string> {
        // Sui doesn't have contract code in the same way
        return '0x';
    }

    clearCache(): void {
        this.cache.clear();
    }
}

export default SuiProvider;
