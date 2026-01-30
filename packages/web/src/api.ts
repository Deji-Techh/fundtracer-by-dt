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
    authProvider?: 'google' | 'wallet';
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

    if (!token && endpoint !== '/api/auth/login' && endpoint !== '/api/analytics/visit') { // Allow login & tracking without token
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

    const text = await response.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error('API Parse Error:', text);
        throw new Error(`Server returned invalid response (Status ${response.status}): ${text.slice(0, 50)}...`);
    }

    if (!response.ok) {
        if (response.status === 401) {
            removeAuthToken();
            window.location.reload(); // Force re-login
        }
        const errorMessage = data.details || data.message || data.error || 'Request failed';
        throw new Error(errorMessage);
    }

    return data;
}

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

// User endpoints
export async function getProfile(): Promise<UserProfile> {
    return apiRequest('/api/user/profile');
}

export async function updateProfile(data: { displayName?: string; email?: string }): Promise<{ success: boolean; user: UserProfile }> {
    return apiRequest('/api/user/profile', 'POST', data);
}

// Alchemy API key management
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
    options?: any
): Promise<ApiResponse<MultiWalletResult>> {
    return apiRequest('/api/analyze/compare', 'POST', { addresses, chain, options });
}

export async function analyzeContract(
    contractAddress: string,
    chain: ChainId,
    options?: any
): Promise<ApiResponse<any>> {
    return apiRequest('/api/analyze/contract', 'POST', { contractAddress, chain, options });
}

export async function analyzeSybil(
    contractAddress: string,
    chain: ChainId,
    options?: { maxInteractors?: number; minClusterSize?: number }
): Promise<ApiResponse<any>> {
    return apiRequest('/api/analyze/sybil', 'POST', { contractAddress, chain, options });
}

/** Analyze a list of addresses directly (paste from Dune) */
export async function analyzeSybilAddresses(
    addresses: string[],
    chain: ChainId,
    options?: { minClusterSize?: number }
): Promise<ApiResponse<any>> {
    return apiRequest('/api/analyze/sybil-addresses', 'POST', { addresses, chain, options });
}

/** Fetch contract interactors from Dune Analytics */
export async function fetchDuneInteractors(
    contractAddress: string,
    chain: ChainId,
    options?: { limit?: number; customApiKey?: string }
): Promise<{ success: boolean; wallets?: string[]; count?: number; error?: string }> {
    return apiRequest('/api/dune/fetch', 'POST', {
        contractAddress,
        chain,
        limit: options?.limit || 1000,
        customApiKey: options?.customApiKey,
    });
}

/** Look up contract info by address */
export async function lookupContract(
    address: string
): Promise<{ success: boolean; address: string; name?: string; type?: string; symbol?: string; isKnown: boolean }> {
    return apiRequest(`/api/contracts/lookup/${address}`);
}

/** Batch lookup multiple contract addresses */
export async function batchLookupContracts(
    addresses: string[]
): Promise<{ success: boolean; contracts: Record<string, any>; total: number }> {
    return apiRequest('/api/contracts/batch', 'POST', { addresses });
}

/** Search contracts by name */
export async function searchContracts(
    query: string
): Promise<{ success: boolean; results: Array<{ address: string; name: string; type: string }>; total: number }> {
    return apiRequest(`/api/contracts/search?q=${encodeURIComponent(query)}`);
}

/** Trigger contract database refresh (admin) */
export async function refreshContracts(): Promise<{ success: boolean; added: number; total: number }> {
    return apiRequest('/api/contracts/refresh', 'POST');
}
