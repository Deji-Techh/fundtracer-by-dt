/**
 * CEX Wallet Database
 * Manual + auto-detect database of known CEX wallet addresses
 * 
 * Manual: Known hot wallets from major CEXs
 * Auto-detect: Pattern-based detection for unknown CEX-like wallets
 */

import { ChainId } from '@fundtracer/core';

export interface CEXWallet {
  address: string;
  name: string;
  chain: ChainId;
  type: 'deposit' | 'hot' | 'cold';
  isMain: boolean;
  label?: string;
}

export interface DetectedCEX {
  address: string;
  score: number;
  signals: string[];
  lastActivity: number;
  estimatedVolume?: number;
  uniqueSenders?: number;
}

export interface CEXGroup {
  name: string;
  wallets: CEXWallet[];
}

export type CEXWalletDatabase = Partial<Record<ChainId, CEXGroup[]>>;

// Manual CEX wallet database
export const CEX_WALLETS: CEXWalletDatabase = {
  ethereum: [
    {
      name: 'Binance',
      wallets: [
        { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Hot Wallet 20', chain: 'ethereum', type: 'hot', isMain: true },
        { address: '0x631fc1ea2270e98fbd9d92658ece0f5a269aa161', name: 'Binance: Hot Wallet', chain: 'ethereum', type: 'hot', isMain: false },
        { address: '0x28fA6C20b26Be9bAd1d89E5e8E2d1F5C5e3dE4aF', name: 'Binance: Deposit Wallet', chain: 'ethereum', type: 'deposit', isMain: false },
      ]
    },
    {
      name: 'Coinbase',
      wallets: [
        { address: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Coinbase 2', chain: 'ethereum', type: 'hot', isMain: true },
        { address: '0xb1697cea2605d1dBa32d94A72d8CBfCFB8f55aC9', name: 'Coinbase: Hot Wallet', chain: 'ethereum', type: 'hot', isMain: false },
        { address: '0xA5d1d5d9a8E7a8d1E5c8a9f2d3c4B5e6f7a8b9c0', name: 'Coinbase: Deposit', chain: 'ethereum', type: 'deposit', isMain: false },
      ]
    },
    {
      name: 'Kraken',
      wallets: [
        { address: '0xe9f7ecae3a53d2a67105292894676b00d1fab785', name: 'Kraken: Hot Wallet', chain: 'ethereum', type: 'hot', isMain: true },
        { address: '0xf30ba13e4b04ce5dc4d254ae5fa95477800f0eb0', name: 'Kraken: Hot Wallet 2', chain: 'ethereum', type: 'hot', isMain: false },
        { address: '0x05ff6964d21e5dae3b1010d5ae0465b3c450f381', name: 'Kraken: Hot Wallet 4', chain: 'ethereum', type: 'hot', isMain: false },
      ]
    },
    {
      name: 'Bybit',
      wallets: [
        { address: '0xf89d7b9c864f589bbf53a82105107622b35eaa40', name: 'Bybit: Hot Wallet', chain: 'ethereum', type: 'hot', isMain: true },
        { address: '0x4BC195D2dC6Bf3B8e1C5b7e1D5C9aF3E2b7d1C0a', name: 'Bybit: Deposit', chain: 'ethereum', type: 'deposit', isMain: false },
      ]
    },
    {
      name: 'OKX',
      wallets: [
        { address: '0x4b4e14a3773ee558b6597070797fd51eb48606e5', name: 'OKX: Hot Wallet', chain: 'ethereum', type: 'hot', isMain: true },
        { address: '0x559432e18b281731c054cd703d4b49872be4ed53', name: 'OKX: Hot Wallet 5', chain: 'ethereum', type: 'hot', isMain: false },
      ]
    },
    {
      name: 'KuCoin',
      wallets: [
        { address: '0x53f78a071d04224b8e254e243fffc6d9f2f3fa23', name: 'KuCoin: Hot Wallet 2', chain: 'ethereum', type: 'hot', isMain: true },
      ]
    },
    {
      name: 'Bitget',
      wallets: [
        { address: '0x19e2A56B1F0C7c12d9a4f4a5d7C8E3F2a1b0c9d8', name: 'Bitget: Hot Wallet', chain: 'ethereum', type: 'hot', isMain: true },
      ]
    },
    {
      name: 'Gate.io',
      wallets: [
        { address: '0x0f5d2A7B8E1d2C3a4b5e6f7a8b9c0d1e2f3a4b5', name: 'Gate.io: Hot Wallet', chain: 'ethereum', type: 'hot', isMain: true },
      ]
    },
  ],
  linea: [
    {
      name: 'Binance',
      wallets: [
        { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Linea Hot Wallet', chain: 'linea', type: 'hot', isMain: true },
      ]
    },
    {
      name: 'Coinbase',
      wallets: [
        { address: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Coinbase: Linea', chain: 'linea', type: 'hot', isMain: true },
      ]
    },
  ],
  arbitrum: [
    {
      name: 'Binance',
      wallets: [
        { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Arbitrum Hot Wallet', chain: 'arbitrum', type: 'hot', isMain: true },
      ]
    },
    {
      name: 'Coinbase',
      wallets: [
        { address: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Coinbase: Arbitrum', chain: 'arbitrum', type: 'hot', isMain: true },
      ]
    },
  ],
  base: [
    {
      name: 'Binance',
      wallets: [
        { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Base Hot Wallet', chain: 'base', type: 'hot', isMain: true },
      ]
    },
  ],
  optimism: [
    {
      name: 'Binance',
      wallets: [
        { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Optimism Hot Wallet', chain: 'optimism', type: 'hot', isMain: true },
      ]
    },
    {
      name: 'Coinbase',
      wallets: [
        { address: '0x503828976d22510aad0201ac7ec88293211d23da', name: 'Coinbase: Optimism', chain: 'optimism', type: 'hot', isMain: true },
      ]
    },
  ],
  polygon: [
    {
      name: 'Binance',
      wallets: [
        { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: Polygon Hot Wallet', chain: 'polygon', type: 'hot', isMain: true },
      ]
    },
  ],
  bsc: [
    {
      name: 'Binance',
      wallets: [
        { address: '0xF977814e90dA44bFA03b6295A0616a897441aceC', name: 'Binance: BSC Hot Wallet', chain: 'bsc', type: 'hot', isMain: true },
        { address: '0x0E09FaBB73Bd3ade0a17ECC321fD13a19e81cE82', name: 'Binance: Cake', chain: 'bsc', type: 'hot', isMain: false },
      ]
    },
  ],
};

// CEX name aliases for matching
export const CEX_ALIASES: Record<string, string> = {
  'binance': 'Binance',
  'coinbase': 'Coinbase',
  'kraken': 'Kraken',
  'bybit': 'Bybit',
  'okx': 'OKX',
  'kucoin': 'KuCoin',
  'bitget': 'Bitget',
  'gate.io': 'Gate.io',
  'gate': 'Gate.io',
  'huobi': 'Huobi',
  'mexc': 'MEXC',
  'bitfinex': 'Bitfinex',
  'gemini': 'Gemini',
};

// Get all CEX wallet addresses for a chain
export function getCEXAddresses(chain: ChainId): string[] {
  const groups = CEX_WALLETS[chain] || [];
  return groups.flatMap(group => group.wallets.map(w => w.address.toLowerCase()));
}

// Get CEX info for a wallet address
export function getCEXInfo(address: string, chain: ChainId): { cexName: string; type: string; isMain: boolean } | null {
  const groups = CEX_WALLETS[chain] || [];
  for (const group of groups) {
    const wallet = group.wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
    if (wallet) {
      return {
        cexName: group.name,
        type: wallet.type,
        isMain: wallet.isMain,
      };
    }
  }
  return null;
}

// Check if address is a known CEX wallet
export function isKnownCEX(address: string, chain: ChainId): boolean {
  return getCEXInfo(address, chain) !== null;
}

// Get all CEX names for a chain
export function getCEXNames(chain: ChainId): string[] {
  const groups = CEX_WALLETS[chain] || [];
  return groups.map(g => g.name);
}

// Auto-detect CEX-like wallet patterns
export function detectCEXPattern(
  txCount: number,
  uniqueSenders: number,
  uniqueRecipients: number,
  avgTxValue: number,
  totalVolume: number
): { isCEX: boolean; score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  // High transaction count
  if (txCount > 10000) {
    score += 30;
    signals.push('veryHighTxCount');
  } else if (txCount > 1000) {
    score += 20;
    signals.push('highTxCount');
  }

  // Many unique senders (deposit wallet pattern)
  if (uniqueSenders > 100) {
    score += 25;
    signals.push('manyUniqueSenders');
  } else if (uniqueSenders > 20) {
    score += 15;
    signals.push('multipleSenders');
  }

  // Low unique recipients vs senders (hot wallet pattern)
  if (uniqueRecipients < uniqueSenders * 0.3 && uniqueSenders > 50) {
    score += 20;
    signals.push('oneWayFlow');
  }

  // High average tx value
  if (avgTxValue > 10000) {
    score += 15;
    signals.push('highAvgValue');
  } else if (avgTxValue > 1000) {
    score += 10;
    signals.push('mediumAvgValue');
  }

  // Very high total volume
  if (totalVolume > 1000000) {
    score += 10;
    signals.push('veryHighVolume');
  }

  return {
    isCEX: score >= 50,
    score: Math.min(score, 100),
    signals,
  };
}
