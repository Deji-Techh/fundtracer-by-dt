import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Wallet,
  TrendingUp,
  Receipt,
  Image,
  Shield,
  BarChart3,
  Copy,
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  X,
  ChevronRight,
  Activity,
  Layers,
} from 'lucide-react';
import './AppSolana.css';

interface SolanaToken {
  mint: string;
  uiAmount: number;
  decimals: number;
  symbol?: string;
  name?: string;
  price?: number;
  value?: number;
  logoUrl?: string;
}

interface SolanaNFT {
  id: string;
  mint: string;
  name: string;
  imageUrl?: string;
  collection?: string;
}

interface SolanaTransaction {
  signature: string;
  slot: number;
  blockTime: number;
  fee: number;
  status: 'success' | 'failed';
  type: string;
  from: string;
  to?: string;
  amount?: number;
  token?: string;
}

interface RiskSignal {
  id: string;
  name: string;
  detected: boolean;
  severity: 'low' | 'medium' | 'high';
}

interface RiskAnalysis {
  score: number;
  signals: RiskSignal[];
  factors: { label: string; value: string; risk: number }[];
}

const SOLANA_EXPLORER = 'https://solscan.io';

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

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function isValidSolanaAddress(address: string): boolean {
  if (!address) return false;
  if (address.length < 32 || address.length > 44) return false;
  const base58Chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  return [...address].every(c => base58Chars.includes(c));
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://fundtracer-by-dt-production.up.railway.app';

async function fetchWithAuth(endpoint: string, token: string) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export default function AppSolana() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [address, setAddress] = useState(searchParams.get('address') || '');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'transactions' | 'nfts' | 'defi' | 'risk'>('portfolio');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [portfolio, setPortfolio] = useState<any>(null);
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [nfts, setNfts] = useState<SolanaNFT[]>([]);
  const [defi, setDefi] = useState<any[]>([]);
  const [risk, setRisk] = useState<RiskAnalysis | null>(null);

  const token = localStorage.getItem('auth_token') || '';

  const handleSearch = useCallback(async () => {
    if (!address.trim()) {
      setError('Please enter a wallet address');
      return;
    }
    if (!isValidSolanaAddress(address.trim())) {
      setError('Invalid Solana address format');
      return;
    }
    
    setError('');
    setLoading(true);
    setSearchParams({ address: address.trim() });
    
    try {
      const addr = address.trim();
      
      const [portfolioData, txsData, nftsData, defiData, riskData] = await Promise.allSettled([
        token ? fetchWithAuth(`/api/solana/portfolio/${addr}`, token) : Promise.reject(new Error('Not authenticated')),
        token ? fetchWithAuth(`/api/solana/transactions/${addr}?limit=50`, token) : Promise.resolve({ transactions: [] }),
        token ? fetchWithAuth(`/api/solana/nfts/${addr}`, token) : Promise.resolve({ nfts: [] }),
        token ? fetchWithAuth(`/api/solana/defi/${addr}`, token) : Promise.resolve({ positions: [] }),
        token ? fetchWithAuth(`/api/solana/risk/${addr}`, token) : Promise.resolve(null),
      ]);
      
      if (portfolioData.status === 'fulfilled') setPortfolio(portfolioData.value);
      if (txsData.status === 'fulfilled') setTransactions(txsData.value.transactions || []);
      if (nftsData.status === 'fulfilled') setNfts(nftsData.value.nfts || []);
      if (defiData.status === 'fulfilled') setDefi(defiData.value.positions || []);
      if (riskData.status === 'fulfilled' && riskData.value) setRisk(riskData.value);
      
    } catch (err: any) {
      console.error('Solana analysis error:', err);
      setError(err.message || 'Failed to analyze wallet');
    } finally {
      setLoading(false);
    }
  }, [address, token, setSearchParams]);

  useEffect(() => {
    const addr = searchParams.get('address');
    if (addr && isValidSolanaAddress(addr)) {
      setAddress(addr);
      setTimeout(() => handleSearch(), 0);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.walletAddress) {
      setAddress(user.walletAddress);
      setSearchParams({ address: user.walletAddress });
    }
  }, [user]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    console.log('Address copied');
  };

  const tabs = [
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'nfts', label: 'NFTs', icon: Image },
    { id: 'defi', label: 'DeFi', icon: Layers },
    { id: 'risk', label: 'Risk', icon: Shield },
  ];

  return (
    <div className="solana-page">
      <div className="solana-header">
        <div className="header-content">
          <div className="logo-section" onClick={() => navigate('/app')}>
            <div className="logo">F</div>
            <span className="logo-text">FundTracer</span>
            <span className="chain-badge">Solana</span>
          </div>
          
          <div className="search-section">
            <div className="search-bar">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Enter Solana wallet address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              {address && (
                <button className="clear-btn" onClick={() => { setAddress(''); setPortfolio(null); }}>
                  <X size={16} />
                </button>
              )}
            </div>
            <button className="analyze-btn" onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} /> : 'Analyze'}
            </button>
          </div>
          
          <div className="user-section">
            <div className="user-avatar">{user?.walletAddress?.[0]?.toUpperCase() || 'U'}</div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            className="error-banner"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <span>{error}</span>
            <button onClick={() => setError('')}><X size={16} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <Loader2 className="spin" size={40} />
            <p>Analyzing Solana wallet...</p>
          </div>
        </div>
      )}

      {portfolio && !loading && (
        <div className="solana-content">
          <div className="wallet-header">
            <div className="wallet-info">
              <div className="wallet-address">
                <h2>{formatAddress(portfolio.address)}</h2>
                <button className="copy-btn" onClick={copyAddress}><Copy size={14} /></button>
                <a 
                  href={`${SOLANA_EXPLORER}/address/${portfolio.address}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <div className="wallet-meta">
                <span className="chain-tag">Solana</span>
                <span className="fetch-time">Updated {new Date(portfolio.fetchedAt).toLocaleTimeString()}</span>
              </div>
            </div>
            <div className="total-value">
              <span className="label">Total Value</span>
              <span className="value">{formatUsd(portfolio.totalUsd)}</span>
            </div>
          </div>

          <div className="tabs-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'portfolio' && (
              <div className="portfolio-tab">
                <div className="balance-card">
                  <div className="sol-balance">
                    <span className="token-icon">◎</span>
                    <div className="balance-info">
                      <span className="amount">{formatSol(portfolio.sol.lamports)} SOL</span>
                      <span className="usd">{formatUsd(portfolio.sol.usd)}</span>
                    </div>
                  </div>
                  {portfolio.staking && portfolio.staking.length > 0 && (
                    <div className="staking-info">
                      <span className="label">Staked</span>
                      <span className="value">{portfolio.staking.length} accounts</span>
                    </div>
                  )}
                </div>

                {portfolio.tokens && portfolio.tokens.length > 0 && (
                  <div className="tokens-section">
                    <h3>Tokens ({portfolio.tokens.length})</h3>
                    <div className="tokens-list">
                      {portfolio.tokens.map((token: SolanaToken, idx: number) => (
                        <div key={idx} className="token-row">
                          <div className="token-icon-wrap">
                            {token.logoUrl ? (
                              <img src={token.logoUrl} alt="" className="token-logo" />
                            ) : (
                              <div className="token-placeholder">{(token.symbol || '?')[0]}</div>
                            )}
                          </div>
                          <div className="token-info">
                            <span className="token-name">{token.symbol || token.mint.slice(0, 8)}</span>
                            <span className="token-amount">{token.uiAmount.toLocaleString()} {token.symbol || ''}</span>
                          </div>
                          <div className="token-value">
                            {token.value ? formatUsd(token.value) : '--'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!portfolio.tokens || portfolio.tokens.length === 0) && (
                  <div className="empty-state">
                    <Wallet size={40} />
                    <p>No token holdings found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="transactions-tab">
                {transactions.length > 0 ? (
                  <div className="txs-list">
                    {transactions.map((tx, idx) => (
                      <div key={idx} className={`tx-row ${tx.status}`}>
                        <div className="tx-icon">
                          {tx.amount ? (
                            tx.amount > 0 ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />
                          ) : <Activity size={16} />}
                        </div>
                        <div className="tx-info">
                          <span className="tx-type">{tx.type || 'Transaction'}</span>
                          <span className="tx-time">{formatTime(tx.blockTime)}</span>
                        </div>
                        <div className="tx-details">
                          {tx.amount && (
                            <span className={`tx-amount ${tx.amount > 0 ? 'received' : 'sent'}`}>
                              {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(4)} SOL
                            </span>
                          )}
                        </div>
                        <a 
                          href={`${SOLANA_EXPLORER}/tx/${tx.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tx-link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Receipt size={40} />
                    <p>No transactions found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'nfts' && (
              <div className="nfts-tab">
                {nfts.length > 0 ? (
                  <div className="nfts-grid">
                    {nfts.map((nft, idx) => (
                      <div key={idx} className="nft-card">
                        {nft.imageUrl ? (
                          <img src={nft.imageUrl} alt={nft.name} className="nft-image" />
                        ) : (
                          <div className="nft-placeholder">
                            <Image size={24} />
                          </div>
                        )}
                        <div className="nft-info">
                          <span className="nft-name">{nft.name || 'Unknown'}</span>
                          {nft.collection && <span className="nft-collection">{nft.collection}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Image size={40} />
                    <p>No NFTs found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'defi' && (
              <div className="defi-tab">
                {defi.length > 0 ? (
                  <div className="defi-list">
                    {defi.map((position, idx) => (
                      <div key={idx} className="defi-row">
                        <div className="defi-protocol">
                          <Layers size={18} />
                          <span>{position.protocol}</span>
                        </div>
                        <div className="defi-type">{position.type}</div>
                        <div className="defi-amount">
                          {position.amount.toLocaleString()} {position.token}
                        </div>
                        <div className="defi-value">{formatUsd(position.value)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <BarChart3 size={40} />
                    <p>No DeFi positions found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'risk' && risk && (
              <div className="risk-tab">
                <div className="risk-score-card">
                  <div className={`risk-score ${risk.score > 70 ? 'high' : risk.score > 40 ? 'medium' : 'low'}`}>
                    {risk.score}
                  </div>
                  <span className="risk-label">Risk Score</span>
                </div>
                
                {risk.signals.length > 0 && (
                  <div className="risk-signals">
                    <h3>Risk Signals</h3>
                    {risk.signals.map((signal, idx) => (
                      <div key={idx} className={`signal-row ${signal.severity}`}>
                        <Shield size={16} />
                        <span className="signal-name">{signal.name}</span>
                        <span className="signal-severity">{signal.severity}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {risk.factors && risk.factors.length > 0 && (
                  <div className="risk-factors">
                    <h3>Factors</h3>
                    {risk.factors.map((factor, idx) => (
                      <div key={idx} className="factor-row">
                        <span className="factor-label">{factor.label}</span>
                        <span className="factor-value">{factor.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!portfolio && !loading && (
        <div className="empty-page">
          <div className="empty-content">
            <Wallet size={64} />
            <h2>Solana Wallet Analyzer</h2>
            <p>Enter a Solana wallet address to analyze portfolio, transactions, NFTs, DeFi positions, and risk score.</p>
            <div className="sample-addresses">
              <span>Try these addresses:</span>
              <button onClick={() => setAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')}>
                7xKX...sAsU
              </button>
              <button onClick={() => setAddress('JUPyiwrYJFskUPiHa7hkeR8VUtkqjberbSOWd91pbT2')}>
                JUPy...bT2
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}