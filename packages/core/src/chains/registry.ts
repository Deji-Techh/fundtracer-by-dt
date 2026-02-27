// ============================================================
// FundTracer by DT - Chain Registry
// Supports EVM chains and Solana
// ============================================================

import { ChainConfig, ChainAdapter } from './types.js';
import { SolanaAdapter } from './solana/index.js';

export const SUPPORTED_CHAINS = {
  ethereum: { type: 'evm' as const, id: '1', name: 'Ethereum', symbol: 'ETH', explorer: 'https://etherscan.io', enabled: true },
  arbitrum: { type: 'evm' as const, id: '42161', name: 'Arbitrum', symbol: 'ETH', explorer: 'https://arbiscan.io', enabled: true },
  base: { type: 'evm' as const, id: '8453', name: 'Base', symbol: 'ETH', explorer: 'https://basescan.org', enabled: true },
  optimism: { type: 'evm' as const, id: '10', name: 'Optimism', symbol: 'ETH', explorer: 'https://optimistic.etherscan.io', enabled: true },
  polygon: { type: 'evm' as const, id: '137', name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com', enabled: true },
  linea: { type: 'evm' as const, id: '59144', name: 'Linea', symbol: 'ETH', explorer: 'https://lineascan.build', enabled: true },
  solana: { type: 'solana' as const, id: 'mainnet-beta', name: 'Solana', symbol: 'SOL', explorer: 'https://solscan.io', enabled: true },
} as const;

export type SupportedChain = keyof typeof SUPPORTED_CHAINS;

const adapterCache = new Map<string, ChainAdapter>();

export function getAdapter(chain: SupportedChain): ChainAdapter {
  const cached = adapterCache.get(chain);
  if (cached) return cached;

  const config = SUPPORTED_CHAINS[chain];
  
  if (config.type === 'solana') {
    const adapter = new SolanaAdapter();
    adapterCache.set(chain, adapter);
    return adapter;
  }
  
  throw new Error(`EVM adapter not implemented yet. Use existing EVM infrastructure.`);
}

export function isSupportedChain(chain: string): chain is SupportedChain {
  return chain in SUPPORTED_CHAINS;
}

export function getChainConfig(chain: SupportedChain): ChainConfig {
  const config = SUPPORTED_CHAINS[chain];
  return {
    id: config.id,
    type: config.type,
    chainId: config.id,
    name: config.name,
    symbol: config.symbol,
    explorer: config.explorer,
    apiUrl: '',
    enabled: config.enabled,
  };
}

export function getEnabledChains(): ChainConfig[] {
  return Object.entries(SUPPORTED_CHAINS)
    .filter(([_, config]) => config.enabled)
    .map(([key, config]) => ({
      id: config.id,
      type: config.type,
      chainId: config.id,
      name: config.name,
      symbol: config.symbol,
      explorer: config.explorer,
      apiUrl: '',
      enabled: config.enabled,
    }));
}

export function detectChainType(address: string): 'evm' | 'solana' | null {
  if (!address) return null;
  
  if (address.endsWith('.sol')) return 'solana';
  if (address.endsWith('.eth')) return 'evm';
  
  if (address.startsWith('0x') && address.length === 42) {
    return 'evm';
  }
  
  if (address.length >= 32 && address.length <= 44) {
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    if ([...address].every(c => base58Chars.includes(c))) {
      return 'solana';
    }
  }
  
  return null;
}
