import type { McpToolHandler, McpToolResult } from './types.js';

// ---------------------------------------------------------------------------
// Helper: format a result consistently
// ---------------------------------------------------------------------------
function ok(text: string): McpToolResult {
  return { content: [{ type: 'text', text }] };
}

function err(message: string): McpToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

// ---------------------------------------------------------------------------
// 1. analyze_wallet
// ---------------------------------------------------------------------------
const analyzeWallet: McpToolHandler = async (args, ctx) => {
  const { address, chainId, transactionLimit } = args as {
    address: string; chainId: string; transactionLimit?: number;
  };

  try {
    const { WalletAnalyzer } = await import('fundtracer-core');
    const analyzer = new WalletAnalyzer(buildApiKeyConfig(), (progress) => {
      console.error(`[MCP] analyze_wallet ${address}: ${progress.stage} ${progress.current}/${progress.total}`);
    });

    const result = await analyzer.analyze(address, chainId as any, {
      transactionLimit: (transactionLimit as number) || 500,
    });

    return ok(JSON.stringify({
      address: result.wallet.address,
      chain: chainId,
      balanceEth: result.wallet.balanceInEth,
      txCount: result.wallet.txCount,
      isContract: result.wallet.isContract,
      riskScore: result.overallRiskScore,
      riskLevel: result.riskLevel,
      suspiciousIndicators: result.suspiciousIndicators.map(i => ({
        type: i.type,
        severity: i.severity,
        description: i.description,
        score: i.score,
      })),
      topFundingSources: result.summary.topFundingSources.slice(0, 5),
      topFundingDestinations: result.summary.topFundingDestinations.slice(0, 5),
      projectsInteracted: result.projectsInteracted.slice(0, 10),
      activityPeriodDays: result.summary.activityPeriodDays,
      averageTxPerDay: result.summary.averageTxPerDay,
    }, null, 2));
  } catch (error: any) {
    return err(`Wallet analysis failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// 2. trace_funds
// ---------------------------------------------------------------------------
const traceFunds: McpToolHandler = async (args, ctx) => {
  const { address, chainId, maxDepth = 3, direction = 'both' } = args as {
    address: string; chainId: string; maxDepth?: number; direction?: string;
  };

  try {
    const { WalletAnalyzer } = await import('fundtracer-core');
    const analyzer = new WalletAnalyzer(buildApiKeyConfig());

    const treeConfig: any = { maxDepth, direction };
    if (chainId === 'solana') {
      const { SolanaFundingTreeService } = await import('../services/SolanaFundingTreeService.js');
      const heliusKey = process.env.HELIUS_KEY_1 || process.env.DEFAULT_ALCHEMY_API_KEY || '';
      const svc = new SolanaFundingTreeService(heliusKey.startsWith('http') ? process.env.DEFAULT_ALCHEMY_API_KEY || '' : heliusKey);
      const tree = await svc.buildFundingTree(address, maxDepth as number);
      return ok(JSON.stringify(tree, null, 2));
    }

    const tree = await analyzer.buildFundingTree(address, chainId as any, { treeConfig });

    return ok(JSON.stringify({
      sources: summarizeTree(tree.fundingSources),
      destinations: summarizeTree(tree.fundingDestinations),
    }, null, 2));
  } catch (error: any) {
    return err(`Fund tracing failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// 3. compare_wallets
// ---------------------------------------------------------------------------
const compareWallets: McpToolHandler = async (args, ctx) => {
  const { addresses, chainId } = args as { addresses: string; chainId: string };
  const addrList = addresses.split(',').map((a: string) => a.trim()).filter(Boolean);

  if (addrList.length < 2) return err('At least 2 addresses required');

  try {
    const { WalletAnalyzer } = await import('fundtracer-core');
    const analyzer = new WalletAnalyzer(buildApiKeyConfig());

    const result = await analyzer.compareWallets(addrList, chainId as any);

    return ok(JSON.stringify({
      wallets: addrList,
      chain: chainId,
      correlationScore: result.correlationScore,
      isSybilLikely: result.isSybilLikely,
      commonFundingSources: result.commonFundingSources,
      commonDestinations: result.commonDestinations,
      sharedProjects: result.sharedProjects,
      directTransfers: result.directTransfers.length,
    }, null, 2));
  } catch (error: any) {
    return err(`Wallet comparison failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// 4. analyze_contract
// ---------------------------------------------------------------------------
const analyzeContract: McpToolHandler = async (args, ctx) => {
  const { contractAddress, chainId, maxInteractors = 100 } = args as {
    contractAddress: string; chainId: string; maxInteractors?: number;
  };

  try {
    const { WalletAnalyzer } = await import('fundtracer-core');
    const analyzer = new WalletAnalyzer(buildApiKeyConfig());

    const result = await analyzer.analyzeContract(contractAddress, chainId as any, {
      maxInteractors: maxInteractors as number,
    });

    return ok(JSON.stringify({
      contractAddress,
      chain: chainId,
      totalInteractors: result.totalInteractors,
      riskScore: result.riskScore,
      sharedFundingGroups: result.sharedFundingGroups.slice(0, 20),
      suspiciousPatterns: result.suspiciousPatterns,
    }, null, 2));
  } catch (error: any) {
    return err(`Contract analysis failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// 5. detect_sybil_clusters
// ---------------------------------------------------------------------------
const detectSybilClusters: McpToolHandler = async (args, ctx) => {
  const { addresses, chainId } = args as { addresses: string; chainId: string };
  const addrList = addresses.split(',').map((a: string) => a.trim()).filter(Boolean);

  if (addrList.length < 3) return err('At least 3 addresses required for cluster detection');

  try {
    const { SybilAnalyzer } = await import('fundtracer-core');
    const alchemyKey = process.env.DEFAULT_ALCHEMY_API_KEY || '';
    const sybilConfig = buildSybilConfig();

    const analyzer = new SybilAnalyzer(chainId as any, sybilConfig);
    const result = await analyzer.analyzeAddresses(addrList, { minClusterSize: 2 });

    return ok(JSON.stringify({
      chain: chainId,
      totalWallets: result.totalInteractors,
      uniqueFundingSources: result.uniqueFundingSources,
      flaggedClusters: result.flaggedClusters.map(c => ({
        fundingSource: c.fundingSource,
        fundingSourceLabel: c.fundingSourceLabel,
        walletCount: c.totalWallets,
        sybilScore: c.sybilScore,
        flags: c.flags,
        timeSpanHours: c.timeSpan.durationHours,
      })),
      summary: result.summary,
    }, null, 2));
  } catch (error: any) {
    return err(`Sybil detection failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// 6. get_portfolio
// ---------------------------------------------------------------------------
const getPortfolio: McpToolHandler = async (args, ctx) => {
  const { address, chainId } = args as { address: string; chainId: string };

  try {
    if (chainId === 'solana') {
      const { solanaPortfolioService } = await import('../services/SolanaPortfolioService.js');
      const portfolio = await solanaPortfolioService.getPortfolio(address);
      return ok(JSON.stringify(portfolio, null, 2));
    }

    return ok(JSON.stringify({
      address,
      chainId,
      note: 'For EVM chain portfolio data, use the FundTracer REST API: GET /api/portfolio?address=' + address + '&chain=' + chainId,
    }, null, 2));
  } catch (error: any) {
    return err(`Portfolio fetch failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// 7. get_transactions
// ---------------------------------------------------------------------------
const getTransactions: McpToolHandler = async (args, ctx) => {
  const { address, chainId, limit = 50 } = args as {
    address: string; chainId: string; limit?: number;
  };

  try {
    const { WalletAnalyzer } = await import('fundtracer-core');
    const analyzer = new WalletAnalyzer(buildApiKeyConfig());

    const result = await analyzer.analyze(address, chainId as any, {
      transactionLimit: limit as number,
      skipFundingTree: true,
    });

    return ok(JSON.stringify({
      address,
      chainId,
      transactions: result.transactions.slice(0, limit as number).map(tx => ({
        hash: tx.hash,
        blockNumber: tx.blockNumber,
        timestamp: tx.timestamp,
        from: tx.from,
        to: tx.to,
        value: tx.valueInEth,
        status: tx.status,
        category: tx.category,
        methodName: tx.methodName,
      })),
      totalCount: result.transactions.length,
    }, null, 2));
  } catch (error: any) {
    return err(`Transaction fetch failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// 8. lookup_entity
// ---------------------------------------------------------------------------
const lookupEntity: McpToolHandler = async (args, ctx) => {
  const { query, chainId } = args as { query: string; chainId?: string };

  try {
    const { EntityService } = await import('../services/EntityService.js');
    const chain = chainId || 'ethereum';

    // Try as address first
    if (/^0x[a-fA-F0-9]{40}$/.test(query) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query)) {
      const entity = EntityService.lookupEntity(chain, query);
      if (entity) return ok(JSON.stringify(entity, null, 2));
      return ok(JSON.stringify({ address: query, label: 'Unknown address', chain }, null, 2));
    }

    // Search by name — use the imported searchEntities from data/entities
    const { searchEntities } = await import('../data/entities.js');
    const results = searchEntities(query);
    return ok(JSON.stringify({ query, results: results.length > 0 ? results.slice(0, 20) : 'No entities found' }, null, 2));
  } catch (error: any) {
    return err(`Entity lookup failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// 9. get_gas_prices
// ---------------------------------------------------------------------------
const getGasPrices: McpToolHandler = async (args, ctx) => {
  try {
    const { default: axios } = await import('axios');
    const alchemyKey = process.env.DEFAULT_ALCHEMY_API_KEY;

    if (!alchemyKey) return err('Alchemy API key not configured');

    const chains: Record<string, string> = {
      ethereum: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      base: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      optimism: `https://opt-mainnet.g.alchemy.com/v2/${alchemyKey}`,
      polygon: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    };

    const results: Record<string, any> = {};
    for (const [chain, url] of Object.entries(chains)) {
      try {
        const res = await axios.post(url, {
          jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1,
        }, { timeout: 5000 });
        const gasWei = parseInt(res.data.result, 16);
        results[chain] = {
          gasPriceGwei: (gasWei / 1e9).toFixed(2),
          gasPriceWei: gasWei,
        };
      } catch {
        results[chain] = { error: 'Unavailable' };
      }
    }

    return ok(JSON.stringify(results, null, 2));
  } catch (error: any) {
    return err(`Gas price fetch failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// 10. get_token_info
// ---------------------------------------------------------------------------
const getTokenInfo: McpToolHandler = async (args, ctx) => {
  const { tokenAddress, chainId } = args as { tokenAddress: string; chainId: string };

  try {
    const { default: axios } = await import('axios');
    const coingeckoUrl = 'https://api.coingecko.com/api/v3';

    // Fetch from CoinGecko by address
    const platformMap: Record<string, string> = {
      ethereum: 'ethereum',
      base: 'base',
      arbitrum: 'arbitrum-ethereum',
      optimism: 'optimistic-ethereum',
      polygon: 'polygon-pos',
    };

    const platform = platformMap[chainId];
    if (platform) {
      const res = await axios.get(`${coingeckoUrl}/coins/${platform}/contract/${tokenAddress}`, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' },
      });

      const d = res.data;
      return ok(JSON.stringify({
        name: d.name,
        symbol: d.symbol,
        marketCapRank: d.market_cap_rank,
        currentPrice: d.market_data?.current_price?.usd || null,
        marketCap: d.market_data?.market_cap?.usd || null,
        totalVolume: d.market_data?.total_volume?.usd || null,
        priceChange24h: d.market_data?.price_change_percentage_24h || null,
        description: d.description?.en?.substring(0, 500) || '',
      }, null, 2));
    }

    // Solana / unsupported: use DexScreener
    const dsRes = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
      timeout: 5000,
    });

    return ok(JSON.stringify(dsRes.data?.pairs?.slice(0, 5) || { note: 'No data found' }, null, 2));
  } catch (error: any) {
    return err(`Token info fetch failed: ${error.message}`);
  }
};

// ---------------------------------------------------------------------------
// Handler registry
// ---------------------------------------------------------------------------
export const TOOL_HANDLERS: Record<string, McpToolHandler> = {
  analyze_wallet: analyzeWallet,
  trace_funds: traceFunds,
  compare_wallets: compareWallets,
  analyze_contract: analyzeContract,
  detect_sybil_clusters: detectSybilClusters,
  get_portfolio: getPortfolio,
  get_transactions: getTransactions,
  lookup_entity: lookupEntity,
  get_gas_prices: getGasPrices,
  get_token_info: getTokenInfo,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function buildApiKeyConfig() {
  const alchemyKeys = process.env.ALCHEMY_API_KEYS?.split(',') || [];
  return {
    alchemy: process.env.DEFAULT_ALCHEMY_API_KEY || alchemyKeys[0] || '',
    moralis: process.env.MORALIS_API_KEY || '',
    etherscan: process.env.ETHERSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY || '',
    lineascan: process.env.LINEASCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY || '',
    arbiscan: process.env.ARBISCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY || '',
    basescan: process.env.BASESCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY || '',
    optimism: process.env.OPTIMISM_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY || '',
    polygonscan: process.env.POLYGONSCAN_API_KEY || process.env.DEFAULT_ETHERSCAN_API_KEY || '',
  };
}

function buildSybilConfig() {
  const alchemyKeys = process.env.ALCHEMY_API_KEYS?.split(',') || [];
  const defaultKey = process.env.DEFAULT_ALCHEMY_API_KEY || alchemyKeys[0] || '';
  return {
    defaultKey,
    moralisKey: process.env.MORALIS_API_KEY || '',
    contractKeys: [defaultKey, ...alchemyKeys].filter(Boolean),
    walletKeys: [defaultKey, ...alchemyKeys].filter(Boolean),
  };
}

function summarizeTree(node: any): any {
  if (!node) return null;
  return {
    address: node.address,
    label: node.label,
    totalValueInEth: node.totalValueInEth,
    txCount: node.txCount,
    suspiciousScore: node.suspiciousScore,
    suspiciousReasons: node.suspiciousReasons,
    children: node.children?.map(summarizeTree) || [],
  };
}
