/**
 * IntelPage - Arkham-style landing page with live blockchain data
 * Replaces the old SaaS-style landing page
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrivy } from '@privy-io/react-auth';
import { useAuth } from '../contexts/AuthContext';
import {
  LandingLayout,
  LiveFeed,
  FeedItem,
  StatBlock,
  StatGrid,
  Panel,
  Badge,
  EntityCard,
  EntityList,
  DataGrid,
  Column
} from '../design-system';
import './IntelPage.css';

// API endpoints for live data
const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex';

interface MarketStats {
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  ethGas: number;
  activeAddresses: number;
  defiTvl: number;
}

interface TrendingToken {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  chain: string;
}

export function IntelPage() {
  const navigate = useNavigate();
  const { login: loginPrivy, user: privyUser } = usePrivy();
  const address = privyUser?.wallet?.address;
  const isConnected = !!address;
  const { isAuthenticated } = useAuth();

  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [trendingTokens, setTrendingTokens] = useState<TrendingToken[]>([]);
  const [liveFeed, setLiveFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch market stats from CoinGecko
  const fetchMarketStats = useCallback(async () => {
    try {
      const response = await fetch(`${COINGECKO_API}/global`);
      const data = await response.json();
      
      setMarketStats({
        totalMarketCap: data.data.total_market_cap.usd,
        totalVolume: data.data.total_volume.usd,
        btcDominance: data.data.market_cap_percentage.btc,
        ethGas: 25, // Placeholder - would need Etherscan API
        activeAddresses: 1240000, // Placeholder
        defiTvl: 85000000000 // Placeholder - would need DeFiLlama
      });
    } catch (error) {
      console.error('Failed to fetch market stats:', error);
    }
  }, []);

  // Fetch trending tokens
  const fetchTrendingTokens = useCallback(async () => {
    try {
      const response = await fetch(`${COINGECKO_API}/coins/markets?vs_currency=usd&order=volume_desc&per_page=10&sparkline=false`);
      const data = await response.json();
      
      setTrendingTokens(data.map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        change24h: coin.price_change_percentage_24h || 0,
        volume: coin.total_volume,
        marketCap: coin.market_cap,
        chain: 'Multi'
      })));
    } catch (error) {
      console.error('Failed to fetch trending tokens:', error);
    }
  }, []);

  // Generate simulated live feed (in production, this would be WebSocket data)
  const generateLiveFeed = useCallback(() => {
    const exchanges = ['Binance', 'Coinbase', 'Uniswap', 'Kraken', 'dYdX'];
    const tokens = ['ETH', 'BTC', 'USDC', 'USDT', 'SOL', 'ARB', 'OP'];
    const types: FeedItem['type'][] = ['transfer', 'swap', 'transfer', 'swap', 'transfer'];
    
    const generateAddress = () => {
      const chars = '0123456789abcdef';
      let addr = '0x';
      for (let i = 0; i < 40; i++) {
        addr += chars[Math.floor(Math.random() * chars.length)];
      }
      return addr;
    };

    const generateTx = (): FeedItem => {
      const isLabeled = Math.random() > 0.6;
      const value = (Math.random() * 500 + 10).toFixed(2);
      const risks: FeedItem['risk'][] = ['low', 'low', 'low', 'medium', 'high'];
      
      return {
        id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        time: new Date(),
        type: types[Math.floor(Math.random() * types.length)],
        from: generateAddress(),
        fromLabel: isLabeled && Math.random() > 0.5 ? exchanges[Math.floor(Math.random() * exchanges.length)] : undefined,
        to: generateAddress(),
        toLabel: isLabeled && Math.random() > 0.5 ? exchanges[Math.floor(Math.random() * exchanges.length)] : undefined,
        value: `$${Number(value).toLocaleString()}K`,
        tokenSymbol: tokens[Math.floor(Math.random() * tokens.length)],
        risk: risks[Math.floor(Math.random() * risks.length)]
      };
    };

    // Initial batch
    const initialFeed = Array.from({ length: 15 }, generateTx);
    setLiveFeed(initialFeed);

    // Add new transactions periodically
    const interval = setInterval(() => {
      setLiveFeed(prev => {
        const newTx = generateTx();
        return [newTx, ...prev.slice(0, 49)];
      });
    }, 2000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, []);

  // Initial data fetch
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchMarketStats(),
        fetchTrendingTokens()
      ]);
      setLoading(false);
    };
    
    fetchAll();
    generateLiveFeed();

    // Refresh stats every 60 seconds
    const statsInterval = setInterval(fetchMarketStats, 60000);
    const tokensInterval = setInterval(fetchTrendingTokens, 30000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(tokensInterval);
    };
  }, [fetchMarketStats, fetchTrendingTokens, generateLiveFeed]);

  const formatNumber = (num: number, decimals = 2) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(decimals)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  const tokenColumns: Column<TrendingToken>[] = [
    { 
      key: 'name', 
      header: 'Token',
      render: (_, row) => (
        <div className="intel-token-cell">
          <span className="intel-token-name">{row.name}</span>
          <span className="intel-token-symbol">{row.symbol}</span>
        </div>
      )
    },
    { 
      key: 'price', 
      header: 'Price', 
      align: 'right',
      sortable: true,
      render: (val) => `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`
    },
    { 
      key: 'change24h', 
      header: '24h', 
      align: 'right',
      sortable: true,
      render: (val) => (
        <span className={val >= 0 ? 'text-green' : 'text-red'}>
          {val >= 0 ? '+' : ''}{val.toFixed(2)}%
        </span>
      )
    },
    { 
      key: 'volume', 
      header: 'Volume', 
      align: 'right',
      sortable: true,
      render: (val) => formatNumber(val)
    },
    { 
      key: 'marketCap', 
      header: 'Market Cap', 
      align: 'right',
      sortable: true,
      render: (val) => formatNumber(val)
    }
  ];

  const navItems = [
    { label: 'Intel', href: '/', active: true },
    { label: 'Features', href: '/features' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'FAQ', href: '/faq' },
    { label: 'API', href: '/api' },
    { label: 'CLI', href: '/cli' },
    { label: 'About', href: '/about' },
  ];

  const handleLaunchApp = () => {
    if (isAuthenticated) {
      navigate('/app-evm');
    } else {
      navigate('/auth');
    }
  };

  return (
    <LandingLayout
      navItems={navItems}
      showSearch={false}
      transparent={true}
      headerRight={
        <div className="intel-header-actions">
          {isAuthenticated ? (
            <button className="intel-btn intel-btn--primary" onClick={() => navigate('/app-evm')}>
              Launch App
            </button>
          ) : (
            <button className="intel-btn intel-btn--primary" onClick={() => navigate('/auth?mode=signup')}>
              Get Started
            </button>
          )}
        </div>
      }
    >
      {/* Arkham-style Watermark */}
      <div className="view-watermark">
        <img src="/logo.png" alt="" className="watermark-logo" />
        <span className="watermark-text">FUNDTRACER</span>
      </div>
      <div className="intel-page">
        {/* Hero Section */}
        <section className="intel-hero">
          <div className="intel-hero__content">
            <div className="intel-hero__badge">
              <Badge variant="info" size="sm">LIVE INTEL</Badge>
            </div>
            <h1 className="intel-hero__title">
              Blockchain Intelligence
              <span className="intel-hero__title-accent">Platform</span>
            </h1>
            <p className="intel-hero__subtitle">
              Track wallets, analyze transactions, and investigate on-chain activity 
              across multiple blockchains in real-time.
            </p>
            <div className="intel-hero__actions">
              <button className="intel-btn intel-btn--primary intel-btn--lg" onClick={handleLaunchApp}>
                Start Investigating
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button className="intel-btn intel-btn--secondary intel-btn--lg" onClick={() => navigate('/pricing')}>
                View Pricing
              </button>
            </div>
          </div>
          
          {/* Animated background grid */}
          <div className="intel-hero__grid" />
        </section>

        {/* Market Stats */}
        <section className="intel-section">
          <StatGrid columns={6}>
            <StatBlock
              label="Total Market Cap"
              value={marketStats ? formatNumber(marketStats.totalMarketCap) : '—'}
              change={2.34}
              loading={loading}
            />
            <StatBlock
              label="24h Volume"
              value={marketStats ? formatNumber(marketStats.totalVolume) : '—'}
              change={-1.2}
              loading={loading}
            />
            <StatBlock
              label="BTC Dominance"
              value={marketStats ? `${marketStats.btcDominance.toFixed(1)}%` : '—'}
              change={0.5}
              loading={loading}
            />
            <StatBlock
              label="ETH Gas"
              value={marketStats ? `${marketStats.ethGas} gwei` : '—'}
              loading={loading}
            />
            <StatBlock
              label="Active Addresses"
              value={marketStats ? `${(marketStats.activeAddresses / 1e6).toFixed(2)}M` : '—'}
              change={5.2}
              loading={loading}
            />
            <StatBlock
              label="DeFi TVL"
              value={marketStats ? formatNumber(marketStats.defiTvl) : '—'}
              change={1.8}
              loading={loading}
            />
          </StatGrid>
        </section>

        {/* Main Grid */}
        <section className="intel-section">
          <div className="intel-grid">
            {/* Live Feed */}
            <div className="intel-grid__feed">
              <LiveFeed
                items={liveFeed}
                title="LIVE TRANSACTIONS"
                onItemClick={(item) => console.log('Clicked:', item)}
              />
            </div>

            {/* Trending Tokens */}
            <div className="intel-grid__tokens">
              <Panel title="TRENDING BY VOLUME" noPadding>
                <DataGrid
                  columns={tokenColumns}
                  data={trendingTokens}
                  keyField="id"
                  loading={loading}
                  compact
                  onRowClick={(row) => navigate(`/app-evm?token=${row.id}`)}
                />
              </Panel>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="intel-section">
          <div className="intel-features">
            <div className="intel-feature">
              <div className="intel-feature__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3 className="intel-feature__title">Real-Time Tracking</h3>
              <p className="intel-feature__desc">
                Monitor wallet activity, transactions, and token movements as they happen across all major chains.
              </p>
            </div>

            <div className="intel-feature">
              <div className="intel-feature__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <h3 className="intel-feature__title">Multi-Chain Support</h3>
              <p className="intel-feature__desc">
                Ethereum, Arbitrum, Optimism, Base, Polygon, Linea, and Solana - all in one place.
              </p>
            </div>

            <div className="intel-feature">
              <div className="intel-feature__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
              </div>
              <h3 className="intel-feature__title">Sybil Detection</h3>
              <p className="intel-feature__desc">
                Advanced algorithms to detect wallet clusters, airdrop farmers, and suspicious patterns.
              </p>
            </div>

            <div className="intel-feature">
              <div className="intel-feature__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 className="intel-feature__title">Risk Analysis</h3>
              <p className="intel-feature__desc">
                Contract verification, rug-pull detection, and comprehensive safety scores for tokens.
              </p>
            </div>

            <div className="intel-feature">
              <div className="intel-feature__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18"/>
                  <path d="M9 21V9"/>
                </svg>
              </div>
              <h3 className="intel-feature__title">Portfolio Analytics</h3>
              <p className="intel-feature__desc">
                Track holdings, PnL, and performance across all your wallets with detailed breakdowns.
              </p>
            </div>

            <div className="intel-feature">
              <div className="intel-feature__icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3 className="intel-feature__title">Telegram Alerts</h3>
              <p className="intel-feature__desc">
                Get instant notifications for wallet activity, price movements, and custom triggers.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="intel-cta">
          <div className="intel-cta__content">
            <h2 className="intel-cta__title">Ready to investigate?</h2>
            <p className="intel-cta__subtitle">
              Sign in with Google or X to start tracking on-chain activity in seconds.
            </p>
            <button className="intel-btn intel-btn--primary intel-btn--lg" onClick={handleLaunchApp}>
              Get Started
            </button>
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}

export default IntelPage;
