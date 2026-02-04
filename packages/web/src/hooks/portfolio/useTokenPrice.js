import { useState, useEffect, useCallback, useRef } from 'react';
import { cache } from '../../lib/cache.js';
import { geckoTerminal, dexScreener } from '../../lib/apiClient.js';

const PRICE_CACHE_TTL = 60;

const TOKEN_ADDRESS_TO_POOL = {
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': { network: 'ethereum', address: '0xb5c1077355d12d653239d5e69a7f61d88e9a30a6' },
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': { network: 'ethereum', address: '0x1a62f9e72d0c7a6a7d8f6a9e7c8c5e4b3a2f1e0d' },
  '0x514910771af9ca656af840dff83e8264ecf986ca': { network: 'ethereum', address: '0xdc9ac1465f5c90e5c8d1f7c4c2d7b3a9e8f6d4c2' },
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': { network: 'ethereum', address: '0x3e4a3a47b5e8d9c9f9c5b9d7e8f6d5c4b3a2918' },
  '0x6c3f90f043a72fa612cbac8115ee7e52bde6e769': { network: 'linea', address: '0x6c3f90f043a72fa612cbac8115ee7e52bde6e769' },
  '0xda5289fcaaf71d52a80a254da614a192b693e977': { network: 'linea', address: '0xda5289fcaaf71d52a80a254da614a192b693e977' },
};

export function useTokenPrice(tokenAddress, chainId = 'ethereum') {
  const [price, setPrice] = useState(null);
  const [change24h, setChange24h] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchPrice = useCallback(async () => {
    if (!tokenAddress) return;

    const cacheKey = `price:${tokenAddress}:${chainId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL * 1000) {
      setPrice(cached.price);
      setChange24h(cached.change24h);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let priceData = null;
      const poolInfo = TOKEN_ADDRESS_TO_POOL[tokenAddress.toLowerCase()];

      if (poolInfo) {
        try {
          const gtData = await geckoTerminal.getOHLCV(poolInfo.network, poolInfo.address, 'hour', '24');
          if (gtData?.data?.attributes?.ohlcv?.length > 0) {
            const ohlcv = gtData.data.attributes.ohlcv;
            const latestPrice = ohlcv[ohlcv.length - 1]?.[5];
            const prevPrice = ohlcv[0]?.[5];
            priceData = {
              price: latestPrice,
              change24h: prevPrice ? ((latestPrice - prevPrice) / prevPrice) * 100 : 0,
            };
          }
        } catch (gtError) {
          console.warn('[useTokenPrice] GeckoTerminal failed:', gtError);
        }
      }

      if (!priceData && chainId) {
        try {
          const dsPair = await dexScreener.getPair(chainId, tokenAddress);
          if (dsPair?.pair) {
            priceData = {
              price: parseFloat(dsPair.pair.priceUsd) || 0,
              change24h: dsPair.pair.priceChange?.h24 || 0,
            };
          }
        } catch (dsError) {
          console.warn('[useTokenPrice] DexScreener failed:', dsError);
        }
      }

      if (priceData && mountedRef.current) {
        setPrice(priceData.price);
        setChange24h(priceData.change24h);
        cache.set(cacheKey, {
          price: priceData.price,
          change24h: priceData.change24h,
          timestamp: Date.now(),
        }, PRICE_CACHE_TTL);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tokenAddress, chainId]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPrice();

    const interval = setInterval(fetchPrice, PRICE_CACHE_TTL * 1000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchPrice]);

  const refetch = useCallback(() => {
    const cacheKey = `price:${tokenAddress}:${chainId}`;
    cache.delete(cacheKey);
    fetchPrice();
  }, [fetchPrice, tokenAddress, chainId]);

  return { price, change24h, isLoading, error, refetch };
}

export function useMultiTokenPrices(tokens) {
  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!tokens || tokens.length === 0) return;

    setIsLoading(true);
    const loadedPrices = {};
    let mounted = true;

    tokens.forEach(async (token) => {
      const { price, change24h } = await useTokenPrice(token.address, token.chainId);
      if (mounted) {
        loadedPrices[token.address] = { price, change24h };
        if (Object.keys(loadedPrices).length === tokens.length) {
          setPrices(loadedPrices);
          setIsLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
    };
  }, [tokens]);

  return { prices, isLoading };
}

export default useTokenPrice;
