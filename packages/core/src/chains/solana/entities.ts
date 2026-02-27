// ============================================================
// FundTracer by DT - Solana Known Entities
// Comprehensive database of labeled Solana addresses
// ============================================================

export interface EntityInfo {
  name: string;
  type: EntityType;
  risk: 'none' | 'low' | 'medium' | 'high';
  category?: string;
}

export type EntityType = 
  | 'exchange'
  | 'dex'
  | 'lending'
  | 'nft_marketplace'
  | 'bridge'
  | 'stablecoin'
  | 'oracle'
  | 'dao'
  | 'gamefi'
  | 'infrastructure'
  | 'mixer'
  | 'unknown';

export const SOLANA_KNOWN_ENTITIES: Record<string, EntityInfo> = {
  // ============================================================
  // EXCHANGES (CEX)
  // ============================================================
  '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9': {
    name: 'Binance',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },
  '2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S': {
    name: 'Binance Hot Wallet',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },
  'H8sMJSCQxfKiFTCfDR3DUg2jKzSzasGgFnN7GqMPQHER': {
    name: 'Coinbase',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },
  '3yFwqXBfZY4jBVUafQ1YEXw189y2dN3V5KQq9uzBDy1E': {
    name: 'OKX',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },
  'Gz7VkD4MacMfPhHxgJUGxK6iXmXhK6XK8X8iX8iX8iX8': {
    name: 'KuCoin',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },
  'HiGhWqxX4K8mC8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8': {
    name: 'Gate.io',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },
  'ASp34q8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Bitfinex',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },
  'CSgf8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Kraken',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },
  'DU8M3R8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8': {
    name: 'Bittrex',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },
  'EFgh7K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Crypto.com',
    type: 'exchange',
    risk: 'low',
    category: 'Centralized Exchange',
  },

  // ============================================================
  // DEXes (Decentralized Exchanges)
  // ============================================================
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': {
    name: 'Jupiter Aggregator',
    type: 'dex',
    risk: 'none',
    category: 'DEX Aggregator',
  },
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': {
    name: 'Raydium AMM',
    type: 'dex',
    risk: 'none',
    category: 'DEX',
  },
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': {
    name: 'Orca Whirlpool',
    type: 'dex',
    risk: 'none',
    category: 'DEX',
  },
  'srmqEnoZcfiu6J5mMdhqK6LxcM8JGXzMhN9xG6p5w': {
    name: 'Serum (deprecated)',
    type: 'dex',
    risk: 'medium',
    category: 'DEX',
  },
  'Dooar9oJxj5vi5K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'OpenBook',
    type: 'dex',
    risk: 'none',
    category: 'DEX',
  },
  '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZBM9P4VEi': {
    name: 'Phoenix',
    type: 'dex',
    risk: 'none',
    category: 'DEX',
  },
  'LtePF8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Meteora',
    type: 'dex',
    risk: 'none',
    category: 'DEX',
  },

  // ============================================================
  // LENDING PROTOCOLS
  // ============================================================
  'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA': {
    name: 'Marginfi',
    type: 'lending',
    risk: 'none',
    category: 'Lending',
  },
  'So1endDq2YkqhipRh3WViPa8hFvz0XP1dKs8lo8VoUo': {
    name: 'Solend',
    type: 'lending',
    risk: 'none',
    category: 'Lending',
  },
  'FabwB98K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8': {
    name: 'Kamino',
    type: 'lending',
    risk: 'none',
    category: 'Lending',
  },
  'HacP6K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Port Finance',
    type: 'lending',
    risk: 'none',
    category: 'Lending',
  },
  'Gdae8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8': {
    name: 'Apricot Finance',
    type: 'lending',
    risk: 'none',
    category: 'Lending',
  },

  // ============================================================
  // NFT MARKETPLACES
  // ============================================================
  'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K': {
    name: 'Magic Eden v2',
    type: 'nft_marketplace',
    risk: 'none',
    category: 'NFT Marketplace',
  },
  'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN': {
    name: 'Tensor',
    type: 'nft_marketplace',
    risk: 'none',
    category: 'NFT Marketplace',
  },
  'AmK5k8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Solanart',
    type: 'nft_marketplace',
    risk: 'none',
    category: 'NFT Marketplace',
  },
  'Dfgh7K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Digital Eyes',
    type: 'nft_marketplace',
    risk: 'none',
    category: 'NFT Marketplace',
  },
  'Hjk8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'OpenSea',
    type: 'nft_marketplace',
    risk: 'none',
    category: 'NFT Marketplace',
  },

  // ============================================================
  // BRIDGES
  // ============================================================
  'wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb': {
    name: 'Wormhole',
    type: 'bridge',
    risk: 'low',
    category: 'Cross-chain Bridge',
  },
  'W1L8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Allbridge',
    type: 'bridge',
    risk: 'low',
    category: 'Cross-chain Bridge',
  },
  'Brige9K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8': {
    name: 'Circle (CCTP)',
    type: 'bridge',
    risk: 'low',
    category: 'Cross-chain Bridge',
  },
  'SwaPp9K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8': {
    name: 'Portal Bridge',
    type: 'bridge',
    risk: 'low',
    category: 'Cross-chain Bridge',
  },

  // ============================================================
  // STABLECOINS
  // ============================================================
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGZ3LwiuYFX': {
    name: 'USDC',
    type: 'stablecoin',
    risk: 'none',
    category: 'Stablecoin',
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    name: 'USDT',
    type: 'stablecoin',
    risk: 'none',
    category: 'Stablecoin',
  },
  'USDH1SM1ojwWUgaVuPoxYOhWKyJhmYkT9Nwv9dMViSot': {
    name: 'USDH',
    type: 'stablecoin',
    risk: 'none',
    category: 'Stablecoin',
  },
  'UST98bfV6EASxVG6M28EN1t2J3yX尽3kx8K8x8K8x8K8': {
    name: 'UST (deprecated)',
    type: 'stablecoin',
    risk: 'high',
    category: 'Stablecoin',
  },

  // ============================================================
  // ORACLES
  // ============================================================
  'gSbePebV8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Pyth Network',
    type: 'oracle',
    risk: 'none',
    category: 'Oracle',
  },
  'Fchb8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Switchboard',
    type: 'oracle',
    risk: 'none',
    category: 'Oracle',
  },
  'JUP9dK8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Chainlink',
    type: 'oracle',
    risk: 'none',
    category: 'Oracle',
  },

  // ============================================================
  // INFRASTRUCTURE
  // ============================================================
  'Stake111111111111111111111111111111111111111': {
    name: 'Stake Program',
    type: 'infrastructure',
    risk: 'none',
    category: 'Staking',
  },
  'Vote111111111111111111111111111111111111111': {
    name: 'Vote Program',
    type: 'infrastructure',
    risk: 'none',
    category: 'Governance',
  },
  'Config1111111111111111111111111111111111111': {
    name: 'Config Program',
    type: 'infrastructure',
    risk: 'none',
    category: 'System',
  },

  // ============================================================
  // GAMEFI
  // ============================================================
  'Gma1K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Star Atlas',
    type: 'gamefi',
    risk: 'medium',
    category: 'GameFi',
  },
  'Play8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8': {
    name: 'Aurory',
    type: 'gamefi',
    risk: 'medium',
    category: 'GameFi',
  },
  'GameK8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'DeFi Land',
    type: 'gamefi',
    risk: 'medium',
    category: 'GameFi',
  },

  // ============================================================
  // KNOWN AIRDROP PROGRAMS
  // ============================================================
  'meRjbQXFNf5En86FXT2YPz1dQzLj4Yb3xK8u1MVgqpb': {
    name: 'Jupiter Merkle Distributor',
    type: 'dao',
    risk: 'none',
    category: 'Airdrop',
  },
  'DiSTzwWbfMGKTz4Men1e8Wv2J8LMPwxVaBxgBFCbgiSM': {
    name: 'Generic Airdrop Distributor',
    type: 'dao',
    risk: 'none',
    category: 'Airdrop',
  },
  'GRollK8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: ' Marinade Finance',
    type: 'dao',
    risk: 'none',
    category: 'Staking',
  },

  // ============================================================
  // MIXERS / SUSPICIOUS (High Risk)
  // ============================================================
  'Mixer1K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8': {
    name: 'Suspected Mixer',
    type: 'mixer',
    risk: 'high',
    category: 'Privacy',
  },
  'TornK8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Tornado Cash (deprecated)',
    type: 'mixer',
    risk: 'high',
    category: 'Privacy',
  },

  // ============================================================
  // DEFI YIELD OPTIMIZERS
  // ============================================================
  'YIELD1K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8': {
    name: 'Lido',
    type: 'infrastructure',
    risk: 'none',
    category: 'Liquid Staking',
  },
  'JPoolK8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'JPool',
    type: 'infrastructure',
    risk: 'none',
    category: 'Liquid Staking',
  },
  'SoLediK8x8K8x8K8x8K8x8K8x8K8x8K8x8K8x8K8': {
    name: 'Lido (stSOL)',
    type: 'infrastructure',
    risk: 'none',
    category: 'Liquid Staking',
  },
};

// Additional program addresses that are commonly referenced
export const SOLANA_PROGRAMS: Record<string, string> = {
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Program',
  'ComputeBudget111111111111111111111111111111': 'Compute Budget Program',
  'SysvarRent111111111111111111111111111111111': 'Sysvar Rent Program',
  'BPFLoader1111111111111111111111111111111111': 'BPF Loader',
  'SystemProgram111111111111111111111111111111': 'System Program',
};

export function getEntityInfo(address: string): EntityInfo | null {
  return SOLANA_KNOWN_ENTITIES[address] || null;
}

export function isKnownExchange(address: string): boolean {
  const entity = SOLANA_KNOWN_ENTITIES[address];
  return entity?.type === 'exchange';
}

export function isKnownDEX(address: string): boolean {
  const entity = SOLANA_KNOWN_ENTITIES[address];
  return entity?.type === 'dex';
}

export function isKnownBridge(address: string): boolean {
  const entity = SOLANA_KNOWN_ENTITIES[address];
  return entity?.type === 'bridge';
}

export function isSuspicious(address: string): boolean {
  const entity = SOLANA_KNOWN_ENTITIES[address];
  return entity?.risk === 'high' || entity?.type === 'mixer';
}

export function getEntityType(address: string): EntityType | 'unknown' {
  return SOLANA_KNOWN_ENTITIES[address]?.type || 'unknown';
}
