import { useState, useEffect, useCallback } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  chain: string | null;
  chainId: number | null;
}

const CHAIN_IDS: Record<string, number> = {
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  bsc: 56,
  avalanche: 43114,
  linea: 59144,
  solana: 'solana' as unknown as number,
};

export function useWallet() {
  const { 
    user, 
    login, 
    logout, 
    connectWallet, 
    disconnectWallet,
    ready,
    authenticated 
  } = usePrivy();
  
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    isConnected: false,
    chain: null,
    chainId: null,
  });

  useEffect(() => {
    if (user?.wallet) {
      setWalletState({
        address: user.wallet.address,
        isConnected: true,
        chain: user.wallet.chainType === 'ethereum' ? 'eip155' : 'solana',
        chainId: user.wallet.chainType === 'ethereum' ? 1 : 0,
      });
    } else {
      setWalletState({
        address: null,
        isConnected: false,
        chain: null,
        chainId: null,
      });
    }
  }, [user]);

  const connect = useCallback(async () => {
    try {
      await connectWallet();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  }, [connectWallet]);

  const disconnect = useCallback(async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }, [disconnectWallet]);

  const switchChain = useCallback(async (chainName: string) => {
    if (!window.ethereum) return;
    
    const chainId = CHAIN_IDS[chainName.toLowerCase()];
    if (!chainId) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error) {
      console.error('Failed to switch chain:', error);
    }
  }, []);

  return {
    address: walletState.address,
    isConnected: walletState.isConnected,
    chain: walletState.chain,
    chainId: walletState.chainId,
    connect,
    disconnect,
    switchChain,
    login,
    logout,
    ready,
    authenticated,
  };
}

export function useWalletAddress() {
  const { address, isConnected } = useWallet();
  return { address, isConnected };
}

export default useWallet;
