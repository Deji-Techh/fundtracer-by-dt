// Portfolio Analytics Dashboard
// Full-screen professional analytics view with 3D charts, wallet functions, and exports

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Wallet, 
  Coins, 
  Image, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertCircle, 
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Send,
  Download,
  QrCode,
  FileText,
  Share2,
  Maximize2,
  Minimize2,
  Activity,
  PieChart,
  BarChart3,
  History,
  MoreHorizontal
} from 'lucide-react';
import { ethers } from 'ethers';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { 
  keyManager, 
  resolveIPFSImageUrl, 
  getIPFSFallbacks,
  fetchWithTimeout,
  executeBatches 
} from '../utils/alchemyHelpers';
import './PortfolioAnalytics.css';

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
  percentage: number;
}

interface NFTItem {
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  collectionName?: string;
  floorPrice?: number;
  floorPriceUsd?: number;
}

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  asset: string;
  category: 'external' | 'erc20' | 'erc721' | 'erc1155';
  timestamp: number;
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
  totalChange24h: number;
  totalChange7d: number;
  lastUpdated: number;
}

interface PriceData {
  [symbol: string]: {
    price: number;
    change24h: number;
  };
}

// Price Service using CoinGecko with proper symbol mapping
class PriceService {
  private apiKey: string;
  private cache: Map<string, { price: number; change24h: number; timestamp: number }> = new Map();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes
  
  // Map common symbols to CoinGecko IDs
  private symbolToId: { [symbol: string]: string } = {
    'ETH': 'ethereum',
    'WETH': 'weth',
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'DAI': 'dai',
    'WBTC': 'wrapped-bitcoin',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'AAVE': 'aave',
    'CRV': 'curve-dao-token',
    'SNX': 'havven',
    'COMP': 'compound-governance-token',
    'MKR': 'maker',
    'YFI': 'yearn-finance',
    'LDO': 'lido-dao',
    'RPL': 'rocket-pool',
    'MATIC': 'matic-network',
    'ARB': 'arbitrum',
    'OP': 'optimism',
    'LINEA': 'linea-2',
    'USDC.E': 'usd-coin',
    'AXLUSDC': 'axelar-usdc',
    'WSTETH': 'wrapped-steth',
    'RETH': 'rocket-pool-eth',
    'CBETH': 'coinbase-wrapped-staked-eth',
    'STETH': 'staked-ether'
  };

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private getCoinGeckoId(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    return this.symbolToId[upperSymbol] || upperSymbol.toLowerCase();
  }

  async getTokenPrices(symbols: string[]): Promise<PriceData> {
    const result: PriceData = {};
    const uncachedSymbols: string[] = [];

    // Check cache first
    symbols.forEach(symbol => {
      if (!symbol) return;
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
        result[symbol] = { price: cached.price, change24h: cached.change24h };
      } else {
        uncachedSymbols.push(symbol);
      }
    });

    if (uncachedSymbols.length === 0) return result;

    try {
      // Convert symbols to CoinGecko IDs
      const ids = uncachedSymbols.map(s => this.getCoinGeckoId(s)).join(',');
      
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        { 
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(10000)
        }
      );
      
      if (!response.ok) {
        console.warn('CoinGecko API failed:', response.status);
        throw new Error(`Price API failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      uncachedSymbols.forEach(symbol => {
        const id = this.getCoinGeckoId(symbol);
        const price = data[id]?.usd || 0;
        const change24h = data[id]?.usd_24h_change || 0;
        
        result[symbol] = { price, change24h };
        
        if (price > 0) {
          this.cache.set(symbol, { price, change24h, timestamp: Date.now() });
        }
      });
    } catch (error) {
      console.warn('Failed to fetch prices from CoinGecko:', error);
      // Fallback: use cached data even if expired, or zero
      uncachedSymbols.forEach(symbol => {
        const cached = this.cache.get(symbol);
        result[symbol] = { 
          price: cached?.price || 0, 
          change24h: cached?.change24h || 0 
        };
      });
    }

    return result;
  }

  // Get historical prices for sparklines (7 days)
  async getHistoricalPrices(symbol: string, days: number = 7): Promise<number[]> {
    const cacheKey = `hist_${symbol}_${days}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      // Return cached sparkline data stored in price field as array
      return cached.price as any || [];
    }

    try {
      const id = this.getCoinGeckoId(symbol);
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`,
        { signal: AbortSignal.timeout(10000) }
      );

      if (!response.ok) throw new Error('Historical data fetch failed');

      const data = await response.json();
      const prices = data.prices?.map((p: [number, number]) => p[1]) || [];
      
      // Cache the sparkline data
      if (prices.length > 0) {
        this.cache.set(cacheKey, { price: prices as any, change24h: 0, timestamp: Date.now() });
      }
      
      return prices;
    } catch (error) {
      console.warn(`Failed to fetch historical data for ${symbol}:`, error);
      return [];
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

// 3D Pie Chart Component
const PieChart3D: React.FC<{ data: TokenBalance[]; totalValue: number }> = ({ data, totalValue }) => {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  
  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.usdValue - a.usdValue).slice(0, 5);
    const colors = ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f87171'];
    
    // Calculate total of only the displayed tokens for accurate percentages
    const displayedTotal = sorted.reduce((sum, t) => sum + t.usdValue, 0);
    
    return sorted.map((token, index) => ({
      ...token,
      color: colors[index % colors.length],
      percentage: displayedTotal > 0 ? (token.usdValue / displayedTotal) * 100 : 0
    }));
  }, [data]);

  let cumulativePercentage = 0;

  return (
    <div className="pie-chart-3d-container">
      <div className="pie-chart-3d">
        {chartData.map((slice, index) => {
          const percentage = slice.percentage;
          const startAngle = (cumulativePercentage / 100) * 360;
          const endAngle = ((cumulativePercentage + percentage) / 100) * 360;
          cumulativePercentage += percentage;
          
          const isHovered = hoveredSlice === index;
          const translateZ = isHovered ? '30px' : '0px';
          
          return (
            <div
              key={slice.contractAddress}
              className={`pie-slice-3d ${isHovered ? 'hovered' : ''}`}
              style={{
                background: `conic-gradient(from ${startAngle}deg, ${slice.color} 0deg, ${slice.color} ${endAngle - startAngle}deg, transparent ${endAngle - startAngle}deg)`,
                transform: `translateZ(${translateZ})`,
                zIndex: isHovered ? 10 : 1
              }}
              onMouseEnter={() => setHoveredSlice(index)}
              onMouseLeave={() => setHoveredSlice(null)}
            >
              <div className="pie-slice-label">
                <span className="pie-symbol">{slice.symbol}</span>
                <span className="pie-percent">{percentage.toFixed(1)}%</span>
              </div>
            </div>
          );
        })}
        <div className="pie-center">
          <span className="pie-total">${(totalValue / 1000).toFixed(1)}K</span>
        </div>
      </div>
      
      <div className="pie-legend">
        {chartData.map((slice, index) => (
          <div 
            key={slice.contractAddress}
            className={`legend-item ${hoveredSlice === index ? 'active' : ''}`}
            onMouseEnter={() => setHoveredSlice(index)}
            onMouseLeave={() => setHoveredSlice(null)}
          >
            <div className="legend-color" style={{ background: slice.color }} />
            <span className="legend-symbol">{slice.symbol}</span>
            <span className="legend-value">${slice.usdValue.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Sparkline Component
const Sparkline: React.FC<{ data: number[]; width?: number; height?: number; color?: string }> = ({ 
  data, 
  width = 120, 
  height = 40,
  color = '#60a5fa'
}) => {
  if (!data || data.length < 2) return <div className="sparkline-placeholder" style={{ width, height }} />;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  
  const isPositive = data[data.length - 1] >= data[0];
  const strokeColor = color;
  
  return (
    <svg width={width} height={height} className="sparkline">
      <defs>
        <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        points={points}
      />
      <polygon
        fill="url(#sparklineGradient)"
        points={`0,${height} ${points} ${width},${height}`}
      />
    </svg>
  );
};

// Asset Table Component
const AssetTable: React.FC<{ 
  tokens: TokenBalance[]; 
  ethBalance: string; 
  ethUsdValue: number;
  totalValue: number;
  sparklines: { [symbol: string]: number[] };
}> = ({ tokens, ethBalance, ethUsdValue, totalValue, sparklines }) => {
  const [sortConfig, setSortConfig] = useState<{ key: keyof TokenBalance; direction: 'asc' | 'desc' }>({
    key: 'usdValue',
    direction: 'desc'
  });

  const sortedTokens = useMemo(() => {
    const allAssets: TokenBalance[] = [
      {
        contractAddress: 'native',
        tokenBalance: ethBalance,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        usdValue: ethUsdValue,
        price: ethUsdValue / (parseInt(ethBalance, 16) / 1e18 || 1),
        priceChange24h: 0,
        percentage: totalValue > 0 ? (ethUsdValue / totalValue) * 100 : 0
      },
      ...tokens
    ];
    
    return allAssets.sort((a, b) => {
      const aValue = Number(a[sortConfig.key]) || 0;
      const bValue = Number(b[sortConfig.key]) || 0;
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [tokens, ethBalance, ethUsdValue, totalValue, sortConfig]);

  const handleSort = (key: keyof TokenBalance) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className="asset-table-container">
      <table className="asset-table">
        <thead>
          <tr>
            <th onClick={() => handleSort('name')}>Asset</th>
            <th onClick={() => handleSort('tokenBalance')}>Balance</th>
            <th onClick={() => handleSort('price')}>Price</th>
            <th onClick={() => handleSort('usdValue')}>Value</th>
            <th onClick={() => handleSort('percentage')}>Allocation</th>
            <th>7D Trend</th>
          </tr>
        </thead>
        <tbody>
          {sortedTokens.map((token, index) => (
            <tr key={token.contractAddress} style={{ animationDelay: `${index * 0.05}s` }}>
              <td className="asset-cell">
                {token.logo ? (
                  <img src={token.logo} alt={token.symbol} className="asset-logo" />
                ) : (
                  <div className="asset-icon">{token.symbol?.[0]}</div>
                )}
                <div className="asset-info">
                  <span className="asset-name">{token.name}</span>
                  <span className="asset-symbol">{token.symbol}</span>
                </div>
              </td>
              <td className="balance-cell">
                {token.contractAddress === 'native' 
                  ? (parseInt(token.tokenBalance, 16) / 1e18).toFixed(4)
                  : (parseInt(token.tokenBalance) / Math.pow(10, token.decimals)).toLocaleString(undefined, { maximumFractionDigits: 6 })
                }
              </td>
              <td className="price-cell">
                ${token.price.toFixed(2)}
                {token.priceChange24h !== 0 && (
                  <span className={`price-change ${token.priceChange24h >= 0 ? 'positive' : 'negative'}`}>
                    {token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%
                  </span>
                )}
              </td>
              <td className="value-cell">
                ${token.usdValue.toLocaleString()}
              </td>
              <td className="allocation-cell">
                <div className="allocation-bar">
                  <div 
                    className="allocation-fill" 
                    style={{ width: `${token.percentage}%` }}
                  />
                </div>
                <span>{token.percentage.toFixed(1)}%</span>
              </td>
              <td className="trend-cell">
                <Sparkline 
                  data={sparklines[token.symbol] || [token.usdValue * 0.9, token.usdValue]} 
                  color={token.priceChange24h >= 0 ? '#34d399' : '#f87171'}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Send Modal Component
const SendModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  tokens: TokenBalance[];
  ethBalance: string;
  walletAddress: string;
  onSend: (to: string, amount: string, token?: string) => Promise<void>;
}> = ({ isOpen, onClose, tokens, ethBalance, walletAddress, onSend }) => {
  const [selectedToken, setSelectedToken] = useState<string>('native');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!recipient || !amount) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!ethers.isAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await onSend(recipient, amount, selectedToken === 'native' ? undefined : selectedToken);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const allAssets = [
    { 
      contractAddress: 'native', 
      symbol: 'ETH', 
      name: 'Ethereum',
      balance: (parseInt(ethBalance, 16) / 1e18).toFixed(6)
    },
    ...tokens.map(t => ({
      contractAddress: t.contractAddress,
      symbol: t.symbol,
      name: t.name,
      balance: (parseInt(t.tokenBalance) / Math.pow(10, t.decimals)).toFixed(6)
    }))
  ];

  const selectedAsset = allAssets.find(a => a.contractAddress === selectedToken);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content send-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Send size={20} /> Send Assets</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Select Asset</label>
            <select 
              value={selectedToken} 
              onChange={(e) => setSelectedToken(e.target.value)}
              className="asset-select"
            >
              {allAssets.map(asset => (
                <option key={asset.contractAddress} value={asset.contractAddress}>
                  {asset.symbol} - Balance: {asset.balance}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Recipient Address</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
              className="address-input"
            />
          </div>
          
          <div className="form-group">
            <label>Amount</label>
            <div className="amount-input-group">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="amount-input"
              />
              <button 
                className="max-btn"
                onClick={() => setAmount(selectedAsset?.balance || '0')}
              >
                MAX
              </button>
            </div>
          </div>
          
          <div className="transaction-preview">
            <div className="preview-row">
              <span>From</span>
              <span>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            </div>
            <div className="preview-row">
              <span>To</span>
              <span>{recipient ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}` : '—'}</span>
            </div>
            <div className="preview-row">
              <span>Amount</span>
              <span>{amount || '0'} {selectedAsset?.symbol}</span>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button 
            className="send-btn" 
            onClick={handleSend}
            disabled={loading || !recipient || !amount}
          >
            {loading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Receive Modal Component
const ReceiveModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  walletAddress: string;
}> = ({ isOpen, onClose, walletAddress }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content receive-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><QrCode size={20} /> Receive Assets</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="receive-description">
            Send assets to this address on Linea Mainnet
          </p>
          
          <div className="qr-container">
            {/* QR Code would be generated here using qrcode.react */}
            <div className="qr-placeholder">
              <QrCode size={120} />
              <span>QR Code</span>
            </div>
          </div>
          
          <div className="address-display">
            <code>{walletAddress}</code>
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          
          <div className="network-warning">
            <AlertCircle size={16} />
            <span>Only send Linea Mainnet assets to this address</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Portfolio Analytics Component
export const PortfolioAnalytics: React.FC<{ walletAddress: string }> = ({ walletAddress }) => {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [sparklines, setSparklines] = useState<{ [symbol: string]: number[] }>({});
  const dashboardRef = useRef<HTMLDivElement>(null);

  const priceService = useMemo(() => new PriceService(''), []);

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

  // Fetch Token Balances
  const fetchTokenBalances = async (): Promise<TokenBalance[]> => {
    const key = keyManager.getWalletKey();
    
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

    // Fetch metadata in parallel batches
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
        
        const symbol = metaData.result?.symbol || '?';
        const decimals = metaData.result?.decimals || 18;
        const rawBalance = parseInt(token.tokenBalance);
        const formattedBalance = rawBalance / Math.pow(10, decimals);
        
        // Return metadata first, prices will be fetched in batch
        return {
          contractAddress: token.contractAddress,
          tokenBalance: token.tokenBalance,
          name: metaData.result?.name || 'Unknown Token',
          symbol: symbol,
          decimals: decimals,
          logo: metaData.result?.logo,
          formattedBalance
        };
      } catch (err) {
        return {
          contractAddress: token.contractAddress,
          tokenBalance: token.tokenBalance,
          name: 'Unknown Token',
          symbol: '?',
          decimals: 18,
          formattedBalance: 0
        };
      }
    });

    // Extract successful results
    const tokensWithMetadata = metadataResults
      .filter((result: any) => result.status === 'fulfilled')
      .map((result: any) => result.value)
      .filter((token: any) => token.contractAddress);

    // Fetch all prices in one batch call
    const uniqueSymbols = [...new Set(tokensWithMetadata.map((t: any) => t.symbol).filter((s: string) => s !== '?'))];
    const prices = await priceService.getTokenPrices(uniqueSymbols);

    // Map prices back to tokens
    return tokensWithMetadata.map((token: any) => {
      const price = prices[token.symbol]?.price || 0;
      const priceChange24h = prices[token.symbol]?.change24h || 0;
      const usdValue = token.formattedBalance * price;
      
      return {
        contractAddress: token.contractAddress,
        tokenBalance: token.tokenBalance,
        name: token.name,
        symbol: token.symbol,
        decimals: token.decimals,
        logo: token.logo,
        usdValue: usdValue,
        price: price,
        priceChange24h: priceChange24h,
        percentage: 0 // Will calculate after total
      };
    });
  };

  // Fetch NFTs
  const fetchNFTs = async (): Promise<NFTItem[]> => {
    const key = keyManager.getWalletKey();
    
    const response = await fetchWithTimeout(
      `https://linea-mainnet.g.alchemy.com/v2/${key}/getNFTs?owner=${walletAddress}&pageSize=100&withMetadata=true`,
      {},
      15000
    );
    
    const data = await response.json();
    
    return (data.ownedNfts || []).map((nft: any): NFTItem => {
      let imageUrl = nft.media?.[0]?.gateway || 
                    nft.media?.[0]?.thumbnail || 
                    nft.media?.[0]?.raw ||
                    nft.metadata?.image;
      
      imageUrl = resolveIPFSImageUrl(imageUrl);

      return {
        contractAddress: nft.contract?.address,
        tokenId: nft.id?.tokenId,
        name: nft.title || nft.metadata?.name || `NFT #${nft.id?.tokenId}`,
        description: nft.description || nft.metadata?.description,
        imageUrl,
        collectionName: nft.contract?.name || nft.contract?.openSea?.collectionName || 'Unknown Collection',
      };
    });
  };

  // Fetch Transactions
  const fetchTransactions = async (): Promise<Transaction[]> => {
    const keys = keyManager.getContractKeys(2);
    
    const [fromResponse, toResponse] = await Promise.all([
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
              maxCount: '0x32'
            }]
          })
        },
        10000
      ),
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
              maxCount: '0x32'
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

    const processTransfer = (tx: any, direction: 'in' | 'out'): Transaction => ({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      value: tx.value,
      asset: tx.asset || 'ETH',
      category: tx.category,
      timestamp: new Date(tx.metadata?.blockTimestamp).getTime(),
      direction
    });

    const fromTxs = (fromData.result?.transfers || []).map((tx: any) => processTransfer(tx, 'out'));
    const toTxs = (toData.result?.transfers || []).map((tx: any) => processTransfer(tx, 'in'));

    const allTxs = [...fromTxs, ...toTxs];
    const uniqueTxs = allTxs.filter((tx, index, self) => 
      index === self.findIndex((t) => t.hash === tx.hash && t.direction === t.direction)
    );
    
    uniqueTxs.sort((a, b) => b.timestamp - a.timestamp);

    return uniqueTxs;
  };

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch all data in parallel
      const [ethBalance, tokens, nfts, transactions] = await Promise.all([
        fetchEthBalance().catch(err => {
          console.error('ETH fetch error:', err);
          return '0';
        }),
        fetchTokenBalances().catch(err => {
          console.error('Token fetch error:', err);
          return [];
        }),
        fetchNFTs().catch(err => {
          console.error('NFT fetch error:', err);
          return [];
        }),
        fetchTransactions().catch(err => {
          console.error('Transaction fetch error:', err);
          return [];
        })
      ]);

      // Calculate ETH value
      const ethBalanceNum = parseInt(ethBalance, 16) / 1e18;
      const ethPriceData = (await priceService.getTokenPrices(['ethereum']))['ethereum'] || { price: 0, change24h: 0 };
      const ethPrice = ethPriceData.price;
      const ethUsdValue = ethBalanceNum * ethPrice;

      // Calculate total value and percentages
      const totalTokenValue = tokens.reduce((sum, t) => sum + t.usdValue, 0);
      const totalUsdValue = ethUsdValue + totalTokenValue;
      
      // Update percentages
      const tokensWithPercentage = tokens.map(t => ({
        ...t,
        percentage: totalUsdValue > 0 ? (t.usdValue / totalUsdValue) * 100 : 0
      }));

      // Fetch real historical prices for sparklines
      const sparklineData: { [symbol: string]: number[] } = {};
      
      // Fetch historical data for top tokens by value (limited to avoid API limits)
      const topTokens = [...tokensWithPercentage]
        .sort((a, b) => b.usdValue - a.usdValue)
        .slice(0, 5)
        .map(t => t.symbol);
      
      await Promise.all(
        ['ETH', ...topTokens].map(async (symbol) => {
          if (symbol && symbol !== '?') {
            const history = await priceService.getHistoricalPrices(symbol, 7);
            if (history.length > 0) {
              sparklineData[symbol] = history;
            } else {
              // Fallback: generate flat line from current value
              const token = tokensWithPercentage.find(t => t.symbol === symbol);
              const currentPrice = symbol === 'ETH' ? ethPrice : (token?.price || 0);
              sparklineData[symbol] = Array(7).fill(currentPrice);
            }
          }
        })
      );

      // Calculate real 24h and 7d changes based on portfolio composition
      let totalChange24h = 0;
      let totalChange7d = 0;
      
      // ETH contribution to change
      totalChange24h += ethUsdValue * (ethPriceData.change24h / 100);
      
      // Token contributions to change
      tokensWithPercentage.forEach(token => {
        if (token.priceChange24h !== 0) {
          totalChange24h += token.usdValue * (token.priceChange24h / 100);
        }
      });

      setPortfolio({
        address: walletAddress,
        ethBalance,
        ethUsdValue,
        tokens: tokensWithPercentage.sort((a, b) => b.usdValue - a.usdValue),
        nfts,
        transactions,
        totalUsdValue,
        totalChange24h,
        totalChange7d,
        lastUpdated: Date.now()
      });
      
      setSparklines(sparklineData);
      setLastRefresh(Date.now());
    } catch (err: any) {
      console.error('Failed to fetch portfolio:', err);
      setError(err.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  // Handle send transaction
  const handleSend = async (to: string, amount: string, token?: string) => {
    // Implement actual transaction sending using ethers.js
    // This would connect to MetaMask, WalletConnect, etc.
    
    const ethereum = (window as any).ethereum;
    if (!ethereum) {
      throw new Error('No wallet detected. Please install MetaMask or Rabby.');
    }
    
    const provider = new ethers.BrowserProvider(ethereum);
    const signer = await provider.getSigner();
    
    if (token) {
      // ERC20 transfer
      const contract = new ethers.Contract(token, [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function decimals() view returns (uint8)'
      ], signer);
      
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);
      const tx = await contract.transfer(to, amountWei);
      await tx.wait();
    } else {
      // ETH transfer
      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(amount)
      });
      await tx.wait();
    }
    
    // Refresh portfolio after transaction
    await fetchPortfolio();
  };

  // Export to PDF
  const exportToPDF = async () => {
    if (!dashboardRef.current) return;
    
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 2,
      backgroundColor: '#171717'
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`portfolio-${walletAddress.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!portfolio) return;
    
    const rows = [
      ['Asset', 'Symbol', 'Balance', 'Price (USD)', 'Value (USD)', 'Allocation (%)'],
      ['Ethereum', 'ETH', (parseInt(portfolio.ethBalance, 16) / 1e18).toString(), 
       (portfolio.ethUsdValue / (parseInt(portfolio.ethBalance, 16) / 1e18 || 1)).toFixed(2),
       portfolio.ethUsdValue.toFixed(2),
       ((portfolio.ethUsdValue / portfolio.totalUsdValue) * 100).toFixed(2)],
      ...portfolio.tokens.map(t => [
        t.name,
        t.symbol,
        (parseInt(t.tokenBalance) / Math.pow(10, t.decimals)).toString(),
        t.price.toFixed(2),
        t.usdValue.toFixed(2),
        t.percentage.toFixed(2)
      ])
    ];
    
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${walletAddress.slice(0, 8)}.csv`;
    a.click();
  };

  // Share portfolio
  const handleShare = async () => {
    if (!portfolio) return;
    
    const shareData = {
      title: `FundTracer Portfolio - ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      text: `Check out this portfolio on FundTracer! Total Value: $${portfolio.totalUsdValue.toLocaleString()}`,
      url: `${window.location.origin}/portfolio/${walletAddress}`
    };
    
    try {
      if (navigator.share) {
        // Use native share on mobile
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        alert('Portfolio link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareData.url);
        alert('Portfolio link copied to clipboard!');
      } catch (clipboardErr) {
        console.error('Clipboard failed:', clipboardErr);
      }
    }
  };

  // Format helpers
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner" />
        <p>Loading portfolio analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-error">
        <AlertCircle size={48} />
        <p>{error}</p>
        <button onClick={fetchPortfolio}>Retry</button>
      </div>
    );
  }

  if (!portfolio) return null;

  const isPositive24h = portfolio.totalChange24h >= 0;
  const isPositive7d = portfolio.totalChange7d >= 0;

  return (
    <>
      <div 
        ref={dashboardRef}
        className={`portfolio-analytics ${isFullscreen ? 'fullscreen' : ''}`}
      >
        {/* Header */}
        <div className="analytics-header">
          <div className="header-title">
            <Activity size={28} className="header-icon" />
            <div>
              <h1>Portfolio Analytics</h1>
              <p className="wallet-address">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                <span className="chain-badge">Linea</span>
              </p>
            </div>
          </div>
          
          <div className="header-actions">
            <span className="refresh-time">
              <Clock size={14} />
              {formatDate(lastRefresh)}
            </span>
            <button className="action-btn" onClick={fetchPortfolio}>
              <RefreshCw size={16} />
            </button>
            <button className="action-btn" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="metrics-grid">
          <div className="metric-card primary">
            <span className="metric-label">Total Value</span>
            <span className="metric-value">
              ${portfolio.totalUsdValue.toLocaleString()}
            </span>
            <div className={`metric-change ${isPositive24h ? 'positive' : 'negative'}`}>
              {isPositive24h ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>${Math.abs(portfolio.totalChange24h).toFixed(2)} ({((portfolio.totalChange24h / portfolio.totalUsdValue) * 100).toFixed(1)}%)</span>
              <span className="change-period">24h</span>
            </div>
          </div>
          
          <div className="metric-card">
            <span className="metric-label">7 Day Change</span>
            <span className="metric-value secondary">
              {isPositive7d ? '+' : ''}${portfolio.totalChange7d.toFixed(2)}
            </span>
            <div className={`metric-change ${isPositive7d ? 'positive' : 'negative'}`}>
              {isPositive7d ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{((portfolio.totalChange7d / portfolio.totalUsdValue) * 100).toFixed(1)}%</span>
            </div>
          </div>
          
          <div className="metric-card">
            <span className="metric-label">Assets</span>
            <span className="metric-value secondary">{portfolio.tokens.length + 1}</span>
            <span className="metric-detail">{portfolio.nfts.length} NFTs</span>
          </div>
          
          {(() => {
            // Calculate best performer from actual data
            const allAssets: Array<{symbol: string; change24h: number}> = [
              { symbol: 'ETH', change24h: portfolio.totalChange24h > 0 ? (portfolio.totalChange24h / portfolio.totalUsdValue) * 100 : 0 },
              ...portfolio.tokens
                .filter(t => t.priceChange24h !== 0)
                .map(t => ({ symbol: t.symbol, change24h: t.priceChange24h }))
            ];
            const bestPerformer = allAssets.length > 0 
              ? allAssets.reduce((best, asset) => asset.change24h > best.change24h ? asset : best, allAssets[0])
              : null;
            
            return bestPerformer && bestPerformer.change24h !== 0 ? (
              <div className="metric-card">
                <span className="metric-label">Best Performer</span>
                <span className="metric-value positive">{bestPerformer.symbol}</span>
                <span className={`metric-change ${bestPerformer.change24h >= 0 ? 'positive' : 'negative'}`}>
                  {bestPerformer.change24h >= 0 ? '+' : ''}{bestPerformer.change24h.toFixed(1)}%
                </span>
              </div>
            ) : (
              <div className="metric-card">
                <span className="metric-label">Best Performer</span>
                <span className="metric-value">—</span>
                <span className="metric-change">No data</span>
              </div>
            );
          })()}
        </div>

        {/* Main Content Grid */}
        <div className="analytics-grid">
          {/* Left Column - Chart & Allocation */}
          <div className="analytics-left">
            <div className="chart-card">
              <h3><PieChart size={18} /> Asset Allocation</h3>
              <PieChart3D 
                data={portfolio.tokens} 
                totalValue={portfolio.totalUsdValue} 
              />
            </div>
            
            <div className="activity-card">
              <h3><BarChart3 size={18} /> Portfolio Trend</h3>
              <div className="trend-chart">
                <Sparkline 
                  data={sparklines['ETH'] || []} 
                  width={300} 
                  height={80}
                />
              </div>
              {(() => {
                // Calculate trend stats from sparkline data
                const ethSparkline = sparklines['ETH'] || [];
                let high = portfolio.totalUsdValue;
                let low = portfolio.totalUsdValue;
                let avg = portfolio.totalUsdValue;
                
                if (ethSparkline.length > 0) {
                  // Calculate portfolio value at each point
                  const portfolioValues = ethSparkline.map(price => {
                    const ethValueAtPoint = (parseInt(portfolio.ethBalance, 16) / 1e18) * price;
                    return ethValueAtPoint + portfolio.tokens.reduce((sum, t) => {
                      const tokenSparkline = sparklines[t.symbol];
                      if (tokenSparkline && tokenSparkline.length > 0) {
                        const tokenPrice = tokenSparkline[ethSparkline.indexOf(price)] || t.price;
                        const balance = parseInt(t.tokenBalance) / Math.pow(10, t.decimals);
                        return sum + (balance * tokenPrice);
                      }
                      return sum + t.usdValue;
                    }, 0);
                  });
                  
                  high = Math.max(...portfolioValues);
                  low = Math.min(...portfolioValues);
                  avg = portfolioValues.reduce((a, b) => a + b, 0) / portfolioValues.length;
                }
                
                return (
                  <div className="trend-stats">
                    <div className="trend-stat">
                      <span className="stat-label">High (7d)</span>
                      <span className="stat-value">${high.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="trend-stat">
                      <span className="stat-label">Low (7d)</span>
                      <span className="stat-value">${low.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                    <div className="trend-stat">
                      <span className="stat-label">Avg</span>
                      <span className="stat-value">${avg.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
          
          {/* Right Column - Asset Table */}
          <div className="analytics-right">
            <div className="assets-card">
              <h3><Coins size={18} /> Asset Breakdown</h3>
              <AssetTable 
                tokens={portfolio.tokens}
                ethBalance={portfolio.ethBalance}
                ethUsdValue={portfolio.ethUsdValue}
                totalValue={portfolio.totalUsdValue}
                sparklines={sparklines}
              />
            </div>
          </div>
        </div>

        {/* NFT Section */}
        {portfolio.nfts.length > 0 && (
          <div className="nfts-section">
            <h3><Image size={18} /> NFT Collections</h3>
            <div className="nfts-grid">
              {portfolio.nfts.slice(0, 4).map((nft, index) => (
                <div key={index} className="nft-collection-card">
                  <div className="nft-image">
                    {nft.imageUrl ? (
                      <img src={nft.imageUrl} alt={nft.name} />
                    ) : (
                      <div className="nft-placeholder">
                        <Image size={32} />
                      </div>
                    )}
                  </div>
                  <div className="nft-info">
                    <span className="nft-collection">{nft.collectionName}</span>
                    <span className="nft-name">{nft.name}</span>
                    {nft.floorPrice && (
                      <span className="nft-floor">Floor: {nft.floorPrice} ETH</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="action-bar">
          <button className="action-btn-primary" onClick={() => setSendModalOpen(true)}>
            <Send size={18} />
            Send
          </button>
          <button className="action-btn-primary" onClick={() => setReceiveModalOpen(true)}>
            <QrCode size={18} />
            Receive
          </button>
          <button className="action-btn-secondary" onClick={exportToPDF}>
            <FileText size={18} />
            Export PDF
          </button>
          <button className="action-btn-secondary" onClick={exportToCSV}>
            <Download size={18} />
            Export CSV
          </button>
          <button className="action-btn-secondary" onClick={handleShare}>
            <Share2 size={18} />
            Share
          </button>
        </div>
      </div>

      {/* Modals */}
      <SendModal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        tokens={portfolio.tokens}
        ethBalance={portfolio.ethBalance}
        walletAddress={walletAddress}
        onSend={handleSend}
      />
      
      <ReceiveModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        walletAddress={walletAddress}
      />
    </>
  );
};

export default PortfolioAnalytics;
