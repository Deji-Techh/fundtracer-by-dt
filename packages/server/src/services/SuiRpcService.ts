/**
 * Sui RPC Service
 * Direct RPC queries to Sui blockchain for wallet transactions
 */

import { cache } from '../utils/cache.js';

const SUI_RPC_URL = process.env.SUI_RPC_URL || 'https://sui-mainnet.g.alchemy.com/v2/demo';

interface SuiTransactionBlock {
  digest: string;
  timestamp?: number;
  effects?: {
    events?: Array<{
      type: string;
      parsedJson?: any;
    }>;
  };
}

interface TransactionSummary {
  digest: string;
  timestamp: number;
  sender: string;
  events: Array<{
    type: string;
    data: any;
  }>;
}

export class SuiRpcService {
  private rpcUrl: string;

  constructor(rpcUrl?: string) {
    this.rpcUrl = rpcUrl || SUI_RPC_URL;
  }

  private async rpcCall(method: string, params: any[] = []): Promise<any> {
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
      throw new Error(`Sui RPC error: ${data.error.message}`);
    }
    return data.result;
  }

  async getWalletTransactions(address: string, limit: number = 50): Promise<TransactionSummary[]> {
    const cacheKey = `sui:txs:${address}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const transactions = await this.rpcCall('suix_queryTransactionBlocks', [{
        filter: {
          MoveFunction: {
            package: '0x2',
            module: 'coin',
            function: 'transfer',
          },
        },
        sender: address,
      }, limit, true, {
        showEffects: true,
        showEvents: true,
      }]);

      const summaries: TransactionSummary[] = (transactions || []).map((tx: any) => ({
        digest: tx.digest,
        timestamp: tx.timestampMs || Date.now(),
        sender: tx.transaction?.data?.sender || '',
        events: (tx.effects?.events || []).map((event: any) => ({
          type: event.type,
          data: event.parsedJson || event,
        })),
      }));

      cache.set(cacheKey, summaries, 60);
      return summaries;
    } catch (error) {
      console.error('[SuiRpcService] Error fetching transactions:', error);
      return [];
    }
  }

  async getRecentTradersFromDex(dexName: string = 'cetus', limit: number = 20): Promise<any[]> {
    const cacheKey = `sui:traders:${dexName}:${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
      const dexAddresses: Record<string, string> = {
        cetus: '0x1e3b4d4e6eb5edb51c97e5a4e3b2c9f3e7b8c9a1b2d3e4f5a6b7c8d9e0f1a2',
        turbos: '0x2e3b4d4e6eb5edb51c97e5a4e3b2c9f3e7b8c9a1b2d3e4f5a6b7c8d9e0f1a2',
      };

      const poolAddress = dexAddresses[dexName];
      if (!poolAddress) {
        return [];
      }

      const transactions = await this.rpcCall('suix_queryTransactionBlocks', [{
        MoveCall: {
          package: '0x1',
          module: 'dex',
          function: 'swap',
        },
      }, 100, true, {
        showEffects: true,
        showEvents: true,
      }]);

      const traders = new Map<string, {
        address: string;
        trades: number;
        volume: number;
        lastActive: number;
      }>();

      (transactions || []).forEach((tx: any) => {
        const sender = tx.transaction?.data?.sender;
        if (!sender || sender === '0x0000000000000000000000000000000000000000000000000000000000000000') return;

        const existing = traders.get(sender) || {
          address: sender,
          trades: 0,
          volume: 0,
          lastActive: 0,
        };

        existing.trades += 1;
        existing.lastActive = Math.max(existing.lastActive, tx.timestampMs || 0);
        
        traders.set(sender, existing);
      });

      const result = Array.from(traders.values())
        .sort((a, b) => b.trades - a.trades)
        .slice(0, limit);

      cache.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      console.error('[SuiRpcService] Error fetching traders:', error);
      return [];
    }
  }
}

export default SuiRpcService;
