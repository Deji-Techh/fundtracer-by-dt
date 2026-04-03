import { usePrivy } from '@privy-io/react-auth';

interface UnifiedWallet {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  provider: 'privy' | null;
}

export function useUnifiedWallet(): UnifiedWallet {
  const { 
    login: privyLogin, 
    logout: privyLogout, 
    user: privyUser,
    ready: privyReady 
  } = usePrivy();
  
  const privyAddress = privyUser?.wallet?.address || null;
  const privyConnected = !!privyAddress;
  
  return {
    address: privyAddress,
    isConnected: privyConnected,
    isConnecting: !privyReady,
    connect: async () => {
      try {
        await privyLogin();
      } catch (error) {
        console.error('[useUnifiedWallet] Privy connect error:', error);
        throw error;
      }
    },
    disconnect: async () => {
      try {
        await privyLogout();
      } catch (error) {
        console.error('[useUnifiedWallet] Privy disconnect error:', error);
        throw error;
      }
    },
    provider: 'privy',
  };
}

export default useUnifiedWallet;
