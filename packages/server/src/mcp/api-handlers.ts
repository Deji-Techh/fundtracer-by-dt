import type { McpToolHandler, McpToolResult } from './types.js';
import { default as axios } from 'axios';
import { logMcpRequest } from './mcpLogger.js';
import { tryResolveAddress } from '../utils/nameResolver.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ok(text: string): McpToolResult {
  return { content: [{ type: 'text', text }] };
}

function err(message: string): McpToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

function extractApiError(error: any): string {
  return error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Unknown error';
}

async function resolveAddressInput(input: string): Promise<{ resolved?: string; error?: McpToolResult }> {
  const { resolved, error } = await tryResolveAddress(input);
  if (error) return { error: err(error) };
  return { resolved };
}

async function routeGet(path: string, params?: Record<string, any>) {
  return api().get(path, { params });
}

async function routePost(path: string, body?: any, params?: Record<string, any>) {
  return api().post(path, body, { params });
}

async function routePatch(path: string, body?: any, params?: Record<string, any>) {
  return api().patch(path, body, { params });
}

async function routeDelete(path: string, params?: Record<string, any>) {
  return api().delete(path, { params });
}

const API_BASE = process.env.FUNDTRACER_API_URL || 'https://api.fundtracer.xyz';

/** Module-level context set by withLogging — carries the real end-user identity */
let _mcpCtx: any = null;

function api() {
  const key = _mcpCtx?.apiKey || process.env.FUNDTRACER_MCP_API_KEY || '';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  if (_mcpCtx?.userId) {
    headers['X-MCP-UserId'] = _mcpCtx.userId;
    // x-auth-token survives Cloudflare header stripping; embed userId for scope bypass
    headers['x-auth-token'] = `${key}:${_mcpCtx.userId}`;
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
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;

  try {
    const res = await api().get(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}`, {
      params: { chain: chainId },
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = extractApiError(error);
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
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;

  try {
    const res = await api().post('/api/history', {
      wallet: resolvedAddr || address,
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
    const msg = extractApiError(error);
    return err(`Transaction fetch failed: ${msg}`);
  }
};

// ---------------------------------------------------------------------------
// 8. lookup_entity
// ---------------------------------------------------------------------------
const lookupEntity: McpToolHandler = async (args, ctx) => {
  const { query, chainId } = args as { query: string; chainId?: string };
  const chain = chainId || 'ethereum';
  const { resolved: resolvedQuery } = await resolveAddressInput(query);
  const lookupValue = resolvedQuery || query;

  try {
    // Try as address lookup first
    if (/^0x[a-fA-F0-9]{40}$/.test(lookupValue) || /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(lookupValue)) {
      const res = await api().get(`/api/entities/${lookupValue}`, {
        params: { chain },
      });
      return ok(JSON.stringify(res.data, null, 2));
    }

    // Search by name
    const res = await api().get('/api/entities/search', {
      params: { q: lookupValue, chain },
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    if (error.response?.status === 404) {
      return ok(JSON.stringify({ query: lookupValue, label: 'Unknown address', chain }, null, 2));
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
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(tokenAddress);
  if (resolveErr) return resolveErr;

  try {
    const res = await routeGet(`/api/tokens/${encodeURIComponent(resolvedAddr || tokenAddress)}`, {
      chain: chainId,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    const msg = extractApiError(error);
    return err(`Token info fetch failed: ${msg}`);
  }
};

// ---------------------------------------------------------------------------
// 11. resolve_name
// ---------------------------------------------------------------------------
const resolveName: McpToolHandler = async (args, ctx) => {
  const { input } = args as { input: string };
  const { resolved, error } = await tryResolveAddress(input);
  const normalizedInput = typeof input === 'string' ? input.trim().toLowerCase() : '';
  const normalizedResolved = typeof resolved === 'string' ? resolved.toLowerCase() : '';

  return ok(JSON.stringify({
    input,
    resolved,
    isAddress: /^0x[a-fA-F0-9]{40}$/.test(resolved),
    isResolvedName: normalizedResolved !== normalizedInput,
    ...(error ? { warning: error } : {}),
  }, null, 2));
};

// ---------------------------------------------------------------------------
// 12. get_transaction_detail
// ---------------------------------------------------------------------------
const getTransactionDetail: McpToolHandler = async (args, ctx) => {
  const { chainId, hash } = args as { chainId: string; hash: string };
  try {
    const res = await routeGet(`/api/tx/${encodeURIComponent(chainId)}/${encodeURIComponent(hash)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Transaction detail fetch failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 13. get_transaction_history
// ---------------------------------------------------------------------------
const getTransactionHistory: McpToolHandler = async (args, ctx) => {
  const { address, chainId, pageToken = null, filters = {} } = args as {
    address: string; chainId: string; pageToken?: string | null; filters?: Record<string, any>;
  };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;

  try {
    const res = await routePost('/api/history', {
      wallet: resolvedAddr || address,
      blockchain: chainId,
      pageToken,
      filters,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Transaction history fetch failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 14. analyze_cex_flow
// ---------------------------------------------------------------------------
const analyzeCEXFlow: McpToolHandler = async (args, ctx) => {
  const { walletAddress, chainId, cexName, depth } = args as {
    walletAddress: string; chainId: string; cexName?: string; depth?: number;
  };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(walletAddress);
  if (resolveErr) return resolveErr;

  try {
    const res = await routePost('/api/analyze/cex-flow', {
      walletAddress: resolvedAddr || walletAddress,
      chain: chainId,
      ...(cexName ? { cexName } : {}),
      ...(depth !== undefined ? { depth } : {}),
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`CEX flow analysis failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 15. analyze_sybil_addresses
// ---------------------------------------------------------------------------
const analyzeSybilAddresses: McpToolHandler = async (args, ctx) => {
  const { addresses, chainId, txHash } = args as { addresses: string; chainId: string; txHash?: string };
  const list = addresses.split(',').map(a => a.trim()).filter(Boolean);
  const resolved: string[] = [];
  for (const a of list) {
    const r = await resolveAddressInput(a);
    if (r.error) return r.error;
    resolved.push(r.resolved || a);
  }

  try {
    const res = await routePost('/api/analyze/sybil-addresses', {
      addresses: resolved,
      chain: chainId,
      ...(txHash ? { txHash } : {}),
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Sybil address analysis failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 16. search_contracts / lookup_contract / contract stats
// ---------------------------------------------------------------------------
const searchContracts: McpToolHandler = async (args) => {
  const { query } = args as { query: string };
  try {
    const res = await routeGet('/api/contracts/search', { q: query });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Contract search failed: ${extractApiError(error)}`);
  }
};

const lookupContract: McpToolHandler = async (args) => {
  const { address } = args as { address: string };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/contracts/lookup/${encodeURIComponent(resolvedAddr || address)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Contract lookup failed: ${extractApiError(error)}`);
  }
};

const getContractStats: McpToolHandler = async () => {
  try {
    const res = await routeGet('/api/contracts/stats');
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Contract stats fetch failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 17. token and market tooling
// ---------------------------------------------------------------------------
const searchTokens: McpToolHandler = async (args) => {
  const { query } = args as { query: string };
  try {
    const res = await routeGet('/api/tokens/search', { q: query });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Token search failed: ${extractApiError(error)}`);
  }
};

const getMarketStats: McpToolHandler = async () => {
  try {
    const res = await routeGet('/api/market/stats');
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Market stats fetch failed: ${extractApiError(error)}`);
  }
};

const getMarketCoins: McpToolHandler = async (args) => {
  const { chainId, page = 1, perPage = 100 } = args as { chainId?: string; page?: number; perPage?: number };
  try {
    const res = await routeGet('/api/market/coins', {
      chain: chainId || 'all',
      page,
      per_page: perPage,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Market coins fetch failed: ${extractApiError(error)}`);
  }
};

const getTokenChart: McpToolHandler = async (args) => {
  const { tokenAddress, chainId, coinId, days = 7 } = args as {
    tokenAddress: string; chainId: string; coinId: string; days?: number;
  };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(tokenAddress);
  if (resolveErr) return resolveErr;

  try {
    const res = await routeGet(`/api/tokens/${encodeURIComponent(resolvedAddr || tokenAddress)}/chart`, {
      chain: chainId,
      coinId,
      days,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Token chart fetch failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 18. DEX Screener tools
// ---------------------------------------------------------------------------
const getDexScreenerLatestProfiles: McpToolHandler = async () => {
  try {
    const res = await routeGet('/api/dexscreener/profiles/latest');
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`DEX Screener profiles fetch failed: ${extractApiError(error)}`);
  }
};

const getDexScreenerBoosts: McpToolHandler = async () => {
  try {
    const res = await routeGet('/api/dexscreener/boosts/top');
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`DEX Screener boosts fetch failed: ${extractApiError(error)}`);
  }
};

const searchDexScreenerPairs: McpToolHandler = async (args) => {
  const { query } = args as { query: string };
  try {
    const res = await routeGet('/api/dexscreener/search', { q: query });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`DEX Screener search failed: ${extractApiError(error)}`);
  }
};

const getDexScreenerTokenDetails: McpToolHandler = async (args) => {
  const { chainId, tokenAddress } = args as { chainId: string; tokenAddress: string };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(tokenAddress);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/dexscreener/token/${encodeURIComponent(chainId)}/${encodeURIComponent(resolvedAddr || tokenAddress)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`DEX Screener token fetch failed: ${extractApiError(error)}`);
  }
};

const getDexScreenerTokenPairs: McpToolHandler = async (args) => {
  const { chainId, tokenAddress } = args as { chainId: string; tokenAddress: string };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(tokenAddress);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/dexscreener/pairs/${encodeURIComponent(chainId)}/${encodeURIComponent(resolvedAddr || tokenAddress)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`DEX Screener pairs fetch failed: ${extractApiError(error)}`);
  }
};

const getDexScreenerTrending: McpToolHandler = async () => {
  try {
    const res = await routeGet('/api/dexscreener/trending');
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`DEX Screener trending fetch failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 19. Scan history
// ---------------------------------------------------------------------------
const getScanHistory: McpToolHandler = async () => {
  try {
    const res = await routeGet('/api/scan-history');
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Scan history fetch failed: ${extractApiError(error)}`);
  }
};

const getScanHistoryStats: McpToolHandler = async () => {
  try {
    const res = await routeGet('/api/scan-history/stats');
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Scan history stats fetch failed: ${extractApiError(error)}`);
  }
};

const saveScanHistoryItem: McpToolHandler = async (args) => {
  try {
    const res = await routePost('/api/scan-history', args);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Scan history save failed: ${extractApiError(error)}`);
  }
};

const syncScanHistory: McpToolHandler = async (args) => {
  const { items } = args as { items: any[] };
  try {
    const res = await routePost('/api/scan-history/sync', { items });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Scan history sync failed: ${extractApiError(error)}`);
  }
};

const deleteScanHistoryItem: McpToolHandler = async (args) => {
  const { address } = args as { address: string };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeDelete(`/api/scan-history/${encodeURIComponent(resolvedAddr || address)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Scan history delete failed: ${extractApiError(error)}`);
  }
};

const clearScanHistory: McpToolHandler = async () => {
  try {
    const res = await routeDelete('/api/scan-history');
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Scan history clear failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 20. Rooms / investigation collaboration
// ---------------------------------------------------------------------------
const listRooms: McpToolHandler = async () => {
  try {
    const res = await routeGet('/api/rooms');
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room listing failed: ${extractApiError(error)}`);
  }
};

const getRoomDetails: McpToolHandler = async (args) => {
  const { roomId } = args as { roomId: string };
  try {
    const res = await routeGet(`/api/rooms/${encodeURIComponent(roomId)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room details fetch failed: ${extractApiError(error)}`);
  }
};

const createRoom: McpToolHandler = async (args) => {
  try {
    const res = await routePost('/api/rooms', args);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room creation failed: ${extractApiError(error)}`);
  }
};

const updateRoom: McpToolHandler = async (args) => {
  const { roomId, ...body } = args as Record<string, any>;
  try {
    const res = await routePatch(`/api/rooms/${encodeURIComponent(roomId)}`, body);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room update failed: ${extractApiError(error)}`);
  }
};

const deleteRoom: McpToolHandler = async (args) => {
  const { roomId } = args as { roomId: string };
  try {
    const res = await routeDelete(`/api/rooms/${encodeURIComponent(roomId)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room delete failed: ${extractApiError(error)}`);
  }
};

const listRoomMessages: McpToolHandler = async (args) => {
  const { roomId, limit = 50, before } = args as { roomId: string; limit?: number; before?: number };
  try {
    const params: Record<string, any> = { limit };
    if (before !== undefined) params.before = before;
    const res = await routeGet(`/api/rooms/${encodeURIComponent(roomId)}/messages`, params);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room messages fetch failed: ${extractApiError(error)}`);
  }
};

const sendRoomMessage: McpToolHandler = async (args) => {
  const { roomId, content, tempId } = args as { roomId: string; content: string; tempId?: string };
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/messages`, { content, tempId });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room message send failed: ${extractApiError(error)}`);
  }
};

const joinRoom: McpToolHandler = async (args) => {
  const { roomId, inviteCode } = args as { roomId: string; inviteCode?: string };
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/join`, inviteCode ? { inviteCode } : {});
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room join failed: ${extractApiError(error)}`);
  }
};

const leaveRoom: McpToolHandler = async (args) => {
  const { roomId } = args as { roomId: string };
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/leave`, {});
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room leave failed: ${extractApiError(error)}`);
  }
};

const removeRoomMember: McpToolHandler = async (args) => {
  const { roomId, uid } = args as { roomId: string; uid: string };
  try {
    const res = await routeDelete(`/api/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(uid)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room member removal failed: ${extractApiError(error)}`);
  }
};

const promoteRoomMember: McpToolHandler = async (args) => {
  const { roomId, uid, role } = args as { roomId: string; uid: string; role: string };
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(uid)}/role`, { role });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room member promotion failed: ${extractApiError(error)}`);
  }
};

const createRoomInvite: McpToolHandler = async (args) => {
  const { roomId, expiresInHours, maxUses } = args as { roomId: string; expiresInHours?: number; maxUses?: number };
  try {
    const body: Record<string, any> = {};
    if (expiresInHours !== undefined) body.expiresInHours = expiresInHours;
    if (maxUses !== undefined) body.maxUses = maxUses;
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/invite`, body);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room invite creation failed: ${extractApiError(error)}`);
  }
};

const listRoomPins: McpToolHandler = async (args) => {
  const { roomId } = args as { roomId: string };
  try {
    const res = await routeGet(`/api/rooms/${encodeURIComponent(roomId)}/pins`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room pins fetch failed: ${extractApiError(error)}`);
  }
};

const pinRoomMessage: McpToolHandler = async (args) => {
  const { roomId, messageId, category, note } = args as { roomId: string; messageId: string; category?: string; note?: string };
  try {
    const res = await routePost(`/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/pin`, { category, note });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room pin failed: ${extractApiError(error)}`);
  }
};

const unpinRoomMessage: McpToolHandler = async (args) => {
  const { roomId, messageId } = args as { roomId: string; messageId: string };
  try {
    const res = await routeDelete(`/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}/pin`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room unpin failed: ${extractApiError(error)}`);
  }
};

const editRoomMessage: McpToolHandler = async (args) => {
  const { roomId, messageId, content } = args as { roomId: string; messageId: string; content: string };
  try {
    const res = await routePatch(`/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}`, { content });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room message edit failed: ${extractApiError(error)}`);
  }
};

const deleteRoomMessage: McpToolHandler = async (args) => {
  const { roomId, messageId } = args as { roomId: string; messageId: string };
  try {
    const res = await routeDelete(`/api/rooms/${encodeURIComponent(roomId)}/messages/${encodeURIComponent(messageId)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room message delete failed: ${extractApiError(error)}`);
  }
};

const exportRoom: McpToolHandler = async (args) => {
  const { roomId } = args as { roomId: string };
  try {
    const res = await routeGet(`/api/rooms/${encodeURIComponent(roomId)}/export`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Room export failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 21. Polymarket
// ---------------------------------------------------------------------------
const getPolymarketMarkets: McpToolHandler = async (args) => {
  const options = args as Record<string, any>;
  try {
    const res = await routeGet('/api/polymarket/markets', options);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket markets fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketMarket: McpToolHandler = async (args) => {
  const { slug } = args as { slug: string };
  try {
    const res = await routeGet(`/api/polymarket/markets/${encodeURIComponent(slug)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket market fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketTrending: McpToolHandler = async (args) => {
  const { limit } = args as { limit?: number };
  try {
    const res = await routeGet('/api/polymarket/trending', limit ? { limit } : undefined);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket trending fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketSpikes: McpToolHandler = async (args) => {
  const { threshold, minVolume } = args as { threshold?: number; minVolume?: number };
  try {
    const params: Record<string, any> = {};
    if (threshold !== undefined) params.threshold = threshold;
    if (minVolume !== undefined) params.minVolume = minVolume;
    const res = await routeGet('/api/polymarket/spikes', params);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket spikes fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketMovers: McpToolHandler = async (args) => {
  const { minChange } = args as { minChange?: number };
  try {
    const res = await routeGet('/api/polymarket/movers', minChange ? { minChange } : undefined);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket movers fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketEvents: McpToolHandler = async (args) => {
  const options = args as Record<string, any>;
  try {
    const res = await routeGet('/api/polymarket/events', options);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket events fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketLeaderboard: McpToolHandler = async (args) => {
  const { limit } = args as { limit?: number };
  try {
    const res = await routeGet('/api/polymarket/leaderboard', limit ? { limit } : undefined);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket leaderboard fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketTrader: McpToolHandler = async (args) => {
  const { address } = args as { address: string };
  try {
    const res = await routeGet(`/api/polymarket/trader/${encodeURIComponent(address)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket trader fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketOrderBook: McpToolHandler = async (args) => {
  const { tokenId } = args as { tokenId: string };
  try {
    const res = await routeGet(`/api/polymarket/orderbook/${encodeURIComponent(tokenId)}`);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket order book fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketTrades: McpToolHandler = async (args) => {
  const { conditionId, limit } = args as { conditionId: string; limit?: number };
  try {
    const res = await routeGet(`/api/polymarket/trades/${encodeURIComponent(conditionId)}`, limit ? { limit } : undefined);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket trades fetch failed: ${extractApiError(error)}`);
  }
};

const getPolymarketHistory: McpToolHandler = async (args) => {
  const { conditionId, interval, limit } = args as { conditionId: string; interval?: 'hour' | 'day'; limit?: number };
  const params: Record<string, any> = {};
  if (interval) params.interval = interval;
  if (limit !== undefined) params.limit = limit;
  try {
    const res = await routeGet(`/api/polymarket/history/${encodeURIComponent(conditionId)}`, params);
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Polymarket history fetch failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 22. Portfolio sub-tools
// ---------------------------------------------------------------------------
const getPortfolioTokens: McpToolHandler = async (args) => {
  const { address, chainId } = args as { address: string; chainId: string };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}/tokens`, {
      chain: chainId,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Portfolio tokens fetch failed: ${extractApiError(error)}`);
  }
};

const getPortfolioNfts: McpToolHandler = async (args) => {
  const { address, chainId } = args as { address: string; chainId: string };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}/nfts`, {
      chain: chainId,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Portfolio NFTs fetch failed: ${extractApiError(error)}`);
  }
};

const getPortfolioActivity: McpToolHandler = async (args) => {
  const { address, chainId } = args as { address: string; chainId: string };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}/activity`, {
      chain: chainId,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Portfolio activity fetch failed: ${extractApiError(error)}`);
  }
};

const getPortfolioStablecoins: McpToolHandler = async (args) => {
  const { address, chainId } = args as { address: string; chainId: string };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(address);
  if (resolveErr) return resolveErr;
  try {
    const res = await routeGet(`/api/portfolio/${encodeURIComponent(resolvedAddr || address)}/stablecoins`, {
      chain: chainId,
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Portfolio stablecoins fetch failed: ${extractApiError(error)}`);
  }
};

// ---------------------------------------------------------------------------
// 23. Contract batch / refresh and Dune helper
// ---------------------------------------------------------------------------
const batchLookupContracts: McpToolHandler = async (args) => {
  const { addresses } = args as { addresses: string };
  const list = addresses.split(',').map(a => a.trim()).filter(Boolean);
  const resolved: string[] = [];
  for (const a of list) {
    const r = await resolveAddressInput(a);
    if (r.error) return r.error;
    resolved.push(r.resolved || a);
  }

  try {
    const res = await routePost('/api/contracts/batch', { addresses: resolved });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Batch contract lookup failed: ${extractApiError(error)}`);
  }
};

const refreshContracts: McpToolHandler = async () => {
  try {
    const res = await routePost('/api/contracts/refresh', {});
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Contract refresh failed: ${extractApiError(error)}`);
  }
};

const fetchDuneInteractors: McpToolHandler = async (args) => {
  const { contractAddress, chain, limit, customApiKey } = args as {
    contractAddress: string; chain: string; limit?: number; customApiKey?: string;
  };
  const { resolved: resolvedAddr, error: resolveErr } = await resolveAddressInput(contractAddress);
  if (resolveErr) return resolveErr;

  try {
    const res = await routePost('/api/dune/fetch', {
      contractAddress: resolvedAddr || contractAddress,
      chain,
      ...(limit !== undefined ? { limit } : {}),
      ...(customApiKey ? { customApiKey } : {}),
    });
    return ok(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    return err(`Dune interactor fetch failed: ${extractApiError(error)}`);
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
  analyze_cex_flow: withLogging('analyze_cex_flow', analyzeCEXFlow),
  analyze_sybil_addresses: withLogging('analyze_sybil_addresses', analyzeSybilAddresses),
  resolve_name: withLogging('resolve_name', resolveName),
  get_portfolio: withLogging('get_portfolio', getPortfolio),
  get_portfolio_tokens: withLogging('get_portfolio_tokens', getPortfolioTokens),
  get_portfolio_nfts: withLogging('get_portfolio_nfts', getPortfolioNfts),
  get_portfolio_activity: withLogging('get_portfolio_activity', getPortfolioActivity),
  get_portfolio_stablecoins: withLogging('get_portfolio_stablecoins', getPortfolioStablecoins),
  get_transactions: withLogging('get_transactions', getTransactions),
  get_transaction_history: withLogging('get_transaction_history', getTransactionHistory),
  get_transaction_detail: withLogging('get_transaction_detail', getTransactionDetail),
  lookup_entity: withLogging('lookup_entity', lookupEntity),
  search_contracts: withLogging('search_contracts', searchContracts),
  lookup_contract: withLogging('lookup_contract', lookupContract),
  batch_lookup_contracts: withLogging('batch_lookup_contracts', batchLookupContracts),
  get_contract_stats: withLogging('get_contract_stats', getContractStats),
  refresh_contracts: withLogging('refresh_contracts', refreshContracts),
  search_tokens: withLogging('search_tokens', searchTokens),
  get_market_stats: withLogging('get_market_stats', getMarketStats),
  get_market_coins: withLogging('get_market_coins', getMarketCoins),
  get_gas_prices: withLogging('get_gas_prices', getGasPrices),
  get_token_info: withLogging('get_token_info', getTokenInfo),
  get_token_chart: withLogging('get_token_chart', getTokenChart),
  get_dexscreener_latest_profiles: withLogging('get_dexscreener_latest_profiles', getDexScreenerLatestProfiles),
  get_dexscreener_top_boosts: withLogging('get_dexscreener_top_boosts', getDexScreenerBoosts),
  search_dexscreener_pairs: withLogging('search_dexscreener_pairs', searchDexScreenerPairs),
  get_dexscreener_token_details: withLogging('get_dexscreener_token_details', getDexScreenerTokenDetails),
  get_dexscreener_token_pairs: withLogging('get_dexscreener_token_pairs', getDexScreenerTokenPairs),
  get_dexscreener_trending: withLogging('get_dexscreener_trending', getDexScreenerTrending),
  get_scan_history: withLogging('get_scan_history', getScanHistory),
  get_scan_history_stats: withLogging('get_scan_history_stats', getScanHistoryStats),
  save_scan_history_item: withLogging('save_scan_history_item', saveScanHistoryItem),
  sync_scan_history: withLogging('sync_scan_history', syncScanHistory),
  delete_scan_history_item: withLogging('delete_scan_history_item', deleteScanHistoryItem),
  clear_scan_history: withLogging('clear_scan_history', clearScanHistory),
  list_rooms: withLogging('list_rooms', listRooms),
  get_room_details: withLogging('get_room_details', getRoomDetails),
  create_room: withLogging('create_room', createRoom),
  update_room: withLogging('update_room', updateRoom),
  delete_room: withLogging('delete_room', deleteRoom),
  list_room_messages: withLogging('list_room_messages', listRoomMessages),
  send_room_message: withLogging('send_room_message', sendRoomMessage),
  join_room: withLogging('join_room', joinRoom),
  leave_room: withLogging('leave_room', leaveRoom),
  remove_room_member: withLogging('remove_room_member', removeRoomMember),
  promote_room_member: withLogging('promote_room_member', promoteRoomMember),
  create_room_invite: withLogging('create_room_invite', createRoomInvite),
  list_room_pins: withLogging('list_room_pins', listRoomPins),
  pin_room_message: withLogging('pin_room_message', pinRoomMessage),
  unpin_room_message: withLogging('unpin_room_message', unpinRoomMessage),
  edit_room_message: withLogging('edit_room_message', editRoomMessage),
  delete_room_message: withLogging('delete_room_message', deleteRoomMessage),
  export_room: withLogging('export_room', exportRoom),
  get_polymarket_markets: withLogging('get_polymarket_markets', getPolymarketMarkets),
  get_polymarket_market: withLogging('get_polymarket_market', getPolymarketMarket),
  get_polymarket_trending: withLogging('get_polymarket_trending', getPolymarketTrending),
  get_polymarket_spikes: withLogging('get_polymarket_spikes', getPolymarketSpikes),
  get_polymarket_movers: withLogging('get_polymarket_movers', getPolymarketMovers),
  get_polymarket_events: withLogging('get_polymarket_events', getPolymarketEvents),
  get_polymarket_leaderboard: withLogging('get_polymarket_leaderboard', getPolymarketLeaderboard),
  get_polymarket_trader: withLogging('get_polymarket_trader', getPolymarketTrader),
  get_polymarket_order_book: withLogging('get_polymarket_order_book', getPolymarketOrderBook),
  get_polymarket_trades: withLogging('get_polymarket_trades', getPolymarketTrades),
  get_polymarket_history: withLogging('get_polymarket_history', getPolymarketHistory),
  fetch_dune_interactors: withLogging('fetch_dune_interactors', fetchDuneInteractors),
};
