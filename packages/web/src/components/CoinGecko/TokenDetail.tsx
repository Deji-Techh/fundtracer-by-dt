import React, { useState } from 'react';

interface TokenDetailProps {
  token: {
    id: string;
    name: string;
    symbol: string;
    price: number;
    change24h: number;
    change7d: number;
    volume24h: number;
    marketCap: number;
    circulatingSupply: number;
    totalSupply: number;
    fullyDilutedValuation: number;
  };
  onBack: () => void;
}

type TabType = 'overview' | 'chart' | 'holders';

const TokenDetail: React.FC<TokenDetailProps> = ({ token, onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [timeframe, setTimeframe] = useState('7d');

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toFixed(2)}`;
  };

  const formatSupply = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B ${token.symbol}`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M ${token.symbol}`;
    return `${num.toFixed(2)} ${token.symbol}`;
  };

  const renderOverview = () => (
    <div className="token-overview">
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Market Cap</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#fff' }}>
            {formatLargeNumber(token.marketCap)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">24h Volume</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#fff' }}>
            {formatLargeNumber(token.volume24h)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Circulating Supply</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#fff' }}>
            {formatSupply(token.circulatingSupply)}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Fully Diluted Valuation</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#fff' }}>
            {formatLargeNumber(token.fullyDilutedValuation)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Price Performance</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 16 }}>
          {['1h', '24h', '7d', '30d'].map((period) => (
            <div key={period} style={{ textAlign: 'center', padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: 4 }}>{period}</div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600, color: token.change24h >= 0 ? '#10b981' : '#ef4444' }}>
                {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderChart = () => (
    <div className="token-chart" style={{ height: 400, background: '#1a1a1a', borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="card-title">Price Chart</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['1h', '24h', '7d', '30d', '90d', '1y'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #2a2a2a',
                background: timeframe === tf ? '#3b82f6' : 'transparent',
                color: timeframe === tf ? '#fff' : '#9ca3af',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
        <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,150 Q100,100 200,120 T400,80 T600,140 T800,100 L800,300 L0,300 Z"
            fill="url(#chartGradient)"
          />
          <path
            d="M0,150 Q100,100 200,120 T400,80 T600,140 T800,100"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );

  const renderHolders = () => (
    <div className="token-holders">
      <div className="card">
        <div className="card-title">Top Holders</div>
        <div style={{ marginTop: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: i < 5 ? '1px solid #2a2a2a' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: '#6b7280', fontWeight: 600, width: 24 }}>{i}</span>
                <span style={{ color: '#fff' }}>0x{Math.random().toString(16).slice(2, 10)}...{Math.random().toString(16).slice(2, 6)}</span>
              </div>
              <span style={{ color: '#9ca3af' }}>{(Math.random() * 10).toFixed(2)}% ({(Math.random() * 1000000).toFixed(0)} {token.symbol})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid #2a2a2a',
            background: 'transparent',
            color: '#9ca3af',
            cursor: 'pointer',
            marginBottom: 16
          }}
        >
          ← Back
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 700
          }}>
            {token.symbol.slice(0, 2)}
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', margin: 0 }}>
              {token.name}
            </h1>
            <span style={{ color: '#6b7280', fontSize: '1rem' }}>{token.symbol}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontSize: '2.5rem', fontWeight: 700, color: '#fff' }}>
            {formatPrice(token.price)}
          </span>
          <span style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: token.change24h >= 0 ? '#10b981' : '#ef4444'
          }}>
            {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
        >
          Chart
        </button>
        <button
          className={`tab ${activeTab === 'holders' ? 'active' : ''}`}
          onClick={() => setActiveTab('holders')}
        >
          Holders
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'chart' && renderChart()}
      {activeTab === 'holders' && renderHolders()}
    </div>
  );
};

export default TokenDetail;
