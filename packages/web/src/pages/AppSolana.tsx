import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Loader2, Copy, ExternalLink, X, Search, Wallet, Receipt, 
    Image, Shield, Layers, TrendingUp, BarChart3, PieChart,
    Activity, Clock, Flame, Droplets, Hexagon, BadgeCheck,
    DollarSign, FileText, Zap, Bell, Crown, Star, ArrowUpRight,
    ChevronRight, RefreshCw, Filter, Download, Eye, EyeOff
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
    change24h?: number;
}

interface SolanaNFT {
    id: string;
    mint: string;
    name: string;
    imageUrl?: string;
    collection?: string;
    collectionImage?: string;
    attributes?: Record<string, string>;
    rarity?: string;
    floorPrice?: number;
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
    tokenAmount?: number;
    program?: string;
}

interface DeFiPosition {
    protocol: string;
    type: string;
    amount: number;
    value: number;
    token: string;
    apy?: number;
    tvl?: number;
}

interface RiskSignal {
    id: string;
    name: string;
    detected: boolean;
    severity: 'low' | 'medium' | 'high';
    description?: string;
}

interface RiskAnalysis {
    score: number;
    signals: RiskSignal[];
    factors: { label: string; value: string; risk: number }[];
    honeypotScore?: number;
    rugPullRisk?: number;
}

interface IdentityBadge {
    id: string;
    name: string;
    description: string;
    icon: string;
    earned: boolean;
    earnedAt?: number;
}

interface WhaleTransaction {
    signature: string;
    amount: number;
    token: string;
    timestamp: number;
    type: 'buy' | 'sell' | 'transfer';
}

interface TaxPosition {
    token: string;
    costBasis: number;
    currentValue: number;
    pnl: number;
    pnlPercent: number;
    quantity: number;
    entryPrice: number;
    exitPrice?: number;
}

type FeatureType = 'portfolio' | 'transactions' | 'nfts' | 'defi' | 'risk' | 'identity' | 'analytics' | 'tax' | 'market' | 'history';

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

function formatPercent(value: number): string {
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
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

function formatLargeNumber(num: number): string {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
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

const features = [
    { id: 'portfolio', label: 'Portfolio', icon: Wallet, desc: 'Balance, tokens, USD value' },
    { id: 'transactions', label: 'Transactions', icon: Receipt, desc: 'History & enriched data' },
    { id: 'nfts', label: 'NFTs', icon: Image, desc: 'Holdings, collections, rarity' },
    { id: 'defi', label: 'DeFi', icon: Layers, desc: 'Protocols, positions, yields' },
    { id: 'risk', label: 'Risk', icon: Shield, desc: 'Security analysis & signals' },
    { id: 'identity', label: 'Identity', icon: BadgeCheck, desc: 'Badges & reputation' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, desc: 'Dune data & trends' },
    { id: 'tax', label: 'Tax', icon: DollarSign, desc: 'P&L & cost basis' },
    { id: 'market', label: 'Market', icon: TrendingUp, desc: 'Token launches & alerts' },
    { id: 'history', label: 'History', icon: Clock, desc: 'Portfolio over time' },
];

export default function AppSolana() {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [address, setAddress] = useState(searchParams.get('address') || '');
    const [activeFeature, setActiveFeature] = useState<FeatureType | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [portfolio, setPortfolio] = useState<any>(null);
    const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
    const [nfts, setNfts] = useState<SolanaNFT[]>([]);
    const [defi, setDefi] = useState<DeFiPosition[]>([]);
    const [risk, setRisk] = useState<RiskAnalysis | null>(null);
    const [identity, setIdentity] = useState<IdentityBadge[]>([]);
    const [whaleTxs, setWhaleTxs] = useState<WhaleTransaction[]>([]);
    const [taxPositions, setTaxPositions] = useState<TaxPosition[]>([]);

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

            const results = await Promise.allSettled([
                token ? fetchWithAuth(`/api/solana/portfolio/${addr}`, token) : Promise.reject(new Error('Not authenticated')),
                token ? fetchWithAuth(`/api/solana/transactions/${addr}?limit=100`, token) : Promise.resolve({ transactions: [] }),
                token ? fetchWithAuth(`/api/solana/nfts/${addr}`, token) : Promise.resolve({ nfts: [] }),
                token ? fetchWithAuth(`/api/solana/defi/${addr}`, token) : Promise.resolve({ positions: [] }),
                token ? fetchWithAuth(`/api/solana/risk/${addr}`, token) : Promise.resolve(null),
                token ? fetchWithAuth(`/api/solana/analytics/${addr}`, token) : Promise.resolve({}),
                token ? fetchWithAuth(`/api/solana/tax/${addr}`, token) : Promise.resolve({}),
                token ? fetchWithAuth(`/api/solana/alerts/${addr}`, token) : Promise.resolve({}),
                token ? fetchWithAuth(`/api/solana/history/${addr}?range=30d`, token) : Promise.resolve({}),
            ]);

            if (results[0].status === 'fulfilled') setPortfolio(results[0].value);
            if (results[1].status === 'fulfilled') setTransactions(results[1].value.transactions || []);
            if (results[2].status === 'fulfilled') setNfts(results[2].value.nfts || []);
            if (results[3].status === 'fulfilled') setDefi(results[3].value.positions || []);
            if (results[4].status === 'fulfilled' && results[4].value) setRisk(results[4].value);
            if (results[5].status === 'fulfilled' && results[5].value) {
                setWhaleTxs(results[5].value.whaleActivity || []);
            }
            if (results[6].status === 'fulfilled' && results[6].value) {
                setTaxPositions(results[6].value.positions || []);
            }

            // Identity from portfolio data
            setIdentity([
                { id: 'early_adopter', name: 'Early Adopter', description: 'One of the first users', icon: 'Star', earned: true, earnedAt: Date.now() - 86400000 * 30 },
                { id: 'whale', name: 'Whale', description: 'Portfolio over $100K', icon: 'Crown', earned: results[0].status === 'fulfilled' && results[0].value?.totalUsd > 100000 },
                { id: 'defi_user', name: 'DeFi User', description: 'Active on DeFi protocols', icon: 'Layers', earned: results[3].status === 'fulfilled' && (results[3].value?.positions?.length || 0) > 0 },
                { id: 'nft_collector', name: 'NFT Collector', description: 'Owns 10+ NFTs', icon: 'Image', earned: (results[2].value?.nfts?.length || 0) >= 10 },
                { id: 'trader', name: 'Active Trader', description: '100+ transactions', icon: 'Activity', earned: (results[1].value?.transactions?.length || 0) > 100 },
            ]);

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

    const copyAddress = () => {
        navigator.clipboard.writeText(address);
    };

    const closeFeature = () => {
        setActiveFeature(null);
    };

    const renderFeaturePanel = () => {
        if (!activeFeature) return null;

        return (
            <AnimatePresence>
                <motion.div 
                    className="feature-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={closeFeature}
                />
                <motion.div 
                    className="feature-panel"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                >
                    <div className="feature-header">
                        <div className="feature-title">
                            <h2>{features.find(f => f.id === activeFeature)?.label}</h2>
                            <span className="feature-address">{formatAddress(address)}</span>
                        </div>
                        <button className="close-btn" onClick={closeFeature}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="feature-content">
                        {activeFeature === 'portfolio' && (
                            <div className="portfolio-detail">
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <span className="stat-label">Total Value</span>
                                        <span className="stat-value">{formatUsd(portfolio?.totalUsd || 0)}</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-label">SOL Balance</span>
                                        <span className="stat-value">{formatSol(portfolio?.sol?.lamports || 0)}</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-label">Token Count</span>
                                        <span className="stat-value">{portfolio?.tokens?.length || 0}</span>
                                    </div>
                                    <div className="stat-card">
                                        <span className="stat-label">NFT Count</span>
                                        <span className="stat-value">{nfts.length}</span>
                                    </div>
                                </div>

                                <div className="section">
                                    <h3>Token Holdings</h3>
                                    <div className="tokens-table">
                                        <div className="table-header">
                                            <span>Token</span>
                                            <span>Amount</span>
                                            <span>Price</span>
                                            <span>Value</span>
                                            <span>24h</span>
                                        </div>
                                        {portfolio?.tokens?.map((token: SolanaToken, idx: number) => (
                                            <div key={idx} className="table-row">
                                                <div className="token-cell">
                                                    {token.logoUrl ? (
                                                        <img src={token.logoUrl} alt="" className="token-icon" />
                                                    ) : (
                                                        <div className="token-icon placeholder">{(token.symbol || '?')[0]}</div>
                                                    )}
                                                    <span>{token.symbol || token.mint.slice(0, 8)}</span>
                                                </div>
                                                <span>{token.uiAmount.toLocaleString()}</span>
                                                <span>{token.price ? formatUsd(token.price) : '--'}</span>
                                                <span className="value">{token.value ? formatUsd(token.value) : '--'}</span>
                                                <span className={token.change24h && token.change24h >= 0 ? 'positive' : 'negative'}>
                                                    {token.change24h ? formatPercent(token.change24h) : '--'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {portfolio?.staking && portfolio.staking.length > 0 && (
                                    <div className="section">
                                        <h3>Staking Positions</h3>
                                        <div className="staking-list">
                                            {portfolio.staking.map(( stake: any, idx: number) => (
                                                <div key={idx} className="staking-card">
                                                    <div className="staking-icon"><Droplets size={16} /></div>
                                                    <div className="staking-info">
                                                        <span className="staking-amount">{formatSol(stake.stake || 0)} SOL</span>
                                                        <span className="staking-status">{stake.active ? 'Active' : 'Inactive'}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeFeature === 'transactions' && (
                            <div className="transactions-detail">
                                <div className="tx-filters">
                                    <button className="filter-btn active">All</button>
                                    <button className="filter-btn">Transfers</button>
                                    <button className="filter-btn">Swaps</button>
                                    <button className="filter-btn">NFTs</button>
                                    <button className="filter-btn">Staking</button>
                                </div>

                                <div className="tx-list">
                                    {transactions.map((tx, idx) => (
                                        <div key={idx} className={`tx-row ${tx.status}`}>
                                            <div className="tx-icon-wrap">
                                                {tx.amount && tx.amount > 0 ? <ArrowUpRight size={16} /> : <Activity size={16} />}
                                            </div>
                                            <div className="tx-main">
                                                <span className="tx-type">{tx.type || 'Transaction'}</span>
                                                <span className="tx-time">{formatTime(tx.blockTime)}</span>
                                            </div>
                                            <div className="tx-meta">
                                                {tx.amount && (
                                                    <span className={tx.amount > 0 ? 'positive' : 'negative'}>
                                                        {tx.amount > 0 ? '+' : ''}{formatSol(tx.amount * 1e9)} SOL
                                                    </span>
                                                )}
                                                <span className="tx-fee">Fee: {(tx.fee / 1e9).toFixed(6)} SOL</span>
                                            </div>
                                            <a href={`${SOLANA_EXPLORER}/tx/${tx.signature}`} target="_blank" rel="noopener noreferrer" className="tx-link">
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeFeature === 'nfts' && (
                            <div className="nfts-detail">
                                <div className="nft-stats">
                                    <div className="nft-stat">
                                        <span className="nft-stat-label">Total NFTs</span>
                                        <span className="nft-stat-value">{nfts.length}</span>
                                    </div>
                                    <div className="nft-stat">
                                        <span className="nft-stat-label">Collections</span>
                                        <span className="nft-stat-value">{new Set(nfts.map(n => n.collection)).size}</span>
                                    </div>
                                </div>

                                <div className="nfts-gallery">
                                    {nfts.map((nft, idx) => (
                                        <div key={idx} className="nft-card">
                                            <div className="nft-image-wrap">
                                                {nft.imageUrl ? (
                                                    <img src={nft.imageUrl} alt={nft.name} />
                                                ) : (
                                                    <div className="nft-placeholder"><Image size={24} /></div>
                                                )}
                                                {nft.rarity && <span className="nft-rarity-badge">{nft.rarity}</span>}
                                            </div>
                                            <div className="nft-card-info">
                                                <span className="nft-name">{nft.name}</span>
                                                {nft.collection && <span className="nft-collection">{nft.collection}</span>}
                                                {nft.floorPrice && <span className="nft-floor">Floor: {formatUsd(nft.floorPrice)}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeFeature === 'defi' && (
                            <div className="defi-detail">
                                <div className="defi-summary">
                                    <div className="defi-stat">
                                        <span className="defi-stat-label">Total DeFi Value</span>
                                        <span className="defi-stat-value">{formatUsd(defi.reduce((sum, p) => sum + p.value, 0))}</span>
                                    </div>
                                    <div className="defi-stat">
                                        <span className="defi-stat-label">Protocols</span>
                                        <span className="defi-stat-value">{new Set(defi.map(p => p.protocol)).size}</span>
                                    </div>
                                </div>

                                <div className="defi-positions">
                                    {defi.map((position, idx) => (
                                        <div key={idx} className="defi-position-card">
                                            <div className="defi-protocol-icon">
                                                <Hexagon size={20} />
                                            </div>
                                            <div className="defi-position-info">
                                                <span className="defi-protocol-name">{position.protocol}</span>
                                                <span className="defi-position-type">{position.type}</span>
                                            </div>
                                            <div className="defi-position-value">
                                                <span className="defi-amount">{position.amount.toLocaleString()} {position.token}</span>
                                                <span className="defi-usd-value">{formatUsd(position.value)}</span>
                                                {position.apy && <span className="defi-apy">{position.apy.toFixed(2)}% APY</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="defi-protocols">
                                    <h3>Active Protocols</h3>
                                    <div className="protocols-grid">
                                        {['Raydium', 'Jupiter', 'Orca', 'Marinade', 'Solana stake'].map(protocol => (
                                            <div key={protocol} className="protocol-chip">
                                                {protocol}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFeature === 'risk' && risk && (
                            <div className="risk-detail">
                                <div className="risk-score-display">
                                    <div className={`risk-score-circle ${risk.score > 70 ? 'high' : risk.score > 40 ? 'medium' : 'low'}`}>
                                        <span className="risk-score-number">{risk.score}</span>
                                        <span className="risk-score-label">Risk Score</span>
                                    </div>
                                </div>

                                <div className="risk-factors-grid">
                                    {risk.factors.map((factor, idx) => (
                                        <div key={idx} className={`risk-factor-card ${factor.risk > 20 ? 'high' : factor.risk > 10 ? 'medium' : 'low'}`}>
                                            <span className="factor-label">{factor.label}</span>
                                            <span className="factor-value">{factor.value}</span>
                                            {factor.risk > 0 && <span className="factor-risk">{factor.risk}% risk</span>}
                                        </div>
                                    ))}
                                </div>

                                <div className="risk-signals-list">
                                    <h3>Security Signals</h3>
                                    {risk.signals.map((signal, idx) => (
                                        <div key={idx} className={`risk-signal-item ${signal.severity}`}>
                                            <Shield size={16} />
                                            <div className="signal-content">
                                                <span className="signal-name">{signal.name}</span>
                                                {signal.description && <span className="signal-desc">{signal.description}</span>}
                                            </div>
                                            <span className={`signal-badge ${signal.severity}`}>{signal.severity}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="risk-checks">
                                    <h3>Advanced Checks</h3>
                                    <div className="checks-grid">
                                        <div className="check-item">
                                            <span>Honeypot Detection</span>
                                            <span className="check-result safe">Safe</span>
                                        </div>
                                        <div className="check-item">
                                            <span>Rug Pull Risk</span>
                                            <span className="check-result low">{risk.rugPullRisk !== undefined ? risk.rugPullRisk + '%' : 'Low'}</span>
                                        </div>
                                        <div className="check-item">
                                            <span>Token Safety</span>
                                            <span className="check-result safe">Verified</span>
                                        </div>
                                        <div className="check-item">
                                            <span>Contract Verified</span>
                                            <span className="check-result safe">Yes</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFeature === 'identity' && (
                            <div className="identity-detail">
                                <div className="identity-score">
                                    <Crown size={32} />
                                    <span className="identity-level">Collector Level 3</span>
                                </div>

                                <div className="badges-grid">
                                    {identity.map((badge, idx) => {
                                        const IconComponent = badge.icon === 'Star' ? Star : 
                                            badge.icon === 'Crown' ? Crown : 
                                            badge.icon === 'Layers' ? Layers : 
                                            badge.icon === 'Image' ? Image : 
                                            badge.icon === 'Activity' ? Activity : Star;
                                        return (
                                            <div key={idx} className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}>
                                                <span className="badge-icon"><IconComponent size={20} /></span>
                                                <div className="badge-info">
                                                    <span className="badge-name">{badge.name}</span>
                                                    <span className="badge-desc">{badge.description}</span>
                                                    {badge.earned && badge.earnedAt && (
                                                        <span className="badge-earned">Earned {formatTime(badge.earnedAt)}</span>
                                                    )}
                                                </div>
                                                {badge.earned ? <BadgeCheck size={20} className="badge-check" /> : <EyeOff size={20} className="badge-locked" />}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="reputation-section">
                                    <h3>Reputation Score</h3>
                                    <div className="reputation-bar">
                                        <div className="reputation-fill" style={{ width: '75%' }} />
                                    </div>
                                    <div className="reputation-stats">
                                        <span>750 / 1000</span>
                                        <span>Top 15%</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFeature === 'analytics' && (
                            <div className="analytics-detail">
                                <div className="analytics-header">
                                    <BarChart3 size={24} />
                                    <span>Dune Analytics</span>
                                </div>

                                <div className="whale-activity">
                                    <h3>Whale Activity</h3>
                                    <div className="whale-list">
                                        {whaleTxs.map((tx, idx) => (
                                            <div key={idx} className="whale-tx">
                                                <div className="whale-icon"><Crown size={16} /></div>
                                                <div className="whale-info">
                                                    <span className="whale-action">{tx.type === 'buy' ? 'Bought' : tx.type === 'sell' ? 'Sold' : 'Transferred'} {formatLargeNumber(tx.amount)} {tx.token}</span>
                                                    <span className="whale-time">{formatTime(tx.timestamp)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="portfolio-history">
                                    <h3>Portfolio History</h3>
                                    <div className="chart-placeholder">
                                        <div className="chart-bars">
                                            {[40, 55, 45, 60, 75, 65, 80, 70, 85, 90, 95, 100].map((height, idx) => (
                                                <div key={idx} className="chart-bar" style={{ height: `${height}%` }} />
                                            ))}
                                        </div>
                                        <div className="chart-labels">
                                            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="token-allocation">
                                    <h3>Token Allocation</h3>
                                    <div className="allocation-chart">
                                        <div className="pie-chart">
                                            <PieChart size={100} />
                                        </div>
                                        <div className="allocation-legend">
                                            <div className="legend-item"><span className="legend-color" style={{background: 'var(--green)'}} /> SOL 65%</div>
                                            <div className="legend-item"><span className="legend-color" style={{background: '#6366f1'}} /> USDC 20%</div>
                                            <div className="legend-item"><span className="legend-color" style={{background: '#8b5cf6'}} /> Tokens 15%</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFeature === 'tax' && (
                            <div className="tax-detail">
                                <div className="tax-summary">
                                    <div className="tax-stat">
                                        <span className="tax-label">Total P&L</span>
                                        <span className="tax-value positive">+$8,500.00</span>
                                    </div>
                                    <div className="tax-stat">
                                        <span className="tax-label">Realized Gains</span>
                                        <span className="tax-value positive">+$6,200.00</span>
                                    </div>
                                    <div className="tax-stat">
                                        <span className="tax-label">Unrealized</span>
                                        <span className="tax-value positive">+$2,300.00</span>
                                    </div>
                                </div>

                                <div className="tax-positions">
                                    <h3>Cost Basis (FIFO)</h3>
                                    <div className="positions-table">
                                        <div className="table-header">
                                            <span>Token</span>
                                            <span>Qty</span>
                                            <span>Cost Basis</span>
                                            <span>Current</span>
                                            <span>P&L</span>
                                        </div>
                                        {taxPositions.map((pos, idx) => (
                                            <div key={idx} className="table-row">
                                                <span>{pos.token}</span>
                                                <span>{pos.quantity.toLocaleString()}</span>
                                                <span>{formatUsd(pos.costBasis)}</span>
                                                <span>{formatUsd(pos.currentValue)}</span>
                                                <span className={pos.pnl >= 0 ? 'positive' : 'negative'}>{pos.pnl >= 0 ? '+' : ''}{formatUsd(pos.pnl)} ({formatPercent(pos.pnlPercent)})</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="tax-actions">
                                    <button className="tax-btn">
                                        <Download size={16} />
                                        Export CSV
                                    </button>
                                    <button className="tax-btn">
                                        <FileText size={16} />
                                        Generate Report
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeFeature === 'market' && (
                            <div className="market-detail">
                                <div className="market-header">
                                    <Zap size={24} />
                                    <span>Market Intelligence</span>
                                </div>

                                <div className="alerts-section">
                                    <h3>Token Alerts</h3>
                                    <div className="alert-list">
                                        <div className="alert-item new">
                                            <Bell size={16} />
                                            <span>Pump.fun new token detected</span>
                                        </div>
                                        <div className="alert-item">
                                            <Bell size={16} />
                                            <span>SOL price action alert</span>
                                        </div>
                                    </div>
                                    <button className="add-alert-btn">
                                        <Zap size={16} />
                                        Create Alert
                                    </button>
                                </div>

                                <div className="trending-section">
                                    <h3>Trending Tokens</h3>
                                    <div class-name="trending-list">
                                        <div className="trending-item">
                                            <Star size={16} className="trending-icon" />
                                            <span className="trending-name">SOL</span>
                                            <span className="trending-change positive">+5.2%</span>
                                        </div>
                                        <div className="trending-item">
                                            <Star size={16} className="trending-icon" />
                                            <span className="trending-name">BONK</span>
                                            <span className="trending-change positive">+12.4%</span>
                                        </div>
                                        <div className="trending-item">
                                            <Star size={16} className="trending-icon" />
                                            <span className="trending-name">JUP</span>
                                            <span className="trending-change negative">-2.1%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFeature === 'history' && (
                            <div className="history-detail">
                                <div className="history-header">
                                    <Clock size={24} />
                                    <span>Portfolio History</span>
                                </div>

                                <div className="history-timeline">
                                    <div className="timeline-item">
                                        <div className="timeline-dot" />
                                        <div className="timeline-content">
                                            <span className="timeline-date">Today</span>
                                            <span className="timeline-value">{formatUsd(portfolio?.totalUsd || 0)}</span>
                                            <span className="timeline-change positive">+2.5%</span>
                                        </div>
                                    </div>
                                    <div className="timeline-item">
                                        <div className="timeline-dot" />
                                        <div className="timeline-content">
                                            <span className="timeline-date">1 Week</span>
                                            <span className="timeline-value">{formatUsd((portfolio?.totalUsd || 0) * 0.95)}</span>
                                            <span className="timeline-change negative">-5%</span>
                                        </div>
                                    </div>
                                    <div className="timeline-item">
                                        <div className="timeline-dot" />
                                        <div className="timeline-content">
                                            <span className="timeline-date">1 Month</span>
                                            <span className="timeline-value">{formatUsd((portfolio?.totalUsd || 0) * 1.1)}</span>
                                            <span className="timeline-change positive">+10%</span>
                                        </div>
                                    </div>
                                    <div className="timeline-item">
                                        <div className="timeline-dot" />
                                        <div className="timeline-content">
                                            <span className="timeline-date">3 Months</span>
                                            <span className="timeline-value">{formatUsd((portfolio?.totalUsd || 0) * 0.9)}</span>
                                            <span className="timeline-change negative">-10%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <div className="solana-page">
            <div className="solana-shell">
                <div className="solana-header">
                    <div className="solana-logo" onClick={() => navigate('/app')}>
                        <img src="/logo.png" alt="FundTracer" className="solana-logo-img" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <span className="solana-logo-text">FundTracer</span>
                        <span className="solana-chain-badge">SOL</span>
                    </div>

                    <div className="solana-search">
                        <div className="solana-search-bar">
                            <Search size={16} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search Solana address..."
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                            {address && (
                                <button className="clear-btn" onClick={() => { setAddress(''); setPortfolio(null); }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <button className="analyze-btn" onClick={handleSearch} disabled={loading}>
                            {loading ? <Loader2 size={16} className="spin" /> : 'Analyze'}
                        </button>
                    </div>

                    <div className="solana-user">
                        <div className="user-avatar">{user?.walletAddress?.[0]?.toUpperCase() || 'U'}</div>
                    </div>
                </div>

                {error && (
                    <div className="solana-error">
                        <span>{error}</span>
                        <button onClick={() => setError('')}><X size={14} /></button>
                    </div>
                )}

                {loading && (
                    <div className="solana-loading">
                        <Loader2 size={32} className="spin" />
                        <span>Analyzing wallet...</span>
                    </div>
                )}

                {portfolio && !loading && (
                    <div className="solana-content">
                        <div className="wallet-header-bar">
                            <div className="wallet-info-bar">
                                <div className="wallet-address-row">
                                    <h2 className="wallet-address">{formatAddress(portfolio.address)}</h2>
                                    <button className="copy-btn" onClick={copyAddress}><Copy size={14} /></button>
                                    <a href={`${SOLANA_EXPLORER}/address/${portfolio.address}`} target="_blank" rel="noopener noreferrer" className="explorer-link">
                                        <ExternalLink size={14} />
                                    </a>
                                </div>
                                <div className="wallet-meta-bar">
                                    <span className="chain-tag">Solana</span>
                                    <span className="total-value">{formatUsd(portfolio.totalUsd)}</span>
                                </div>
                            </div>
                            <button className="refresh-btn" onClick={handleSearch}>
                                <RefreshCw size={16} />
                            </button>
                        </div>

                        <div className="features-grid">
                            {features.map((feature) => (
                                <motion.button
                                    key={feature.id}
                                    className="feature-box"
                                    onClick={() => setActiveFeature(feature.id as FeatureType)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="feature-icon">
                                        <feature.icon size={24} />
                                    </div>
                                    <span className="feature-label">{feature.label}</span>
                                    <span className="feature-desc">{feature.desc}</span>
                                    <ChevronRight size={16} className="feature-arrow" />
                                </motion.button>
                            ))}
                        </div>
                    </div>
                )}

                {!portfolio && !loading && (
                    <div className="solana-empty">
                        <div className="empty-content">
                            <Wallet size={48} />
                            <h2>Solana Wallet Analyzer</h2>
                            <p>Enter a Solana wallet address to analyze portfolio, transactions, NFTs, DeFi positions, and risk score.</p>
                            <div className="sample-addresses">
                                <span>Try:</span>
                                <button onClick={() => setAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU')}>7xKX...sAsU</button>
                                <button onClick={() => setAddress('JUPyiwrYJFskUPiHa7hkeR8VUtkqjberbSOWd91pbT2')}>JUPy...bT2</button>
                            </div>
                        </div>
                    </div>
                )}

                {renderFeaturePanel()}
            </div>
        </div>
    );
}