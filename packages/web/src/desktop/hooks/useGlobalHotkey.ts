import { useEffect, useCallback } from 'react';
import { isTauri } from '../lib/tauri-commands';
import { useTabs } from '../contexts/TabsContext';
import { extractAddress } from './useClipboardDetection';

export function useGlobalHotkey() {
  const { openTab } = useTabs();

  const handleHotkey = useCallback(async () => {
    try {
      // Read primary selection via Rust command
      const { invoke } = await import('@tauri-apps/api/core');
      const text = await invoke<string>('check_primary_selection');
      if (!text) return;

      const address = extractAddress(text);
      if (address) {
        openTab(address);
      }
    } catch {
      // No selection or not in Tauri — silently skip
    }
  }, [openTab]);

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setup = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        const unlistenFn = await listen('global-hotkey-triggered', () => {
          handleHotkey();
        });
        unlisten = unlistenFn;
      } catch {
        // Global shortcut not available
      }
    };

    setup();
    return () => { unlisten?.(); };
  }, [handleHotkey]);
}
