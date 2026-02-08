/**
 * FeatureExtractor - Multi-dimensional wallet feature extraction
 * Extracts comprehensive behavioral features from wallet addresses client-side
 */

import { keyManager, fetchWithTimeout } from '../utils/alchemyHelpers';

// Types for extracted features
export interface WalletFeatures {
  address: string;
  chain: string;
  
  // Funding sources
  funders: Array<{
    address: string;
    amount: string;
    timestamp: number;
    txHash: string;
    blockNumber: number;
  }>;
  
  // Token interactions
  tokens: Array<{
    contract: string;
    name: string;
    symbol: string;
    decimals: number;
    interactions: number;
    firstInteraction: number;
    lastInteraction: number;
  }>;
  tokenProfile: string[];
  tokenFingerprint: string; // Sorted token addresses hash
  
  // Spender approvals (DEX routers, aggregators)
  spenders: Array<{
    address: string;
    count: number;
    protocols: string[];
    firstApproval: number;
    lastApproval: number;
  }>;
  spenderFingerprint: string; // Sorted spender set hash
  
  // Exit patterns (consolidation)
  topRecipients: Array<{
    address: string;
    amount: string;
    count: number;
    percentage: number;
  }>;
  consolidationScore: number; // 0-100
  
  // Temporal patterns
  activityBuckets: Array<{ hour: number; count: number }>; // 24-hour distribution
  burstEvents: Array<{
    id: string;
    startTime: number;
    endTime: number;
    eventCount: number;
    walletCount: number;
  }>;
  campaignIds: string[];
  
  // Counterparties
  counterparties: Array<{
    address: string;
    count: number;
    type: 'bridge' | 'router' | 'cex' | 'dex' | 'unknown';
    labels?: string[];
  }>;
  sharedCounterpartyScore: number;
  
  // Metadata
  firstActivity: number;
  lastActivity: number;
  totalTransactions: number;
  uniqueDaysActive: number;
  
  // Computed metrics
  suspicionScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

// Known protocol addresses for classification
const KNOWN_PROTOCOLS: Record<string, { name: string; type: 'router' | 'dex' | 'bridge' | 'cex' }> = {
  '0xE592427A0AEce92De3Edee1F18E0157C05861564': { name: 'Uniswap V3 Router', type: 'router' },
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45': { name: 'Uniswap V3 Universal Router', type: 'router' },
  '0x1111111254eeb25477b68fb85ed929f73a960582': { name: '1inch V5 Aggregator', type: 'router' },
  '0x1111111254fb6c44bac0bed2854e76f90643097d': { name: '1inch V4 Router', type: 'router' },
  '0xdef1c0ded9bec7f1a1670819833240f027b25eff': { name: '0x Exchange Proxy', type: 'router' },
  '0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1': { name: 'Optimism Bridge', type: 'bridge' },
  '0x3E4e3291Ed667FB4Dee6808D9da439B9DA785Ac7': { name: 'Polygon Bridge', type: 'bridge' },
  '0x8e6D9f31b047E8bCc751acE73B947A38E7582368': { name: 'Arbitrum Bridge', type: 'bridge' },
  '0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1': { name: 'Base Bridge', type: 'bridge' },
};

// Known CEX addresses
const KNOWN_CEX = new Set([
  '0x28C6c06298d514Db089934071355E5743bf21d60', // Binance
  '0x21a31Ee1afC51d94C2eFcCAa209', // Binance 2
  '0xdfd5293d8e347dfe59e90efd55b2956a1343963d', // Binance 3
  '0x71660c4005ba85c37ccec55d991c5b1d6b3c66e5', // Coinbase
  '0x503828976df32d8a6a9e77540c6fd85e81a55b75', // Coinbase 2
  '0x3b8c924c1f07ecdcae991e2389e0cf2f73c75d23', // Coinbase 3
]);

export class FeatureExtractor {
  private chain: string;
  private progressCallback?: (progress: number) => void;
  private abortController: AbortController;

  constructor(chain: string = 'linea', progressCallback?: (progress: number) => void) {
    this.chain = chain;
    this.progressCallback = progressCallback;
    this.abortController = new AbortController();
  }

  abort() {
    this.abortController.abort();
  }

  /**
   * Extract features for a single wallet
   * Optimized for speed with parallel requests
   */
  async extractFeatures(address: string): Promise<WalletFeatures | null> {
    try {
      // Parallel fetch of all data sources
      const [transfers, approvals, nativeTxs] = await Promise.all([
        this.fetchAssetTransfers(address),
        this.fetchApprovals(address),
        this.fetchNativeTransactions(address)
      ]);

      // Process features
      const funders = this.extractFunders(transfers, nativeTxs);
      const tokens = this.extractTokens(transfers);
      const spenders = this.extractSpenders(approvals);
      const topRecipients = this.extractRecipients(transfers);
      const counterparties = this.extractCounterparties(transfers, nativeTxs);
      const activityBuckets = this.computeActivityBuckets(transfers, nativeTxs);
      const burstEvents = this.detectBurstEvents(transfers, nativeTxs);

      // Build token profile
      const tokenProfile = this.buildTokenProfile(tokens);

      // Calculate consolidation score
      const consolidationScore = this.calculateConsolidationScore(topRecipients);

      // Calculate counterparty score
      const sharedCounterpartyScore = this.calculateCounterpartyScore(counterparties);

      // Compute temporal metrics
      const allTimestamps = [
        ...transfers.map(t => t.timestamp),
        ...nativeTxs.map(t => t.timestamp)
      ].filter(Boolean);

      const firstActivity = allTimestamps.length > 0 ? Math.min(...allTimestamps) : 0;
      const lastActivity = allTimestamps.length > 0 ? Math.max(...allTimestamps) : 0;
      const uniqueDays = new Set(allTimestamps.map(t => Math.floor(t / 86400))).size;

      return {
        address,
        chain: this.chain,
        funders,
        tokens,
        tokenProfile,
        tokenFingerprint: this.computeTokenFingerprint(tokens),
        spenders,
        spenderFingerprint: this.computeSpenderFingerprint(spenders),
        topRecipients: topRecipients.slice(0, 10),
        consolidationScore,
        activityBuckets,
        burstEvents,
        campaignIds: burstEvents.map(b => b.id),
        counterparties,
        sharedCounterpartyScore,
        firstActivity,
        lastActivity,
        totalTransactions: transfers.length + nativeTxs.length,
        uniqueDaysActive: uniqueDays,
        suspicionScore: 0, // Will be calculated by clustering engine
        riskLevel: 'low'
      };
    } catch (error) {
      console.error(`[FeatureExtractor] Failed to extract features for ${address}:`, error);
      return null;
    }
  }

  /**
   * Extract features for multiple wallets with progress tracking
   */
  async extractFeaturesBatch(
    addresses: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<WalletFeatures[]> {
    const results: WalletFeatures[] = [];
    const batchSize = 5; // Process 5 wallets at a time to avoid rate limits
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(addr => this.extractFeatures(addr))
      );
      
      // Filter out nulls and add to results
      results.push(...batchResults.filter((r): r is WalletFeatures => r !== null));
      
      // Report progress
      if (onProgress) {
        onProgress(Math.min(i + batchSize, addresses.length), addresses.length);
      }
      
      // Small delay between batches
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  private async fetchAssetTransfers(address: string): Promise<any[]> {
    const key = keyManager.getWalletKey();
    const rpcUrl = this.getRpcUrl();
    
    try {
      const response = await fetchWithTimeout(
        `${rpcUrl}/${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getAssetTransfers',
            params: [{
              fromBlock: '0x0',
              toBlock: 'latest',
              fromAddress: address,
              category: ['external', 'erc20', 'erc721', 'erc1155'],
              withMetadata: true,
              maxCount: '0x64' // Last 100 transactions
            }]
          })
        },
        10000,
        this.abortController.signal
      );
      
      const data = await response.json();
      return data.result?.transfers || [];
    } catch (error) {
      return [];
    }
  }

  private async fetchApprovals(address: string): Promise<any[]> {
    // Fetch Approval events for ERC20 tokens
    const key = keyManager.getWalletKey();
    const rpcUrl = this.getRpcUrl();
    
    try {
      const response = await fetchWithTimeout(
        `${rpcUrl}/${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getLogs',
            params: [{
              fromBlock: '0x0',
              toBlock: 'latest',
              topics: [
                '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925', // Approval event
                null,
                '0x000000000000000000000000' + address.slice(2) // Indexed owner
              ]
            }]
          })
        },
        10000,
        this.abortController.signal
      );
      
      const data = await response.json();
      return data.result || [];
    } catch (error) {
      return [];
    }
  }

  private async fetchNativeTransactions(address: string): Promise<any[]> {
    const key = keyManager.getWalletKey();
    const rpcUrl = this.getRpcUrl();
    
    try {
      // Fetch both incoming and outgoing
      const [fromResponse, toResponse] = await Promise.all([
        fetchWithTimeout(
          `${rpcUrl}/${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'alchemy_getAssetTransfers',
              params: [{
                fromBlock: '0x0',
                toBlock: 'latest',
                fromAddress: address,
                category: ['external'],
                withMetadata: true,
                maxCount: '0x32'
              }]
            })
          },
          10000,
          this.abortController.signal
        ),
        fetchWithTimeout(
          `${rpcUrl}/${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'alchemy_getAssetTransfers',
              params: [{
                fromBlock: '0x0',
                toBlock: 'latest',
                toAddress: address,
                category: ['external'],
                withMetadata: true,
                maxCount: '0x32'
              }]
            })
          },
          10000,
          this.abortController.signal
        )
      ]);
      
      const [fromData, toData] = await Promise.all([
        fromResponse.json(),
        toResponse.json()
      ]);
      
      return [
        ...(fromData.result?.transfers || []),
        ...(toData.result?.transfers || [])
      ];
    } catch (error) {
      return [];
    }
  }

  private extractFunders(transfers: any[], nativeTxs: any[]) {
    // Get first funding transactions (incoming native transfers)
    const funders: WalletFeatures['funders'] = [];
    
    for (const tx of nativeTxs) {
      if (tx.to === undefined) { // Incoming
        funders.push({
          address: tx.from,
          amount: tx.value,
          timestamp: new Date(tx.metadata?.blockTimestamp).getTime() / 1000 || 0,
          txHash: tx.hash,
          blockNumber: parseInt(tx.blockNum, 16)
        });
      }
    }
    
    // Sort by timestamp, earliest first
    return funders.sort((a, b) => a.timestamp - b.timestamp);
  }

  private extractTokens(transfers: any[]) {
    const tokenMap = new Map<string, WalletFeatures['tokens'][0]>();
    
    for (const tx of transfers) {
      if (tx.category === 'erc20' && tx.rawContract?.address) {
        const contract = tx.rawContract.address;
        
        if (!tokenMap.has(contract)) {
          tokenMap.set(contract, {
            contract,
            name: tx.asset || 'Unknown',
            symbol: tx.asset || '???',
            decimals: parseInt(tx.rawContract.decimal) || 18,
            interactions: 0,
            firstInteraction: Infinity,
            lastInteraction: 0
          });
        }
        
        const token = tokenMap.get(contract)!;
        token.interactions++;
        
        const timestamp = new Date(tx.metadata?.blockTimestamp).getTime() / 1000 || 0;
        token.firstInteraction = Math.min(token.firstInteraction, timestamp);
        token.lastInteraction = Math.max(token.lastInteraction, timestamp);
      }
    }
    
    return Array.from(tokenMap.values())
      .sort((a, b) => b.interactions - a.interactions);
  }

  private extractSpenders(approvals: any[]) {
    const spenderMap = new Map<string, WalletFeatures['spenders'][0]>();
    
    for (const log of approvals) {
      // Decode spender from topics
      const spender = '0x' + log.topics[2]?.slice(-40);
      
      if (!spender) continue;
      
      if (!spenderMap.has(spender)) {
        const protocol = KNOWN_PROTOCOLS[spender.toLowerCase()];
        
        spenderMap.set(spender, {
          address: spender,
          count: 0,
          protocols: protocol ? [protocol.name] : [],
          firstApproval: Infinity,
          lastApproval: 0
        });
      }
      
      const spenderData = spenderMap.get(spender)!;
      spenderData.count++;
      
      const timestamp = parseInt(log.blockNumber) * 12; // Approximate
      spenderData.firstApproval = Math.min(spenderData.firstApproval, timestamp);
      spenderData.lastApproval = Math.max(spenderData.lastApproval, timestamp);
    }
    
    return Array.from(spenderMap.values())
      .sort((a, b) => b.count - a.count);
  }

  private extractRecipients(transfers: any[]) {
    const recipientMap = new Map<string, { amount: bigint; count: number }>();
    let totalAmount = BigInt(0);
    
    for (const tx of transfers) {
      if (tx.to && tx.value) {
        const to = tx.to;
        const value = BigInt(tx.value);
        
        if (!recipientMap.has(to)) {
          recipientMap.set(to, { amount: BigInt(0), count: 0 });
        }
        
        recipientMap.get(to)!.amount += value;
        recipientMap.get(to)!.count++;
        totalAmount += value;
      }
    }
    
    return Array.from(recipientMap.entries())
      .map(([address, data]) => ({
        address,
        amount: data.amount.toString(),
        count: data.count,
        percentage: totalAmount > 0 ? Number((data.amount * BigInt(100)) / totalAmount) : 0
      }))
      .sort((a, b) => parseInt(b.amount) - parseInt(a.amount));
  }

  private extractCounterparties(transfers: any[], nativeTxs: any[]) {
    const counterpartyMap = new Map<string, { count: number; type: string }>();
    
    for (const tx of [...transfers, ...nativeTxs]) {
      const counterparty = tx.to || tx.from;
      if (!counterparty) continue;
      
      const lowerAddr = counterparty.toLowerCase();
      
      // Determine type
      let type = 'unknown';
      if (KNOWN_CEX.has(lowerAddr)) {
        type = 'cex';
      } else if (KNOWN_PROTOCOLS[lowerAddr]) {
        type = KNOWN_PROTOCOLS[lowerAddr].type;
      }
      
      if (!counterpartyMap.has(counterparty)) {
        counterpartyMap.set(counterparty, { count: 0, type });
      }
      
      counterpartyMap.get(counterparty)!.count++;
    }
    
    return Array.from(counterpartyMap.entries())
      .map(([address, data]) => ({
        address,
        count: data.count,
        type: data.type as any,
        labels: KNOWN_PROTOCOLS[address.toLowerCase()]?.name 
          ? [KNOWN_PROTOCOLS[address.toLowerCase()].name]
          : undefined
      }))
      .sort((a, b) => b.count - a.count);
  }

  private computeActivityBuckets(transfers: any[], nativeTxs: any[]) {
    const buckets = new Array(24).fill(0).map((_, i) => ({ hour: i, count: 0 }));
    
    for (const tx of [...transfers, ...nativeTxs]) {
      const timestamp = new Date(tx.metadata?.blockTimestamp).getTime();
      if (timestamp) {
        const hour = new Date(timestamp).getUTCHours();
        buckets[hour].count++;
      }
    }
    
    return buckets;
  }

  private detectBurstEvents(transfers: any[], nativeTxs: any[]) {
    // Collect all events with timestamps
    const events: Array<{ timestamp: number; type: string }> = [];
    
    for (const tx of [...transfers, ...nativeTxs]) {
      const timestamp = new Date(tx.metadata?.blockTimestamp).getTime() / 1000;
      if (timestamp) {
        events.push({
          timestamp,
          type: tx.category || 'external'
        });
      }
    }
    
    // Sort by time
    events.sort((a, b) => a.timestamp - b.timestamp);
    
    // Sliding window detection
    const bursts: WalletFeatures['burstEvents'] = [];
    const windowSize = 3600; // 1 hour
    const minEvents = 5;
    
    let windowStart = 0;
    
    for (let i = 0; i < events.length; i++) {
      // Move window start if needed
      while (events[i].timestamp - events[windowStart].timestamp > windowSize) {
        windowStart++;
      }
      
      const windowEvents = i - windowStart + 1;
      
      if (windowEvents >= minEvents) {
        // Check if this extends an existing burst
        const lastBurst = bursts[bursts.length - 1];
        
        if (lastBurst && events[windowStart].timestamp - lastBurst.endTime < windowSize) {
          lastBurst.endTime = events[i].timestamp;
          lastBurst.eventCount = windowEvents;
        } else {
          bursts.push({
            id: `Campaign-${String.fromCharCode(65 + bursts.length)}`,
            startTime: events[windowStart].timestamp,
            endTime: events[i].timestamp,
            eventCount: windowEvents,
            walletCount: 1 // Will be updated during clustering
          });
        }
      }
    }
    
    return bursts;
  }

  private buildTokenProfile(tokens: WalletFeatures['tokens']): string[] {
    const profile: string[] = [];
    const totalInteractions = tokens.reduce((sum, t) => sum + t.interactions, 0);
    
    if (tokens.length === 0) {
      profile.push('no-tokens');
    } else if (tokens.length < 3) {
      profile.push('few-tokens');
    } else if (tokens.length > 10) {
      profile.push('diverse-tokens');
    }
    
    // Check for specific patterns
    const hasStablecoin = tokens.some(t => 
      ['USDC', 'USDT', 'DAI', 'BUSD'].includes(t.symbol)
    );
    if (hasStablecoin) profile.push('stablecoin-user');
    
    const hasDEX = tokens.some(t => 
      ['UNI', 'SUSHI', 'CAKE', 'JOE'].includes(t.symbol)
    );
    if (hasDEX) profile.push('dex-trader');
    
    return profile;
  }

  private calculateConsolidationScore(recipients: WalletFeatures['topRecipients']) {
    if (recipients.length === 0) return 0;
    
    // If top recipient gets >50% of funds, high consolidation
    const topPercentage = recipients[0].percentage;
    
    if (topPercentage > 80) return 100;
    if (topPercentage > 60) return 80;
    if (topPercentage > 40) return 60;
    if (topPercentage > 20) return 40;
    return 20;
  }

  private calculateCounterpartyScore(counterparties: WalletFeatures['counterparties']) {
    // Score based on interaction with known protocols
    let score = 0;
    
    for (const cp of counterparties.slice(0, 5)) {
      if (cp.type === 'router') score += 10;
      if (cp.type === 'bridge') score += 15;
      if (cp.type === 'cex') score += 5;
    }
    
    return Math.min(100, score);
  }

  private computeTokenFingerprint(tokens: WalletFeatures['tokens']): string {
    // Create hash from sorted token addresses
    const sorted = tokens.map(t => t.contract.toLowerCase()).sort();
    return sorted.join(',');
  }

  private computeSpenderFingerprint(spenders: WalletFeatures['spenders']): string {
    const sorted = spenders.map(s => s.address.toLowerCase()).sort();
    return sorted.join(',');
  }

  private getRpcUrl(): string {
    const rpcUrls: Record<string, string> = {
      'ethereum': 'https://eth-mainnet.g.alchemy.com/v2',
      'linea': 'https://linea-mainnet.g.alchemy.com/v2',
      'arbitrum': 'https://arb-mainnet.g.alchemy.com/v2',
      'optimism': 'https://opt-mainnet.g.alchemy.com/v2',
      'polygon': 'https://polygon-mainnet.g.alchemy.com/v2',
      'base': 'https://base-mainnet.g.alchemy.com/v2'
    };
    
    return rpcUrls[this.chain] || rpcUrls['linea'];
  }
}

export default FeatureExtractor;
