import {
    getAuthToken,
    fetchScanHistory,
    saveScanHistoryItem,
    syncScanHistory,
    deleteScanHistoryItem,
    clearScanHistory as clearScanHistoryApi,
    ScanHistoryItem,
} from '../api';

export interface HistoryItem {
    address: string;
    label?: string;
    timestamp: number;
    chain?: string;
    type?: 'wallet' | 'contract' | 'compare' | 'sybil';
    // Analysis summary (stored after successful scan)
    riskScore?: number;
    riskLevel?: string;
    totalTransactions?: number;
    totalValueSentEth?: number;
    totalValueReceivedEth?: number;
    activityPeriodDays?: number;
    balanceInEth?: number;
}

// Flag to prevent duplicate syncs
let syncInProgress = false;

function isAuthenticated(): boolean {
    return !!getAuthToken();
}

// In-memory cache (cleared on page refresh/sign out)
let memoryHistory: HistoryItem[] = [];

// ============================================================
// Public API (server-only, no localStorage persistence)
// ============================================================

export const getHistory = (): HistoryItem[] => {
    // Return in-memory cache - cleared on page refresh
    return memoryHistory;
};

const saveHistoryToMemory = (items: HistoryItem[]): void => {
    memoryHistory = items;
    // Dispatch event so other components can react
    window.dispatchEvent(new Event('historyChanged'));
};

/**
 * Push a single item to the server (fire-and-forget).
 * Does NOT block the caller.
 */
function pushItemToServer(item: HistoryItem): void {
    if (!isAuthenticated()) return;
    saveScanHistoryItem(item as ScanHistoryItem).catch(err => {
        console.warn('[History] Failed to push item to server:', err.message);
    });
}

/**
 * Delete a single item from the server (fire-and-forget).
 */
function deleteItemFromServer(address: string): void {
    if (!isAuthenticated()) return;
    deleteScanHistoryItem(address).catch(err => {
        console.warn('[History] Failed to delete item from server:', err.message);
    });
}

/**
 * Clear all items on the server (fire-and-forget).
 */
function clearServerHistory(): void {
    if (!isAuthenticated()) return;
    clearScanHistoryApi().catch(err => {
        console.warn('[History] Failed to clear server history:', err.message);
    });
}

export const addToHistory = (
    address: string,
    chain: string,
    label?: string,
    summary?: {
        riskScore?: number;
        riskLevel?: string;
        totalTransactions?: number;
        totalValueSentEth?: number;
        totalValueReceivedEth?: number;
        activityPeriodDays?: number;
        balanceInEth?: number;
    },
    type?: 'wallet' | 'contract' | 'compare' | 'sybil'
) => {
    const history = getHistory();
    // Remove if exists (to move to top)
    const filtered = history.filter(item => item.address.toLowerCase() !== address.toLowerCase());

    const newItem: HistoryItem = {
        address,
        label,
        timestamp: Date.now(),
        chain,
        type: type || 'wallet',
        ...summary,
    };

    const newHistory = [newItem, ...filtered].slice(0, 50);
    saveHistoryToMemory(newHistory);

    // Push to server in background
    pushItemToServer(newItem);

    return newHistory;
};

export const clearHistory = () => {
    memoryHistory = [];
    clearServerHistory();
    window.dispatchEvent(new Event('historyChanged'));
};

export const removeFromHistory = (address: string) => {
    const history = getHistory();
    const newHistory = history.filter(item => item.address.toLowerCase() !== address.toLowerCase());
    saveHistoryToMemory(newHistory);

    // Delete from server in background
    deleteItemFromServer(address);

    return newHistory;
};

// ============================================================
// Full Sync — fetch from server, called on auth / page load
// ============================================================

/**
 * Fetches history from the server and updates in-memory cache.
 * Called on page load when authenticated.
 */
export async function syncHistoryWithServer(): Promise<boolean> {
    if (!isAuthenticated() || syncInProgress) return false;

    syncInProgress = true;
    try {
        const response = await fetchScanHistory();

        if (!response.success || !response.items) {
            return false;
        }

        const serverItems = response.items as HistoryItem[];

        // Check if anything actually changed
        const changed = serverItems.length !== memoryHistory.length ||
            serverItems.some((i, idx) => {
                const localItem = memoryHistory[idx];
                return !localItem || i.address !== localItem.address || i.timestamp !== localItem.timestamp;
            });

        if (changed) {
            // Sort by timestamp desc
            const sorted = serverItems
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, 50);

            memoryHistory = sorted;
            window.dispatchEvent(new Event('historyChanged'));
            return true;
        }

        return false;
    } catch (err: any) {
        console.warn('[History] Sync failed:', err.message);
        return false;
    } finally {
        syncInProgress = false;
    }
}

/**
 * Fetch server history without merging (useful for pull-only).
 */
export async function fetchServerHistory(): Promise<HistoryItem[]> {
    if (!isAuthenticated()) return getHistory();

    try {
        const response = await fetchScanHistory();
        if (response.success && response.items) {
            const sorted = response.items
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, 50) as HistoryItem[];
            memoryHistory = sorted;
            return sorted;
        }
    } catch (err: any) {
        console.warn('[History] Failed to fetch server history:', err.message);
    }
    return getHistory();
}
