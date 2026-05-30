// ============================================================
// WatchtowerMonitor — 24/7 wallet monitoring via Alchemy WebSocket
// Uses the server's Alchemy key pool for WebSocket connections.
// Caches events to Firestore per-user, broadcasts to desktop clients.
// ============================================================

import { getFirestore, admin } from '../firebase.js';
import { getSybilAlchemyKeys } from '../utils/alchemyKeys.js';

const ADMIN = admin;
const FieldValue = ADMIN.firestore.FieldValue;

const CHAIN_WS_HOST: Record<string, string> = {
  ethereum: 'eth-mainnet',
  linea: 'linea-mainnet',
  arbitrum: 'arb-mainnet',
  base: 'base-mainnet',
  optimism: 'opt-mainnet',
  polygon: 'polygon-mainnet',
  bsc: 'bnb-mainnet',
};

// Token contracts keyed by chain -> lowercase address -> {symbol, decimals}
const KNOWN_TOKENS: Record<string, Record<string, { symbol: string; decimals: number }>> = {
  ethereum: {
    '0xdac17f958d2ee523a2206206994597c13d831ec7': { symbol: 'USDT', decimals: 6 },
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6 },
    '0x6b175474e89094c44da98b954eedeac495271d0f': { symbol: 'DAI', decimals: 18 },
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { symbol: 'WBTC', decimals: 8 },
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': { symbol: 'WETH', decimals: 18 },
  },
  linea: {
    '0x176211869ca2b568f2a7d4ee941e073a821ee1ff': { symbol: 'USDC', decimals: 6 },
    '0xa219439258ca9da29e9cc4ce5596924745e12b93': { symbol: 'USDT', decimals: 6 },
    '0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f': { symbol: 'WETH', decimals: 18 },
  },
  base: {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': { symbol: 'USDC', decimals: 6 },
    '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
  },
  arbitrum: {
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': { symbol: 'USDC', decimals: 6 },
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': { symbol: 'USDT', decimals: 6 },
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': { symbol: 'WETH', decimals: 18 },
  },
  optimism: {
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85': { symbol: 'USDC', decimals: 6 },
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': { symbol: 'USDT', decimals: 6 },
    '0x4200000000000000000000000000000000000006': { symbol: 'WETH', decimals: 18 },
  },
  polygon: {
    '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359': { symbol: 'USDC', decimals: 6 },
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': { symbol: 'USDT', decimals: 6 },
    '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': { symbol: 'WETH', decimals: 18 },
  },
  bsc: {
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': { symbol: 'USDC', decimals: 18 },
    '0x55d398326f99059ff775485246999027b3197955': { symbol: 'USDT', decimals: 18 },
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8': { symbol: 'WETH', decimals: 18 },
  },
};

interface WatchtowerEvent {
  address: string;
  chain: string;
  txHash: string;
  from: string;
  to: string;
  valueEth: number;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  counterparty: string;
  tokenAddress?: string;
  tokenAmount?: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
}

/**
 * Decode an ERC-20 transfer from transaction input calldata.
 * Returns token info + actual sender/recipient extracted from calldata.
 * For native ETH transfers, this returns null (use tx.from / tx.to directly).
 */
function decodeTokenTransfer(input: string, chain: string, txTo: string): {
  tokenAddress: string;
  tokenAmount: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  tokenSender: string;
  tokenRecipient: string;
} | null {
  if (!input || input === '0x' || input.length < 138) return null;

  const methodSig = input.slice(0, 10); // "0xa9059cbb" or "0x23b872dd"
  let tokenSender: string;
  let tokenRecipient: string;
  let amountHex: string;

  if (methodSig === '0xa9059cbb' && input.length >= 138) {
    // transfer(address recipient, uint256 amount)
    // recipient is right-aligned 32 bytes at calldata offset 4 (hex offset 10)
    tokenRecipient = '0x' + input.slice(34, 74).toLowerCase();
    amountHex = '0x' + input.slice(74, 138);
    tokenSender = ''; // will be filled from tx.from in handleTxEvent
  } else if (methodSig === '0x23b872dd' && input.length >= 202) {
    // transferFrom(address sender, address recipient, uint256 amount)
    tokenSender = '0x' + input.slice(34, 74).toLowerCase();
    tokenRecipient = '0x' + input.slice(98, 138).toLowerCase();
    amountHex = '0x' + input.slice(138, 202);
  } else {
    return null;
  }

  const amount = BigInt(amountHex).toString();
  if (amount === '0') return null;

  const tokenInfo = KNOWN_TOKENS[chain]?.[txTo.toLowerCase()];

  return {
    tokenAddress: txTo.toLowerCase(),
    tokenAmount: amount,
    tokenSymbol: tokenInfo?.symbol,
    tokenDecimals: tokenInfo?.decimals,
    tokenSender,
    tokenRecipient,
  };
}

type EventCallback = (uid: string, event: WatchtowerEvent) => void;

export class WatchtowerMonitor {
  private activeConnections: Map<string, { ws: any; subId: string | null }> = new Map();
  private watchedAddresses: Map<string, Set<string>> = new Map(); // chain -> set of addresses (lowercase)
  private addressWatchers: Map<string, Set<string>> = new Map(); // address -> set of user IDs
  private addressOriginalCase: Map<string, string> = new Map(); // lowercase -> original case for Alchemy filter
  private eventSubscribers: Set<EventCallback> = new Set();
  private db: any;
  private firstMessageLogged = false;
  private chainKeyIndex: Map<string, number> = new Map();

  constructor() {
    this.db = getFirestore();
  }

  /** Subscribe to events for a specific user (called by WS server) */
  subscribe(callback: EventCallback): () => void {
    this.eventSubscribers.add(callback);
    return () => this.eventSubscribers.delete(callback);
  }

  /** Notify all subscribers of an event */
  private notifySubscribers(uid: string, event: WatchtowerEvent) {
    for (const cb of this.eventSubscribers) {
      try { cb(uid, event); } catch {}
    }
  }

  /** Start monitoring — called on server boot */
  async start(): Promise<void> {
    console.log('[Watchtower] Starting monitor...');
    await this.loadWatchlist();
    await this.connectAllChains();
    console.log(`[Watchtower] Monitoring ${this.watchedAddresses.size} chains, ${this.addressWatchers.size} addresses`);
  }

  /** Add a wallet to monitor for a specific user */
  async addWallet(uid: string, address: string, chain: string): Promise<void> {
    const addr = address.toLowerCase();
    const key = this.chainAddrKey(chain, addr);

    // Preserve original case for Alchemy's case-sensitive address filter
    this.addressOriginalCase.set(addr, address);

    if (!this.addressWatchers.has(key)) {
      this.addressWatchers.set(key, new Set());
    }
    this.addressWatchers.get(key)!.add(uid);

    if (!this.watchedAddresses.has(chain)) {
      this.watchedAddresses.set(chain, new Set());
    }
    const hadAddr = this.watchedAddresses.get(chain)!.has(addr);
    this.watchedAddresses.get(chain)!.add(addr);

    // Persist to Firestore
    try {
      const watchlistDoc = this.db.collection('watchlist').doc(key);
      await watchlistDoc.set({
        address: addr,
        chain,
        watchers: Array.from(this.addressWatchers.get(key)!),
        addedBy: uid,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    } catch (e: any) {
      console.error(`[Watchtower] Failed to persist addWallet ${key}:`, e.message);
    }

    // If this is a new address on this chain, reconnect
    if (!hadAddr) {
      await this.reconnectChain(chain);
    }
  }

  /** Remove a wallet from monitoring for a specific user */
  async removeWallet(uid: string, address: string, chain: string): Promise<void> {
    const addr = address.toLowerCase();
    const key = this.chainAddrKey(chain, addr);

    const watchers = this.addressWatchers.get(key);
    if (watchers) {
      watchers.delete(uid);
      if (watchers.size === 0) {
        this.addressWatchers.delete(key);
        this.addressOriginalCase.delete(addr);
        // Remove from Firestore
        try {
          await this.db.collection('watchlist').doc(key).delete();
        } catch (e: any) {
          console.error(`[Watchtower] Failed to delete watchlist doc ${key}:`, e.message);
        }
        const chainSet = this.watchedAddresses.get(chain);
        if (chainSet) {
          chainSet.delete(addr);
          if (chainSet.size === 0) {
            this.watchedAddresses.delete(chain);
            await this.disconnectChain(chain);
            return;
          }
          await this.reconnectChain(chain);
        }
      } else {
        // Update watchers list in Firestore
        try {
          await this.db.collection('watchlist').doc(key).update({
            watchers: Array.from(watchers),
            updatedAt: FieldValue.serverTimestamp(),
          });
        } catch (e: any) {
          console.error(`[Watchtower] Failed to update watchlist doc ${key}:`, e.message);
        }
      }
    }
  }

  /** Get recent activity for a user */
  async getActivity(uid: string, limit = 50): Promise<WatchtowerEvent[]> {
    try {
      const snapshot = await this.db
        .collection('watchtower_events').doc(uid)
        .collection('activity')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map((doc: any) => doc.data() as WatchtowerEvent);
    } catch {
      return [];
    }
  }

  // ─── Private ────────────────────────────────────────────────

  private chainAddrKey(chain: string, addr: string): string {
    return `${chain}:${addr}`;
  }

  /** Collect all unique available Alchemy keys */
  private getAllKeys(): string[] {
    const keys = getSybilAlchemyKeys();
    return [keys.defaultKey, ...keys.contractKeys, ...keys.walletKeys]
      .filter(Boolean)
      .filter((k, i, arr) => arr.indexOf(k) === i);
  }

  /** Build a WebSocket URL for a chain using the given key index */
  private buildWsUrl(chain: string, keyIndex: number): string | null {
    const allKeys = this.getAllKeys();
    if (allKeys.length === 0) return null;
    const host = CHAIN_WS_HOST[chain];
    if (!host) return null;
    const key = allKeys[keyIndex % allKeys.length];
    return `wss://${host}.g.alchemy.com/v2/${key}`;
  }

  /** Rotate to the next Alchemy key for a chain and return the new URL */
  private rotateKey(chain: string): string | null {
    const allKeys = this.getAllKeys();
    if (allKeys.length === 0) return null;
    const currentIdx = this.chainKeyIndex.get(chain) ?? 0;
    const nextIdx = (currentIdx + 1) % allKeys.length;
    this.chainKeyIndex.set(chain, nextIdx);
    console.log(`[Watchtower] ${chain}: rotating to key #${nextIdx + 1}/${allKeys.length}`);
    return this.buildWsUrl(chain, nextIdx);
  }

  private async loadWatchlist(): Promise<void> {
    try {
      const snapshot = await this.db.collection('watchlist').get();
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const original = data.address || doc.id;
        const addr = original.toLowerCase();
        const chain = data.chain || data.chains?.[0] || 'ethereum';
        const watchers: string[] = data.watchers || (data.addedBy ? [data.addedBy] : []);

        const key = this.chainAddrKey(chain, addr);
        this.addressWatchers.set(key, new Set(watchers));
        this.addressOriginalCase.set(addr, original);

        if (!this.watchedAddresses.has(chain)) {
          this.watchedAddresses.set(chain, new Set());
        }
        this.watchedAddresses.get(chain)!.add(addr);
      }
      console.log(`[Watchtower] Loaded ${snapshot.size} tracked wallets from watchlist`);
    } catch (e: any) {
      console.error('[Watchtower] Failed to load watchlist:', e.message);
    }
  }

  private async connectAllChains(): Promise<void> {
    const allKeys = this.getAllKeys();
    if (allKeys.length === 0) {
      console.error('[Watchtower] No Alchemy keys available');
      return;
    }

    for (const chain of Object.keys(CHAIN_WS_HOST)) {
      if (!this.watchedAddresses.has(chain) || this.watchedAddresses.get(chain)!.size === 0) {
        continue;
      }
      // Assign initial key index (spread across available keys)
      if (!this.chainKeyIndex.has(chain)) {
        const idx = Object.keys(CHAIN_WS_HOST).indexOf(chain) % allKeys.length;
        this.chainKeyIndex.set(chain, idx);
      }
      this.connectChain(chain);
    }
  }

  private connectChain(chain: string): void {
    const addrsLower = Array.from(this.watchedAddresses.get(chain) || []);
    if (addrsLower.length === 0) return;

    const keyIdx = this.chainKeyIndex.get(chain) ?? 0;
    const wsUrl = this.buildWsUrl(chain, keyIdx);
    if (!wsUrl) {
      console.error(`[Watchtower] ${chain}: no Alchemy key available`);
      return;
    }

    const allKeys = this.getAllKeys();
    console.log(`[Watchtower] ${chain}: connecting with key #${keyIdx + 1}/${allKeys.length}`);

    import('ws').then((WS) => {
      const ws = new WS.default(wsUrl);
      let subId: string | null = null;
      let pingInterval: ReturnType<typeof setInterval>;
      let msgCount = 0;

      ws.on('open', () => {
        // Build filter identically to working Python implementation:
        // all "from" entries first, then all "to" entries
        const fromFilters = addrsLower.map((a) => ({ from: a }));
        const toFilters = addrsLower.map((a) => ({ to: a }));
        const addresses = [...fromFilters, ...toFilters];

        const subMsg = JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_subscribe',
          params: [
            'alchemy_minedTransactions',
            {
              addresses,
              includeRemoved: false,
              hashesOnly: false,
            },
          ],
          id: 1,
        });
        console.log(`[Watchtower] Subscribing on ${chain} with ${addresses.length} filters for ${addrsLower.length} addresses`);
        ws.send(subMsg);

        pingInterval = setInterval(() => {
          if (ws.readyState === WS.default.OPEN) {
            ws.ping();
          }
        }, 20000); // match Python's 20s ping_interval
      });

      ws.on('message', (raw: Buffer) => {
        msgCount++;
        try {
          const rawStr = raw.toString();
          const msg = JSON.parse(rawStr);

          // Log first 3 messages for diagnostics
          if (msgCount <= 3) {
            console.log(`[Watchtower] Msg #${msgCount} on ${chain}:`, rawStr.slice(0, 400));
          }

          // Match Python: skip messages that have top-level "result" but no "params"
          // (subscription confirmation: {"jsonrpc":"2.0","id":1,"result":"0x..."})
          if ('result' in msg && !('params' in msg)) {
            subId = msg.result;
            console.log(`[Watchtower] Subscribed on ${chain} (sub ${subId}) — watching ${addrsLower.length} addresses`);
            return;
          }

          // Match Python: skip messages without "params"
          if (!('params' in msg)) return;

          // Match Python: extract result.transaction
          const result = msg.params?.result;
          const tx = result?.transaction;
          if (!tx) return;

          // Skip removed (reorg'd) transactions
          if (result.removed) return;

          this.handleTxEvent(chain, addrsLower, result);
        } catch (e: any) {
          console.error(`[Watchtower] Message handler error on ${chain} (msg #${msgCount}):`, e.message);
        }
      });

      ws.on('close', (code: number) => {
        clearInterval(pingInterval);
        const newUrl = this.rotateKey(chain);
        if (!newUrl) return;
        console.log(`[Watchtower] ${chain} WS closed (code ${code}), reconnecting in 10s...`);
        setTimeout(() => {
          if (this.watchedAddresses.has(chain) && this.watchedAddresses.get(chain)!.size > 0) {
            this.connectChain(chain);
          }
        }, 10000);
      });

      ws.on('error', (err: Error) => {
        console.error(`[Watchtower] ${chain} WS error:`, err.message);
        // 401 means this key doesn't have access to this chain — let close handler rotate
        if (err.message.includes('401') || err.message.includes('403')) {
          try { ws.close(); } catch {}
        }
      });

      this.activeConnections.set(chain, { ws, subId: null });
    }).catch((err) => {
      console.error(`[Watchtower] Failed to load ws module for ${chain}:`, err.message);
    });
  }

  private async reconnectChain(chain: string): Promise<void> {
    await this.disconnectChain(chain);
    this.connectChain(chain);
  }

  private async disconnectChain(chain: string): Promise<void> {
    const conn = this.activeConnections.get(chain);
    if (conn) {
      try { conn.ws.close(); } catch {}
      this.activeConnections.delete(chain);
    }
  }

  private handleTxEvent(chain: string, addrs: string[], result: any): void {
    const tx = result?.transaction;
    if (!tx) return;

    const from = (tx.from || '').toLowerCase();
    const to = (tx.to || '').toLowerCase();
    const hash = tx.hash || '';
    const input = tx.input || '';
    const valueEth = parseInt(tx.value || '0x0', 16) / 1e18;
    const timestamp = Math.floor(Date.now() / 1000);

    // Try to decode ERC-20 token transfer from calldata
    const tokenTransfer = decodeTokenTransfer(input, chain, to);

    // Determine the actual sender and recipient for matching.
    // For token transfers, the real recipient is encoded in calldata (not tx.to).
    const effectiveFrom = tokenTransfer
      ? (tokenTransfer.tokenSender || from) // transfer(): sender is tx.from
      : from;
    const effectiveTo = tokenTransfer
      ? tokenTransfer.tokenRecipient      // the actual recipient from calldata
      : to;

    // Check which watched addresses are involved
    for (const addr of addrs) {
      if (effectiveFrom !== addr && effectiveTo !== addr) continue;

      const isIncoming = effectiveTo === addr;
      const counterparty = isIncoming ? effectiveFrom : effectiveTo;

      const event: WatchtowerEvent = {
        address: addr,
        chain,
        txHash: hash,
        from: effectiveFrom,
        to: effectiveTo,
        valueEth: tokenTransfer ? 0 : valueEth,
        timestamp,
        direction: isIncoming ? 'incoming' : 'outgoing',
        counterparty,
        ...(tokenTransfer ? {
          tokenAddress: tokenTransfer.tokenAddress,
          tokenAmount: tokenTransfer.tokenAmount,
          tokenSymbol: tokenTransfer.tokenSymbol,
          tokenDecimals: tokenTransfer.tokenDecimals,
        } : {}),
      };

      // Find all users watching this address and store + notify
      const key = this.chainAddrKey(chain, addr);
      const watchers = this.addressWatchers.get(key);
      if (watchers) {
        if (tokenTransfer) {
          const sym = tokenTransfer.tokenSymbol || `tok:${to.slice(0, 8)}`;
          const dec = tokenTransfer.tokenDecimals ?? 18;
          const raw = BigInt(tokenTransfer.tokenAmount);
          const div = BigInt(10) ** BigInt(Math.min(dec, 18));
          const intPart = (raw / div).toString();
          console.log(`[Watchtower] Tx: ${chain} ${event.direction} ${intPart} ${sym} — ${hash.slice(0, 10)}...`);
        } else {
          console.log(`[Watchtower] Tx: ${chain} ${event.direction} ${valueEth.toFixed(4)} ETH — ${hash.slice(0, 10)}...`);
        }
        for (const uid of watchers) {
          this.storeEvent(uid, event);
          this.notifySubscribers(uid, event);
        }
      }
    }
  }

  private async storeEvent(uid: string, event: WatchtowerEvent): Promise<void> {
    try {
      // Use txHash + direction as doc ID so both incoming and outgoing
      // perspectives are stored when the same user watches both parties.
      const docId = `${event.txHash}_${event.direction}`;
      await this.db
        .collection('watchtower_events').doc(uid)
        .collection('activity').doc(docId)
        .set({
          ...event,
          createdAt: FieldValue.serverTimestamp(),
        });
    } catch (e: any) {
      console.error('[Watchtower] Failed to store event:', e.message);
    }
  }
}

let monitorInstance: WatchtowerMonitor | null = null;

export function getWatchtowerMonitor(): WatchtowerMonitor {
  if (!monitorInstance) {
    monitorInstance = new WatchtowerMonitor();
  }
  return monitorInstance;
}
