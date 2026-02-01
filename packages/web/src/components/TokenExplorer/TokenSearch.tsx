import React, { useState, useEffect, useCallback } from 'react';

interface TokenResult {
  id: string;
  name: string;
  symbol: string;
  thumb: string;
}

interface TokenSearchProps {
  onSelect: (token: TokenResult) => void;
  placeholder?: string;
}

export const TokenSearch: React.FC<TokenSearchProps> = ({ 
  onSelect, 
  placeholder = "Search tokens..." 
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TokenResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchTokens = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      // Using CoinGecko search API
      const response = await fetch(`/api/tokens/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Error searching tokens:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchTokens(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchTokens]);

  const handleSelect = (token: TokenResult) => {
    onSelect(token);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 16px',
          borderRadius: '8px',
          border: '1px solid #e5e5e5',
          fontSize: '1rem',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
      />

      {showDropdown && (query.length >= 2 || results.length > 0) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {loading ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
              Searching...
            </div>
          ) : results.length > 0 ? (
            results.map((token) => (
              <div
                key={token.id}
                onClick={() => handleSelect(token)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {token.thumb ? (
                  <img
                    src={token.thumb}
                    alt={token.symbol}
                    style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: '#e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6b7280',
                    }}
                  >
                    {token.symbol.charAt(0)}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{token.name}</div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{token.symbol}</div>
                </div>
              </div>
            ))
          ) : query.length >= 2 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
              No tokens found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default TokenSearch;
