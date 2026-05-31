import type { ChainId } from '../types';

const STORAGE_KEY = 'fundtracer_cex_flow_state';
const keyFor = (scope: string) => `${STORAGE_KEY}:${scope}`;

export interface CexFlowState {
  address: string;
  chain: ChainId;
  result: Record<string, unknown> | null;
}

const DEFAULT_STATE: CexFlowState = {
  address: '',
  chain: 'ethereum',
  result: null,
};

export function getCexFlowState(scope = 'global'): CexFlowState {
  try {
    const raw = localStorage.getItem(keyFor(scope));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<CexFlowState>;
    return {
      address: typeof parsed.address === 'string' ? parsed.address : '',
      chain: (parsed.chain || 'ethereum') as ChainId,
      result: (parsed.result || null) as Record<string, unknown> | null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveCexFlowState(state: CexFlowState, scope = 'global'): void {
  try {
    localStorage.setItem(keyFor(scope), JSON.stringify(state));
  } catch {}
}

export function clearCexFlowState(scope = 'global'): void {
  try {
    localStorage.removeItem(keyFor(scope));
  } catch {}
}
