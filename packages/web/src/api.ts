// ============================================================
// API Client - Communicates with FundTracer Server
// ============================================================

import { ChainId, AnalysisResult, MultiWalletResult, FundingNode } from '@fundtracer/core';

// In production, assume the API is on the same domain if not specified (e.g., via proxy)
// Or use a hardcoded production URL if frontend/backend are separate
// In production, endpoints already include '/api' prefix, so base should be empty
const API_BASE = import.meta.env.VITE_API_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : '');

interface ApiResponse<T> {
    success: boolean;
    result?: T;
    error?: string;
    message?: string;
    usageRemaining?: number | 'unlimited';
}

export interface UserProfile {
    uid: string;
    name?: string;
    displayName?: string;
    username?: string;
    hasCustomApiKey: boolean;
    hasAlchemyApiKey?: boolean;
    tier?: 'free' | 'pro' | 'max';
    isVerified?: boolean;
    usage: {
        today: number;
        limit: number | 'unlimited';
        remaining: number | 'unlimited';
    };
    walletAddress?: string | null;
    profilePicture?: string | null;
    photoURL?: string | null;
    authProvider?: 'wallet' | 'google' | 'twitter';
}

// Token management
export const getAuthToken = () => localStorage.getItem('fundtracer_token');
export const setAuthToken = (token: string) => localStorage.setItem('fundtracer_token', token);
export const removeAuthToken = () => localStorage.removeItem('fundtracer_token');

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function apiRequestWithRetry<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any,
    retryCount = 0
): Promise<T> {
    const token = getAuthToken();

    // Check if endpoint requires authentication
    const isPublicEndpoint = 
        endpoint.startsWith('/api/auth/') ||
        endpoint.startsWith('/api/analytics/') ||
        endpoint.startsWith('/api/dexscreener/') ||
        endpoint.startsWith('/api/market/') ||
        endpoint.startsWith('/api/tokens/') ||
        endpoint.startsWith('/api/polymarket/');
    
    if (!token && !isPublicEndpoint) {
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Prefer the descriptive message, then error label, then generic status
            const errorMessage = errorData.message || errorData.error || `API error: ${response.status}`;
            const hint = errorData.hint;

            // If server returns 401, the token is invalid/expired — clear it immediately
            if (response.status === 401) {
                removeAuthToken();
                localStorage.removeItem('fundtracer_token_expiry');
            }

            // Retry on server errors (5xx) and certain client errors
            const shouldRetry = response.status >= 500 || response.status === 429;
            if (shouldRetry && retryCount < MAX_RETRIES) {
                const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
                console.log(`[API Retry] ${endpoint}: Retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
                await delay(retryDelay);
                return apiRequestWithRetry<T>(endpoint, method, body, retryCount + 1);
            }

            console.error(`[API Error] ${endpoint}: ${response.status} ${errorMessage}${hint ? ` (Hint: ${hint})` : ''}`);

            // Include status code and hint in error so callers can detect auth failures and show hints
            const error = new Error(hint ? `${errorMessage} ${hint}` : errorMessage);
        (error as any).status = response.status;
        (error as any).hint = hint;
        throw error;
    }

    return response.json();
    } catch (networkError: any) {
        // Network errors (fetch failed) - retry if possible
        const shouldRetry = retryCount < MAX_RETRIES;
        if (shouldRetry) {
            const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            console.log(`[API Retry] ${endpoint}: Network error, retrying in ${retryDelay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await delay(retryDelay);
            return apiRequestWithRetry<T>(endpoint, method, body, retryCount + 1);
        }
        throw networkError;
    }
}

// Export alias for backward compatibility
export const apiRequest = apiRequestWithRetry;

// Authentication endpoints
export async function loginWithWallet(address: string, signature: string, message: string): Promise<{ token: string, user: any }> {
    const data = await apiRequest<{ token: string, user: any }>('/api/auth/login-wallet', 'POST', {
        address,
        signature,
        message
    });
    setAuthToken(data.token);
    return data;
}

export async function loginWithGoogle(idToken: string): Promise<{ token: string, user: any }> {
    const data = await apiRequest<{ token: string, user: any }>('/api/auth/google-login', 'POST', {
        idToken
    });
    setAuthToken(data.token);
    return data;
}

export async function loginWithTwitter(idToken: string): Promise<{ token: string, user: any }> {
    const data = await apiRequest<{ token: string, user: any }>('/api/auth/twitter-login', 'POST', {
        idToken
    });
    setAuthToken(data.token);
    return data;
}

export async function linkWalletToGoogle(
    idToken: string,
    address: string,
    signature: string,
    message: string
): Promise<{ success: boolean; walletAddress: string; isVerified: boolean }> {
    return apiRequest('/api/auth/link-wallet', 'POST', {
        idToken,
        address,
        signature,
        message
    });
}

export async function unlinkWalletFromGoogle(idToken: string): Promise<{ success: boolean }> {
    return apiRequest('/api/auth/unlink-wallet', 'POST', { idToken });
}

export async function linkWalletToAccount(
    uid: string,
    address: string,
    signature: string,
    message: string
): Promise<{ success: boolean; token: string; walletAddress: string; isVerified: boolean }> {
    const data = await apiRequest<{ success: boolean; token: string; walletAddress: string; isVerified: boolean }>(
        '/api/auth/link-wallet',
        'POST',
        { uid, address, signature, message }
    );
    setAuthToken(data.token);
    return data;
}

export async function unlinkWalletFromAccount(uid: string): Promise<{ success: boolean }> {
    return apiRequest('/api/auth/unlink-wallet', 'POST', { uid });
}

// User endpoints
export async function getProfile(): Promise<UserProfile> {
    return apiRequest('/api/user/profile');
}

export async function updateProfile(data: { displayName?: string; profilePicture?: string }): Promise<{ success: boolean; user: UserProfile }> {
    return apiRequest('/api/user/profile', 'POST', data);
}

// Alchemy API Key management
export async function saveAlchemyKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/user/alchemy-api-key', 'POST', { apiKey });
}

export async function removeAlchemyKey(): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/user/alchemy-api-key', 'DELETE');
}

// Analytics tracking
export async function trackVisit(userId?: string): Promise<void> {
    try {
        await apiRequest('/api/analytics/visit', 'POST', { userId });
    } catch (err) {
        console.error('Failed to track visit:', err);
    }
}

// Analysis endpoints
export async function analyzeWallet(
    address: string,
    chain: ChainId,
    options?: { limit?: number; offset?: number;[key: string]: any }
): Promise<ApiResponse<AnalysisResult & { pagination?: { total: number; offset: number; limit: number; hasMore: boolean } }>> {
    return apiRequest('/api/analyze/wallet', 'POST', { address, chain, options });
}

// Load more transactions (for infinite scroll)
export async function loadMoreTransactions(
    address: string,
    chain: ChainId,
    offset: number,
    limit: number = 100
): Promise<{ transactions: any[]; pagination: { total: number; offset: number; limit: number; hasMore: boolean } }> {
    const response = await apiRequest<any>('/api/analyze/wallet', 'POST', {
        address,
        chain,
        options: { offset, limit }
    });
    return {
        transactions: response.result?.transactions || [],
        pagination: response.result?.pagination || { total: 0, offset, limit, hasMore: false }
    };
}

export async function compareWallets(
    addresses: string[],
    chain: ChainId,
    options?: { txHash?: string }
): Promise<ApiResponse<MultiWalletResult>> {
    return apiRequest('/api/analyze/compare', 'POST', { addresses, chain, txHash: options?.txHash });
}

// Fetch funding tree on-demand (separate from initial wallet analysis for speed)
export async function fetchFundingTree(
    address: string,
    chain: ChainId,
    maxDepth?: number
): Promise<ApiResponse<{ fundingSources: FundingNode; fundingDestinations: FundingNode }>> {
    const body: any = { address, chain };
    if (maxDepth !== undefined) {
        body.options = { treeConfig: { maxDepth } };
    }
    return apiRequest('/api/analyze/funding-tree', 'POST', body);
}

export async function analyzeContract(
    contractAddress: string,
    chain: ChainId,
    options?: { maxInteractors?: number; analyzeFunding?: boolean; txHash?: string }
): Promise<ApiResponse<any>> {
    return apiRequest('/api/analyze/contract', 'POST', { contractAddress, chain, options });
}

// Contract endpoints
export async function searchContract(query: string): Promise<{ address: string | null; name: string | null }> {
    return apiRequest('/api/contracts/search', 'POST', { query });
}

export async function getContractInfo(address: string, chain: ChainId): Promise<any> {
    return apiRequest('/api/contracts/info', 'POST', { address, chain });
}

// Contract search for ContractSearch component
export async function searchContracts(query: string): Promise<{ success: boolean; results: any[] }> {
    return apiRequest('/api/contracts/search-list', 'POST', { query });
}

export async function lookupContract(address: string): Promise<{ success: boolean; address: string; name: string | null; type?: string; symbol?: string }> {
    return apiRequest('/api/contracts/lookup', 'POST', { address });
}

// Sybil detection
export async function checkSybil(address: string): Promise<{ isSybil: boolean; confidence: number; reasons: string[] }> {
    return apiRequest('/api/analyze/sybil', 'POST', { address });
}

// Dune Analytics
export async function getDuneMetrics(metric: string, params?: any): Promise<any> {
    return apiRequest('/api/dune/metrics', 'POST', { metric, params });
}

// Fetch Dune contract interactors
export async function fetchDuneInteractors(
    contractAddress: string,
    chain: ChainId,
    options?: { limit?: number; customApiKey?: string }
): Promise<{ success: boolean; wallets?: string[]; error?: string }> {
    return apiRequest('/api/dune/fetch', 'POST', {
        contractAddress,
        chain,
        ...options
    });
}

// Analyze addresses for Sybil patterns
export async function analyzeSybilAddresses(
    addresses: string[],
    chain: ChainId,
    options?: { txHash?: string }
): Promise<{ success: boolean; result?: any; error?: string }> {
    return apiRequest('/api/analyze/sybil-addresses', 'POST', { addresses, chain, txHash: options?.txHash });
}

// Search tokens via CoinGecko
export async function searchTokens(query: string): Promise<{ query: string; results: any[] }> {
    return apiRequest(`/api/tokens/search?q=${encodeURIComponent(query)}`);
}

// Get market coins (top coins with market data)
export async function getMarketCoins(
    chain?: string, 
    page: number = 1, 
    perPage: number = 100
): Promise<{ coins: any[]; chain?: string }> {
    const params = new URLSearchParams();
    if (chain && chain !== 'all') params.append('chain', chain);
    params.append('page', page.toString());
    params.append('per_page', perPage.toString());
    
    return apiRequest(`/api/market/coins?${params.toString()}`);
}

// DEX Screener API endpoints
export async function getDEXScreenerTrending(): Promise<{ tokens: any[]; lastUpdated: string; cached?: boolean }> {
    return apiRequest('/api/dexscreener/trending');
}

export async function searchDEXScreenerPairs(query: string): Promise<{ query: string; pairs: any[] }> {
    return apiRequest(`/api/dexscreener/search?q=${encodeURIComponent(query)}`);
}

export async function getDEXScreenerTokenDetails(chainId: string, tokenAddress: string): Promise<any> {
    return apiRequest(`/api/dexscreener/token/${chainId}/${tokenAddress}`);
}

export async function getDEXScreenerTokenPairs(chainId: string, tokenAddress: string): Promise<any> {
    return apiRequest(`/api/dexscreener/pairs/${chainId}/${tokenAddress}`);
}

// Scan History sync endpoints
export interface ScanHistoryItem {
    address: string;
    label?: string;
    timestamp: number;
    chain?: string;
    type?: 'wallet' | 'contract' | 'compare' | 'sybil';
    riskScore?: number;
    riskLevel?: string;
    totalTransactions?: number;
    totalValueSentEth?: number;
    totalValueReceivedEth?: number;
    activityPeriodDays?: number;
    balanceInEth?: number;
}

export async function fetchScanHistory(): Promise<{ success: boolean; items: ScanHistoryItem[] }> {
    return apiRequest('/api/scan-history');
}

export async function saveScanHistoryItem(item: ScanHistoryItem): Promise<{ success: boolean }> {
    return apiRequest('/api/scan-history', 'POST', item);
}

export async function syncScanHistory(items: ScanHistoryItem[]): Promise<{ success: boolean; items: ScanHistoryItem[] }> {
    return apiRequest('/api/scan-history/sync', 'POST', { items });
}

export async function deleteScanHistoryItem(address: string): Promise<{ success: boolean }> {
    return apiRequest(`/api/scan-history/${encodeURIComponent(address)}`, 'DELETE');
}

export async function clearScanHistory(): Promise<{ success: boolean }> {
    return apiRequest('/api/scan-history', 'DELETE');
}

// ============================================================
// Polymarket API - Prediction Markets
// ============================================================

export interface PolymarketMarket {
    id: string;
    question: string;
    slug: string;
    conditionId: string;
    description?: string;
    image?: string;
    outcomes: string[];
    outcomePrices: string[];
    volume?: number;
    volume24hr?: number;
    volume1wk?: number;
    liquidity?: number;
    endDate?: string;
    active: boolean;
    closed: boolean;
    tags?: string[];
}

export interface PolymarketTrader {
    address: string;
    volume?: number;
    profit?: number;
    positions?: number;
    winRate?: number;
    rank?: number;
}

export interface VolumeSpike {
    market: PolymarketMarket;
    spikeRatio: number;
    currentVolume: number;
    avgVolume: number;
}

export interface PriceMover {
    market: PolymarketMarket;
    priceChange: number;
    previousPrice: number;
    currentPrice: number;
}

// Get markets with optional search/filter
export async function getPolymarketMarkets(options?: {
    q?: string;
    active?: boolean;
    closed?: boolean;
    limit?: number;
    offset?: number;
    order?: 'volume24hr' | 'liquidity' | 'endDate' | 'startDate';
}): Promise<{ success: boolean; data: PolymarketMarket[]; count: number }> {
    const params = new URLSearchParams();
    if (options?.q) params.append('q', options.q);
    if (options?.active !== undefined) params.append('active', String(options.active));
    if (options?.closed !== undefined) params.append('closed', String(options.closed));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    if (options?.order) params.append('order', options.order);
    
    const url = `/api/polymarket/markets${params.toString() ? '?' + params.toString() : ''}`;
    return apiRequest(url);
}

// Get single market by slug
export async function getPolymarketMarket(slug: string): Promise<{ success: boolean; data: PolymarketMarket }> {
    return apiRequest(`/api/polymarket/markets/${encodeURIComponent(slug)}`);
}

// Get trending markets (high 24h volume)
export async function getPolymarketTrending(limit?: number): Promise<{ success: boolean; data: PolymarketMarket[]; count: number }> {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest(`/api/polymarket/trending${params}`);
}

// Get volume spikes
export async function getPolymarketSpikes(threshold?: number, minVolume?: number): Promise<{ success: boolean; data: VolumeSpike[]; count: number }> {
    const params = new URLSearchParams();
    if (threshold) params.append('threshold', String(threshold));
    if (minVolume) params.append('minVolume', String(minVolume));
    
    const url = `/api/polymarket/spikes${params.toString() ? '?' + params.toString() : ''}`;
    return apiRequest(url);
}

// Get price movers
export async function getPolymarketMovers(minChange?: number): Promise<{ success: boolean; data: PriceMover[]; count: number }> {
    const params = minChange ? `?minChange=${minChange}` : '';
    return apiRequest(`/api/polymarket/movers${params}`);
}

// Get events (market groups)
export async function getPolymarketEvents(options?: {
    active?: boolean;
    limit?: number;
    offset?: number;
}): Promise<{ success: boolean; data: any[]; count: number }> {
    const params = new URLSearchParams();
    if (options?.active !== undefined) params.append('active', String(options.active));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    
    const url = `/api/polymarket/events${params.toString() ? '?' + params.toString() : ''}`;
    return apiRequest(url);
}

// Get leaderboard
export async function getPolymarketLeaderboard(limit?: number): Promise<{ success: boolean; data: PolymarketTrader[]; count: number }> {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest(`/api/polymarket/leaderboard${params}`);
}

// Get trader profile
export async function getPolymarketTrader(address: string): Promise<{ success: boolean; data: PolymarketTrader }> {
    return apiRequest(`/api/polymarket/trader/${address}`);
}

// Get order book for a token
export async function getPolymarketOrderBook(tokenId: string): Promise<{ success: boolean; data: any }> {
    return apiRequest(`/api/polymarket/orderbook/${tokenId}`);
}

// Get trades for a market
export async function getPolymarketTrades(conditionId: string, limit?: number): Promise<{ success: boolean; data: any[]; count: number }> {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest(`/api/polymarket/trades/${conditionId}${params}`);
}

// Get price history for a market
export async function getPolymarketHistory(
    conditionId: string,
    interval?: 'hour' | 'day',
    limit?: number
): Promise<{ success: boolean; data: any[]; count: number }> {
    const params = new URLSearchParams();
    if (interval) params.append('interval', interval);
    if (limit) params.append('limit', String(limit));
    
    const url = `/api/polymarket/history/${conditionId}${params.toString() ? '?' + params.toString() : ''}`;
    return apiRequest(url);
}
