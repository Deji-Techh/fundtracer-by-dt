import type { ChainId } from '../types';

const STORAGE_KEY = 'fundtracer_sybil_state';
const keyFor = (scope: string) => `${STORAGE_KEY}:${scope}`;

export interface SybilState {
  textInput: string;
  chain: ChainId;
  result: Record<string, unknown> | null;
}

const DEFAULT_STATE: SybilState = {
  textInput: '',
  chain: 'ethereum',
  result: null,
};

export function getSybilState(scope = 'global'): SybilState {
  try {
    const raw = localStorage.getItem(keyFor(scope));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<SybilState>;
    return {
      textInput: typeof parsed.textInput === 'string' ? parsed.textInput : '',
      chain: (parsed.chain || 'ethereum') as ChainId,
      result: (parsed.result || null) as Record<string, unknown> | null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveSybilState(state: SybilState, scope = 'global'): void {
  try {
    localStorage.setItem(keyFor(scope), JSON.stringify(state));
  } catch {}
}

export function clearSybilState(scope = 'global'): void {
  try {
    localStorage.removeItem(keyFor(scope));
  } catch {}
}
