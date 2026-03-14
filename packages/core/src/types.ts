// ============================================================
// FundTracer by DT - Core Types
// ============================================================

/** Supported blockchain networks */
export type ChainId = 'ethereum' | 'linea' | 'arbitrum' | 'base' | 'optimism' | 'polygon' | 'bsc';

/** Chain configuration */
export interface ChainConfig {
    id: ChainId;
    chainId: number; // EIP-155 Chain ID
    name: string;
    symbol: string;
    explorer: string;
    apiUrl: string;
    enabled: boolean;
}

/** Provider type - free vs paid */
export type ProviderTier = 'free' | 'paid';

/** Transaction status */
export type TxStatus = 'success' | 'failed' | 'pending';

/** Transaction type category */
export type TxCategory =
    | 'transfer'
    | 'contract_creation'
    | 'contract_call'
    | 'token_transfer'
    | 'nft_transfer'
    | 'dex_swap'
    | 'bridge'
    | 'lending'
    | 'staking'
    | 'unknown';

/** Normalized transaction data */
export interface Transaction {
    hash: string;
    blockNumber: number;
    timestamp: number;
    from: string;
    to: string | null;
    value: string;
    valueInEth: number;
    gasUsed: string;
    gasPrice: string;
    gasCostInEth: number;
    status: TxStatus;
    category: TxCategory;
    methodId?: string;
    methodName?: string;
    isIncoming: boolean;
    tokenTransfers?: TokenTransfer[];
}

/** Token transfer event */
export interface TokenTransfer {
    tokenAddress: string;
    tokenName: string;
    tokenSymbol: string;
    tokenDecimals: number;
    from: string;
    to: string;
    value: string;
    valueFormatted: number;
}

/** Wallet information and stats */
export interface WalletInfo {
    address: string;
    chain: ChainId;
    balance: string;
    balanceInEth: number;
    txCount: number;
    firstTxTimestamp?: number;
    lastTxTimestamp?: number;
    isContract: boolean;
    label?: string;
    isInfrastructure?: boolean;
    infrastructureType?: string; // 'bridge', 'exchange', 'mixer'
}

/** Funding tree node */
export interface FundingNode {
    address: string;
    label?: string;
    depth: number;
    direction: 'source' | 'destination';
    totalValue: string;
    totalValueInEth: number;
    txCount: number;
    firstTx?: Transaction;
    children: FundingNode[];
    suspiciousScore: number;
    suspiciousReasons: string[];
    isInfrastructure?: boolean;
    entityType?: 'cex' | 'dex' | 'bridge' | 'wallet' | 'mixer' | 'contract' | 'other';
}

/** Funding tree configuration */
export interface FundingTreeConfig {
    maxDepth: number;
    direction: 'sources' | 'destinations' | 'both';
    minValueEth?: number;
    timeRange?: {
        start?: number;
        end?: number;
    };
}

/** Suspicious activity severity */
export type SuspiciousSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Suspicious activity indicator */
export interface SuspiciousIndicator {
    type: SuspiciousPatternType;
    severity: SuspiciousSeverity;
    description: string;
    evidence: string[];
    score: number;
}

/** Types of suspicious patterns */
export type SuspiciousPatternType =
    | 'sybil_farming'
    | 'wash_trading'
    | 'rapid_movement'
    | 'dust_attack'
    | 'same_block_activity'
    | 'fresh_wallet'
    | 'circular_flow'
    | 'known_bad_actor';

/** Complete wallet analysis result */
export interface AnalysisResult {
    wallet: WalletInfo;
    transactions: Transaction[];
    fundingSources: FundingNode;
    fundingDestinations: FundingNode;
    suspiciousIndicators: SuspiciousIndicator[];
    overallRiskScore: number;
    riskLevel: SuspiciousSeverity;
    projectsInteracted: ProjectInteraction[];
    sameBlockTransactions: SameBlockGroup[];
    summary: AnalysisSummary;
}

/** Project/protocol interaction */
export interface ProjectInteraction {
    contractAddress: string;
    projectName?: string;
    category: 'defi' | 'nft' | 'bridge' | 'dao' | 'gaming' | 'unknown';
    interactionCount: number;
    totalValueInEth: number;
    firstInteraction: number;
    lastInteraction: number;
}

/** Transactions in same block */
export interface SameBlockGroup {
    blockNumber: number;
    timestamp: number;
    transactions: Transaction[];
    isSuspicious: boolean;
    reason?: string;
}

/** Analysis summary stats */
export interface AnalysisSummary {
    totalTransactions: number;
    successfulTxs: number;
    failedTxs: number;
    totalValueSentEth: number;
    totalValueReceivedEth: number;
    uniqueInteractedAddresses: number;
    topFundingSources: { address: string; valueEth: number }[];
    topFundingDestinations: { address: string; valueEth: number }[];
    activityPeriodDays: number;
    averageTxPerDay: number;
}

/** Multi-wallet comparison result */
export interface MultiWalletResult {
    wallets: AnalysisResult[];
    commonFundingSources: string[];
    commonDestinations: string[];
    sharedProjects: ProjectInteraction[];
    directTransfers: Transaction[];
    correlationScore: number;
    isSybilLikely: boolean;
}

/** Filter options for queries */
export interface FilterOptions {
    timeRange?: {
        start?: number; // Unix timestamp
        end?: number;
    };
    minValue?: number;
    maxValue?: number;
    categories?: TxCategory[];
    status?: TxStatus[];
    addressFilter?: string[]; // Only include txs with these addresses
    limit?: number; // Maximum number of transactions to fetch
}

/** API response from block explorers */
export interface ExplorerApiResponse<T> {
    status: string;
    message: string;
    result: T;
}

/** Progress callback for long operations */
export type ProgressCallback = (progress: {
    stage: string;
    current: number;
    total: number;
    message: string;
}) => void;

/** Contract interactor info */
export interface ContractInteractor {
    address: string;
    interactionCount: number;
    totalValueInEth: number;
    totalValueOutEth: number;
    firstInteraction: number;
    lastInteraction: number;
    fundingSource?: string;
}

/** Contract analysis result */
export interface ContractAnalysisResult {
    contractAddress: string;
    chain: ChainId;
    totalInteractors: number;
    interactors: ContractInteractor[];
    sharedFundingGroups: {
        fundingSource: string;
        wallets: string[];
        count: number;
    }[];
    suspiciousPatterns: SuspiciousIndicator[];
    riskScore: number;
}
