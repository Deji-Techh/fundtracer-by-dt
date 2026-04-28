import React, { useState, useEffect } from 'react';
import { Receipt, ExternalLink, ArrowUpRight, Activity, Filter, Loader2 } from 'lucide-react';
import './SolanaTransactionsView.css';

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

interface SolanaTransactionsViewProps {
  address: string;
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

function formatSol(lamports: number): string {
  return (lamports / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatAddress(addr: string): string {
  if (!addr) return '';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://fundtracer-by-dt-production.up.railway.app';

export function SolanaTransactionsView({ address }: SolanaTransactionsViewProps) {
  const [transactions, setTransactions] = useState<SolanaTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txFilter, setTxFilter] = useState('all');

  useEffect(() => {
    if (!address) return;
    fetchTransactions();
  }, [address]);

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('fundtracer_token');
    
    try {
      const res = await fetch(`${API_BASE}/api/solana/transactions/${address}?limit=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err: any) {
      console.error('Transactions fetch error:', err);
      setError(err.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (txFilter === 'all') return true;
    if (txFilter === 'transfers') return tx.type?.includes('transfer');
    if (txFilter === 'swaps') return tx.type?.includes('swap') || tx.type === 'unknown';
    if (txFilter === 'nfts') return tx.token || tx.tokenAmount;
    if (txFilter === 'staking') return tx.type === 'staking';
    return true;
  });

  if (!address) {
    return (
      <div className="solana-view-empty">
        <Receipt size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="solana-view-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading transactions...</p>
      </div>
    );
  }

  if (error || transactions.length === 0) {
    return (
      <div className="solana-view-empty">
        <Receipt size={48} />
        <h3>No Transactions</h3>
        <p>{error || 'This wallet has no transactions'}</p>
      </div>
    );
  }

  return (
    <div className="solana-transactions-view">
      {/* Filters */}
      <div className="tx-filters">
        <button 
          className={`filter-btn ${txFilter === 'all' ? 'active' : ''}`} 
          onClick={() => setTxFilter('all')}
        >
          All
        </button>
        <button 
          className={`filter-btn ${txFilter === 'transfers' ? 'active' : ''}`} 
          onClick={() => setTxFilter('transfers')}
        >
          Transfers
        </button>
        <button 
          className={`filter-btn ${txFilter === 'swaps' ? 'active' : ''}`} 
          onClick={() => setTxFilter('swaps')}
        >
          Swaps
        </button>
        <button 
          className={`filter-btn ${txFilter === 'nfts' ? 'active' : ''}`} 
          onClick={() => setTxFilter('nfts')}
        >
          NFTs
        </button>
        <button 
          className={`filter-btn ${txFilter === 'staking' ? 'active' : ''}`} 
          onClick={() => setTxFilter('staking')}
        >
          Staking
        </button>
      </div>

      {/* Transaction List */}
      <div className="tx-list">
        {filteredTransactions.map((tx, idx) => (
          <div key={idx} className={`tx-row ${tx.status}`}>
            <div className="tx-icon-wrap">
              {tx.amount && tx.amount > 0 ? <ArrowUpRight size={16} /> : <Activity size={16} />}
            </div>
            <div className="tx-main">
              <span className="tx-type">{tx.type === 'unknown' ? 'Transfer' : tx.type || 'Transaction'}</span>
              <span className="tx-time">{formatTime(tx.blockTime)}</span>
            </div>
            <div className="tx-meta">
              {tx.amount && (
                <span className={tx.amount > 0 ? 'positive' : 'negative'}>
                  {tx.amount > 0 ? '+' : ''}{formatSol(tx.amount * 1e9)} SOL
                </span>
              )}
              {tx.fee && <span className="tx-fee">Fee: {formatSol(tx.fee)} SOL</span>}
            </div>
            <a 
              href={`https://solscan.io/tx/${tx.signature}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="tx-link"
            >
              <ExternalLink size={14} />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SolanaTransactionsView;