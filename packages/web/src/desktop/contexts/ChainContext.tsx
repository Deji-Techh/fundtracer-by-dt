import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ChainId } from '../types';

interface ChainContextType {
  chain: ChainId;
  setChain: (chain: ChainId) => void;
}

const ChainContext = createContext<ChainContextType>({
  chain: 'ethereum',
  setChain: () => {},
});

export function ChainProvider({ children }: { children: ReactNode }) {
  const [chain, setChain] = useState<ChainId>('ethereum');

  const updateChain = useCallback((c: ChainId) => setChain(c), []);

  return (
    <ChainContext.Provider value={{ chain, setChain: updateChain }}>
      {children}
    </ChainContext.Provider>
  );
}

export function useChain() {
  return useContext(ChainContext);
}

export const CHAINS: { id: ChainId; label: string }[] = [
  { id: 'ethereum', label: 'Ethereum' }, { id: 'linea', label: 'Linea' },
  { id: 'arbitrum', label: 'Arbitrum' }, { id: 'base', label: 'Base' },
  { id: 'optimism', label: 'Optimism' }, { id: 'polygon', label: 'Polygon' },
  { id: 'bsc', label: 'BSC' }, { id: 'solana', label: 'Solana' },
];
