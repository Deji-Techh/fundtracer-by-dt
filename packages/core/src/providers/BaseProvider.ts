// ============================================================
// FundTracer by DT - Base Provider Abstract Class
// ============================================================

import axios, { AxiosInstance } from 'axios';
import {
    ChainId,
    ChainConfig,
    Transaction,
    WalletInfo,
    TokenTransfer,
    TxStatus,
    TxCategory,
    ExplorerApiResponse,
    FilterOptions,
} from '../types.js';
import { getChainConfig } from '../chains.js';

/** Debug flag - set FUNDTRACER_DEBUG=true to see verbose logs */
const DEBUG = process.env.FUNDTRACER_DEBUG === 'true';

/** Rate limiter to respect API limits */
class RateLimiter {
    private queue: Array<() => void> = [];
    private processing = false;
    private lastCall = 0;
    private minInterval: number;

    constructor(callsPerSecond: number = 2) {
        this.minInterval = 1000 / callsPerSecond;
    }

    async throttle(): Promise<void> {
        return new Promise((resolve) => {
            this.queue.push(resolve);
            this.processQueue();
        });
    }

    private async processQueue() {
        if (this.processing || this.queue.length === 0) return;
        this.processing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            const waitTime = Math.max(0, this.minInterval - (now - this.lastCall));

            if (waitTime > 0) {
                await new Promise(r => setTimeout(r, waitTime));
            }

            const resolve = this.queue.shift();
            if (resolve) {
                this.lastCall = Date.now();
                resolve();
            }
        }

        this.processing = false;
    }
}

/** Cache for API responses */
class ResponseCache {
    private cache = new Map<string, { data: unknown; expires: number }>();
    private ttl: number;

    constructor(ttlMinutes: number = 5) {
        this.ttl = ttlMinutes * 60 * 1000;
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expires) {
            this.cache.delete(key);
            return null;
        }
        return entry.data as T;
    }

    set(key: string, data: unknown): void {
        this.cache.set(key, {
            data,
            expires: Date.now() + this.ttl,
        });
    }

    clear(): void {
        this.cache.clear();
    }
}

export abstract class BaseProvider {
    protected chainConfig: ChainConfig;
    protected apiKey: string;
    protected client: AxiosInstance;
    protected rateLimiter: RateLimiter;
    protected cache: ResponseCache;

    constructor(chainId: ChainId, apiKey: string) {
        this.chainConfig = getChainConfig(chainId);
        this.apiKey = apiKey;
        this.rateLimiter = new RateLimiter(5); // User requested 5 calls/sec
        this.cache = new ResponseCache(5);

        this.client = axios.create({
            baseURL: this.chainConfig.apiUrl,
            timeout: 30000,
        });
    }

    get chainId(): ChainId {
        return this.chainConfig.id;
    }

    get chainName(): string {
        return this.chainConfig.name;
    }

    /** Make API request with rate limiting, caching, and retries */
    protected async request<T>(
        params: Record<string, string | number>,
        retries = 3
    ): Promise<T> {
        const cacheKey = JSON.stringify(params);
        const cached = this.cache.get<T>(cacheKey);
        if (cached) return cached;

        await this.rateLimiter.throttle();

        const requestParams = {
            ...params,
            apikey: this.apiKey?.trim(),
            chainid: String(this.chainConfig.chainId),
        };

        // Debug logging disabled for browser compatibility

        try {
            const response = await this.client.get<ExplorerApiResponse<T>>('', {
                params: requestParams,
            });

            if (response.data.status !== '1' && response.data.message !== 'No transactions found') {
                const errorResult = JSON.stringify(response.data.result);

                // Check for rate limit error
                if (typeof response.data.result === 'string' && response.data.result.includes('Max calls per sec')) {
                    if (retries > 0) {
                        if (DEBUG) console.warn(`[WARN] Rate limit hit. Retrying in 1s... (${retries} left)`);
                        await new Promise(r => setTimeout(r, 1000));
                        return this.request<T>(params, retries - 1);
                    }
                }

                // Check for "No records found" or similar benign empty responses
                if (typeof response.data.result === 'string' && (
                    response.data.result.includes('No records found') ||
                    response.data.result.includes('No transactions found')
                )) {
                    // Return empty array for list-type queries
                    return [] as unknown as T;
                }

                const action = params.action || 'unknown';
                const module = params.module || 'unknown';
                console.error(`[${this.chainName}] Etherscan API error (${module}/${action}):`, errorResult);
                throw new Error(`[${this.chainName}] API Error (${action}): ${response.data.message} - ${errorResult}`);
            }

            this.cache.set(cacheKey, response.data.result);
            return response.data.result;
        } catch (error) {
            // Retry on network errors
            if (retries > 0) {
                if (DEBUG) console.warn(`[WARN] Request failed. Retrying... (${retries} left)`);
                await new Promise(r => setTimeout(r, 1000));
                return this.request<T>(params, retries - 1);
            }
            throw error;
        }
    }

    /** Get wallet balance in Wei */
    async getBalance(address: string): Promise<string> {
        return this.request<string>({
            module: 'account',
            action: 'balance',
            address,
            tag: 'latest',
        });
    }

    /** Get contract code */
    async getCode(address: string): Promise<string> {
        try {
            return await this.request<string>({
                module: 'proxy',
                action: 'eth_getCode',
                address,
                tag: 'latest',
            });
        } catch {
            return '0x';
        }
    }

    /** Check if address is a contract */
    async isContract(address: string): Promise<boolean> {
        const code = await this.getCode(address);
        return code !== '0x';
    }

    /** Get wallet info */
    async getWalletInfo(address: string): Promise<WalletInfo> {
        const [balance, isContract, txs] = await Promise.all([
            this.getBalance(address),
            this.isContract(address),
            this.getTransactions(address, { status: ['success', 'failed'] }),
        ]);

        const timestamps = txs.map(tx => tx.timestamp).filter(t => t > 0);

        return {
            address: address.toLowerCase(),
            chain: this.chainId,
            balance,
            balanceInEth: parseFloat(balance) / 1e18,
            txCount: txs.length,
            firstTxTimestamp: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
            lastTxTimestamp: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
            isContract,
        };
    }

    /** Get normal transactions for an address */
    async getTransactions(
        address: string,
        filters?: FilterOptions
    ): Promise<Transaction[]> {
        const limit = filters?.limit || 10000; // Use limit if provided, default to 10000
        const rawTxs = await this.request<RawTransaction[]>({
            module: 'account',
            action: 'txlist',
            address,
            startblock: 0,
            endblock: 99999999,
            page: 1,
            offset: limit,
            sort: 'desc',
        });

        if (!Array.isArray(rawTxs)) return [];

        let transactions = rawTxs.map(tx => this.normalizeTransaction(tx, address));

        // Apply filters
        if (filters) {
            transactions = this.applyFilters(transactions, filters);
        }

        return transactions;
    }

    /** Get internal transactions for an address */
    async getInternalTransactions(
        address: string,
        filters?: FilterOptions
    ): Promise<Transaction[]> {
        const limit = filters?.limit || 10000;
        const rawTxs = await this.request<RawInternalTransaction[]>({
            module: 'account',
            action: 'txlistinternal',
            address,
            startblock: 0,
            endblock: 99999999,
            page: 1,
            offset: limit,
            sort: 'desc',
        });

        if (!Array.isArray(rawTxs)) return [];

        let transactions = rawTxs.map(tx => this.normalizeInternalTransaction(tx, address));

        if (filters) {
            transactions = this.applyFilters(transactions, filters);
        }

        return transactions;
    }

    /** Get ERC20 token transfers */
    async getTokenTransfers(
        address: string,
        filters?: FilterOptions
    ): Promise<TokenTransfer[]> {
        const limit = filters?.limit || 10000;
        const rawTransfers = await this.request<RawTokenTransfer[]>({
            module: 'account',
            action: 'tokentx',
            address,
            startblock: 0,
            endblock: 99999999,
            page: 1,
            offset: limit,
            sort: 'desc',
        });

        if (!Array.isArray(rawTransfers)) return [];

        return rawTransfers.map(t => ({
            tokenAddress: t.contractAddress.toLowerCase(),
            tokenName: t.tokenName,
            tokenSymbol: t.tokenSymbol,
            tokenDecimals: parseInt(t.tokenDecimal, 10),
            from: t.from.toLowerCase(),
            to: t.to.toLowerCase(),
            value: t.value,
            valueFormatted: parseFloat(t.value) / Math.pow(10, parseInt(t.tokenDecimal, 10)),
        }));
    }

    /** Get the first funder of an address (Etherscan V2 API) */
    async getFirstFunder(address: string): Promise<{ funder: string; tx: Transaction } | null> {
        try {
            // Use funded by API if available
            const result = await this.request<{ address: string; txHash: string }>({
                module: 'account',
                action: 'fundedby',
                address,
            });

            if (result && result.address) {
                const txs = await this.getTransactions(address);
                const fundingTx = txs.find(tx => tx.hash.toLowerCase() === result.txHash.toLowerCase());

                return {
                    funder: result.address.toLowerCase(),
                    tx: fundingTx || txs[txs.length - 1], // Fallback to first tx
                };
            }
        } catch {
            // Fallback: find the earliest incoming transaction
            const txs = await this.getTransactions(address);
            const incomingTxs = txs.filter(tx => tx.isIncoming && tx.valueInEth > 0);

            if (incomingTxs.length > 0) {
                const firstTx = incomingTxs[incomingTxs.length - 1];
                return {
                    funder: firstTx.from.toLowerCase(),
                    tx: firstTx,
                };
            }
        }

        return null;
    }

    /** Normalize raw transaction to our format */
    protected normalizeTransaction(raw: RawTransaction, viewerAddress: string): Transaction {
        const value = raw.value || '0';
        const gasUsed = raw.gasUsed || '0';
        const gasPrice = raw.gasPrice || '0';

        return {
            hash: raw.hash.toLowerCase(),
            blockNumber: parseInt(raw.blockNumber, 10),
            timestamp: parseInt(raw.timeStamp, 10),
            from: raw.from.toLowerCase(),
            to: raw.to?.toLowerCase() || null,
            value,
            valueInEth: parseFloat(value) / 1e18,
            gasUsed,
            gasPrice,
            gasCostInEth: (parseFloat(gasUsed) * parseFloat(gasPrice)) / 1e18,
            status: raw.isError === '1' ? 'failed' : 'success',
            category: this.categorizeTransaction(raw),
            methodId: raw.methodId,
            methodName: raw.functionName?.split('(')[0],
            isIncoming: raw.to?.toLowerCase() === viewerAddress.toLowerCase(),
        };
    }

    /** Normalize internal transaction */
    protected normalizeInternalTransaction(
        raw: RawInternalTransaction,
        viewerAddress: string
    ): Transaction {
        const value = raw.value || '0';

        return {
            hash: raw.hash.toLowerCase(),
            blockNumber: parseInt(raw.blockNumber, 10),
            timestamp: parseInt(raw.timeStamp, 10),
            from: raw.from.toLowerCase(),
            to: raw.to?.toLowerCase() || null,
            value,
            valueInEth: parseFloat(value) / 1e18,
            gasUsed: '0',
            gasPrice: '0',
            gasCostInEth: 0,
            status: raw.isError === '1' ? 'failed' : 'success',
            category: 'contract_call',
            isIncoming: raw.to?.toLowerCase() === viewerAddress.toLowerCase(),
        };
    }

    /** Categorize transaction type */
    protected categorizeTransaction(raw: RawTransaction): TxCategory {
        // Contract creation
        if (!raw.to || raw.to === '') {
            return 'contract_creation';
        }

        // Simple transfer (no input data)
        if (!raw.input || raw.input === '0x') {
            return 'transfer';
        }

        // Try to identify by method signature
        const methodId = raw.input.slice(0, 10).toLowerCase();

        // Common DEX methods
        const dexMethods = [
            '0x7ff36ab5', // swapExactETHForTokens
            '0x38ed1739', // swapExactTokensForTokens
            '0x18cbafe5', // swapExactTokensForETH
            '0x8803dbee', // swapTokensForExactTokens
            '0xfb3bdb41', // swapETHForExactTokens
            '0x5c11d795', // swapExactTokensForTokensSupportingFeeOnTransferTokens
            '0x791ac947', // swapExactTokensForETHSupportingFeeOnTransferTokens
            '0xb6f9de95', // swapExactETHForTokensSupportingFeeOnTransferTokens
            '0x128acb08', // Uniswap V3 swap
            '0x04e45aaf', // exactInputSingle
            '0xc04b8d59', // exactInput
            '0x414bf389', // exactInputSingle V3
        ];

        if (dexMethods.includes(methodId)) {
            return 'dex_swap';
        }

        // ERC20 transfer/approve
        if (methodId === '0xa9059cbb' || methodId === '0x095ea7b3') {
            return 'token_transfer';
        }

        // NFT transfers
        const nftMethods = [
            '0x23b872dd', // transferFrom
            '0x42842e0e', // safeTransferFrom
            '0xb88d4fde', // safeTransferFrom with data
        ];

        if (nftMethods.includes(methodId)) {
            return 'nft_transfer';
        }

        // Bridge methods
        const bridgeMethods = [
            '0xa9f9e675', // depositETH
            '0xe9e05c42', // depositTransaction
        ];

        if (bridgeMethods.includes(methodId)) {
            return 'bridge';
        }

        return 'contract_call';
    }

    /** Apply filters to transactions */
    protected applyFilters(txs: Transaction[], filters: FilterOptions): Transaction[] {
        return txs.filter(tx => {
            if (filters.timeRange) {
                if (filters.timeRange.start && tx.timestamp < filters.timeRange.start) return false;
                if (filters.timeRange.end && tx.timestamp > filters.timeRange.end) return false;
            }

            if (filters.minValue !== undefined && tx.valueInEth < filters.minValue) return false;
            if (filters.maxValue !== undefined && tx.valueInEth > filters.maxValue) return false;

            if (filters.categories && !filters.categories.includes(tx.category)) return false;
            if (filters.status && !filters.status.includes(tx.status)) return false;

            if (filters.addressFilter && filters.addressFilter.length > 0) {
                const addresses = filters.addressFilter.map(a => a.toLowerCase());
                if (!addresses.includes(tx.from) && (!tx.to || !addresses.includes(tx.to))) {
                    return false;
                }
            }

            return true;
        });
    }

    /** Clear the response cache */
    clearCache(): void {
        this.cache.clear();
    }
}

// Raw types from explorer APIs
interface RawTransaction {
    hash: string;
    blockNumber: string;
    timeStamp: string;
    from: string;
    to: string;
    value: string;
    gasUsed: string;
    gasPrice: string;
    isError: string;
    input: string;
    methodId?: string;
    functionName?: string;
}

interface RawInternalTransaction {
    hash: string;
    blockNumber: string;
    timeStamp: string;
    from: string;
    to: string;
    value: string;
    isError: string;
}

interface RawTokenTransfer {
    hash: string;
    blockNumber: string;
    timeStamp: string;
    contractAddress: string;
    from: string;
    to: string;
    value: string;
    tokenName: string;
    tokenSymbol: string;
    tokenDecimal: string;
}
