import { clearLocalHistoryCache, stopHistoryPolling } from './history';

const EXACT_KEYS = [
  'fundtracer_tabs_v2',
  'fundtracer_window_state',
];

const KEY_PREFIXES = [
  'fundtracer_compare_state:',
  'fundtracer_contract_scanner_state:',
  'fundtracer_cex_flow_state:',
  'fundtracer_interactors_state:',
  'fundtracer_sybil_state:',
];

const SESSION_KEYS = [
  'try_now_address',
  'try_now_chain',
];

export function clearLocalAppSessionState(): void {
  stopHistoryPolling();
  clearLocalHistoryCache();

  try {
    for (const key of EXACT_KEYS) localStorage.removeItem(key);

    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (KEY_PREFIXES.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {}

  try {
    for (const key of SESSION_KEYS) sessionStorage.removeItem(key);
  } catch {}
}
