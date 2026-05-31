import type { ChainId } from '../types';

const STORAGE_KEY = 'fundtracer_compare_state';
const keyFor = (scope: string) => `${STORAGE_KEY}:${scope}`;

export interface CompareState {
  addresses: string[];
  chain: ChainId;
  result: Record<string, unknown> | null;
  aiMessages?: Array<{ role: 'assistant' | 'user'; content: string }>;
  activeTab?: 'overview' | 'graph' | 'detailed';
}

const DEFAULT_STATE: CompareState = {
  addresses: ['', ''],
  chain: 'ethereum',
  result: null,
  aiMessages: [],
  activeTab: 'overview',
};

export function getCompareState(scope = 'global'): CompareState {
  try {
    const raw = localStorage.getItem(keyFor(scope));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<CompareState>;
    return {
      addresses: Array.isArray(parsed.addresses) && parsed.addresses.length >= 2 ? parsed.addresses : ['', ''],
      chain: (parsed.chain || 'ethereum') as ChainId,
      result: (parsed.result || null) as Record<string, unknown> | null,
      aiMessages: Array.isArray(parsed.aiMessages) ? parsed.aiMessages : [],
      activeTab: (parsed.activeTab || 'overview') as 'overview' | 'graph' | 'detailed',
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveCompareState(state: CompareState, scope = 'global'): void {
  try {
    localStorage.setItem(keyFor(scope), JSON.stringify(state));
  } catch {}
}

export function clearCompareState(scope = 'global'): void {
  try {
    localStorage.removeItem(keyFor(scope));
  } catch {}
}
