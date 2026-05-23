import type { McpToolHandler, McpToolResult } from './types.js';
import { default as axios } from 'axios';
import { logMcpRequest } from './mcpLogger.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ok(text: string): McpToolResult {
  return { content: [{ type: 'text', text }] };
}

function err(message: string): McpToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

const API_BASE = process.env.FUNDTRACER_API_URL || 'https://api.fundtracer.xyz';

/** Module-level context set by withLogging — carries the real end-user identity */
let _mcpCtx: any = null;

function api() {
  const key = _mcpCtx?.apiKey || process.env.FUNDTRACER_MCP_API_KEY || '';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'x-auth-token': key,
    'Content-Type': 'application/json',
  };
  if (_mcpCtx?.userId) {
    headers['X-MCP-UserId'] = _mcpCtx.userId;
  }
  return axios.create({
    baseURL: API_BASE,
    timeout: 60000,
    headers,
  });
}

// ---------------------------------------------------------------------------
// 1. analyze_wallet
// ---------------------------------------------------------------------------
const analyzeWallet: McpToolHandler = async (args, ctx) => {
  const { address, chainId, transactionLimit } = args as {
    address: string; chainId: string; transactionLimit?: number;
  };

  try {
    const res = await api().post('/api/analyze/wallet', {
      address,
      chain: chainId,
      options: { limit: transactionLimit || 500 },
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message;
    return err(`Wallet analysis failed: ${msg}`);
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
    const res = await api().post('/api/analyze/funding-tree', {
      address,
      chain: chainId,
      maxDepth,
      direction,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message;
    return err(`Fund tracing failed: ${msg}`);
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
    const res = await api().post('/api/analyze/compare', {
      addresses: addrList,
      chain: chainId,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message;
    return err(`Wallet comparison failed: ${msg}`);
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
    const res = await api().post('/api/analyze/contract', {
      contractAddress,
      chain: chainId,
      maxInteractors,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message;
    return err(`Contract analysis failed: ${msg}`);
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
    const res = await api().post('/api/analyze/sybil', {
      addresses: addrList,
      chain: chainId,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message;
    return err(`Sybil detection failed: ${msg}`);
  }
};

// ---------------------------------------------------------------------------
// 6. get_portfolio
// ---------------------------------------------------------------------------
const getPortfolio: McpToolHandler = async (args, ctx) => {
  const { address, chainId } = args as { address: string; chainId: string };

  try {
    const res = await api().get(`/api/portfolio/${address}`, {
      params: { chain: chainId },
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message;
    return err(`Portfolio fetch failed: ${msg}`);
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
    const res = await api().post('/api/history', {
      wallet: address,
      blockchain: chainId,
      pageToken: null,
      filters: {},
    });

    const txs = (res.data.transactions || []).slice(0, limit as number);
    return ok(JSON.stringify({
      address,
      chainId,
      transactions: txs,
      totalCount: res.data.transactions?.length || 0,
    }, null, 2));
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message;
    return err(`Transaction fetch failed: ${msg}`);
  }
};

// ---------------------------------------------------------------------------
// 8. lookup_entity
// ---------------------------------------------------------------------------
const lookupEntity: McpToolHandler = async (args, ctx) => {
  const { query, chainId } = args as { query: string; chainId?: string };
  const chain = chainId || 'ethereum';

  try {
    // Try as address lookup first
    if (/^0x[a-fA-F0-9]{40}$/.test(query) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query)) {
      const res = await api().get(`/api/entities/${query}`, {
        params: { chain },
      });
      return ok(JSON.stringify(res.data, null, 2));
    }

    // Search by name
    const res = await api().get('/api/entities/search', {
      params: { q: query, chain },
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    if (error.response?.status === 404) {
      return ok(JSON.stringify({ query, label: 'Unknown address', chain }, null, 2));
    }
    const msg = error.response?.data?.error || error.message;
    return err(`Entity lookup failed: ${msg}`);
  }
};

// ---------------------------------------------------------------------------
// 9. get_gas_prices
// ---------------------------------------------------------------------------
const getGasPrices: McpToolHandler = async (args, ctx) => {
  const { chainId } = args as { chainId?: string };

  try {
    const res = await api().get('/api/gas', {
      params: chainId ? { chain: chainId } : {},
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message;
    return err(`Gas price fetch failed: ${msg}`);
  }
};

// ---------------------------------------------------------------------------
// 10. get_token_info
// ---------------------------------------------------------------------------
const getTokenInfo: McpToolHandler = async (args, ctx) => {
  const { tokenAddress, chainId } = args as { tokenAddress: string; chainId: string };

  try {
    const res = await api().get('/api/market/coins', {
      params: { address: tokenAddress, chainId },
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message;
    return err(`Token info fetch failed: ${msg}`);
  }
};

/**
 * Wraps a tool handler with MCP request logging to Firestore.
 * Logs success/error, args, duration, and userId for the History tab.
 */
function withLogging(toolName: string, handler: McpToolHandler): McpToolHandler {
  return async (args: any, ctx: any) => {
    _mcpCtx = ctx; // Set context so api() passes X-MCP-UserId on internal calls
    const start = Date.now();
    try {
      const result = await handler(args, ctx);
      logMcpRequest({
        userId: ctx.userId,
        toolName,
        args: JSON.stringify(args).substring(0, 500),
        status: result.isError ? 'error' : 'success',
        responsePreview: JSON.stringify(result).substring(0, 300),
        duration: Date.now() - start,
        createdAt: Date.now(),
        keyPrefix: ctx.apiKeyPrefix,
      });
      return result;
    } catch (error: any) {
      logMcpRequest({
        userId: ctx.userId,
        toolName,
        args: JSON.stringify(args).substring(0, 500),
        status: 'error',
        responsePreview: error.message.substring(0, 300),
        duration: Date.now() - start,
        createdAt: Date.now(),
        keyPrefix: ctx.apiKeyPrefix,
      });
      throw error;
    } finally {
      _mcpCtx = null; // Clear context
    }
  };
}

// ---------------------------------------------------------------------------
// Handler registry
// ---------------------------------------------------------------------------
export const TOOL_HANDLERS: Record<string, McpToolHandler> = {
  analyze_wallet: withLogging('analyze_wallet', analyzeWallet),
  trace_funds: withLogging('trace_funds', traceFunds),
  compare_wallets: withLogging('compare_wallets', compareWallets),
  analyze_contract: withLogging('analyze_contract', analyzeContract),
  detect_sybil_clusters: withLogging('detect_sybil_clusters', detectSybilClusters),
  get_portfolio: withLogging('get_portfolio', getPortfolio),
  get_transactions: withLogging('get_transactions', getTransactions),
  lookup_entity: withLogging('lookup_entity', lookupEntity),
  get_gas_prices: withLogging('get_gas_prices', getGasPrices),
  get_token_info: withLogging('get_token_info', getTokenInfo),
};
