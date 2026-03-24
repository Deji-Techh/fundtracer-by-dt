export type ChainId =
  | 'ethereum'
  | 'linea'
  | 'arbitrum'
  | 'base'
  | 'optimism'
  | 'polygon'
  | 'bsc';

export interface WalletAnalysisOptions {
  chain: ChainId;
  includeTransactions?: boolean;
  includeTokens?: boolean;
  includeNfts?: boolean;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  gasUsed?: string;
  gasPrice?: string;
  blockNumber: number;
  methodId?: string;
  methodName?: string;
}

export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: string;
  balanceUsd?: number;
  price?: number;
  logo?: string;
}

export interface Wallet {
  address: string;
  chain: ChainId;
  balance: string;
  balanceUsd?: number;
  isContract: boolean;
  firstSeen?: number;
  lastSeen?: number;
  txCount: number;
  riskScore?: number;
  labels?: string[];
}

export interface WalletAnalysis extends Wallet {
  transactions?: Transaction[];
  tokens?: Token[];
  nfts?: any[];
  projectsInteracted?: string[];
  riskFactors?: string[];
}

export interface FundingNode {
  address: string;
  amount: string;
  amountUsd?: number;
  fundedBy: string;
  timestamp: number;
  direction: 'in' | 'out';
  totalValue?: string;
  totalValueInEth?: number;
  txCount?: number;
  type?: string;
}

export interface FundingTreeOptions {
  maxDepth?: number;
  maxNodes?: number;
  includeLabels?: boolean;
}

export interface FundingTree {
  root: string;
  chain: ChainId;
  nodes: FundingNode[];
  edges: Array<{ from: string; to: string; amount: string }>;
}

export interface CompareOptions {
  chain: ChainId;
  includeSharedContracts?: boolean;
  includeSharedTokens?: boolean;
}

export interface CompareResult {
  addresses: string[];
  sharedContracts: string[];
  sharedTokens: string[];
  transactionOverlap: number;
  fundingOverlap: Array<{ from: string; to: string }>;
}

export interface SybilResult {
  address: string;
  chain: ChainId;
  isSybil: boolean;
  confidence: number;
  clusterSize?: number;
  indicators: string[];
  relatedAddresses: string[];
  description?: string;
}

export interface ContractInfo {
  address: string;
  chain: ChainId;
  name?: string;
  isVerified: boolean;
  ABI?: any;
  sourceCode?: string;
  compilerVersion?: string;
  transactionCount?: number;
}

export interface SafetyResult {
  address: string;
  chain: ChainId;
  isMalicious: boolean;
  score: number;
  categories: string[];
  description?: string;
  firstSeen?: number;
  lastSeen?: number;
}

export interface ApiError {
  error: string;
  message?: string;
  hint?: string;
  status?: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface GasPriceLevel {
  gasPrice: number;
  time: string;
}

export interface GasPrices {
  chain: ChainId;
  chainId: number;
  unit: string;
  timestamp: string;
  low: GasPriceLevel;
  medium: GasPriceLevel;
  high: GasPriceLevel;
}

export interface TransactionInfo {
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: string | null;
  chain: ChainId;
  chainId: number;
  from: { address: string; label?: string; type?: string };
  to: { address: string; label?: string; type?: string } | null;
  value: string;
  valueInEth: string;
  gasUsed: string | null;
  effectiveGasPrice: string | null;
  gasCostInEth: string | null;
  maxFeePerGas: string | null;
  maxPriorityFeePerGas: string | null;
  nonce: number;
  transactionIndex: number;
  status: 'success' | 'failed' | 'pending';
  type: number;
  input: string;
  inputMethod: string | null;
  logs: any[];
  logsBloom: string | null;
  gasLimit: string | null;
}

export interface BatchResult {
  address: string;
  analyzed: boolean;
  totalReceived?: number;
  totalSent?: number;
  transactionCount?: number;
  uniqueAddresses?: number;
  activityDays?: number;
  riskScore?: number;
  riskLevel?: string;
  error?: string;
}

export interface BatchAnalysisResult {
  result: BatchResult[];
  meta: {
    total: number;
    analyzed: number;
    failed: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  rateLimit?: RateLimitInfo;
}
