import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Wallet, 
  Coins, 
  Image, 
  RefreshCw, 
  TrendingUp, 
  AlertCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { 
  keyManager, 
  resolveIPFSImageUrl, 
  getIPFSFallbacks,
  fetchWithTimeout,
  executeBatches 
} from '../utils/alchemyHelpers';
import './PortfolioViewer.css';

// Types
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
  imageLoaded?: boolean;
  imageError?: boolean;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  asset: string;
  category: 'external' | 'erc20' | 'erc721' | 'erc1155';
  timestamp: number;
  gasPrice?: string;
  gasUsed?: string;
  tokenId?: string;
  direction: 'in' | 'out';
}

interface PortfolioData {
  address: string;
  ethBalance: string;
  ethUsdValue: number;
  tokens: TokenBalance[];
  nfts: NFTItem[];
  transactions: Transaction[];
  totalUsdValue: number;
  lastUpdated: number;
}

type TabType = 'assets' | 'nfts' | 'transactions';

// Skeleton Components
const AssetSkeleton = () => (
  <div className="token-card skeleton">
    <div className="skeleton-icon" />
    <div className="skeleton-content">
      <div className="skeleton-line short" />
      <div className="skeleton-line shorter" />
    </div>
    <div className="skeleton-values">
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  </div>
);

const NFTSkeleton = () => (
  <div className="nft-card skeleton">
    <div className="skeleton-image" />
    <div className="skeleton-info">
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
  </div>
);

const TxSkeleton = () => (
  <div className="tx-item skeleton">
    <div className="skeleton-icon small" />
    <div className="skeleton-content">
      <div className="skeleton-line" />
      <div className="skeleton-line short" />
    </div>
    <div className="skeleton-values">
      <div className="skeleton-line short" />
    </div>
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
  const [txPagination, setTxPagination] = useState({ page: 1, hasMore: true, loading: false });

  // Fetch ETH Balance
  const fetchEthBalance = async () => {
    const key = keyManager.getWalletKey();
    const response = await fetchWithTimeout(
      `https://linea-mainnet.g.alchemy.com/v2/${key}`,
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
    const data = await response.json();
    return data.result || '0';
  };

  // Fetch Token Balances with Parallel Metadata
  const fetchTokenBalances = async (): Promise<TokenBalance[]> => {
    const key = keyManager.getWalletKey();
    
    // Get token balances
    const response = await fetchWithTimeout(
      `https://linea-mainnet.g.alchemy.com/v2/${key}`,
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
    
    const data = await response.json();
    const tokens = (data.result?.tokenBalances || [])
      .filter((token: any) => parseInt(token.tokenBalance) > 0)
      .slice(0, 50);

    if (tokens.length === 0) return [];

    // Fetch metadata in parallel batches of 10
    const metadataResults = await executeBatches(tokens, 10, async (token: any) => {
      const metaKey = keyManager.getWalletKey();
      try {
        const metaResponse = await fetchWithTimeout(
          `https://linea-mainnet.g.alchemy.com/v2/${metaKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'alchemy_getTokenMetadata',
              params: [token.contractAddress]
            })
          },
          5000
        );
        const metaData = await metaResponse.json();
        return {
          contractAddress: token.contractAddress,
          tokenBalance: token.tokenBalance,
          name: metaData.result?.name || 'Unknown Token',
          symbol: metaData.result?.symbol || '?',
          decimals: metaData.result?.decimals || 18,
          logo: metaData.result?.logo,
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
    });

    // Filter successful results
    return metadataResults
      .filter((result: any) => result.status === 'fulfilled')
      .map((result: any) => result.value)
      .filter((token: TokenBalance) => token.contractAddress);
  };

  // Fetch NFTs with Image Processing
  const fetchNFTs = async (): Promise<NFTItem[]> => {
    const key = keyManager.getWalletKey();
    
    const response = await fetchWithTimeout(
      `https://linea-mainnet.g.alchemy.com/v2/${key}/getNFTs?owner=${walletAddress}&pageSize=100&withMetadata=true`,
      {},
      15000
    );
    
    const data = await response.json();
    
    return (data.ownedNfts || []).map((nft: any): NFTItem => {
      // Try multiple image sources
      let imageUrl = nft.media?.[0]?.gateway || 
                    nft.media?.[0]?.thumbnail || 
                    nft.media?.[0]?.raw ||
                    nft.metadata?.image;
      
      // Resolve IPFS if needed
      imageUrl = resolveIPFSImageUrl(imageUrl);

      return {
        contractAddress: nft.contract?.address,
        tokenId: nft.id?.tokenId,
        name: nft.title || nft.metadata?.name || `NFT #${nft.id?.tokenId}`,
        description: nft.description || nft.metadata?.description,
        imageUrl,
        collectionName: nft.contract?.name || nft.contract?.openSea?.collectionName || 'Unknown Collection',
        imageLoaded: false,
        imageError: false
      };
    });
  };

  // Fetch Transactions (Both FROM and TO)
  const fetchTransactions = async (pageKey?: string): Promise<{ transactions: Transaction[]; pageKey?: string }> => {
    const keys = keyManager.getContractKeys(2);
    
    // Parallel fetch: FROM transfers and TO transfers
    const [fromResponse, toResponse] = await Promise.all([
      // Transfers FROM wallet
      fetchWithTimeout(
        `https://linea-mainnet.g.alchemy.com/v2/${keys[0]}`,
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
              maxCount: '0x32', // 50 per request
              pageKey: pageKey
            }]
          })
        },
        10000
      ),
      // Transfers TO wallet
      fetchWithTimeout(
        `https://linea-mainnet.g.alchemy.com/v2/${keys[1] || keys[0]}`,
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
              toAddress: walletAddress,
              category: ['external', 'erc20', 'erc721', 'erc1155'],
              withMetadata: true,
              maxCount: '0x32',
              pageKey: pageKey
            }]
          })
        },
        10000
      )
    ]);

    const [fromData, toData] = await Promise.all([
      fromResponse.json(),
      toResponse.json()
    ]);

    // Process and merge transactions
    const processTransfer = (tx: any, direction: 'in' | 'out'): Transaction => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      asset: tx.asset || 'ETH',
      category: tx.category,
      timestamp: new Date(tx.metadata?.blockTimestamp).getTime(),
      gasPrice: tx.gasPrice,
      gasUsed: tx.gasUsed,
      tokenId: tx.erc721TokenId || tx.erc1155Metadata?.[0]?.tokenId,
      direction
    });

    const fromTxs = (fromData.result?.transfers || []).map((tx: any) => processTransfer(tx, 'out'));
    const toTxs = (toData.result?.transfers || []).map((tx: any) => processTransfer(tx, 'in'));

    // Merge, deduplicate, and sort
    const allTxs = [...fromTxs, ...toTxs];
    const uniqueTxs = allTxs.filter((tx, index, self) => 
      index === self.findIndex((t) => t.hash === tx.hash && t.direction === tx.direction)
    );
    
    uniqueTxs.sort((a, b) => b.timestamp - a.timestamp);

    return {
      transactions: uniqueTxs,
      pageKey: fromData.result?.pageKey || toData.result?.pageKey
    };
  };

  // Main fetch function
  const fetchAllData = async () => {
    try {
      setLoading({ assets: true, nfts: true, transactions: true });
      setErrors({ assets: '', nfts: '', transactions: '' });

      // Parallel fetch everything
      const [ethBalance, tokens, nfts] = await Promise.all([
        fetchEthBalance().catch(err => {
          console.error('ETH fetch error:', err);
          setErrors(prev => ({ ...prev, assets: 'Failed to load ETH balance' }));
          return '0';
        }),
        fetchTokenBalances().catch(err => {
          console.error('Token fetch error:', err);
          setErrors(prev => ({ ...prev, assets: 'Failed to load tokens' }));
          return [];
        }),
        fetchNFTs().catch(err => {
          console.error('NFT fetch error:', err);
          setErrors(prev => ({ ...prev, nfts: 'Failed to load NFTs' }));
          return [];
        })
      ]);

      // Calculate ETH value (simplified - no price API for now)
      const ethBalanceNum = parseInt(ethBalance, 16) / 1e18;
      const ethUsdValue = 0; // Would need price API

      // Calculate total value (simplified)
      const totalUsdValue = ethUsdValue + tokens.reduce((sum, t) => sum + t.usdValue, 0);

      // Fetch initial transactions
      const { transactions } = await fetchTransactions().catch(err => {
        console.error('Transaction fetch error:', err);
        setErrors(prev => ({ ...prev, transactions: 'Failed to load transactions' }));
        return { transactions: [] };
      });

      setPortfolio({
        address: walletAddress,
        ethBalance,
        ethUsdValue,
        tokens: tokens.sort((a, b) => b.usdValue - a.usdValue),
        nfts,
        transactions,
        totalUsdValue,
        lastUpdated: Date.now()
      });

      setLastRefresh(Date.now());
      setTxPagination({ page: 1, hasMore: transactions.length >= 50, loading: false });
      
      setLoading({ assets: false, nfts: false, transactions: false });
    } catch (err) {
      console.error('Failed to fetch portfolio:', err);
      setLoading({ assets: false, nfts: false, transactions: false });
    }
  };

  // Load more transactions
  const loadMoreTransactions = async () => {
    if (txPagination.loading || !txPagination.hasMore) return;
    
    setTxPagination(prev => ({ ...prev, loading: true }));
    
    try {
      const { transactions: newTxs, pageKey } = await fetchTransactions();
      
      if (newTxs.length === 0) {
        setTxPagination(prev => ({ ...prev, hasMore: false, loading: false }));
        return;
      }

      setPortfolio(prev => {
        if (!prev) return null;
        const existingHashes = new Set(prev.transactions.map(t => t.hash));
        const uniqueNewTxs = newTxs.filter(t => !existingHashes.has(t.hash));
        
        return {
          ...prev,
          transactions: [...prev.transactions, ...uniqueNewTxs]
        };
      });

      setTxPagination(prev => ({ 
        page: prev.page + 1, 
        hasMore: !!pageKey && newTxs.length >= 50,
        loading: false 
      }));
    } catch (err) {
      console.error('Failed to load more transactions:', err);
      setTxPagination(prev => ({ ...prev, loading: false }));
    }
  };

  // Initial load
  useEffect(() => {
    if (walletAddress) {
      fetchAllData();
    }
  }, [walletAddress]);

  // Auto-refresh on tab focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastRefresh = Date.now() - lastRefresh;
        if (timeSinceLastRefresh > 2 * 60 * 1000) {
          fetchAllData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [lastRefresh, walletAddress]);

  // Format helpers
  const formatBalance = (balance: string, decimals: number) => {
    const value = parseInt(balance) / Math.pow(10, decimals);
    if (value < 0.0001) return value.toExponential(2);
    return value.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const formatEth = (wei: string) => {
    const eth = parseInt(wei, 16) / 1e18;
    return eth.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  const formatCurrency = (value: number) => {
    if (value === 0) return '$0.00';
    if (value < 0.01) return '<$0.01';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const tokenCount = portfolio?.tokens?.length || 0;
  const nftCount = portfolio?.nfts?.length || 0;

  return (
    <div className="portfolio-container">
      {/* Chain Banner */}
      <div className="chain-banner">
        <div className="chain-indicator">
          <span className="chain-dot" />
          <span>Linea Mainnet</span>
        </div>
        <span className="coming-soon">More chains coming soon</span>
      </div>

      {/* Header */}
      <div className="portfolio-header">
        <div className="header-main">
          <Wallet size={28} className="header-icon" />
          <div>
            <h1 className="portfolio-title">Portfolio</h1>
            <p className="wallet-address">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <span className="refresh-time">
            <Clock size={14} />
            {formatDate(lastRefresh)}
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
      {portfolio && (
        <div className="value-card">
          <div className="value-main">
            <span className="value-label">Total Value</span>
            <span className="value-amount">{formatCurrency(portfolio.totalUsdValue)}</span>
          </div>
          <div className="value-breakdown">
            <div className="breakdown-item">
              <Coins size={16} />
              <span>{formatEth(portfolio.ethBalance)} ETH</span>
            </div>
            {nftCount > 0 && (
              <div className="breakdown-item">
                <Image size={16} />
                <span>{nftCount} NFTs</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="portfolio-tabs">
        <button 
          className={`tab ${activeTab === 'assets' ? 'active' : ''}`}
          onClick={() => setActiveTab('assets')}
        >
          <Coins size={18} />
          <span>Assets</span>
          {tokenCount > 0 && <span className="tab-badge">{tokenCount}</span>}
        </button>
        <button 
          className={`tab ${activeTab === 'nfts' ? 'active' : ''}`}
          onClick={() => setActiveTab('nfts')}
        >
          <Image size={18} />
          <span>NFTs</span>
          {nftCount > 0 && <span className="tab-badge">{nftCount}</span>}
        </button>
        <button 
          className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          <TrendingUp size={18} />
          <span>Activity</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Assets Tab */}
        {activeTab === 'assets' && (
          <div className="assets-list">
            {loading.assets ? (
              <>
                <AssetSkeleton />
                <AssetSkeleton />
                <AssetSkeleton />
                <AssetSkeleton />
              </>
            ) : errors.assets ? (
              <div className="error-state">
                <AlertCircle size={32} />
                <p>{errors.assets}</p>
              </div>
            ) : (
              <>
                {/* ETH Card */}
                <div className="token-card featured">
                  <div className="token-main">
                    <div className="token-icon eth">Ξ</div>
                    <div className="token-info">
                      <span className="token-name">Ethereum</span>
                      <span className="token-symbol">ETH</span>
                    </div>
                  </div>
                  <div className="token-values">
                    <span className="token-balance">{formatEth(portfolio?.ethBalance || '0')}</span>
                    <span className="token-usd">{formatCurrency(portfolio?.ethUsdValue || 0)}</span>
                  </div>
                </div>

                {/* Token List */}
                {portfolio?.tokens?.map((token, index) => (
                  <div key={token.contractAddress} className="token-card" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="token-main">
                      {token.logo ? (
                        <img src={token.logo} alt={token.symbol} className="token-logo" loading="lazy" />
                      ) : (
                        <div className="token-icon">{token.symbol?.[0] || '?'}</div>
                      )}
                      <div className="token-info">
                        <span className="token-name">{token.name}</span>
                        <span className="token-symbol">{token.symbol}</span>
                      </div>
                    </div>
                    <div className="token-values">
                      <span className="token-balance">{formatBalance(token.tokenBalance, token.decimals)}</span>
                      {token.usdValue > 0 && (
                        <span className="token-usd">{formatCurrency(token.usdValue)}</span>
                      )}
                    </div>
                  </div>
                ))}

                {tokenCount === 0 && (
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
          <div className="nfts-grid">
            {loading.nfts ? (
              <>
                <NFTSkeleton />
                <NFTSkeleton />
                <NFTSkeleton />
                <NFTSkeleton />
              </>
            ) : errors.nfts ? (
              <div className="error-state">
                <AlertCircle size={32} />
                <p>{errors.nfts}</p>
              </div>
            ) : (
              <>
                {portfolio?.nfts?.map((nft, index) => (
                  <div key={`${nft.contractAddress}-${nft.tokenId}`} className="nft-card" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className="nft-image-wrapper">
                      {nft.imageUrl && !nft.imageError ? (
                        <img 
                          src={nft.imageUrl} 
                          alt={nft.name}
                          className="nft-image"
                          loading="lazy"
                          onLoad={() => {
                            setPortfolio(prev => {
                              if (!prev) return null;
                              const newNfts = [...prev.nfts];
                              newNfts[index] = { ...newNfts[index], imageLoaded: true };
                              return { ...prev, nfts: newNfts };
                            });
                          }}
                          onError={() => {
                            // Try fallback URLs
                            const fallbacks = getIPFSFallbacks(nft.imageUrl || '');
                            if (fallbacks.length > 0 && !nft.imageError) {
                              setPortfolio(prev => {
                                if (!prev) return null;
                                const newNfts = [...prev.nfts];
                                newNfts[index] = { ...newNfts[index], imageUrl: fallbacks[0] };
                                return { ...prev, nfts: newNfts };
                              });
                            } else {
                              setPortfolio(prev => {
                                if (!prev) return null;
                                const newNfts = [...prev.nfts];
                                newNfts[index] = { ...newNfts[index], imageError: true };
                                return { ...prev, nfts: newNfts };
                              });
                            }
                          }}
                        />
                      ) : (
                        <div className="nft-placeholder">
                          <Image size={32} />
                        </div>
                      )}
                    </div>
                    <div className="nft-details">
                      <span className="nft-collection">{nft.collectionName}</span>
                      <span className="nft-name">{nft.name}</span>
                    </div>
                  </div>
                ))}

                {nftCount === 0 && (
                  <div className="empty-state">
                    <Image size={48} />
                    <p>No NFTs found</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="transactions-list">
            {loading.transactions ? (
              <>
                <TxSkeleton />
                <TxSkeleton />
                <TxSkeleton />
                <TxSkeleton />
              </>
            ) : errors.transactions ? (
              <div className="error-state">
                <AlertCircle size={32} />
                <p>{errors.transactions}</p>
              </div>
            ) : (
              <>
                {portfolio?.transactions?.map((tx, index) => (
                  <div key={`${tx.hash}-${tx.direction}`} className="tx-item" style={{ animationDelay: `${index * 0.03}s` }}>
                    <div className={`tx-direction ${tx.direction}`}>
                      {tx.direction === 'in' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="tx-main">
                      <div className="tx-type">
                        <span className={`tx-category ${tx.category}`}>{tx.category}</span>
                        <span className="tx-asset">{tx.asset}</span>
                      </div>
                      <div className="tx-meta">
                        <span className="tx-time">{formatDate(tx.timestamp)}</span>
                        {tx.tokenId && <span className="tx-token-id">#{tx.tokenId}</span>}
                      </div>
                    </div>
                    <div className="tx-amount">
                      <span className={`tx-value ${tx.direction}`}>
                        {tx.direction === 'in' ? '+' : '-'}{parseFloat(tx.value || '0').toFixed(4)}
                      </span>
                      <a 
                        href={`https://lineascan.build/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-link"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                ))}

                {txPagination.hasMore && (
                  <button 
                    className="load-more-btn"
                    onClick={loadMoreTransactions}
                    disabled={txPagination.loading}
                  >
                    {txPagination.loading ? (
                      <><RefreshCw size={16} className="spinning" /> Loading...</>
                    ) : (
                      <><ChevronDown size={16} /> Load More</>
                    )}
                  </button>
                )}

                {portfolio?.transactions?.length === 0 && (
                  <div className="empty-state">
                    <TrendingUp size={48} />
                    <p>No transactions found</p>
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
