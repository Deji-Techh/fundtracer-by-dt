import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { CHAINS } from '../../lib/chains.js';

const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

const COMMON_TOKEN_ADDRESSES = {
  ethereum: [
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    '0x514910771af9ca656af840dff83e8264ecf986ca',
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
  ],
  linea: [
    '0x6c3f90f043a72fa612cbac8115ee7e52bde6e769',
    '0xda5289fcaaf71d52a80a254da614a192b693e977',
  ],
  base: [
    '0x4200000000000000000000000000000000000006',
    '0x50c5725949a6f0c72e6a4a24ffded2a6c8d121f3',
  ],
  arbitrum: [
    '0xfa5ed56c20321f38f5db1810ce3ccbdd8b73519f',
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1',
  ],
  optimism: [
    '0x4200000000000000000000000000000000000042',
    '0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6',
  ],
  polygon: [
    '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
    '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
  ],
  bsc: [
    '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c',
    '0xe9e7cea3dedca5984780bafc599bd69add087d56',
  ],
};

export function useTokenBalances(walletAddress) {
  const [chainBalances, setChainBalances] = useState({});
  const [chainErrors, setChainErrors] = useState({});
  const [loadingChains, setLoadingChains] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const fetchChainBalance = useCallback(async (chainId) => {
    const chainConfig = CHAINS[chainId];
    if (!chainConfig) return null;

    try {
      setLoadingChains(prev => new Set([...prev, chainId]));

      const commonTokens = COMMON_TOKEN_ADDRESSES[chainId] || [];
      const tokenAbi = [
        {
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'owner', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        },
        {
          name: 'decimals',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'uint8' }],
        },
        {
          name: 'symbol',
          type: 'function',
          stateMutability: 'view',
          inputs: [],
          outputs: [{ name: '', type: 'string' }],
        },
      ];

      const contracts = commonTokens.map(tokenAddress => ({
        address: tokenAddress,
        abi: tokenAbi,
        functionName: 'balanceOf',
        args: [walletAddress],
      }));

      const chainKey = chainId === 'polygon_pos' ? 'polygon' : 
                      chainId === 'bsc' ? 'bsc' : chainId;
      
      const results = await fetch(`/api/portfolio/${walletAddress}?chain=${chainKey}`, {
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (!results.ok) {
        throw new Error('Failed to fetch balances');
      }

      const data = await results.json();
      setChainBalances(prev => ({
        ...prev,
        [chainId]: {
          native: { symbol: 'ETH', balance: '0', decimals: 18 },
          tokens: data.tokens || [],
          timestamp: Date.now(),
        },
      }));

      return data;
    } catch (error) {
      console.warn(`[useTokenBalances] Failed to fetch ${chainId}:`, error);
      setChainErrors(prev => ({ ...prev, [chainId]: error.message }));
      return null;
    } finally {
      setLoadingChains(prev => {
        const next = new Set(prev);
        next.delete(chainId);
        return next;
      });
    }
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      setChainBalances({});
      setChainErrors({});
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const chains = Object.keys(CHAINS);
    let mounted = true;

    chains.forEach(chainId => {
      if (mounted) {
        fetchChainBalance(chainId);
      }
    });

    const timer = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 2000);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [walletAddress, fetchChainBalance]);

  const allTokens = useMemo(() => {
    const tokens = [];
    Object.entries(chainBalances).forEach(([chainId, balances]) => {
      const chainConfig = CHAINS[chainId];
      if (!chainConfig) return;

      if (balances.native) {
        tokens.push({
          chainId,
          chainName: chainConfig.name,
          chainColor: chainConfig.color,
          address: NATIVE_TOKEN_ADDRESS,
          symbol: chainId === 'bsc' ? 'BNB' : 'ETH',
          balance: balances.native.balance,
          decimals: 18,
          isNative: true,
        });
      }

      (balances.tokens || []).forEach(token => {
        tokens.push({
          chainId,
          chainName: chainConfig.name,
          chainColor: chainConfig.color,
          address: token.address,
          symbol: token.symbol,
          balance: token.balance,
          decimals: token.decimals,
          logoUrl: token.logoUrl,
          isNative: false,
        });
      });
    });

    return tokens.sort((a, b) => {
      const valueA = parseFloat(a.balance) / Math.pow(10, a.decimals);
      const valueB = parseFloat(b.balance) / Math.pow(10, b.decimals);
      return valueB - valueA;
    });
  }, [chainBalances]);

  const totalValue = useMemo(() => {
    return allTokens.reduce((sum, token) => {
      const balance = parseFloat(token.balance) / Math.pow(10, token.decimals);
      return sum + (balance * (token.price || 0));
    }, 0);
  }, [allTokens]);

  const chainBreakdown = useMemo(() => {
    const breakdown = {};
    allTokens.forEach(token => {
      const value = (parseFloat(token.balance) / Math.pow(10, token.decimals)) * (token.price || 0);
      breakdown[token.chainId] = (breakdown[token.chainId] || 0) + value;
    });
    return breakdown;
  }, [allTokens]);

  return {
    tokens: allTokens,
    totalValue,
    chainBreakdown,
    chainBalances,
    chainErrors,
    loadingChains: Array.from(loadingChains),
    isLoading: isLoading || loadingChains.size > 0,
    refetch: () => Object.keys(CHAINS).forEach(fetchChainBalance),
  };
}

export default useTokenBalances;
