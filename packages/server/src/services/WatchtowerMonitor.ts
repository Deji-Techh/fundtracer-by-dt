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
    const keys = getSybilAlchemyKeys();
    const allKeys = [keys.defaultKey, ...keys.contractKeys, ...keys.walletKeys]
      .filter(Boolean)
      .filter((k, i, arr) => arr.indexOf(k) === i);

    if (allKeys.length === 0) {
      console.error('[Watchtower] No Alchemy keys available');
      return;
    }

    for (const [chain, host] of Object.entries(CHAIN_WS_HOST)) {
      if (!this.watchedAddresses.has(chain) || this.watchedAddresses.get(chain)!.size === 0) {
        continue;
      }
      const keyIdx = Object.keys(CHAIN_WS_HOST).indexOf(chain) % allKeys.length;
      const key = allKeys[keyIdx];
      const wsUrl = `wss://${host}.g.alchemy.com/v2/${key}`;

      this.connectChain(chain, wsUrl);
    }
  }

  private connectChain(chain: string, wsUrl: string): void {
    const addrsLower = Array.from(this.watchedAddresses.get(chain) || []);
    if (addrsLower.length === 0) return;

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
        console.log(`[Watchtower] ${chain} WS closed (code ${code}), reconnecting in 10s...`);
        setTimeout(() => {
          if (this.watchedAddresses.has(chain) && this.watchedAddresses.get(chain)!.size > 0) {
            this.connectChain(chain, wsUrl);
          }
        }, 10000);
      });

      ws.on('error', (err: Error) => {
        console.error(`[Watchtower] ${chain} WS error:`, err.message);
      });

      this.activeConnections.set(chain, { ws, subId: null });
    }).catch((err) => {
      console.error(`[Watchtower] Failed to load ws module for ${chain}:`, err.message);
    });
  }

  private async reconnectChain(chain: string): Promise<void> {
    await this.disconnectChain(chain);

    const keys = getSybilAlchemyKeys();
    const allKeys = [keys.defaultKey, ...keys.contractKeys, ...keys.walletKeys]
      .filter(Boolean)
      .filter((k, i, arr) => arr.indexOf(k) === i);
    if (allKeys.length === 0) return;

    const host = CHAIN_WS_HOST[chain];
    if (!host) return;
    const keyIdx = Object.keys(CHAIN_WS_HOST).indexOf(chain) % allKeys.length;
    const key = allKeys[keyIdx];
    const wsUrl = `wss://${host}.g.alchemy.com/v2/${key}`;

    this.connectChain(chain, wsUrl);
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

    // Check which watched addresses are involved
    for (const addr of addrs) {
      if (from !== addr && to !== addr) continue;

      const isIncoming = to === addr;
      const valueEth = parseInt(tx.value || '0x0', 16) / 1e18;
      const timestamp = Math.floor(Date.now() / 1000);

      const event: WatchtowerEvent = {
        address: addr,
        chain,
        txHash: hash,
        from,
        to,
        valueEth,
        timestamp,
        direction: isIncoming ? 'incoming' : 'outgoing',
      };

      // Find all users watching this address and store + notify
      const key = this.chainAddrKey(chain, addr);
      const watchers = this.addressWatchers.get(key);
      if (watchers) {
        console.log(`[Watchtower] Tx: ${chain} ${event.direction} ${valueEth.toFixed(4)} ETH — ${hash.slice(0, 10)}...`);
        for (const uid of watchers) {
          this.storeEvent(uid, event);
          this.notifySubscribers(uid, event);
        }
      }
    }
  }

  private async storeEvent(uid: string, event: WatchtowerEvent): Promise<void> {
    try {
      await this.db
        .collection('watchtower_events').doc(uid)
        .collection('activity').doc(event.txHash)
        .set({
          ...event,
          createdAt: FieldValue.serverTimestamp(),
        }, { merge: true });
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
