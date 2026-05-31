import type { WindowState } from '../types';

const STORAGE_KEY = 'fundtracer_window_state';

const DEFAULT_STATE: WindowState = {
  width: 1280,
  height: 800,
  maximized: false,
  sidebarCollapsed: false,
  openTabs: [{ id: 'default', address: '', chain: 'ethereum', type: 'wallet' }],
};

export function getWindowState(): WindowState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveWindowState(state: Partial<WindowState>): void {
  try {
    const current = getWindowState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...state }));
  } catch {}
}
