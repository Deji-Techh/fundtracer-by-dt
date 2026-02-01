import React, { useState, useEffect } from 'react';
import { Wallet, Coins, Image, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  usdValue?: number;
}

interface NFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  collectionName?: string;
}

interface PortfolioData {
  address: string;
  ethBalance: string;
  tokens: TokenBalance[];
  nfts: NFT[];
  totalUsdValue: number;
}

export const PortfolioViewer = React.memo(function PortfolioViewer({ walletAddress }: { walletAddress: string }) {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState(true);
  const [showNFTs, setShowNFTs] = useState(false);

  useEffect(() => {
    if (walletAddress) {
      fetchPortfolio();
    }
  }, [walletAddress]);

  const fetchPortfolio = async () => {
    setLoading(true);
    setError(null);

    try {
      // Use Alchemy API to get token balances
      const alchemyKey = import.meta.env.VITE_ALCHEMY_API_KEY || '';
      
      // Fetch token balances
      const tokenResponse = await fetch(
        `https://linea-mainnet.g.alchemy.com/v2/${alchemyKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokenBalances',
            params: [walletAddress]
          })
        }
      );
      const tokenData = await tokenResponse.json();

      // Fetch ETH balance
      const ethResponse = await fetch(
        `https://linea-mainnet.g.alchemy.com/v2/${alchemyKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getBalance',
            params: [walletAddress, 'latest']
          })
        }
      );
      const ethData = await ethResponse.json();

      // Fetch NFTs
      const nftResponse = await fetch(
        `https://linea-mainnet.g.alchemy.com/v2/${alchemyKey}/getNFTs?owner=${walletAddress}&pageSize=100`
      );
      const nftData = await nftResponse.json();

      // Process token metadata
      const tokensWithMetadata = await Promise.all(
        (tokenData.result?.tokenBalances || [])
          .filter((token: any) => parseInt(token.tokenBalance) > 0)
          .slice(0, 20) // Limit to top 20 tokens
          .map(async (token: any) => {
            try {
              const metadataResponse = await fetch(
                `https://linea-mainnet.g.alchemy.com/v2/${alchemyKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'alchemy_getTokenMetadata',
                    params: [token.contractAddress]
                  })
                }
              );
              const metadata = await metadataResponse.json();
              
              return {
                contractAddress: token.contractAddress,
                tokenBalance: token.tokenBalance,
                name: metadata.result?.name || 'Unknown Token',
                symbol: metadata.result?.symbol || '?',
                decimals: metadata.result?.decimals || 18,
                logo: metadata.result?.logo
              };
            } catch (err) {
              return {
                contractAddress: token.contractAddress,
                tokenBalance: token.tokenBalance,
                name: 'Unknown Token',
                symbol: '?',
                decimals: 18
              };
            }
          })
      );

      setPortfolio({
        address: walletAddress,
        ethBalance: ethData.result || '0',
        tokens: tokensWithMetadata,
        nfts: (nftData.ownedNfts || []).slice(0, 10).map((nft: any) => ({
          contractAddress: nft.contract?.address,
          tokenId: nft.id?.tokenId,
          name: nft.title || `NFT #${nft.id?.tokenId}`,
          description: nft.description,
          imageUrl: nft.media?.[0]?.gateway,
          collectionName: nft.contract?.name
        })),
        totalUsdValue: 0 // Would need price API for this
      });
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
      setError('Failed to load portfolio data');
      setLoading(false);
    }
  };

  const formatBalance = (balance: string, decimals: number) => {
    const value = parseInt(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  const formatEth = (wei: string) => {
    const eth = parseInt(wei, 16) / 1e18;
    return eth.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  if (loading) {
    return (
      <div className="portfolio-card" style={{ padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: '12px' }}>
        <div className="loading-spinner" style={{ width: '24px', height: '24px' }}></div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="portfolio-card" style={{ padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: '12px' }}>
        <div style={{ color: 'var(--color-danger)' }}>{error || 'No portfolio data'}</div>
      </div>
    );
  }

  return (
    <div className="portfolio-card" style={{ 
      background: 'var(--color-bg-secondary)', 
      borderRadius: '12px',
      border: '1px solid var(--color-border)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Wallet size={20} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontWeight: 600, fontSize: '16px' }}>Portfolio Overview</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '32px', fontWeight: 700 }}>
            {formatEth(portfolio.ethBalance)} ETH
          </span>
          <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
            + {portfolio.tokens.length} tokens
          </span>
        </div>
        
        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          {portfolio.address.slice(0, 6)}...{portfolio.address.slice(-4)}
        </div>
      </div>

      {/* Tokens Section */}
      <div style={{ borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setShowTokens(!showTokens)}
          style={{
            width: '100%',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-primary)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Coins size={18} />
            <span style={{ fontWeight: 500 }}>Tokens ({portfolio.tokens.length})</span>
          </div>
          {showTokens ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showTokens && (
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {portfolio.tokens.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No tokens found
              </div>
            ) : (
              portfolio.tokens.map((token, index) => (
                <div
                  key={token.contractAddress}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    borderBottom: index < portfolio.tokens.length - 1 ? '1px solid var(--color-border)' : 'none',
                    animation: `fadeIn 0.3s ease ${index * 0.05}s both`
                  }}
                >
                  {token.logo ? (
                    <img src={token.logo} alt={token.symbol} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Coins size={16} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{token.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{token.symbol}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 500 }}>
                      {formatBalance(token.tokenBalance, token.decimals)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* NFTs Section */}
      <div>
        <button
          onClick={() => setShowNFTs(!showNFTs)}
          style={{
            width: '100%',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-primary)',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Image size={18} />
            <span style={{ fontWeight: 500 }}>NFTs ({portfolio.nfts.length})</span>
          </div>
          {showNFTs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showNFTs && (
          <div style={{ padding: '20px' }}>
            {portfolio.nfts.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                No NFTs found
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
                {portfolio.nfts.map((nft, index) => (
                  <div
                    key={`${nft.contractAddress}-${nft.tokenId}`}
                    style={{
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: 'var(--color-bg-tertiary)',
                      border: '1px solid var(--color-border)',
                      animation: `fadeIn 0.3s ease ${index * 0.1}s both`
                    }}
                  >
                    {nft.imageUrl ? (
                      <img 
                        src={nft.imageUrl} 
                        alt={nft.name}
                        style={{ width: '100%', height: '150px', objectFit: 'cover' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-tertiary)' }}>
                        <Image size={32} style={{ color: 'var(--color-text-muted)' }} />
                      </div>
                    )}
                    <div style={{ padding: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {nft.name}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        {nft.collectionName || 'Unknown Collection'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
);
