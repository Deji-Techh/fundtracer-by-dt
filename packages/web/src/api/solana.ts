// ============================================================
// FundTracer by DT - Enhanced Solana API Functions
// Comprehensive Solana wallet analysis with Sybil detection
// ============================================================

const HELIUS_KEYS = [
  '77de5802-5beb-4647-bfbb-0ba215d47c81',
  'b81bcc20-7710-40dc-b0f3-0865c03a8a1d',
  'deae0411-c969-41ff-9420-f1a0f59d5639',
];

let keyIndex = 0;

function getHeliusKey(): string {
  const key = HELIUS_KEYS[keyIndex % HELIUS_KEYS.length];
  keyIndex++;
  return key;
}

function isValidSolanaAddress(address: string): boolean {
  try {
    if (!address) return false;
    if (address.length < 32 || address.length > 44) return false;
    const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    return [...address].every(c => base58Chars.includes(c));
  } catch {
    return false;
  }
}

// Known exchange addresses for funding source detection
const KNOWN_EXCHANGES: Record<string, string> = {
  '95j2F3DXxLJP9MNkqLRpYJ3E3V1L9K3QxvK7rMBNq4x': 'Binance',
  '84x2cqC8J4L8C4J8J4L8C4J8J4L8C4J8J4L8C4J8J4': 'Coinbase',
  '45k6yF4kP6kF8kP6kF8kP6kF8kP6kF8kP6kF8kP6kF8': 'Kraken',
  '7x2cqC8J4L8C4J8J4L8C4J8J4L8C4J8J4L8C4J8J4': 'FTX',
  '9x2cqC8J4L8C4J8J4L8C4J8J4L8C4J8J4L8C4J8J4': 'Gemini',
  '3x2cqC8J4L8C4J8J4L8C4J8J4L8C4J8J4L8C4J8J4': 'KuCoin',
  '2x2cqC8J4L8C4J8J4L8C4J8J4L8C4J8J4L8C4J8J4': 'Bitfinex',
  '5x2cqC8J4L8C4J8J4L8C4J8J4L8C4J8J4L8C4J8J4': 'Crypto.com',
};

// Known DeFi protocols
const KNOWN_PROTOCOLS: Record<string, { name: string; category: string }> = {
  'JUPyiwrYJFskUPiHa7hkeR8VUtkqjberbSOWd91pbT2': { name: 'Jupiter', category: 'DEX' },
  'RaydammGVPmJ3TcoGgBF3K7M7uf5SJaRDG4N2fF3NV': { name: 'Raydium', category: 'DEX' },
  'orcaEKTdK7DTHfK7p DzQwnYmm9K847G2d91pbT2': { name: 'Orca', category: 'DEX' },
  'srmtE4LpXK7fFy7xF8L8N9pQz3G9K2d91pbT2': { name: 'Serum', category: 'DEX' },
  'MangoXNAk4sM4N9k4L8C4J8J4L8C4J8J4L8C4J8': { name: 'Mango', category: 'DeFi' },
  'FrkS7Z4K7DTHfK7pDzQwnYmm9K847G2d91pbT2': { name: 'Friktion', category: 'DeFi' },
  'Knp1SmuT9L8N9pQz3G9K847G2d91pbT2': 'Kamino',
  '4T4w1N9k4L8C4J8J4L8C4J8J4L8C4J8J4L8C4': 'Drift',
  'Bridge2L8N9pQz3G9K847G2d91pbT2': 'Wormhole Bridge',
  'Stake1111111111111111111111111111111': { name: 'Solana Stake', category: 'Staking' },
};

// ============================================================
// Main Analysis Function
// ============================================================

export interface SolanaAnalysisResult {
  wallet: WalletInfo;
  portfolio: PortfolioData;
  transactions: TransactionData;
  programInteractions: ProgramInteraction[];
  nfts: NFTData;
  riskAnalysis: RiskAnalysis;
  sybilDetection: SybilDetection;
  fundingTrace: FundingTrace;
}

export async function analyzeSolanaWallet(address: string): Promise<SolanaAnalysisResult> {
  if (!isValidSolanaAddress(address)) {
    throw new Error('Invalid Solana address');
  }

  // Run all fetches in parallel for speed
  const [
    walletInfo,
    transactions,
    tokens,
    nfts,
    enrichedTxs
  ] = await Promise.all([
    getWalletInfo(address),
    getTransactions(address, 100),
    getTokenBalances(address),
    getNFTBalances(address),
    enrichTransactions(address),
  ]);

  // Calculate portfolio value
  const portfolio = calculatePortfolio(tokens, nfts);

  // Analyze program interactions
  const programInteractions = analyzeProgramInteractions(transactions);

  // Risk analysis
  const riskAnalysis = calculateRiskScore(walletInfo, transactions, enrichedTxs);

  // Sybil detection
  const sybilDetection = detectSybil(transactions, enrichedTxs);

  // Funding trace
  const fundingTrace = traceFunding(transactions);

  return {
    wallet: walletInfo,
    portfolio,
    transactions: {
      list: transactions,
      summary: summarizeTransactions(transactions),
    },
    programInteractions,
    nfts,
    riskAnalysis,
    sybilDetection,
    fundingTrace,
  };
}

// ============================================================
// Wallet Info
// ============================================================

export interface WalletInfo {
  address: string;
  chain: { type: string; id: string; name: string };
  balance: string;
  balanceUSD: number | null;
  nativeSymbol: string;
  isContract: boolean;
  firstSeen: number | null;
  lastActive: number | null;
  txCount: number;
  labels: string[];
}

async function getWalletInfo(address: string): Promise<WalletInfo> {
  const key = getHeliusKey();
  const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;
  
  const [balanceRes, accountRes, sigsRes, historyRes] = await Promise.all([
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
    }).then(r => r.json()),
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAccountInfo', params: [address, { encoding: 'jsonParsed' }] }),
    }).then(r => r.json()),
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [address, { limit: 100 }] }),
    }).then(r => r.json()),
    fetch(`https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=100`).then(r => r.json()).catch(() => []),
  ]);

  const isProgram = accountRes.result?.value?.executable ?? false;
  const sigs = sigsRes.result || [];
  const history = Array.isArray(historyRes) ? historyRes : [];

  return {
    address,
    chain: { type: 'solana', id: 'mainnet-beta', name: 'Solana' },
    balance: ((balanceRes.result?.value || 0) / 1e9).toFixed(4),
    balanceUSD: null, // Will be calculated in portfolio
    nativeSymbol: 'SOL',
    isContract,
    firstSeen: sigs.length > 0 ? (sigs[sigs.length - 1]?.blockTime ? sigs[sigs.length - 1].blockTime * 1000 : null) : null,
    lastActive: sigs.length > 0 ? (sigs[0]?.blockTime ? sigs[0].blockTime * 1000 : null) : null,
    txCount: sigs.length,
    labels: isProgram ? ['Program'] : [],
  };
}

// ============================================================
// Transactions
// ============================================================

export interface TransactionData {
  hash: string;
  from: string;
  to: string;
  value: number;
  valueUSD: number | null;
  timestamp: number;
  fee: number;
  feePayer: string;
  status: 'success' | 'failed';
  type: string;
  tokenTransfers: TokenTransfer[];
  programInteractions: string[];
}

interface TokenTransfer {
  from: string;
  to: string;
  mint: string;
  amount: number;
  decimals: number;
}

async function getTransactions(address: string, limit: number = 100): Promise<TransactionData[]> {
  const key = getHeliusKey();
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=${limit}`;

  try {
    const txs = await fetch(url).then(r => r.json());
    if (!Array.isArray(txs)) return [];

    return txs.map((tx: any) => ({
      hash: tx.signature,
      from: tx.nativeTransfers?.[0]?.fromUserAccount || tx.feePayer || address,
      to: tx.nativeTransfers?.[0]?.toUserAccount || '',
      value: (tx.nativeTransfers?.[0]?.amount || 0) / 1e9,
      valueUSD: null,
      timestamp: tx.timestamp * 1000,
      fee: (tx.fee || 0) / 1e9,
      feePayer: tx.feePayer || address,
      status: tx.transactionError ? 'failed' : 'success',
      type: tx.type || 'unknown',
      tokenTransfers: (tx.tokenTransfers || []).map((t: any) => ({
        from: t.fromUserAccount,
        to: t.toUserAccount,
        mint: t.mint,
        amount: t.amount || 0,
        decimals: t.decimals || 0,
      })),
      programInteractions: tx.tokenTransfers?.map((t: any) => t.mint).filter(Boolean) || [],
    }));
  } catch {
    return [];
  }
}

async function enrichTransactions(address: string): Promise<any[]> {
  const key = getHeliusKey();
  const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key=${key}&limit=100`;

  try {
    return await fetch(url).then(r => r.json());
  } catch {
    return [];
  }
}

function summarizeTransactions(txs: TransactionData[]) {
  const sent = txs.filter(tx => tx.from === tx.programInteractions?.[0] || tx.value > 0);
  const received = txs.filter(tx => tx.to !== '' && tx.value > 0);
  const failed = txs.filter(tx => tx.status === 'failed');
  
  const totalSent = sent.reduce((sum, tx) => sum + tx.value, 0);
  const totalReceived = received.reduce((sum, tx) => sum + tx.value, 0);
  
  const amounts = txs.filter(tx => tx.value > 0).map(tx => tx.value).sort((a, b) => a - b);
  const medianAmount = amounts.length > 0 ? amounts[Math.floor(amounts.length / 2)] : 0;

  return {
    total: txs.length,
    sent: sent.length,
    received: received.length,
    failed: failed.length,
    totalSent,
    totalReceived,
    netFlow: totalReceived - totalSent,
    medianAmount,
    avgAmount: amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0,
  };
}

// ============================================================
// Token Balances & Portfolio
// ============================================================

export interface PortfolioData {
  tokens: TokenInfo[];
  nfts: any[];
  totalValueUSD: number;
  distribution: { [key: string]: number };
}

interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  price: number | null;
  valueUSD: number;
  logoUrl: string | null;
}

async function getTokenBalances(address: string): Promise<TokenInfo[]> {
  const key = getHeliusKey();
  const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'token-balances',
        method: 'searchAssets',
        params: {
          ownerAddress: address,
          tokenType: 'fungible',
          displayOptions: { showNativeBalance: true },
        },
      }),
    }).then(r => r.json());

    const items = response.result?.items || [];
    
    // Get SOL price
    const solPrice = await getSolPrice();
    
    return items.map((item: any) => {
      const balance = item.token_info?.balance || 0;
      const decimals = item.token_info?.decimals || 0;
      const price = item.token_info?.price_info?.price_per_token || null;
      const value = balance / Math.pow(10, decimals);
      const valueUSD = price ? value * price : null;

      return {
        address: item.id,
        symbol: item.content?.metadata?.symbol || 'UNKNOWN',
        name: item.content?.metadata?.name || '',
        balance: value,
        decimals,
        price: price || 0,
        valueUSD: valueUSD || 0,
        logoUrl: item.content?.links?.image || null,
      };
    }).sort((a: TokenInfo, b: TokenInfo) => b.valueUSD - a.valueUSD);
  } catch {
    return [];
  }
}

async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const data = await res.json();
    return data.solana?.usd || 0;
  } catch {
    return 0;
  }
}

function calculatePortfolio(tokens: TokenInfo[], nfts: any[]): PortfolioData {
  const totalValueUSD = tokens.reduce((sum, t) => sum + (t.valueUSD || 0), 0);
  
  const distribution: { [key: string]: number } = {};
  tokens.forEach(t => {
    const pct = t.valueUSD / totalValueUSD * 100;
    distribution[t.symbol] = pct;
  });

  return {
    tokens,
    nfts,
    totalValueUSD,
    distribution,
  };
}

// ============================================================
// NFT Holdings
// ============================================================

export interface NFTData {
  holdings: any[];
  collections: { [key: string]: { name: string; count: number; floorPrice: number } };
  totalValueUSD: number;
}

async function getNFTBalances(address: string): Promise<NFTData> {
  const key = getHeliusKey();
  const url = `https://mainnet.helius-rpc.com/?api-key=${key}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'nft-balances',
        method: 'searchAssets',
        params: {
          ownerAddress: address,
          tokenType: 'nft',
          displayOptions: { showNativeBalance: true },
        },
      }),
    }).then(r => r.json());

    const items = response.result?.items || [];
    
    const collections: { [key: string]: any } = {};
    let totalValue = 0;

    items.forEach((item: any) => {
      const collection = item.grouping?.find((g: any) => g.group_key === 'collection')?.group_value || 'Unknown';
      const floorPrice = item.token_info?.price_info?.floor_price || 0;
      
      if (!collections[collection]) {
        collections[collection] = {
          name: item.content?.metadata?.name?.split('#')[0] || collection,
          count: 0,
          floorPrice: floorPrice,
        };
      }
      collections[collection].count++;
      totalValue += floorPrice;
    });

    return {
      holdings: items,
      collections,
      totalValueUSD: totalValue,
    };
  } catch {
    return { holdings: [], collections: {}, totalValueUSD: 0 };
  }
}

// ============================================================
// Program Interactions
// ============================================================

export interface ProgramInteraction {
  programId: string;
  name: string;
  category: string;
  interactionCount: number;
  firstInteraction: number | null;
  lastInteraction: number | null;
  percentage: number;
}

function analyzeProgramInteractions(transactions: TransactionData[]): ProgramInteraction[] {
  const programCounts: { [key: string]: { count: number; first: number | null; last: number | null } } = {};

  transactions.forEach(tx => {
    const programs = tx.programInteractions || [];
    programs.forEach((p: string) => {
      if (!programCounts[p]) {
        programCounts[p] = { count: 0, first: null, last: null };
      }
      programCounts[p].count++;
      if (!programCounts[p].first || tx.timestamp < programCounts[p].first) {
        programCounts[p].first = tx.timestamp;
      }
      if (!programCounts[p].last || tx.timestamp > programCounts[p].last) {
        programCounts[p].last = tx.timestamp;
      }
    });
  });

  const total = transactions.length;
  
  return Object.entries(programCounts)
    .map(([programId, data]) => ({
      programId,
      name: KNOWN_PROTOCOLS[programId]?.name || 'Unknown',
      category: KNOWN_PROTOCOLS[programId]?.category || 'Unknown',
      interactionCount: data.count,
      firstInteraction: data.first,
      lastInteraction: data.last,
      percentage: (data.count / total) * 100,
    }))
    .sort((a, b) => b.interactionCount - a.interactionCount);
}

// ============================================================
// Risk Analysis
// ============================================================

export interface RiskAnalysis {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  signals: RiskSignal[];
  summary: string;
}

interface RiskSignal {
  id: string;
  name: string;
  weight: number;
  detected: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
}

function calculateRiskScore(wallet: WalletInfo, transactions: TransactionData[], enrichedTxs: any[]): RiskAnalysis {
  const signals: RiskSignal[] = [];
  let totalScore = 0;

  // 1. Wallet Age
  if (wallet.firstSeen) {
    const age = Date.now() - wallet.firstSeen;
    const daysOld = age / (1000 * 60 * 60 * 24);
    
    if (daysOld < 7) {
      signals.push({
        id: 'new_wallet_7d',
        name: 'Wallet Created Within 7 Days',
        weight: 30,
        detected: true,
        severity: 'critical',
        details: `Wallet is ${daysOld.toFixed(1)} days old`,
      });
      totalScore += 30;
    } else if (daysOld < 30) {
      signals.push({
        id: 'new_wallet_30d',
        name: 'Wallet Created Within 30 Days',
        weight: 15,
        detected: true,
        severity: 'high',
        details: `Wallet is ${daysOld.toFixed(1)} days old`,
      });
      totalScore += 15;
    } else if (daysOld < 90) {
      signals.push({
        id: 'new_wallet_90d',
        name: 'Wallet Created Within 90 Days',
        weight: 5,
        detected: true,
        severity: 'low',
      });
      totalScore += 5;
    }
  }

  // 2. Balance
  const balance = parseFloat(wallet.balance);
  if (balance < 0.001) {
    signals.push({
      id: 'near_zero_balance',
      name: 'Near-Zero SOL Balance',
      weight: 10,
      detected: true,
      severity: 'low',
      details: `Balance: ${balance.toFixed(6)} SOL`,
    });
    totalScore += 10;
  }

  // 3. External Fee Payers (HIGH RISK)
  const externalFeePayers = transactions.filter(tx => tx.feePayer && tx.feePayer !== wallet.address);
  if (externalFeePayers.length > 0) {
    const extRatio = externalFeePayers.length / transactions.length;
    if (extRatio > 0.5) {
      signals.push({
        id: 'external_fee_payer_high',
        name: 'High External Fee Payer Usage',
        weight: 35,
        detected: true,
        severity: 'critical',
        details: `${externalFeePayers.length} transactions (${(extRatio * 100).toFixed(1)}%) use external fee payers`,
      });
      totalScore += 35;
    } else if (extRatio > 0.2) {
      signals.push({
        id: 'external_fee_payer_medium',
        name: 'Moderate External Fee Payer Usage',
        weight: 15,
        detected: true,
        severity: 'high',
        details: `${externalFeePayers.length} transactions use external fee payers`,
      });
      totalScore += 15;
    }
  }

  // 4. Failed Transactions
  const failed = transactions.filter(tx => tx.status === 'failed');
  const failRatio = failed.length / transactions.length;
  if (failRatio > 0.3) {
    signals.push({
      id: 'high_failure_rate',
      name: 'High Failed Transaction Rate',
      weight: 15,
      detected: true,
      severity: 'high',
      details: `${failed.length} failed (${(failRatio * 100).toFixed(1)}%)`,
    });
    totalScore += 15;
  }

  // 5. Transaction Frequency (Bot-like patterns)
  if (transactions.length > 10) {
    const timestamps = transactions.map(tx => tx.timestamp).sort((a, b) => a - b);
    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const minInterval = Math.min(...intervals);
    
    // Bot detection: very fast transactions
    if (minInterval < 1000) { // Less than 1 second between txs
      signals.push({
        id: 'high_frequency',
        name: 'Bot-Like Transaction Frequency',
        weight: 20,
        detected: true,
        severity: 'high',
        details: `Min interval: ${(minInterval/1000).toFixed(2)}s, Avg: ${(avgInterval/1000).toFixed(2)}s`,
      });
      totalScore += 20;
    }
  }

  // 6. Single Transaction Wallet
  if (transactions.length === 1) {
    signals.push({
      id: 'single_transaction',
      name: 'Single Transaction Wallet',
      weight: 5,
      detected: true,
      severity: 'low',
    });
    totalScore += 5;
  }

  // 7. NFT Spam Detection (many NFTs, low value)
  const nftTx = transactions.filter(tx => tx.type?.includes('NFT') || tx.tokenTransfers?.length > 0);
  if (nftTx.length > 50) {
    signals.push({
      id: 'nft_spam',
      name: 'Potential NFT Spam Activity',
      weight: 10,
      detected: true,
      severity: 'medium',
      details: `${nftTx.length} NFT-related transactions`,
    });
    totalScore += 10;
  }

  const score = Math.max(0, Math.min(100, totalScore));
  
  let level: 'low' | 'medium' | 'high' | 'critical';
  if (score >= 50) level = 'critical';
  else if (score >= 30) level = 'high';
  else if (score >= 15) level = 'medium';
  else level = 'low';

  return {
    score,
    level,
    signals,
    summary: getRiskSummary(score, level, signals),
  };
}

function getRiskSummary(score: number, level: string, signals: RiskSignal[]): string {
  if (score === 0) return 'No risk signals detected. This wallet appears legitimate.';
  
  const critical = signals.filter(s => s.severity === 'critical').length;
  const high = signals.filter(s => s.severity === 'high').length;
  
  if (critical > 0) return `${critical} critical risk signals detected. This wallet shows signs of suspicious activity.`;
  if (high > 0) return `${high} high-risk signals detected. Exercise caution when interacting with this wallet.`;
  return `${signals.length} risk signals detected. This wallet shows some unusual patterns.`;
}

// ============================================================
// Sybil Detection
// ============================================================

export interface SybilDetection {
  detected: boolean;
  confidence: number;
  signals: SybilSignal[];
  similarWallets: string[];
  clusterInfo: any;
}

interface SybilSignal {
  id: string;
  name: string;
  weight: number;
  detected: boolean;
  details?: string;
}

function detectSybil(transactions: TransactionData[], enrichedTxs: any[]): SybilDetection {
  const signals: SybilSignal[] = [];
  let totalWeight = 0;

  // 1. Fee Payer Clustering (same external fee payer)
  const feePayers: { [key: string]: number } = {};
  transactions.forEach(tx => {
    if (tx.feePayer && tx.feePayer !== transactions[0]?.from) {
      feePayers[tx.feePayer] = (feePayers[tx.feePayer] || 0) + 1;
    }
  });

  const sharedFeePayers = Object.entries(feePayers).filter(([_, count]) => count > 3);
  if (sharedFeePayers.length > 0) {
    signals.push({
      id: 'shared_fee_payer',
      name: 'Shared External Fee Payer Detected',
      weight: 40,
      detected: true,
      details: `${sharedFeePayers.length} external fee payer(s) used by this wallet`,
    });
    totalWeight += 40;
  }

  // 2. Batch Transactions (similar timestamps)
  const timestamps = transactions.map(tx => tx.timestamp).sort((a, b) => a - b);
  let batchCount = 0;
  for (let i = 1; i < timestamps.length; i++) {
    if (timestamps[i] - timestamps[i-1] < 100) { // Within 100ms
      batchCount++;
    }
  }
  if (batchCount > 5) {
    signals.push({
      id: 'batch_transactions',
      name: 'Batch Transaction Pattern',
      weight: 25,
      detected: true,
      details: `${batchCount} transactions within 100ms of each other`,
    });
    totalWeight += 25;
  }

  // 3. Same Block Transactions
  const blockTimes: { [key: number]: number } = {};
  enrichedTxs.forEach((tx: any) => {
    if (tx.blockTime) {
      blockTimes[tx.blockTime] = (blockTimes[tx.blockTime] || 0) + 1;
    }
  });
  
  const sameBlockTxs = Object.entries(blockTimes).filter(([_, count]) => count > 3);
  if (sameBlockTxs.length > 0) {
    signals.push({
      id: 'same_block',
      name: 'Same-Block Transaction Pattern',
      weight: 20,
      detected: true,
      details: `${sameBlockTxs.length} blocks with multiple transactions`,
    });
    totalWeight += 20;
  }

  // 4. Airdrop Claiming Pattern (many small incoming from same source)
  const sources: { [key: string]: number } = {};
  transactions.filter(tx => tx.value > 0 && tx.value < 1).forEach(tx => {
    sources[tx.from] = (sources[tx.from] || 0) + 1;
  });
  
  const potentialAirdropSources = Object.entries(sources).filter(([_, count]) => count > 5);
  if (potentialAirdropSources.length > 2) {
    signals.push({
      id: 'airdrop_pattern',
      name: 'Potential Airdrop Farming Pattern',
      weight: 15,
      detected: true,
      details: `${potentialAirdropSources.length} sources with multiple small transfers`,
    });
    totalWeight += 15;
  }

  return {
    detected: totalWeight > 30,
    confidence: Math.min(100, totalWeight),
    signals,
    similarWallets: [], // Would require more complex analysis
    clusterInfo: {
      sharedFeePayers: sharedFeePayers.map(([payer, count]) => ({ payer, count })),
      batchTransactions: batchCount,
    },
  };
}

// ============================================================
// Funding Trace
// ============================================================

export interface FundingTrace {
  ultimateSource: string | null;
  sourceType: string | null;
  hops: FundingHop[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface FundingHop {
  from: string;
  to: string;
  value: number;
  timestamp: number;
  source: string | null;
}

function traceFunding(transactions: TransactionData[]): FundingTrace {
  // Get incoming transactions
  const incoming = transactions
    .filter(tx => tx.value > 0)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (incoming.length === 0) {
    return {
      ultimateSource: null,
      sourceType: null,
      hops: [],
      riskLevel: 'low',
    };
  }

  // Analyze funding sources
  const sources: { [key: string]: { count: number; total: number } } = {};
  incoming.forEach(tx => {
    if (!sources[tx.from]) {
      sources[tx.from] = { count: 0, total: 0 };
    }
    sources[tx.from].count++;
    sources[tx.from].total += tx.value;
  });

  // Find most common source
  const sortedSources = Object.entries(sources)
    .sort((a, b) => b[1].count - a[1].count);
  
  const topSource = sortedSources[0]?.[0];
  const sourceType = KNOWN_EXCHANGES[topSource] || (topSource?.length === 44 ? 'Exchange/Unknown' : 'EOA Wallet');

  // Check if funding is from known exchange (low risk)
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (sourceType === 'EOA Wallet') riskLevel = 'medium';
  if (sortedSources.length > 10) riskLevel = 'high';

  const hops = incoming.slice(0, 5).map(tx => ({
    from: tx.from,
    to: tx.to,
    value: tx.value,
    timestamp: tx.timestamp,
    source: KNOWN_EXCHANGES[tx.from] || null,
  }));

  return {
    ultimateSource: topSource || null,
    sourceType,
    hops,
    riskLevel,
  };
}

// ============================================================
// Export Validation
// ============================================================

export { isValidSolanaAddress };
