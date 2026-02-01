import { useState, useEffect } from 'react';
import { portfolioApi, PortfolioData } from '../services/api/portfolioApi';

export const usePortfolio = (walletAddress: string | null, chain: string = 'linea') => {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setData(null);
      setError(null);
      return;
    }

    const fetchPortfolio = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await portfolioApi.getPortfolio(walletAddress, chain);
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch portfolio');
        console.error('Portfolio fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [walletAddress, chain]);

  return { data, loading, error, refetch: () => {} };
};

export default usePortfolio;
