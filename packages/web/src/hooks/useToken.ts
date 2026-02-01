import { useState, useEffect } from 'react';
import { tokensApi, TokenDetails } from '../services/api/tokensApi';

export const useToken = (address: string | null, chain: string = 'linea') => {
  const [data, setData] = useState<TokenDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setData(null);
      setError(null);
      return;
    }

    const fetchToken = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await tokensApi.getToken(address, chain);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch token details');
        console.error('Token fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchToken();
  }, [address, chain]);

  return { data, loading, error };
};

export default useToken;
