import { apiRequest, getAuthToken } from './client';
import type { ChainId, AnalysisResult } from 'fundtracer-core';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.fundtracer.xyz';

function normalizeChain(chain: ChainId): string {
  const mapping: Record<string, string> = {
    'eth': 'ethereum', 'arb': 'arbitrum', 'opt': 'optimism',
    'polygon_pos': 'polygon', 'matic': 'polygon', 'binance': 'bsc',
  };
  return mapping[chain] || chain;
}

export interface ApiResponse<T> {
  success: boolean;
  result?: T;
  error?: string;
  message?: string;
  rateLimit?: {
    usedMinute: number; limitMinute: number; remainingMinute: number;
    usedDay: number; limitDay: number; remainingDay: number;
    tier: string;
  };
}

export async function analyzeWallet(
  address: string,
  chain: ChainId,
  options?: Record<string, unknown>,
): Promise<ApiResponse<AnalysisResult>> {
  return apiRequest('/api/analyze/wallet', 'POST', {
    address,
    chain: normalizeChain(chain),
    options: { ...(options || {}), skipTimestamps: true },
  });
}

export async function fetchFundingTree(
  address: string,
  chain: ChainId,
  maxDepth?: number,
): Promise<ApiResponse<{ fundingSources: unknown; fundingDestinations: unknown }>> {
  return apiRequest('/api/analyze/funding-tree', 'POST', {
    address,
    chain: normalizeChain(chain),
    options: maxDepth !== undefined ? { treeConfig: { maxDepth } } : undefined,
  });
}

export async function compareWallets(
  addresses: string[],
  chain: ChainId,
): Promise<ApiResponse<unknown>> {
  return apiRequest('/api/analyze/compare', 'POST', {
    addresses,
    chain: normalizeChain(chain),
  });
}

export async function analyzeContract(
  contractAddress: string,
  chain: ChainId,
  options?: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  return apiRequest('/api/analyze/contract', 'POST', {
    contractAddress,
    chain: normalizeChain(chain),
    options,
  });
}

export type ContractAnalysisStreamEvent =
  | { type: 'status'; stage?: string; message?: string }
  | { type: 'warning'; stage?: string; message?: string }
  | { type: 'partial'; stage?: string; message?: string; result: unknown }
  | { type: 'complete'; result: unknown; rateLimit?: ApiResponse<unknown>['rateLimit'] }
  | { type: 'error'; error?: string; message?: string; hint?: string; status?: number };

export function streamAnalyzeContract(
  contractAddress: string,
  chain: ChainId,
  options: Record<string, unknown> | undefined,
  onEvent: (event: ContractAnalysisStreamEvent) => void,
  onError: (err: Error) => void,
): () => void {
  const token = getAuthToken();
  const apiKey = (() => { try { return localStorage.getItem('fdt_api_key'); } catch { return null; } })();
  const controller = new AbortController();
  let closed = false;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanup = () => {
    if (closed) return;
    closed = true;
    controller.abort();
  };

  const parseEventBlock = (block: string): ContractAnalysisStreamEvent | null => {
    let eventType = 'message';
    const dataLines: string[] = [];

    for (const rawLine of block.split('\n')) {
      const line = rawLine.trimEnd();
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }

    if (dataLines.length === 0) return null;

    try {
      const parsed = JSON.parse(dataLines.join('\n'));
      return { type: eventType as ContractAnalysisStreamEvent['type'], ...parsed };
    } catch {
      return null;
    }
  };

  fetch(`${API_BASE}/api/analyze/contract/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      contractAddress,
      chain: normalizeChain(chain),
      options,
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        onError(new Error(errorData.message || errorData.error || `HTTP ${response.status}`));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError(new Error('No response stream'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const event = parseEventBlock(block);
            if (!event) continue;
            onEvent(event);
            if (event.type === 'complete' || event.type === 'error') {
              return;
            }
          }
        }

        if (buffer.trim()) {
          const event = parseEventBlock(buffer);
          if (event) onEvent(event);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') onError(err);
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err);
    });

  return cleanup;
}

export async function detectSybil(
  addresses: string[],
  chain: ChainId,
): Promise<ApiResponse<unknown>> {
  return apiRequest('/api/analyze/sybil-addresses', 'POST', {
    addresses,
    chain: normalizeChain(chain),
  });
}

export type SybilStreamEvent =
  | { type: 'status'; stage?: string; message?: string; totalAddresses?: number; elapsedSeconds?: number; clusters?: number; flaggedClusters?: number }
  | { type: 'complete'; result: unknown; meta?: unknown; rateLimit?: ApiResponse<unknown>['rateLimit'] }
  | { type: 'error'; error?: string; message?: string };

export function streamDetectSybil(
  addresses: string[],
  chain: ChainId,
  onEvent: (event: SybilStreamEvent) => void,
  onError: (err: Error) => void,
): () => void {
  const token = getAuthToken();
  const apiKey = (() => { try { return localStorage.getItem('fdt_api_key'); } catch { return null; } })();
  const controller = new AbortController();
  let closed = false;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanup = () => {
    if (closed) return;
    closed = true;
    controller.abort();
  };

  const parseEventBlock = (block: string): SybilStreamEvent | null => {
    let eventType = 'message';
    const dataLines: string[] = [];
    for (const rawLine of block.split('\n')) {
      const line = rawLine.trimEnd();
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return null;
    try {
      const parsed = JSON.parse(dataLines.join('\n'));
      return { type: eventType as SybilStreamEvent['type'], ...parsed };
    } catch {
      return null;
    }
  };

  fetch(`${API_BASE}/api/analyze/sybil-addresses/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      addresses,
      chain: normalizeChain(chain),
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        onError(new Error(errorData.message || errorData.error || `HTTP ${response.status}`));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError(new Error('No response stream'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const event = parseEventBlock(block);
            if (!event) continue;
            onEvent(event);
            if (event.type === 'complete' || event.type === 'error') return;
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') onError(err);
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err);
    });

  return cleanup;
}

export async function analyzeCEXFlow(
  walletAddress: string,
  chain: ChainId,
): Promise<ApiResponse<unknown>> {
  return apiRequest('/api/analyze/cex-flow', 'POST', {
    walletAddress,
    chain: normalizeChain(chain),
  });
}

export type CexFlowStreamEvent =
  | { type: 'status'; stage?: string; message?: string; transactionCount?: number }
  | { type: 'complete'; result: unknown }
  | { type: 'error'; error?: string; message?: string; hint?: string };

export function streamAnalyzeCEXFlow(
  walletAddress: string,
  chain: ChainId,
  onEvent: (event: CexFlowStreamEvent) => void,
  onError: (err: Error) => void,
): () => void {
  const token = getAuthToken();
  const apiKey = (() => { try { return localStorage.getItem('fdt_api_key'); } catch { return null; } })();
  const controller = new AbortController();
  let closed = false;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanup = () => {
    if (closed) return;
    closed = true;
    controller.abort();
  };

  const parseEventBlock = (block: string): CexFlowStreamEvent | null => {
    let eventType = 'message';
    const dataLines: string[] = [];
    for (const rawLine of block.split('\n')) {
      const line = rawLine.trimEnd();
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return null;
    try {
      const parsed = JSON.parse(dataLines.join('\n'));
      return { type: eventType as CexFlowStreamEvent['type'], ...parsed };
    } catch {
      return null;
    }
  };

  fetch(`${API_BASE}/api/analyze/cex-flow/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      walletAddress,
      chain: normalizeChain(chain),
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        onError(new Error(errorData.message || errorData.error || `HTTP ${response.status}`));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError(new Error('No response stream'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const event = parseEventBlock(block);
            if (!event) continue;
            onEvent(event);
            if (event.type === 'complete' || event.type === 'error') return;
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') onError(err);
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err);
    });

  return cleanup;
}

export async function getPortfolio(address: string, chain: string, opts?: { excludeSpam?: boolean; excludeUnpriced?: boolean }): Promise<unknown> {
  const params = new URLSearchParams({ chain });
  if (opts?.excludeSpam !== undefined) params.set('exclude_spam', String(opts.excludeSpam));
  if (opts?.excludeUnpriced !== undefined) params.set('exclude_unpriced', String(opts.excludeUnpriced));
  return apiRequest(`/api/portfolio/${encodeURIComponent(address)}?${params.toString()}`);
}

export async function getGasPrices(chain?: string): Promise<unknown> {
  const q = chain ? `?chain=${chain}` : '';
  return apiRequest(`/api/gas${q}`);
}

export async function getTransactions(address: string, chain: ChainId, limit = 50): Promise<unknown> {
  return apiRequest('/api/history', 'POST', {
    wallet: address,
    blockchain: normalizeChain(chain),
    limit,
  });
}

/**
 * Stream wallet transaction timestamps via SSE.
 * The initial analysis returns transactions with timestamp=0 for speed.
 * This streams batches of {hash, timestamp} to patch them progressively.
 * Returns a cleanup function that aborts the connection.
 */
export function streamWalletTimestamps(
  taskId: string,
  onBatch: (batch: { hashes: string[]; timestamps: number[] }) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): () => void {
  const token = getAuthToken();
  const apiKey = (() => { try { return localStorage.getItem('fdt_api_key'); } catch { return null; } })();
  const url = `${API_BASE}/api/analyze/timestamps/${taskId}`;
  const controller = new AbortController();
  let closed = false;

  const headers: Record<string, string> = {};
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanup = () => {
    if (closed) return;
    closed = true;
    controller.abort();
  };

  const shouldRetryMissingCache = (status: number, message: string) => (
    status === 404 && /cached transactions|run wallet analysis/i.test(message)
  );

  const start = (attempt = 0) => fetch(url, { headers, signal: controller.signal })
    .then(async (response) => {
      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const e = await response.json();
          message = e.error || e.message || message;
        } catch {}
        if (!closed && attempt < 8 && shouldRetryMissingCache(response.status, message)) {
          window.setTimeout(() => {
            if (!closed) void start(attempt + 1);
          }, 350);
          return;
        }
        onError(new Error(message));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) { onError(new Error('No response stream')); return; }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const jsonStr = line.slice(6);

            try {
              const data = JSON.parse(jsonStr);
              if (data.done) { reader.cancel(); onDone(); return; }
              if (data.error) { onError(new Error(data.error)); return; }
              if (data.hashes && data.timestamps) {
                onBatch({ hashes: data.hashes, timestamps: data.timestamps });
              }
            } catch { /* skip malformed lines */ }
          }
        }
        onDone();
      } catch (err: any) {
        if (err.name !== 'AbortError') onError(err);
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err);
    });

  void start();

  return cleanup;
}

export async function searchTokens(query: string): Promise<unknown> {
  return apiRequest(`/api/tokens/search?q=${encodeURIComponent(query)}`);
}

export async function scanContract(address: string, chain: ChainId): Promise<ApiResponse<unknown>> {
  return apiRequest('/api/contract/scan', 'POST', {
    address,
    chain: normalizeChain(chain),
  });
}

export type ContractScanStreamEvent =
  | { type: 'status'; stage?: string; message?: string; direction?: string; pages?: number; transfers?: number; uniqueWallets?: number; totalTransfers?: number }
  | { type: 'partial'; stage?: string; message?: string; contract?: Record<string, unknown> }
  | { type: 'complete'; result: unknown }
  | { type: 'error'; error?: string; message?: string; hint?: string };

export function streamScanContract(
  address: string,
  chain: ChainId,
  onEvent: (event: ContractScanStreamEvent) => void,
  onError: (err: Error) => void,
): () => void {
  const token = getAuthToken();
  const apiKey = (() => { try { return localStorage.getItem('fdt_api_key'); } catch { return null; } })();
  const controller = new AbortController();
  let closed = false;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  } else if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanup = () => {
    if (closed) return;
    closed = true;
    controller.abort();
  };

  const parseEventBlock = (block: string): ContractScanStreamEvent | null => {
    let eventType = 'message';
    const dataLines: string[] = [];
    for (const rawLine of block.split('\n')) {
      const line = rawLine.trimEnd();
      if (line.startsWith('event:')) eventType = line.slice(6).trim();
      if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) return null;
    try {
      const parsed = JSON.parse(dataLines.join('\n'));
      return { type: eventType as ContractScanStreamEvent['type'], ...parsed };
    } catch {
      return null;
    }
  };

  fetch(`${API_BASE}/api/contract/scan/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      address,
      chain: normalizeChain(chain),
    }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        onError(new Error(errorData.message || errorData.error || `HTTP ${response.status}`));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError(new Error('No response stream'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split('\n\n');
          buffer = blocks.pop() || '';

          for (const block of blocks) {
            const event = parseEventBlock(block);
            if (!event) continue;
            onEvent(event);
            if (event.type === 'complete' || event.type === 'error') return;
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') onError(err);
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') onError(err);
    });

  return cleanup;
}

export async function scanContractRich(address: string, chain: ChainId): Promise<ApiResponse<unknown>> {
  return apiRequest('/api/contract/scan-rich', 'POST', {
    address,
    chain: normalizeChain(chain),
  });
}

export async function shareAnalysis(data: Record<string, unknown>): Promise<{ id: string; url: string }> {
  return apiRequest('/api/share', 'POST', data);
}
