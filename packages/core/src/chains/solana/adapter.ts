// ============================================================
// FundTracer by DT - Solana Adapter
// Implements ChainAdapter for Solana using Helius API
// ============================================================

import { PublicKey } from '@solana/web3.js';
import {
  ChainAdapter,
  ChainIdentifier,
  WalletInfo,
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
} from '../types.js';
import { HeliusKeyManager, CACHE_TTL } from './heliusManager.js';
import { 
  SOLANA_KNOWN_ENTITIES, 
  SOLANA_PROGRAMS,
  getEntityInfo,
  isKnownExchange,
  isSuspicious,
} from './entities.js';

const HELIUS_KEYS = [
  '77de5802-5beb-4647-bfbb-0ba215d47c81',
  'b81bcc20-7710-40dc-b0f3-0865c03a8a1d',
  'deae0411-c969-41ff-9420-f1a0f59d5639',
];

const SOLANA_CHAIN: ChainIdentifier = {
  type: 'solana',
  id: 'mainnet-beta',
  name: 'Solana',
};

const SYSTEM_PROGRAMS = [
  '11111111111111111111111111111111',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  'ComputeBudget111111111111111111111111111111',
  'SysvarRent111111111111111111111111111111111',
];

export class SolanaAdapter implements ChainAdapter {
  chainType: 'solana' = 'solana';
  chainId = 'mainnet-beta';
  private helius: HeliusKeyManager;

  constructor() {
    this.helius = new HeliusKeyManager(HELIUS_KEYS);
  }

  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return PublicKey.isOnCurve(address);
    } catch {
      return false;
    }
  }

  async getWalletInfo(address: string): Promise<WalletInfo> {
    const url = `https://mainnet.helius-rpc.com/?api-key={KEY}`;
    
    const [balanceRes, accountRes, sigsRes] = await Promise.all([
      this.helius.request<{ context: { slot: number }; value: number }>(
        url,
        {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [address],
          }),
        },
        1,
        `bal:${address}`,
        CACHE_TTL.balance
      ),
      this.helius.request<{ context: { slot: number }; value: { executable: boolean; owner: string } | null }>(
        url,
        {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getAccountInfo',
            params: [address, { encoding: 'jsonParsed' }],
          }),
        },
        1,
        `acc:${address}`,
        CACHE_TTL.walletFirstTx
      ),
      this.helius.request<{ context: { slot: number }; value: Array<{ signature: string; slot: number; blockTime: number | null }> }>(
        url,
        {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignaturesForAddress',
            params: [address, { limit: 1 }],
          }),
        },
        5,
        `sigs:${address}:1`,
        CACHE_TTL.recentTransactions
      ),
    ]);

    const isProgram = accountRes.value?.executable ?? false;
    const firstTx = sigsRes.value?.[0];

    return {
      address,
      chain: SOLANA_CHAIN,
      balance: (balanceRes.value / 1e9).toString(),
      nativeSymbol: 'SOL',
      isContract: isProgram,
      firstSeen: firstTx?.blockTime ? firstTx.blockTime * 1000 : null,
      txCount: null,
      labels: await this.getLabels(address),
    };
  }

  async getTransactions(address: string, opts: TxQueryOpts = {}): Promise<UnifiedTransaction[]> {
    const limit = opts.limit ?? 100;
    const url = `https://api.helius.xyz/v0/addresses/${address}/transactions?api-key={KEY}&limit=${limit}`;

    try {
      const txs = await this.helius.request<any[]>(
        url,
        { method: 'GET' },
        10,
        `txs:${address}:${limit}`,
        CACHE_TTL.recentTransactions
      );

      return txs.map(tx => this.normalizeHeliusTx(tx, address));
    } catch {
      return [];
    }
  }

  private normalizeHeliusTx(tx: any, perspective: string): UnifiedTransaction {
    const solTransfers = tx.nativeTransfers || [];
    const tokenTransfers = tx.tokenTransfers || [];

    const outgoing = solTransfers.find((t: any) => t.fromUserAccount === perspective);
    const incoming = solTransfers.find((t: any) => t.toUserAccount === perspective);

    return {
      hash: tx.signature,
      from: outgoing?.fromUserAccount || tx.feePayer,
      to: outgoing?.toUserAccount || incoming?.fromUserAccount || null,
      value: ((outgoing?.amount || incoming?.amount || 0) / 1e9).toString(),
      timestamp: tx.timestamp * 1000,
      fee: (tx.fee / 1e9).toString(),
      feePayer: tx.feePayer,
      status: tx.transactionError ? 'failed' : 'success',
      chain: SOLANA_CHAIN,
      tokenTransfers: tokenTransfers.map((tt: any) => ({
        from: tt.fromUserAccount,
        to: tt.toUserAccount,
        tokenAddress: tt.mint,
        symbol: tt.tokenSymbol || 'UNKNOWN',
        decimals: tt.decimals ?? 0,
        amount: tt.tokenAmount.toString(),
      })),
      programInteractions: tx.accountData?.map((a: any) => a.account) || [],
      type: tx.type,
      source: tx.source,
      raw: tx,
    };
  }

  async getTokenBalances(address: string): Promise<UnifiedTokenBalance[]> {
    const url = `https://mainnet.helius-rpc.com/?api-key={KEY}`;

    try {
      const response = await this.helius.request<{
        result: { items: any[] };
      }>(
        url,
        {
          method: 'POST',
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
        },
        10,
        `tokens:${address}`,
        CACHE_TTL.tokenBalances
      );

      return response.result?.items?.map((item: any) => ({
        address: item.id,
        symbol: item.content?.metadata?.symbol || 'UNKNOWN',
        name: item.content?.metadata?.name || '',
        balance: item.token_info?.balance || '0',
        decimals: item.token_info?.decimals || 0,
        price: item.token_info?.price_info?.price_per_token || null,
        chain: SOLANA_CHAIN,
      })) || [];
    } catch {
      return [];
    }
  }

  async getNFTs(address: string): Promise<UnifiedNFT[]> {
    const url = `https://mainnet.helius-rpc.com/?api-key={KEY}`;

    try {
      const response = await this.helius.request<{
        result: { items: any[] };
      }>(
        url,
        {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'nfts',
            method: 'searchAssets',
            params: {
              ownerAddress: address,
              tokenType: 'nft',
              displayOptions: { showNativeBalance: true, showCollectionMetadata: true },
            },
          }),
        },
        10,
        `nfts:${address}`,
        CACHE_TTL.tokenBalances
      );

      return response.result?.items?.map((item: any) => ({
        address: item.id,
        tokenId: item.id,
        name: item.content?.metadata?.name || 'Unknown NFT',
        imageUrl: item.content?.files?.[0]?.uri || null,
        chain: SOLANA_CHAIN,
      })) || [];
    } catch {
      return [];
    }
  }

  async getFundingSources(address: string, depth: number = 5): Promise<FundingTree> {
    const nodes: Map<string, FundingNode> = new Map();
    const edges: FundingEdge[] = [];
    const visited = new Set<string>();
    const queue: { address: string; depth: number }[] = [{ address, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.address) || current.depth > depth) continue;
      visited.add(current.address);

      const fundingSources = await this.findEarliestFunding(current.address);

      for (const source of fundingSources) {
        const entity = getEntityInfo(source.from);
        const sourceLabel = entity?.name || null;

        if (!nodes.has(source.from)) {
          nodes.set(source.from, {
            address: source.from,
            depth: current.depth + 1,
            label: sourceLabel,
            amount: source.amount,
            fundedBy: null,
            timestamp: source.timestamp,
            type: source.type as 'sol_transfer' | 'fee_payer' | 'token_transfer',
          });
        }

        edges.push({
          from: source.from,
          to: current.address,
          amount: source.amount,
          timestamp: source.timestamp,
          type: source.type,
        });

        if (!sourceLabel && current.depth < depth) {
          queue.push({ address: source.from, depth: current.depth + 1 });
        }
      }
    }

    const ultimateSource = this.findUltimateSource(nodes, edges);

    return {
      root: address,
      nodes: [...nodes.values()],
      edges,
      ultimateSource,
    };
  }

  private async findEarliestFunding(address: string): Promise<Array<{
    from: string;
    amount: number;
    timestamp: number | null;
    type: string;
  }>> {
    const sources: Array<{ from: string; amount: number; timestamp: number | null; type: string }> = [];
    const url = `https://mainnet.helius-rpc.com/?api-key={KEY}`;

    try {
      const sigsRes = await this.helius.request<{ value: Array<{ signature: string }> }>(
        url,
        {
          method: 'POST',
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSignaturesForAddress',
            params: [address, { limit: 100 }],
          }),
        },
        5,
        `sigs:${address}:100`,
        CACHE_TTL.recentTransactions
      );

      const signatures = sigsRes.value?.map(s => s.signature).slice(-10) || [];
      
      if (signatures.length === 0) return [];

      const txsRes = await this.helius.request<any[]>(
        `https://api.helius.xyz/v0/transactions?api-key={KEY}`,
        {
          method: 'POST',
          body: JSON.stringify({ transactions: signatures }),
        },
        50,
        `parsed-batch:${signatures[0]}`,
        CACHE_TTL.fundingTree
      );

      for (const tx of txsRes || []) {
        const transfers = tx.nativeTransfers || [];
        
        for (const transfer of transfers) {
          if (transfer.toUserAccount === address && transfer.amount > 0) {
            sources.push({
              from: transfer.fromUserAccount,
              amount: transfer.amount / 1e9,
              timestamp: tx.timestamp ? tx.timestamp * 1000 : null,
              type: 'sol_transfer',
            });
          }
        }

        if (tx.feePayer && tx.feePayer !== address) {
          sources.push({
            from: tx.feePayer,
            amount: tx.fee / 1e9,
            timestamp: tx.timestamp ? tx.timestamp * 1000 : null,
            type: 'fee_payer',
          });
        }
      }
    } catch {
      // Return empty if API fails
    }

    return sources;
  }

  private findUltimateSource(
    nodes: Map<string, FundingNode>,
    edges: FundingEdge[]
  ): { address: string; label: string; confidence: number } | null {
    if (nodes.size === 0) return null;

    let maxDepth = 0;
    let ultimateNode: FundingNode | null = null;

    for (const node of nodes.values()) {
      if (node.depth > maxDepth) {
        maxDepth = node.depth;
        ultimateNode = node;
      }
    }

    if (!ultimateNode) return null;

    return {
      address: ultimateNode.address,
      label: ultimateNode.label || 'Unknown',
      confidence: Math.min(0.9, 0.3 + maxDepth * 0.15),
    };
  }

  async getRiskScore(address: string): Promise<RiskAssessment> {
    const signals: RiskSignal[] = [];
    let totalScore = 0;

    const [walletInfo, txs, funding] = await Promise.all([
      this.getWalletInfo(address),
      this.getTransactions(address, { limit: 200 }),
      this.getFundingSources(address, 3),
    ]);

    // Signal 1: New wallet
    const walletAge = walletInfo.firstSeen ? Date.now() - walletInfo.firstSeen : null;
    const isNewWallet = walletAge !== null && walletAge < 30 * 24 * 60 * 60 * 1000;
    signals.push({
      id: 'sol_new_wallet',
      name: 'Wallet Created Recently',
      weight: 10,
      detected: isNewWallet,
      details: isNewWallet ? `Wallet is ${Math.round(walletAge! / (24 * 60 * 60 * 1000))} days old` : '',
      severity: 'medium',
    });

    // Signal 2: Low balance
    signals.push({
      id: 'sol_low_balance',
      name: 'Near-Zero SOL Balance',
      weight: 5,
      detected: parseFloat(walletInfo.balance) < 0.01,
      details: `Balance: ${walletInfo.balance} SOL`,
      severity: 'low',
    });

    // Signal 3: External fee payer
    const externalFeePayers = txs.filter(tx => tx.feePayer && tx.feePayer !== address);
    signals.push({
      id: 'sol_external_fee_payer',
      name: 'External Fee Payer Detected',
      weight: 20,
      detected: externalFeePayers.length > txs.length * 0.5,
      details: `${externalFeePayers.length} of ${txs.length} transactions have external fee payer`,
      severity: 'high',
    });

    // Signal 4: CEX withdrawal (reduces risk)
    const hasKnownSource = !!(funding.ultimateSource?.label && funding.ultimateSource.label !== 'Unknown');
    signals.push({
      id: 'sol_cex_withdrawal',
      name: 'Direct CEX Withdrawal',
      weight: -10,
      detected: hasKnownSource,
      details: funding.ultimateSource?.label || '',
      severity: 'low',
    });

    // Signal 5: Rapid token consolidation
    const tokenTransfers = txs.flatMap(tx => tx.tokenTransfers || []);
    const outgoingTransfers = tokenTransfers.filter(t => t.from === address);
    const uniqueDestinations = new Set(outgoingTransfers.map(t => t.to));
    if (outgoingTransfers.length >= 5 && uniqueDestinations.size === 1) {
      signals.push({
        id: 'sol_token_consolidation',
        name: 'Immediate Token Consolidation',
        weight: 20,
        detected: true,
        details: `Sent ${outgoingTransfers.length} tokens to single address`,
        severity: 'high',
      });
    }

    // Signal 6: High transaction count for new wallet
    if (isNewWallet && txs.length > 100) {
      signals.push({
        id: 'sol_high_activity_new_wallet',
        name: 'High Activity New Wallet',
        weight: 15,
        detected: true,
        details: `${txs.length} transactions in first 30 days`,
        severity: 'high',
      });
    }

    // Signal 7: Scripted timing (bot-like behavior)
    if (txs.length >= 10) {
      const timestamps = txs.map(tx => tx.timestamp).sort((a, b) => a - b);
      const intervals: number[] = [];
      for (let i = 1; i < timestamps.length; i++) {
        intervals.push(timestamps[i] - timestamps[i - 1]);
      }
      const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, i) => sum + Math.pow(i - mean, 2), 0) / intervals.length;
      const cv = Math.sqrt(variance) / mean;
      if (cv < 0.1) {
        signals.push({
          id: 'sol_scripted_timing',
          name: 'Scripted Transaction Timing',
          weight: 15,
          detected: true,
          details: 'Transactions show bot-like regular timing',
          severity: 'medium',
        });
      }
    }

    // Signal 8: NFT interactions
    const nftMints = txs.filter(tx => tx.type === 'NFT_MINT' || tx.programInteractions?.some(p => p.includes('nft')));
    if (nftMints.length >= 3) {
      signals.push({
        id: 'sol_nft_farming',
        name: 'Multiple NFT Mints',
        weight: 10,
        detected: true,
        details: `${nftMints.length} NFT mints detected`,
        severity: 'medium',
      });
    }

    // Signal 9: DEX spam (many small swaps)
    const dexInteractions = txs.filter(tx => tx.source === 'JUPITER' || tx.source === 'RAYDIUM' || tx.source === 'ORCA');
    if (dexInteractions.length > 50) {
      signals.push({
        id: 'sol_dex_spam',
        name: 'High DEX Activity',
        weight: 5,
        detected: true,
        details: `${dexInteractions.length} DEX interactions`,
        severity: 'low',
      });
    }

    // Signal 10: Interacts with suspicious addresses
    const suspiciousCounterparties = new Set<string>();
    for (const tx of txs) {
      if (tx.from !== address && isSuspicious(tx.from)) suspiciousCounterparties.add(tx.from);
      if (tx.to && isSuspicious(tx.to)) suspiciousCounterparties.add(tx.to!);
    }
    if (suspiciousCounterparties.size > 0) {
      signals.push({
        id: 'sol_suspicious_interaction',
        name: 'Interacts with Suspicious Addresses',
        weight: 25,
        detected: true,
        details: `${suspiciousCounterparties.size} suspicious interactions`,
        severity: 'critical',
      });
    }

    for (const signal of signals) {
      if (signal.detected) totalScore += signal.weight;
    }

    return {
      score: Math.max(0, Math.min(100, totalScore)),
      signals,
      chain: SOLANA_CHAIN,
    };
  }

  async detectSybilClusters(addresses: string[]): Promise<SybilCluster[]> {
    const clusters: SybilCluster[] = [];
    const feePayerMap = new Map<string, string[]>();
    const fundingMap = new Map<string, string[]>();

    for (const addr of addresses) {
      try {
        const txs = await this.getTransactions(addr, { limit: 50 });
        
        for (const tx of txs) {
          if (tx.feePayer && tx.feePayer !== addr) {
            if (!feePayerMap.has(tx.feePayer)) feePayerMap.set(tx.feePayer, []);
            feePayerMap.get(tx.feePayer)!.push(addr);
          }
        }

        const funding = await this.getFundingSources(addr, 2);
        for (const node of funding.nodes) {
          if (!fundingMap.has(node.address)) fundingMap.set(node.address, []);
          fundingMap.get(node.address)!.push(addr);
        }
      } catch {
        // Continue with other addresses
      }
    }

    for (const [feePayer, wallets] of feePayerMap) {
      const unique = [...new Set(wallets)];
      if (unique.length >= 3) {
        clusters.push({
          id: `fee-payer-${feePayer.slice(0, 8)}`,
          type: 'shared_fee_payer',
          confidence: Math.min(0.95, 0.5 + unique.length * 0.05),
          wallets: unique,
          pivot: feePayer,
          signal: `${unique.length} wallets share fee payer ${feePayer.slice(0, 8)}...`,
          severity: unique.length > 10 ? 'critical' : 'high',
        });
      }
    }

    for (const [funder, recipients] of fundingMap) {
      if (recipients.length >= 3) {
        clusters.push({
          id: `funding-${funder.slice(0, 8)}`,
          type: 'shared_funding_source',
          confidence: 0.7,
          wallets: [...new Set(recipients)],
          pivot: funder,
          signal: `${recipients.length} wallets funded by ${funder.slice(0, 8)}...`,
          severity: recipients.length > 20 ? 'critical' : 'high',
        });
      }
    }

    return clusters;
  }

  private async getLabels(address: string): Promise<string[]> {
    const labels: string[] = [];
    
    const entity = getEntityInfo(address);
    if (entity) {
      labels.push(entity.name);
    }

    return labels;
  }
}
