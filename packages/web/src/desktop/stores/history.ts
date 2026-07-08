import type { HistoryEntry } from '../types';
import { fetchScanHistory, saveScanHistoryItem, deleteScanHistoryItem, clearScanHistory as clearServerHistory } from '../api/history';

const STORAGE_KEY = 'fundtracer_history';
const MAX_ITEMS = 50;

// ---------------------------------------------------------------------------
// Local cache (always up to date with server + local)
// ---------------------------------------------------------------------------
let cached: HistoryEntry[] = [];
let lastSync = 0;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let syncInFlight: Promise<HistoryEntry[]> | null = null;
const MIN_SYNC_GAP_MS = 15_000;

// ---------------------------------------------------------------------------
// LocalStorage helpers (offline fallback)
// ---------------------------------------------------------------------------
function readLocal(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).items || [];
  } catch { return []; }
}

function writeLocal(items: HistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: items.slice(0, MAX_ITEMS) }));
  } catch {}
}

// ---------------------------------------------------------------------------
// Server sync
// ---------------------------------------------------------------------------
async function pullFromServer(): Promise<HistoryEntry[]> {
  try {
    return await fetchScanHistory();
  } catch {
    return [];
  }
}

async function pushToServer(entry: HistoryEntry): Promise<void> {
  try { await saveScanHistoryItem(entry); } catch {}
}

async function removeFromServer(address: string): Promise<void> {
  try { await deleteScanHistoryItem(address); } catch {}
}

async function clearFromServer(): Promise<void> {
  try { await clearServerHistory(); } catch {}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function getHistory(): HistoryEntry[] {
  if (cached.length > 0) return cached;
  cached = readLocal();
  return cached;
}

export function getHistoryCached(): HistoryEntry[] {
  return cached.length > 0 ? cached : readLocal();
}

export async function addHistory(entry: Omit<HistoryEntry, 'timestamp'> & { timestamp?: number }): Promise<void> {
  const items = [...(cached.length > 0 ? cached : readLocal())];
  const existing = items.findIndex(
    e => e.address.toLowerCase() === entry.address.toLowerCase() && e.chain === entry.chain,
  );
  if (existing >= 0) items.splice(existing, 1);
  const item: HistoryEntry = { ...entry, timestamp: Date.now() };
  items.unshift(item);

  cached = items.slice(0, MAX_ITEMS);
  writeLocal(cached);
  await pushToServer(item);
  dispatchChanged();
}

export async function removeHistory(address: string, chain: string): Promise<void> {
  const items = (cached.length > 0 ? cached : readLocal()).filter(
    e => !(e.address.toLowerCase() === address.toLowerCase() && e.chain === chain),
  );
  cached = items.slice(0, MAX_ITEMS);
  writeLocal(cached);
  await removeFromServer(address);
  dispatchChanged();
}

export async function clearHistory(): Promise<void> {
  cached = [];
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  await clearFromServer();
  dispatchChanged();
}

export function clearLocalHistoryCache(): void {
  cached = [];
  lastSync = 0;
  syncInFlight = null;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  dispatchChanged();
}

export async function syncHistory(): Promise<HistoryEntry[]> {
  if (syncInFlight) return syncInFlight;
  const now = Date.now();
  if (now - lastSync < MIN_SYNC_GAP_MS) {
    return cached.length > 0 ? cached : readLocal();
  }

  syncInFlight = (async () => {
  const serverItems = await pullFromServer();
  if (serverItems.length > 0) {
    cached = serverItems;
    writeLocal(cached);
    lastSync = Date.now();
    dispatchChanged();
    return cached;
  }
  // No server items — push local to server
  const local = readLocal();
  if (local.length > 0) {
    for (const item of local) await pushToServer(item);
  }
  cached = local;
  lastSync = Date.now();
  return cached;
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

export function getLastSync(): number {
  return lastSync;
}

// ---------------------------------------------------------------------------
// Polling — pull server changes every 60s when authenticated
// ---------------------------------------------------------------------------
export function startHistoryPolling(intervalMs = 60_000): void {
  if (syncTimer) return;
  syncTimer = setInterval(async () => {
    await syncHistory();
  }, intervalMs);
}

export function stopHistoryPolling(): void {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

// ---------------------------------------------------------------------------
// Change event for UI reactivity
// ---------------------------------------------------------------------------
type HistoryListener = () => void;
const listeners = new Set<HistoryListener>();

export function onHistoryChange(fn: HistoryListener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

function dispatchChanged(): void {
  for (const fn of listeners) fn();
}
