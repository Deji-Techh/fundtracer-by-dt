// ============================================================
// FundTracer by DT - Chain Types
// Universal chain interface for EVM and Solana support
// ============================================================

export type ChainType = 'evm' | 'solana';

export interface ChainIdentifier {
  type: ChainType;
  id: string;
  name: string;
}

export interface ChainConfig {
  id: string;
  type: ChainType;
  chainId: string;
  name: string;
  symbol: string;
  explorer: string;
  apiUrl: string;
  enabled: boolean;
}

export interface WalletInfo {
  address: string;
  chain: ChainIdentifier;
  balance: string;
  nativeSymbol: string;
  isContract: boolean;
  firstSeen: number | null;
  txCount: number | null;
  labels: string[];
}

export interface TokenTransfer {
  from: string;
  to: string;
  tokenAddress: string;
  symbol: string;
  decimals: number;
  amount: string;
  usdValue?: string;
}

export interface UnifiedTransaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  timestamp: number;
  fee: string;
  feePayer?: string;
  status: 'success' | 'failed';
  chain: ChainIdentifier;
  tokenTransfers: TokenTransfer[];
  programInteractions?: string[];
  type?: string;
  source?: string;
  raw: any;
}

export interface UnifiedTokenBalance {
  address: string;
  symbol: string;
  name: string;
  balance: string;
  decimals: number;
  price: number | null;
  chain: ChainIdentifier;
}

export interface UnifiedNFT {
  address: string;
  tokenId: string;
  name: string;
  imageUrl: string | null;
  chain: ChainIdentifier;
}

export interface TxQueryOpts {
  limit?: number;
  before?: string;
  after?: number;
}

export interface FundingNode {
  address: string;
  depth: number;
  label: string | null;
  amount: number;
  fundedBy: string | null;
  timestamp: number | null;
  type: 'sol_transfer' | 'fee_payer' | 'token_transfer';
}

export interface FundingEdge {
  from: string;
  to: string;
  amount: number;
  timestamp: number | null;
  type: string;
}

export interface FundingTree {
  root: string;
  nodes: FundingNode[];
  edges: FundingEdge[];
  ultimateSource: {
    address: string;
    label: string;
    confidence: number;
  } | null;
}

export interface RiskSignal {
  id: string;
  name: string;
  weight: number;
  detected: boolean;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskAssessment {
  score: number;
  signals: RiskSignal[];
  chain: ChainIdentifier;
}

export interface SybilCluster {
  id: string;
  type: string;
  confidence: number;
  wallets: string[];
  pivot: string | null;
  signal: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ChainAdapter {
  chainType: ChainType;
  chainId: string;
  isValidAddress(address: string): boolean;
  getWalletInfo(address: string): Promise<WalletInfo>;
  getTransactions(address: string, opts?: TxQueryOpts): Promise<UnifiedTransaction[]>;
  getTokenBalances(address: string): Promise<UnifiedTokenBalance[]>;
  getNFTs(address: string): Promise<UnifiedNFT[]>;
  getFundingSources(address: string, depth: number): Promise<FundingTree>;
  getRiskScore(address: string): Promise<RiskAssessment>;
  detectSybilClusters(addresses: string[]): Promise<SybilCluster[]>;
}
