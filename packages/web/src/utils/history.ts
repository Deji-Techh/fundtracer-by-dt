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

const HISTORY_KEY = 'fundtracer_search_history';
const MAX_HISTORY = 50;
const LAST_SYNC_KEY = 'fundtracer_history_last_sync';

// Flag to prevent duplicate syncs
let syncInProgress = false;

function isAuthenticated(): boolean {
    return !!getAuthToken();
}

// ============================================================
// Local Storage Operations (always fast, always available)
// ============================================================

export const getHistory = (): HistoryItem[] => {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const saveHistoryToLocal = (items: HistoryItem[]): void => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
};

// ============================================================
// Server Sync (background, non-blocking)
// ============================================================

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

// ============================================================
// Public API (localStorage + server sync)
// ============================================================

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

    const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY);
    saveHistoryToLocal(newHistory);

    // Push to server in background
    pushItemToServer(newItem);

    // Dispatch event so other components can react
    window.dispatchEvent(new Event('historyChanged'));

    return newHistory;
};

export const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    clearServerHistory();
    window.dispatchEvent(new Event('historyChanged'));
};

export const removeFromHistory = (address: string) => {
    const history = getHistory();
    const newHistory = history.filter(item => item.address.toLowerCase() !== address.toLowerCase());
    saveHistoryToLocal(newHistory);

    // Delete from server in background
    deleteItemFromServer(address);

    window.dispatchEvent(new Event('historyChanged'));
    return newHistory;
};

// ============================================================
// Full Sync — merge local + server, called on auth / page load
// ============================================================

/**
 * Syncs local history with the server.
 * - Sends local items to server
 * - Server merges (newer timestamp wins per address)
 * - Returns merged list which is saved to localStorage
 *
 * Returns true if history changed as a result of sync.
 */
export async function syncHistoryWithServer(): Promise<boolean> {
    if (!isAuthenticated() || syncInProgress) return false;

    syncInProgress = true;
    try {
        const localItems = getHistory();
        const response = await syncScanHistory(localItems as ScanHistoryItem[]);

        if (!response.success || !response.items) {
            return false;
        }

        const serverItems = response.items as HistoryItem[];

        // Check if anything actually changed
        const localSet = new Set(localItems.map(i => `${i.address.toLowerCase()}_${i.timestamp}`));
        const serverSet = new Set(serverItems.map(i => `${i.address.toLowerCase()}_${i.timestamp}`));
        const changed = serverItems.length !== localItems.length ||
            serverItems.some(i => !localSet.has(`${i.address.toLowerCase()}_${i.timestamp}`)) ||
            localItems.some(i => !serverSet.has(`${i.address.toLowerCase()}_${i.timestamp}`));

        if (changed) {
            // Sort by timestamp desc (server already does this, but ensure)
            const merged = serverItems
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, MAX_HISTORY);

            saveHistoryToLocal(merged);
            localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
            window.dispatchEvent(new Event('historyChanged'));
            return true;
        }

        localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
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
 * Falls back to local history on error.
 */
export async function fetchServerHistory(): Promise<HistoryItem[]> {
    if (!isAuthenticated()) return getHistory();

    try {
        const response = await fetchScanHistory();
        if (response.success && response.items) {
            return response.items as HistoryItem[];
        }
    } catch (err: any) {
        console.warn('[History] Failed to fetch server history:', err.message);
    }
    return getHistory();
}
