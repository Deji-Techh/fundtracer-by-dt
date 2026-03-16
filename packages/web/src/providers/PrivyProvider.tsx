import React from 'react';
import { PrivyProvider as PrivyReactProvider, usePrivy } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID || 'your-privy-app-id';

interface PrivyUser {
  id: string;
  email?: string;
  wallet?: {
    address: string;
    chainType: 'ethereum' | 'solana';
  };
}

interface PrivyContextValue {
  user: PrivyUser | null;
  address: string | null;
  chain: string | null;
  isConnected: boolean;
  connectWallet: () => void;
  disconnectWallet: () => void;
  login: () => void;
  logout: () => void;
  ready: boolean;
  authenticated: boolean;
}

const PrivyContext = React.createContext<PrivyContextValue>({
  user: null,
  address: null,
  chain: null,
  isConnected: false,
  connectWallet: () => {},
  disconnectWallet: () => {},
  login: () => {},
  logout: () => {},
  ready: false,
  authenticated: false,
});

export const usePrivyWallet = () => React.useContext(PrivyContext);

function PrivyInner({ children }: { children: React.ReactNode }) {
  const { user, login, logout, connectWallet, disconnectWallet, ready, authenticated } = usePrivy();
  const [address, setAddress] = useState<string | null>(null);
  const [chain, setChain] = useState<string | null>(null);

  useEffect(() => {
    if (user?.wallet) {
      setAddress(user.wallet.address);
      setChain(user.wallet.chainType === 'ethereum' ? 'eip155' : 'solana');
    } else {
      setAddress(null);
      setChain(null);
    }
  }, [user]);

  const value: PrivyContextValue = {
    user: user as PrivyUser | null,
    address,
    chain,
    isConnected: !!address,
    connectWallet,
    disconnectWallet,
    login,
    logout,
    ready,
    authenticated,
  };

  return (
    <PrivyContext.Provider value={value}>
      {children}
    </PrivyContext.Provider>
  );
}

interface PrivyProviderProps {
  children: React.ReactNode;
}

export function PrivyWalletProvider({ children }: PrivyProviderProps) {
  if (!PRIVY_APP_ID || PRIVY_APP_ID === 'your-privy-app-id') {
    console.warn('Privy App ID not configured. Set VITE_PRIVY_APP_ID in your environment.');
    return <>{children}</>;
  }

  return (
    <PrivyReactProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#22d3ee',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <PrivyInner>{children}</PrivyInner>
    </PrivyReactProvider>
  );
}

export default PrivyWalletProvider;
