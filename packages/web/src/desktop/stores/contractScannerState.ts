import type { ChainId } from '../types';

const STORAGE_KEY = 'fundtracer_contract_scanner_state';
const keyFor = (scope: string) => `${STORAGE_KEY}:${scope}`;

type ScannerTab = 'overview' | 'interactors' | 'shared-funding';

export interface ContractScannerState {
  address: string;
  chain: ChainId;
  result: Record<string, unknown> | null;
  activeTab: ScannerTab;
  aiMessages: Array<{ role: 'assistant' | 'user'; content: string }>;
}

const DEFAULT_STATE: ContractScannerState = {
  address: '',
  chain: 'ethereum',
  result: null,
  activeTab: 'overview',
  aiMessages: [],
};

export function getContractScannerState(scope = 'global'): ContractScannerState {
  try {
    const raw = localStorage.getItem(keyFor(scope));
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<ContractScannerState>;
    return {
      address: typeof parsed.address === 'string' ? parsed.address : '',
      chain: (parsed.chain || 'ethereum') as ChainId,
      result: (parsed.result || null) as Record<string, unknown> | null,
      activeTab: (parsed.activeTab || 'overview') as ScannerTab,
      aiMessages: Array.isArray(parsed.aiMessages) ? parsed.aiMessages : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveContractScannerState(state: ContractScannerState, scope = 'global'): void {
  try {
    localStorage.setItem(keyFor(scope), JSON.stringify(state));
  } catch {}
}

export function clearContractScannerState(scope = 'global'): void {
  try {
    localStorage.removeItem(keyFor(scope));
  } catch {}
}
