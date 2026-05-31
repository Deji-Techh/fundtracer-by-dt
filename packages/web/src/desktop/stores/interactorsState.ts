import type { ChainId } from '../types';

const STORAGE_KEY = 'fundtracer_interactors_state';
const keyFor = (scope: string) => `${STORAGE_KEY}:${scope}`;

export interface InteractorsState {
  address: string;
  chain: ChainId;
  result: Record<string, unknown> | null;
}

const DEFAULT_STATE: InteractorsState = {
  address: '',
  chain: 'ethereum',
  result: null,
};

export function getInteractorsState(scope = 'global'): InteractorsState {
  try {
    const raw = localStorage.getItem(keyFor(scope));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<InteractorsState>;
    return {
      address: typeof parsed.address === 'string' ? parsed.address : '',
      chain: (parsed.chain || 'ethereum') as ChainId,
      result: (parsed.result || null) as Record<string, unknown> | null,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveInteractorsState(state: InteractorsState, scope = 'global'): void {
  try {
    localStorage.setItem(keyFor(scope), JSON.stringify(state));
  } catch {}
}

export function clearInteractorsState(scope = 'global'): void {
  try {
    localStorage.removeItem(keyFor(scope));
  } catch {}
}
