import React, { useState, useEffect } from 'react';
import { getDEXScreenerTrending } from '../../api';

interface TrendingToken {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  thumb?: string;
  chainId: string;
  tokenAddress: string;
}

interface HeroSectionProps {
  chain?: string;
  onTokenClick?: (token: TrendingToken) => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  chain = 'all',
  onTokenClick
}) => {
  const [trending, setTrending] = useState<TrendingToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    fetchTrending();
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

  const fetchTrending = async () => {
    setLoading(true);
    try {
      const response = await getDEXScreenerTrending();
      
      // Filter by chain if specified
      let tokens = response.tokens || [];
      if (chain && chain !== 'all') {
        tokens = tokens.filter((token: any) => 
          token.chainId?.toLowerCase() === chain.toLowerCase()
        );
      }
      
      // Take top 4 and format
      const topTokens = tokens.slice(0, 4).map((token: any, index: number) => {
        const priceUsd = token.priceUsd ? parseFloat(token.priceUsd) : 0;
        const priceChange = token.priceChange?.h24 || 0;
        
        return {
          id: `${token.chainId}-${token.tokenAddress}`,
          name: token.name || token.symbol || 'Unknown',
          symbol: token.symbol || '???',
          price: priceUsd,
          change24h: priceChange,
          thumb: getTokenImageUrl(token),
          chainId: token.chainId,
          tokenAddress: token.tokenAddress,
        };
      });
      
      setTrending(topTokens);
      setLastUpdated(response.lastUpdated || new Date().toISOString());
      setIsCached(response.cached || false);
    } catch (error) {
      console.error('Error fetching trending:', error);
      setTrending([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    }
    return `$${price.toFixed(6)}`;
  };

  const formatChange = (change: number) => {
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  return (
    <section className="hero-section">
      <h1 className="hero-title">Track Your Crypto Portfolio</h1>
      <p className="hero-subtitle">
        Real-time prices, portfolio tracking, and market analytics across all chains
      </p>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
          <div className="loading-spinner" />
        </div>
      ) : (
        <>
          <div className="trending-grid">
            {trending.map((token) => (
              <div
                key={token.id}
                className="trending-card"
                onClick={() => onTokenClick?.(token)}
              >
                <div className="trending-card-header">
                  {token.thumb ? (
                    <img 
                      src={token.thumb} 
                      alt={token.name}
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
                    <div className="trending-card-icon">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="trending-card-info">
                    <div className="trending-card-name">{token.name}</div>
                    <div className="trending-card-symbol">{token.symbol}</div>
                  </div>
                </div>
                <div className="trending-card-price">
                  {formatPrice(token.price)}
                </div>
                <div className={`trending-card-change ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
                  {formatChange(token.change24h)}
                </div>
              </div>
            ))}
          </div>
          
          {isCached && (
            <div style={{ 
              textAlign: 'center', 
              marginTop: 16, 
              fontSize: '0.875rem', 
              color: '#6b7280' 
            }}>
              Showing cached data • Last updated: {new Date(lastUpdated).toLocaleTimeString()}
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default HeroSection;
