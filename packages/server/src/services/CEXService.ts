/**
 * CEX Service
 * Handles CEX wallet detection and flow analysis
 */

import { cache } from '../utils/cache.js';
import { ChainId } from '@fundtracer/core';
import {
  getCEXInfo,
  getCEXAddresses,
  isKnownCEX,
  detectCEXPattern,
  type CEXWallet
} from '../data/cexWallets.js';

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: number;
  timestamp: number;
  token?: string;
}

export interface ConnectedWallet {
  address: string;
  totalSent: number;
  firstTx: number;
  lastTx: number;
  txCount: number;
  isCEX: boolean;
  cexName?: string;
}

export interface CEXFlowResult {
  targetWallet: string;
  chain: ChainId;
  connectedCEX: {
    cexName: string;
    address: string;
    type: string;
    isMain: boolean;
  }[];
  connectedWallets: ConnectedWallet[];
  stats: {
    totalInteractors: number;
    uniqueCEX: number;
    totalVolume: number;
    cexVolume: number;
  };
  detectedCEX: {
    address: string;
    score: number;
    signals: string[];
  }[];
}

export class CEXService {
  private rpcService: any;

  constructor(rpcService?: any) {
    this.rpcService = rpcService;
  }

  /**
   * Analyze CEX flow for a wallet
   */
  async analyzeCEXFlow(
    walletAddress: string,
    chain: ChainId,
    options?: {
      cexName?: string;
      depth?: number;
      transactions?: Transaction[];
    }
  ): Promise<CEXFlowResult> {
    const cacheKey = `cex-flow:${chain}:${walletAddress}:${options?.cexName || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    // Get transactions for the wallet
    let transactions = options?.transactions;
    if (!transactions) {
      transactions = await this.getWalletTransactions(walletAddress, chain);
    }

    // Find all CEX interactions
    const cexAddresses = getCEXAddresses(chain);
    const connectedCEX: CEXFlowResult['connectedCEX'] = [];
    const connectedWalletsMap = new Map<string, ConnectedWallet>();
    const walletSentToCEX = new Set<string>(); // Wallets that sent TO same CEX as target

    for (const tx of transactions) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      const wallet = walletAddress.toLowerCase();

      // Check if transaction involves target wallet
      if (from === wallet || to === wallet) {
        const counterparty = from === wallet ? to : from;
        
        // Check if counterparty is a known CEX
        const cexInfo = getCEXInfo(counterparty, chain);
        if (cexInfo) {
          if (!connectedCEX.find(c => c.address === counterparty)) {
            connectedCEX.push({
              cexName: cexInfo.cexName,
              address: counterparty,
              type: cexInfo.type,
              isMain: cexInfo.isMain,
            });
          }
        }

        // Track connected wallets
        if (!connectedWalletsMap.has(counterparty)) {
          connectedWalletsMap.set(counterparty, {
            address: counterparty,
            totalSent: 0,
            firstTx: tx.timestamp,
            lastTx: tx.timestamp,
            txCount: 0,
            isCEX: false,
          });
        }

        const cw = connectedWalletsMap.get(counterparty)!;
        cw.txCount++;
        if (from === wallet) {
          cw.totalSent += tx.value;
        }
        cw.firstTx = Math.min(cw.firstTx, tx.timestamp);
        cw.lastTx = Math.max(cw.lastTx, tx.timestamp);
      }

      // Find wallets that sent to same CEX (for "connected wallets" feature)
      // This is the key insight: wallets that sent to the same CEX deposit address
      if (cexAddresses.includes(to) && from !== wallet) {
        // This wallet sent to a CEX that our target also interacted with
        if (!walletSentToCEX.has(from)) {
          walletSentToCEX.add(from);
        }
      }
    }

    // Check if any connected wallets are CEX
    for (const cw of connectedWalletsMap.values()) {
      const cexInfo = getCEXInfo(cw.address, chain);
      if (cexInfo) {
        cw.isCEX = true;
        cw.cexName = cexInfo.cexName;
      }
    }

    // Auto-detect CEX patterns in connected wallets
    const detectedCEX = await this.detectUnknownCEX(Array.from(connectedWalletsMap.values()), chain);

    // Calculate stats
    const stats = {
      totalInteractors: connectedWalletsMap.size,
      uniqueCEX: connectedCEX.length,
      totalVolume: transactions.reduce((sum, tx) => sum + tx.value, 0),
      cexVolume: transactions
        .filter(tx => cexAddresses.includes(tx.to.toLowerCase()) || cexAddresses.includes(tx.from.toLowerCase()))
        .reduce((sum, tx) => sum + tx.value, 0),
    };

    const result: CEXFlowResult = {
      targetWallet: walletAddress,
      chain,
      connectedCEX,
      connectedWallets: Array.from(connectedWalletsMap.values()),
      stats,
      detectedCEX,
    };

    cache.set(cacheKey, result, 300); // 5 min cache
    return result;
  }

  /**
   * Get connected wallets - wallets that sent to same CEX as target
   */
  async getConnectedWallets(
    walletAddress: string,
    chain: ChainId,
    cexName?: string
  ): Promise<ConnectedWallet[]> {
    const transactions = await this.getWalletTransactions(walletAddress, chain);
    const cexAddresses = getCEXAddresses(chain);
    
    // Find CEX addresses the wallet interacted with
    const walletCEXAddresses = new Set<string>();
    for (const tx of transactions) {
      const to = tx.to.toLowerCase();
      const from = tx.from.toLowerCase();
      const wallet = walletAddress.toLowerCase();

      if (from === wallet && cexAddresses.includes(to)) {
        walletCEXAddresses.add(to);
      }
    }

    if (walletCEXAddresses.size === 0) {
      return [];
    }

    // This is a simplified version - in production you'd need to query
    // all transactions to these CEX addresses to find other senders
    // For now, return the basic connected wallets
    const connected: ConnectedWallet[] = [];
    for (const tx of transactions) {
      const from = tx.from.toLowerCase();
      const to = tx.to.toLowerCase();
      const wallet = walletAddress.toLowerCase();

      if (from !== wallet && cexAddresses.includes(to)) {
        // This is another wallet that sent to a CEX our target also used
        connected.push({
          address: from,
          totalSent: tx.value,
          firstTx: tx.timestamp,
          lastTx: tx.timestamp,
          txCount: 1,
          isCEX: false,
        });
      }
    }

    return connected;
  }

  /**
   * Auto-detect unknown CEX-like wallets
   */
  private async detectUnknownCEX(
    wallets: ConnectedWallet[],
    chain: ChainId
  ): Promise<{ address: string; score: number; signals: string[] }[]> {
    const detected: { address: string; score: number; signals: string[] }[] = [];
    const knownAddresses = getCEXAddresses(chain).map(a => a.toLowerCase());

    for (const cw of wallets) {
      if (knownAddresses.includes(cw.address.toLowerCase())) continue;

      const pattern = detectCEXPattern(
        cw.txCount,
        cw.txCount, // Using txCount as proxy for unique senders
        cw.txCount,
        cw.totalSent / Math.max(cw.txCount, 1),
        cw.totalSent
      );

      if (pattern.isCEX) {
        detected.push({
          address: cw.address,
          score: pattern.score,
          signals: pattern.signals,
        });
      }
    }

    return detected.sort((a, b) => b.score - a.score).slice(0, 5);
  }

  /**
   * Get wallet transactions (placeholder - implement with actual RPC)
   */
  private async getWalletTransactions(address: string, chain: ChainId): Promise<Transaction[]> {
    // This would be implemented using the chain-specific RPC service
    // For now, return empty array - will be called from the actual API
    return [];
  }

  /**
   * Check if a wallet is a known CEX
   */
  isCEX(address: string, chain: ChainId): boolean {
    return isKnownCEX(address, chain);
  }

  /**
   * Get CEX info for an address
   */
  getCEXDetails(address: string, chain: ChainId): { cexName: string; type: string; isMain: boolean } | null {
    return getCEXInfo(address, chain);
  }
}

export const cexService = new CEXService();
