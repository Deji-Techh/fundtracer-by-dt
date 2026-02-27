// ============================================================
// FundTracer by DT - Core Package Entry
// ============================================================

// Types
export * from './types.js';

// Chain configuration (legacy EVM)
export { CHAINS, getChainConfig as getLegacyChainConfig } from './chains.js';

// Chain abstraction (EVM + Solana) - must come after legacy to override
export {
  ChainIdentifier,
  ChainAdapter,
  UnifiedTransaction,
  UnifiedTokenBalance,
  UnifiedNFT,
  FundingTree,
  FundingNode,
  FundingEdge,
  RiskAssessment,
  RiskSignal,
  SybilCluster,
  TxQueryOpts,
  SUPPORTED_CHAINS,
  getAdapter,
  isSupportedChain,
  getChainConfig as getChainConfigById,
  getEnabledChains as getEnabledChainList,
  detectChainType,
  SolanaAdapter,
} from './chains/index.js';

// Providers
export * from './providers/index.js';

// Analyzers
export * from './analyzer/index.js';
