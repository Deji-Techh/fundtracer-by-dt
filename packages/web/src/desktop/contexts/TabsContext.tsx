import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { AnalysisTab, ChainId } from '../types';

const TABS_KEY = 'fundtracer_tabs_v2';

interface PersistedTabs {
  activeTabId: string | null;
  tabs: AnalysisTab[];
}

function saveTabsToStore(tabs: AnalysisTab[], activeTabId: string | null): void {
  try {
    const data: PersistedTabs = {
      activeTabId,
      tabs: tabs.map(t => ({ ...t, loading: false, error: undefined })),
    };
    localStorage.setItem(TABS_KEY, JSON.stringify(data));
  } catch {}
}

function loadTabsFromStore(): { tabs: AnalysisTab[]; activeTabId: string | null } {
  try {
    const raw = localStorage.getItem(TABS_KEY);
    if (!raw) return { tabs: [], activeTabId: null };
    const data = JSON.parse(raw);
    const tabs: AnalysisTab[] = (Array.isArray(data.tabs) ? data.tabs : [])
      .map((t: AnalysisTab) => ({ ...t, loading: false, error: undefined }));
    return { tabs, activeTabId: data.activeTabId || (tabs[0]?.id || null) };
  } catch { return { tabs: [], activeTabId: null }; }
}

interface TabsContextType {
  tabs: AnalysisTab[];
  activeTabId: string | null;
  openTab: (address?: string, chain?: ChainId, type?: AnalysisTab['type']) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, updates: Partial<AnalysisTab>) => void;
}

const TabsContext = createContext<TabsContextType>({
  tabs: [],
  activeTabId: null,
  openTab: () => {},
  closeTab: () => {},
  setActiveTab: () => {},
  updateTab: () => {},
});

let tabCounter = 0;

function createTab(address?: string, chain?: ChainId, type?: AnalysisTab['type']): AnalysisTab {
  const id = `tab_${++tabCounter}_${Date.now()}`;
  return {
    id,
    address: address || '',
    chain: chain || 'ethereum',
    type: type || 'wallet',
    loading: false,
  };
}

export function TabsProvider({ children }: { children: ReactNode }) {
  const saved = loadTabsFromStore();
  const initialTabs = saved.tabs.length > 0 ? saved.tabs : [createTab()];
  const [tabs, setTabs] = useState<AnalysisTab[]>(initialTabs);
  const [activeTabId, setActiveTabId] = useState<string | null>(
    saved.activeTabId && initialTabs.find(t => t.id === saved.activeTabId) ? saved.activeTabId : initialTabs[0]?.id || null
  );

  useEffect(() => {
    saveTabsToStore(tabs, activeTabId);
  }, [tabs, activeTabId]);

  const openTab = useCallback((address?: string, chain?: ChainId, type?: AnalysisTab['type']) => {
    // If address given, check if tab already exists for that address
    if (address) {
      const existing = tabs.find(t => t.address.toLowerCase() === address.toLowerCase());
      if (existing) {
        setActiveTabId(existing.id);
        return;
      }
    }
    const tab = createTab(address, chain, type);
    setTabs(prev => [...prev, tab]);
    setActiveTabId(tab.id);
  }, [tabs]);

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      if (prev.length <= 1) return prev; // Keep at least one tab
      const idx = prev.findIndex(t => t.id === id);
      const next = prev.filter(t => t.id !== id);
      if (id === activeTabId) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx]?.id || null);
      }
      return next;
    });
  }, [activeTabId]);

  const setActiveTab = useCallback((id: string) => {
    if (tabs.find(t => t.id === id)) {
      setActiveTabId(id);
    }
  }, [tabs]);

  const updateTab = useCallback((id: string, updates: Partial<AnalysisTab>) => {
    setTabs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  return (
    <TabsContext.Provider value={{ tabs, activeTabId, openTab, closeTab, setActiveTab, updateTab }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  return useContext(TabsContext);
}

export { TabsContext };
