import { useState, useEffect } from 'react';
import { tokensApi, TokenSearchResult } from '../services/api/tokensApi';

export const useTokenSearch = (query: string) => {
  const [results, setResults] = useState<TokenSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await tokensApi.search(query);
        setResults(data);
      } catch (err: any) {
        setError(err.message || 'Failed to search tokens');
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading, error };
};

export default useTokenSearch;
