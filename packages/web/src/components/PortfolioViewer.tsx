import React, { useState, useEffect } from 'react';
import { Wallet, Coins, Image, RefreshCw, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { collection, doc, setDoc, query, orderBy, limit, getDocs, getFirestore } from 'firebase/firestore';
import './PortfolioViewer.css';

// Get Firestore instance
const db = getFirestore();

// API Keys from environment variables
const ASSETS_API_KEY = import.meta.env.VITE_ALCHEMY_ASSETS_API || '';
const NFT_API_KEY = import.meta.env.VITE_ALCHEMY_NFT_API || '';
const TX_API_KEY = import.meta.env.VITE_ALCHEMY_TX_API || '';
const PRICE_API_KEY = import.meta.env.VITE_ALCHEMY_PRICE_API || '';

interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  usdValue: number;
  price: number;
  priceChange24h: number;
}

interface NFTItem {
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  collectionName?: string;
  floorPrice?: number;
  floorPriceCurrency?: string;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  asset: string;
  category: string;
  timestamp: number;
  gasPrice?: string;
  gasUsed?: string;
}

interface PortfolioData {
  address: string;
  ethBalance: string;
  ethUsdValue: number;
  tokens: TokenBalance[];
  nfts: NFTItem[];
  transactions: Transaction[];
  totalUsdValue: number;
  nftFloorValue: number;
  lastUpdated: number;
}

type TabType = 'assets' | 'nfts' | 'transactions';

// Skeleton Components
const AssetSkeleton = () => (
  <div className="portfolio-skeleton asset-skeleton">
    <div className="skeleton-circle" />
    <div className="skeleton-lines">
      <div className="skeleton-line short" />
      <div className="skeleton-line shorter" />
    </div>
    <div className="skeleton-lines right">
      <div className="skeleton-line short" />
      <div className="skeleton-line shorter" />
    </div>
  </div>
);

const NFTSkeleton = () => (
  <div className="portfolio-skeleton nft-skeleton">
    <div className="skeleton-image" />
    <div className="skeleton-line" />
    <div className="skeleton-line shorter" />
  </div>
);

const TxSkeleton = () => (
  <div className="portfolio-skeleton tx-skeleton">
    <div className="skeleton-lines">
      <div className="skeleton-line" />
      <div className="skeleton-line shorter" />
    </div>
    <div className="skeleton-line short" />
  </div>
);

export const PortfolioViewer = React.memo(function PortfolioViewer({ 
  walletAddress 
}: { 
  walletAddress: string 
}) {
  const [activeTab, setActiveTab] = useState<TabType>('assets');
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState({ assets: true, nfts: true, transactions: true });
  const [errors, setErrors] = useState({ assets: '', nfts: '', transactions: '' });
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Fetch token prices from Alchemy
  const fetchTokenPrices = async (tokenAddresses: string[]) => {
    try {
      const response = await fetch(
        `https://linea-mainnet.g.alchemy.com/v2/${PRICE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getTokenPrice',
            params: tokenAddresses
          })
        }
      );
      const data = await response.json();
      return data.result || {};
    } catch (err) {
      console.error('Failed to fetch prices:', err);
      return {};
    }
  };

  // Fetch assets (Key 1)
  const fetchAssets = async (): Promise<Partial<PortfolioData> | null> => {
    try {
      setLoading(prev => ({ ...prev, assets: true }));
      setErrors(prev => ({ ...prev, assets: '' }));

      // Fetch ETH balance
      const ethResponse = await fetch(
        `https://linea-mainnet.g.alchemy.com/v2/${ASSETS_API_KEY}`,
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
      const ethBalance = ethData.result || '0';

      // Fetch token balances
      const tokenResponse = await fetch(
        `https://linea-mainnet.g.alchemy.com/v2/${ASSETS_API_KEY}`,
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

      // Process tokens with metadata
      const tokensWithMetadata: TokenBalance[] = await Promise.all(
        (tokenData.result?.tokenBalances || [])
          .filter((token: any) => parseInt(token.tokenBalance) > 0)
          .slice(0, 50)
          .map(async (token: any): Promise<TokenBalance> => {
            try {
              const metadataResponse = await fetch(
                `https://linea-mainnet.g.alchemy.com/v2/${ASSETS_API_KEY}`,
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
                logo: metadata.result?.logo,
                usdValue: 0,
                price: 0,
                priceChange24h: 0
              };
            } catch (err) {
              return {
                contractAddress: token.contractAddress,
                tokenBalance: token.tokenBalance,
                name: 'Unknown Token',
                symbol: '?',
                decimals: 18,
                usdValue: 0,
                price: 0,
                priceChange24h: 0
              };
            }
          })
      );

      // Fetch prices for all tokens
      const tokenAddresses = tokensWithMetadata.map(t => t.contractAddress);
      const prices = await fetchTokenPrices(tokenAddresses);

      // Calculate USD values
      let totalUsdValue = 0;
      const tokensWithPrices = tokensWithMetadata.map(token => {
        const priceData = prices[token.contractAddress.toLowerCase()];
        const balance = parseInt(token.tokenBalance) / Math.pow(10, token.decimals);
        const price = priceData?.price || 0;
        const usdValue = balance * price;
        totalUsdValue += usdValue;

        return {
          ...token,
          price,
          usdValue,
          priceChange24h: priceData?.priceChange24h || 0
        };
      });

      // Get ETH price
      const ethPriceData = await fetchTokenPrices(['0x0000000000000000000000000000000000000000']);
      const ethPrice = ethPriceData['0x0000000000000000000000000000000000000000']?.price || 0;
      const ethBalanceNum = parseInt(ethBalance, 16) / 1e18;
      const ethUsdValue = ethBalanceNum * ethPrice;
      totalUsdValue += ethUsdValue;

      setLoading(prev => ({ ...prev, assets: false }));
      
      return {
        address: walletAddress,
        ethBalance,
        ethUsdValue,
        tokens: tokensWithPrices.sort((a, b) => b.usdValue - a.usdValue),
        totalUsdValue
      };
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      setErrors(prev => ({ ...prev, assets: 'Failed to load assets' }));
      setLoading(prev => ({ ...prev, assets: false }));
      return null;
    }
  };

  // Fetch NFTs (Key 2)
  const fetchNFTs = async (): Promise<{ nfts: NFTItem[]; nftFloorValue: number } | null> => {
    try {
      setLoading(prev => ({ ...prev, nfts: true }));
      setErrors(prev => ({ ...prev, nfts: '' }));

      const response = await fetch(
        `https://linea-mainnet.g.alchemy.com/v2/${NFT_API_KEY}/getNFTs?owner=${walletAddress}&pageSize=100&withMetadata=true`
      );
      const data = await response.json();

      const nfts: NFTItem[] = await Promise.all(
        (data.ownedNfts || []).map(async (nft: any): Promise<NFTItem> => {
          let floorPrice: number | undefined;
          let floorPriceCurrency: string | undefined;

          // Try to get floor price
          try {
            const floorResponse = await fetch(
              `https://linea-mainnet.g.alchemy.com/v2/${NFT_API_KEY}/getFloorPrice?contractAddress=${nft.contract?.address}`
            );
            const floorData = await floorResponse.json();
            if (floorData.openSea?.floorPrice) {
              floorPrice = floorData.openSea.floorPrice;
              floorPriceCurrency = floorData.openSea.priceCurrency;
            }
          } catch (e) {
            // Floor price not available
          }

          return {
            contractAddress: nft.contract?.address,
            tokenId: nft.id?.tokenId,
            name: nft.title || `NFT #${nft.id?.tokenId}`,
            description: nft.description,
            imageUrl: nft.media?.[0]?.gateway || nft.media?.[0]?.thumbnail,
            collectionName: nft.contract?.name || nft.contract?.openSea?.collectionName,
            floorPrice,
            floorPriceCurrency
          };
        })
      );

      const nftFloorValue = nfts.reduce((sum, nft) => sum + (nft.floorPrice || 0), 0);

      setLoading(prev => ({ ...prev, nfts: false }));
      return { nfts, nftFloorValue };
    } catch (err) {
      console.error('Failed to fetch NFTs:', err);
      setErrors(prev => ({ ...prev, nfts: 'Failed to load NFTs' }));
      setLoading(prev => ({ ...prev, nfts: false }));
      return null;
    }
  };

  // Fetch transactions (Key 3)
  const fetchTransactions = async (): Promise<Transaction[] | null> => {
    try {
      setLoading(prev => ({ ...prev, transactions: true }));
      setErrors(prev => ({ ...prev, transactions: '' }));

      const response = await fetch(
        `https://linea-mainnet.g.alchemy.com/v2/${TX_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'alchemy_getAssetTransfers',
            params: [{
              fromBlock: '0x0',
              toBlock: 'latest',
              fromAddress: walletAddress,
              category: ['external', 'erc20', 'erc721', 'erc1155'],
              withMetadata: true,
              maxCount: '0x64'
            }]
          })
        }
      );
      const data = await response.json();

      const transactions: Transaction[] = (data.result?.transfers || []).map((tx: any) => ({
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: tx.value,
        asset: tx.asset,
        category: tx.category,
        timestamp: new Date(tx.metadata?.blockTimestamp).getTime(),
        gasPrice: tx.gasPrice,
        gasUsed: tx.gasUsed
      }));

      setLoading(prev => ({ ...prev, transactions: false }));
      return transactions;
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setErrors(prev => ({ ...prev, transactions: 'Failed to load transactions' }));
      setLoading(prev => ({ ...prev, transactions: false }));
      return null;
    }
  };

  // Save portfolio snapshot to Firebase
  const savePortfolioSnapshot = async (data: PortfolioData) => {
    try {
      const snapshotRef = doc(collection(db, 'portfolio_snapshots'), `${walletAddress}_${Date.now()}`);
      await setDoc(snapshotRef, {
        address: walletAddress,
        timestamp: Date.now(),
        totalValue: data.totalUsdValue,
        ethValue: data.ethUsdValue,
        tokenCount: data.tokens?.length || 0,
        nftCount: data.nfts?.length || 0
      });
    } catch (err) {
      console.error('Failed to save snapshot:', err);
    }
  };

  // Main fetch function
  const fetchAllData = async () => {
    const [assetsData, nftsData, transactionsData] = await Promise.all([
      fetchAssets(),
      fetchNFTs(),
      fetchTransactions()
    ]);

    // Merge all data into portfolio state
    const completePortfolio: PortfolioData = {
      address: walletAddress,
      ethBalance: assetsData?.ethBalance || '0',
      ethUsdValue: assetsData?.ethUsdValue || 0,
      tokens: assetsData?.tokens || [],
      nfts: nftsData?.nfts || [],
      transactions: transactionsData || [],
      totalUsdValue: (assetsData?.totalUsdValue || 0) + (nftsData?.nftFloorValue || 0),
      nftFloorValue: nftsData?.nftFloorValue || 0,
      lastUpdated: Date.now()
    };

    setPortfolio(completePortfolio);
    
    // Save snapshot
    await savePortfolioSnapshot(completePortfolio);
    setLastRefresh(Date.now());
  };

  // Initial fetch
  useEffect(() => {
    if (walletAddress) {
      fetchAllData();
    }
  }, [walletAddress]);

  // Auto-refresh on tab focus (every 2 minutes)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastRefresh = Date.now() - lastRefresh;
        if (timeSinceLastRefresh > 2 * 60 * 1000) { // 2 minutes
          fetchAllData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastRefresh, walletAddress]);

  const formatBalance = (balance: string, decimals: number) => {
    const value = parseInt(balance) / Math.pow(10, decimals);
    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const formatEth = (wei: string) => {
    const eth = parseInt(wei, 16) / 1e18;
    return eth.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasAnyData = portfolio !== null;
  const tokenCount = portfolio?.tokens?.length || 0;
  const nftCount = portfolio?.nfts?.length || 0;

  return (
    <div className="portfolio-viewer">
      {/* Chain Banner */}
      <div className="chain-banner">
        <span className="chain-dot active" />
        <span>Linea Mainnet</span>
        <span className="chain-coming-soon">More chains coming soon</span>
      </div>

      {/* Header */}
      <div className="portfolio-header">
        <div className="portfolio-title-section">
          <Wallet size={24} />
          <div>
            <h2 className="portfolio-title">Portfolio</h2>
            <p className="portfolio-address">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
        </div>
        <div className="portfolio-actions">
          <span className="last-refresh">
            <Clock size={14} />
            Last updated: {formatDate(lastRefresh)}
          </span>
          <button 
            className="refresh-btn"
            onClick={fetchAllData}
            disabled={loading.assets || loading.nfts || loading.transactions}
          >
            <RefreshCw size={16} className={loading.assets || loading.nfts || loading.transactions ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Total Value Card */}
      {hasAnyData && (
        <div className="total-value-card">
          <div className="total-value-section">
            <span className="total-value-label">Total Value</span>
            <span className="total-value-amount">{formatCurrency(portfolio?.totalUsdValue || 0)}</span>
          </div>
          <div className="value-breakdown">
            <div className="breakdown-item">
              <Coins size={16} />
              <span>{formatCurrency(portfolio?.ethUsdValue || 0)} ETH</span>
            </div>
            <div className="breakdown-item">
              <Image size={16} />
              <span>{formatCurrency(portfolio?.nftFloorValue || 0)} NFTs</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="portfolio-tabs">
        <button 
          className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <Coins size={16} />
          Assets
          {tokenCount > 0 && (
            <span className="tab-badge">{tokenCount}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'nfts' ? 'active' : ''}`}
          onClick={() => setActiveTab('nfts')}
        >
          <Image size={16} />
          NFTs
          {nftCount > 0 && (
            <span className="tab-badge">{nftCount}</span>
          )}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <TrendingUp size={16} />
          Activity
        </button>
      </div>

      {/* Tab Content */}
      <div className="portfolio-content">
        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <div className="assets-tab">
            {loading.assets ? (
              <>
                <AssetSkeleton />
                <AssetSkeleton />
                <AssetSkeleton />
                <AssetSkeleton />
                <AssetSkeleton />
              </>
            ) : errors.assets ? (
              <div className="error-message">
                <AlertCircle size={20} />
                {errors.assets}
              </div>
            ) : (
              <>
                {/* ETH Card */}
                <div className="token-card eth-card">
                  <div className="token-info">
                    <div className="token-icon eth-icon">Ξ</div>
                    <div className="token-details">
                      <span className="token-name">Ethereum</span>
                      <span className="token-symbol">ETH</span>
                    </div>
                  </div>
                  <div className="token-values">
                    <span className="token-balance">{formatEth(portfolio?.ethBalance || '0')} ETH</span>
                    <span className="token-usd">{formatCurrency(portfolio?.ethUsdValue || 0)}</span>
                  </div>
                </div>

                {/* Token List */}
                {portfolio?.tokens?.map((token, index) => (
                  <div key={token.contractAddress} className="token-card" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="token-info">
                      {token.logo ? (
                        <img src={token.logo} alt={token.symbol} className="token-logo" />
                      ) : (
                        <div className="token-icon">
                          {token.symbol?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="token-details">
                        <span className="token-name">{token.name}</span>
                        <span className="token-symbol">{token.symbol}</span>
                      </div>
                    </div>
                    <div className="token-values">
                      <span className="token-balance">
                        {formatBalance(token.tokenBalance, token.decimals)} {token.symbol}
                      </span>
                      <div className="token-price-info">
                        <span className="token-usd">{formatCurrency(token.usdValue)}</span>
                        {token.priceChange24h !== 0 && (
                          <span className={`price-change ${token.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                            {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {(!portfolio?.tokens || portfolio.tokens.length === 0) && (
                  <div className="empty-state">
                    <Coins size={48} />
                    <p>No tokens found</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* NFTs Tab */}
        {activeTab === 'nfts' && (
          <div className="nfts-tab">
            {loading.nfts ? (
              <div className="nfts-grid">
                <NFTSkeleton />
                <NFTSkeleton />
                <NFTSkeleton />
                <NFTSkeleton />
                <NFTSkeleton />
                <NFTSkeleton />
              </div>
            ) : errors.nfts ? (
              <div className="error-message">
                <AlertCircle size={20} />
                {errors.nfts}
              </div>
            ) : (
              <>
                {(!portfolio?.nfts || portfolio.nfts.length === 0) ? (
                  <div className="empty-state">
                    <Image size={48} />
                    <p>No NFTs found</p>
                  </div>
                ) : (
                  <div className="nfts-grid">
                    {portfolio?.nfts?.map((nft, index) => (
                      <div 
                        key={`${nft.contractAddress}-${nft.tokenId}`} 
                        className="nft-card"
                        style={{ animationDelay: `${index * 0.05}s` }}
                      >
                        <div className="nft-image-container">
                          {nft.imageUrl ? (
                            <img 
                              src={nft.imageUrl} 
                              alt={nft.name}
                              className="nft-image"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="nft-placeholder">
                              <Image size={32} />
                            </div>
                          )}
                          {(nft.floorPrice || 0) > 0 && (
                            <div className="nft-floor-badge">
                              Floor: {nft.floorPrice} {nft.floorPriceCurrency || 'ETH'}
                            </div>
                          )}
                        </div>
                        <div className="nft-info">
                          <span className="nft-name" title={nft.name}>{nft.name}</span>
                          <span className="nft-collection" title={nft.collectionName}>
                            {nft.collectionName || 'Unknown Collection'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="transactions-tab">
            {loading.transactions ? (
              <>
                <TxSkeleton />
                <TxSkeleton />
                <TxSkeleton />
                <TxSkeleton />
                <TxSkeleton />
              </>
            ) : errors.transactions ? (
              <div className="error-message">
                <AlertCircle size={20} />
                {errors.transactions}
              </div>
            ) : (
              <>
                {(!portfolio?.transactions || portfolio.transactions.length === 0) ? (
                  <div className="empty-state">
                    <TrendingUp size={48} />
                    <p>No transactions found</p>
                  </div>
                ) : (
                  <div className="transactions-list">
                    {portfolio?.transactions?.slice(0, 50).map((tx, index) => (
                      <div 
                        key={`${tx.hash}-${index}`} 
                        className="transaction-item"
                        style={{ animationDelay: `${index * 0.03}s` }}
                      >
                        <div className="tx-info">
                          <span className="tx-type">{tx.category}</span>
                          <span className="tx-asset">{tx.asset || 'ETH'}</span>
                          <span className="tx-value">
                            {tx.value ? parseFloat(tx.value).toFixed(4) : '0'} {tx.asset || 'ETH'}
                          </span>
                        </div>
                        <div className="tx-meta">
                          <span className="tx-date">{formatDate(tx.timestamp)}</span>
                          <a 
                            href={`https://lineascan.build/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="tx-link"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
