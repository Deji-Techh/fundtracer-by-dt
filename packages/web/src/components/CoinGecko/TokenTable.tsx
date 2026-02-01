import React, { useState, useEffect } from 'react';
import { getDEXScreenerTrending } from '../../api';

interface Token {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  fdv: number;
  image?: string;
  thumb?: string;
  chainId: string;
  tokenAddress: string;
  dexId?: string;
}

interface TokenTableProps {
  chain?: string;
  onTokenClick?: (token: Token) => void;
}

const TokenTable: React.FC<TokenTableProps> = ({
  chain = 'all',
  onTokenClick
}) => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    fetchTokens();
  }, [chain]);

  const getTokenImageUrl = (token: any): string | undefined => {
    // Try to get image from info.imageUrl (DEX Screener CDN format)
    if (token.info?.imageUrl) {
      return token.info.imageUrl;
    }
    
    // Fallback to icon or header fields
    if (token.icon) {
      return token.icon;
    }
    
    if (token.header) {
      return token.header;
    }
    
    return undefined;
  };

  const fetchTokens = async () => {
    setLoading(true);
    try {
      const response = await getDEXScreenerTrending();
      
      // Filter by chain if specified
      let allTokens = response.tokens || [];
      if (chain && chain !== 'all') {
        allTokens = allTokens.filter((token: any) => 
          token.chainId?.toLowerCase() === chain.toLowerCase()
        );
      }
      
      // Format tokens with DEX Screener data
      const formattedTokens = allTokens.slice(0, 100).map((token: any, index: number) => {
        const priceUsd = token.priceUsd ? parseFloat(token.priceUsd) : 0;
        const priceChange = token.priceChange?.h24 || 0;
        const volume24h = token.volume?.h24 || 0;
        
        return {
          id: `${token.chainId}-${token.tokenAddress}`,
          rank: index + 1,
          name: token.name || token.symbol || 'Unknown',
          symbol: token.symbol || '???',
          price: priceUsd,
          change24h: priceChange,
          volume24h: volume24h,
          marketCap: token.marketCap || 0,
          fdv: token.fdv || 0,
          thumb: getTokenImageUrl(token),
          chainId: token.chainId,
          tokenAddress: token.tokenAddress,
          dexId: token.dexId,
        };
      });
      
      setTokens(formattedTokens);
      setLastUpdated(response.lastUpdated || new Date().toISOString());
      setIsCached(response.cached || false);
    } catch (error) {
      console.error('Error fetching tokens:', error);
      setTokens([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return `$${price.toFixed(6)}`;
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatChange = (change: number) => {
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedTokens = [...tokens].sort((a, b) => {
    let aValue: number, bValue: number;
    
    switch (sortBy) {
      case 'name':
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      default:
        aValue = a[sortBy as keyof Token] as number || 0;
        bValue = b[sortBy as keyof Token] as number || 0;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
  });

  const headers = [
    { field: 'rank', label: '#', width: '50px', sortable: false },
    { field: 'name', label: 'Token', width: '2fr', sortable: true },
    { field: 'price', label: 'Price', width: '1fr', sortable: true },
    { field: 'change24h', label: '24h %', width: '1fr', sortable: true },
    { field: 'volume24h', label: 'Volume (24h)', width: '1fr', sortable: true },
    { field: 'marketCap', label: 'Market Cap', width: '1fr', sortable: true },
    { field: 'fdv', label: 'FDV', width: '1fr', sortable: true },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="token-table-container">
        <div className="token-table-header">
          {headers.map((header) => (
            <div
              key={header.field}
              className="token-table-header-cell"
              onClick={() => header.sortable && handleSort(header.field)}
              style={{ cursor: header.sortable ? 'pointer' : 'default' }}
            >
              <span>{header.label}</span>
              {sortBy === header.field && header.sortable && (
                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </div>
          ))}
        </div>

        {sortedTokens.map((token) => (
          <div
            key={token.id}
            className="token-table-row"
            onClick={() => onTokenClick?.(token)}
          >
            <div className="token-table-cell">
              <span className="token-rank">{token.rank}</span>
            </div>
            <div className="token-table-cell">
              <div className="token-info">
                {token.thumb ? (
                  <img 
                    src={token.thumb} 
                    alt={token.name}
                    className="token-icon"
                    style={{ 
                      width: 40, 
                      height: 40, 
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="token-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700 }}>
                    {token.symbol.slice(0, 2)}
                  </div>
                )}
                <div className="token-details">
                  <span className="token-name">{token.name}</span>
                  <span className="token-symbol">{token.symbol}</span>
                  {token.dexId && (
                    <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{token.dexId}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="token-table-cell">
              <span className="token-price">{formatPrice(token.price)}</span>
            </div>
            <div className="token-table-cell">
              <span className={`token-change ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
                {formatChange(token.change24h)}
              </span>
            </div>
            <div className="token-table-cell">
              <span className="token-volume">{formatLargeNumber(token.volume24h)}</span>
            </div>
            <div className="token-table-cell">
              <span className="token-market-cap">{formatLargeNumber(token.marketCap)}</span>
            </div>
            <div className="token-table-cell">
              <span className="token-fdv">{formatLargeNumber(token.fdv)}</span>
            </div>
          </div>
        ))}
      </div>
      
      {isCached && (
        <div style={{ 
          textAlign: 'center', 
          marginTop: 20, 
          fontSize: '0.875rem', 
          color: '#6b7280' 
        }}>
          Showing cached data • Last updated: {new Date(lastUpdated).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default TokenTable;
