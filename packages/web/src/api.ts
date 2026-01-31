// ============================================================
// API Client - Communicates with FundTracer Server
// ============================================================

import { ChainId, AnalysisResult, MultiWalletResult } from '@fundtracer/core';

// In production, assume the API is on the same domain if not specified (e.g., via proxy)
// Or use a hardcoded production URL if frontend/backend are separate
// In production, endpoints already include '/api' prefix, so base should be empty
const API_BASE = import.meta.env.VITE_API_URL ||
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3000'
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
    email: string;
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
    authProvider?: 'email' | 'google' | 'wallet';
}

// Token management
export const getAuthToken = () => localStorage.getItem('fundtracer_token');
export const setAuthToken = (token: string) => localStorage.setItem('fundtracer_token', token);
export const removeAuthToken = () => localStorage.removeItem('fundtracer_token');

async function apiRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'DELETE' = 'GET',
    body?: any
): Promise<T> {
    const token = getAuthToken();

    if (!token && 
        endpoint !== '/api/auth/login' && 
        endpoint !== '/api/auth/register' && 
        endpoint !== '/api/auth/check-username' &&
        endpoint !== '/api/analytics/visit') { // Allow auth endpoints & tracking without token
        throw new Error('Not authenticated');
    }

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
    }

    return response.json();
}

// Authentication endpoints
export async function loginWithWallet(address: string, signature: string, message: string): Promise<{ token: string, user: any }> {
    const data = await apiRequest<{ token: string, user: any }>('/api/auth/login', 'POST', {
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

// NEW: Simple Backend Authentication
export async function register(
    username: string,
    email: string,
    password: string,
    keepSignedIn: boolean
): Promise<{ token: string; user: any }> {
    const data = await apiRequest<{ token: string; user: any }>('/api/auth/register', 'POST', {
        username,
        email,
        password,
        keepSignedIn
    });
    setAuthToken(data.token);
    return data;
}

export async function login(
    username: string,
    password: string,
    keepSignedIn: boolean
): Promise<{ token: string; user: any }> {
    const data = await apiRequest<{ token: string; user: any }>('/api/auth/login', 'POST', {
        username,
        password,
        keepSignedIn
    });
    setAuthToken(data.token);
    return data;
}

export async function checkUsername(username: string): Promise<{ available: boolean; reason?: string }> {
    return apiRequest(`/api/auth/check-username/${username}`, 'GET');
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

export async function updateProfile(data: { displayName?: string; email?: string; profilePicture?: string }): Promise<{ success: boolean; user: UserProfile }> {
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
    chain: ChainId
): Promise<ApiResponse<MultiWalletResult>> {
    return apiRequest('/api/analyze/compare', 'POST', { addresses, chain });
}

export async function analyzeContract(
    address: string,
    chain: ChainId
): Promise<ApiResponse<any>> {
    return apiRequest('/api/analyze/contract', 'POST', { address, chain });
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
    return apiRequest('/api/dune/interactors', 'POST', {
        contractAddress,
        chain,
        ...options
    });
}

// Analyze addresses for Sybil patterns
export async function analyzeSybilAddresses(
    addresses: string[],
    chain: ChainId
): Promise<{ success: boolean; result?: any; error?: string }> {
    return apiRequest('/api/analyze/sybil-batch', 'POST', { addresses, chain });
}
