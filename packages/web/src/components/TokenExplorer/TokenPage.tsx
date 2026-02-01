import React, { useState } from 'react';
import { TokenSearch } from './TokenSearch';
import { TokenChart } from './TokenChart';
import { TokenDetails } from './TokenDetails';
import { useToken } from '../../hooks/useToken';

export const TokenPage: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const { data: tokenDetails, loading: detailsLoading } = useToken(
    selectedToken?.contractAddress || null
  );

  const handleTokenSelect = async (token: any) => {
    setSelectedToken(token);
    
    // Fetch market data from CoinGecko
    try {
      const marketDataResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/${token.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
      );
      const marketDataJson = await marketDataResponse.json();
      setMarketData(marketDataJson.market_data);
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      setMarketData(null);
    }
  };

  return (
    <div>
      {/* Search */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 16px 0', color: '#111827' }}>Token Explorer</h2>
        <TokenSearch 
          onSelect={handleTokenSelect}
          placeholder="Search for tokens (e.g. Ethereum, USDC)..."
        />
      </div>

      {/* Results */}
      {selectedToken && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Token Details */}
          <TokenDetails 
            token={selectedToken}
            marketData={marketData}
            loading={detailsLoading}
          />

          {/* Price Chart */}
          <TokenChart 
            coinId={selectedToken.id}
            tokenName={selectedToken.name}
          />
        </div>
      )}

      {!selectedToken && (
        <div style={{ 
          padding: '48px 24px', 
          textAlign: 'center', 
          color: '#9ca3af',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e5e5',
        }}>
          Search for a token to view details and price chart
        </div>
      )}
    </div>
  );
};

export default TokenPage;
