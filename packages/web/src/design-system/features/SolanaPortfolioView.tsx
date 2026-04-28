import React, { useState, useEffect } from 'react';
import { Wallet, Copy, ExternalLink, RefreshCw, Loader2 } from 'lucide-react';
import './SolanaPortfolioView.css';

interface SolanaToken {
  mint: string;
  uiAmount: number;
  decimals: number;
  symbol?: string;
  name?: string;
  price?: number;
  value?: number;
  logoUrl?: string;
  change24h?: number;
}

interface SolanaPortfolio {
  address: string;
  totalUsd: number;
  sol: { lamports: number };
  tokens?: SolanaToken[];
  staking?: { stake: number; active: boolean }[];
}

interface SolanaPortfolioViewProps {
  address: string;
}

function formatAddress(addr: string): string {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function formatSol(lamports: number): string {
  return (lamports / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatUsd(value: number): string {
  return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPercent(value: number): string {
  return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://fundtracer-by-dt-production.up.railway.app';

export function SolanaPortfolioView({ address }: SolanaPortfolioViewProps) {
  const [portfolio, setPortfolio] = useState<SolanaPortfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;
    fetchPortfolio();
  }, [address]);

  const fetchPortfolio = async () => {
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('fundtracer_token');
    
    try {
      const res = await fetch(`${API_BASE}/api/solana/portfolio/${address}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch portfolio');
      }
      
      const data = await res.json();
      setPortfolio(data);
    } catch (err: any) {
      console.error('Portfolio fetch error:', err);
      setError(err.message || 'Failed to load portfolio');
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
  };

  if (!address) {
    return (
      <div className="solana-view-empty">
        <Wallet size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="solana-view-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading portfolio...</p>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="solana-view-error">
        <Wallet size={48} />
        <h3>Unable to Load Portfolio</h3>
        <p>{error || 'Enter a valid Solana address to view portfolio'}</p>
        {address && (
          <button className="retry-btn" onClick={fetchPortfolio}>
            <RefreshCw size={16} />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="solana-portfolio-view">
      {/* Wallet Header */}
      <div className="wallet-header-bar">
        <div className="wallet-info-bar">
          <div className="wallet-address-row">
            <h2 className="wallet-address">{formatAddress(portfolio.address)}</h2>
            <button className="copy-btn" onClick={copyAddress}>
              <Copy size={14} />
            </button>
            <a 
              href={`https://solscan.io/address/${portfolio.address}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="explorer-link"
            >
              <ExternalLink size={14} />
            </a>
          </div>
          <div className="wallet-meta-bar">
            <span className="chain-tag">Solana</span>
            <span className="total-value">{formatUsd(portfolio.totalUsd)}</span>
          </div>
        </div>
        <button className="refresh-btn" onClick={fetchPortfolio}>
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Value</span>
          <span className="stat-value">{formatUsd(portfolio.totalUsd)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">SOL Balance</span>
          <span className="stat-value">{formatSol(portfolio.sol?.lamports || 0)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Token Count</span>
          <span className="stat-value">{portfolio.tokens?.length || 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Staking</span>
          <span className="stat-value">{portfolio.staking?.length || 0} positions</span>
        </div>
      </div>

      {/* Token Holdings */}
      <div className="section">
        <h3>Token Holdings</h3>
        {portfolio.tokens && portfolio.tokens.length > 0 ? (
          <div className="tokens-table">
            <div className="table-header">
              <span>Token</span>
              <span>Amount</span>
              <span>Price</span>
              <span>Value</span>
              <span>24h</span>
            </div>
            {portfolio.tokens.map((token, idx) => (
              <div key={idx} className="table-row">
                <div className="token-cell">
                  {token.logoUrl ? (
                    <img src={token.logoUrl} alt="" className="token-icon" />
                  ) : (
                    <div className="token-icon placeholder">{(token.symbol || '?')[0]}</div>
                  )}
                  <span className="token-symbol">{token.symbol || token.mint.slice(0, 8)}</span>
                </div>
                <span className="token-amount">{token.uiAmount.toLocaleString()}</span>
                <span className="token-price">{token.price ? formatUsd(token.price) : '--'}</span>
                <span className="token-value">{token.value ? formatUsd(token.value) : '--'}</span>
                <span className={`token-change ${token.change24h && token.change24h >= 0 ? 'positive' : 'negative'}`}>
                  {token.change24h ? formatPercent(token.change24h) : '--'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-table">
            <p>No tokens found</p>
          </div>
        )}
      </div>

      {/* Staking Positions */}
      {portfolio.staking && portfolio.staking.length > 0 && (
        <div className="section">
          <h3>Staking Positions</h3>
          <div className="staking-list">
            {portfolio.staking.map((stake, idx) => (
              <div key={idx} className="staking-card">
                <div className="staking-icon">
                  <Wallet size={16} />
                </div>
                <div className="staking-info">
                  <span className="staking-amount">{formatSol(stake.stake)} SOL</span>
                  <span className="staking-status">{stake.active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SolanaPortfolioView;