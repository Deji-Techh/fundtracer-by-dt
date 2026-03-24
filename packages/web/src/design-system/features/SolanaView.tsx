/**
 * SolanaView - Solana blockchain analysis using new design system
 * Redesigned to match InvestigateView layout
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from '../../providers/SolanaWalletProvider';
import { isValidSolanaAddress } from '../../utils/addressDetection';
import { analyzeSolanaWallet } from '../../api/solana';
import './SolanaView.css';

type SolanaTab = 'overview' | 'transactions' | 'tokens' | 'nfts' | 'programs';

export function SolanaView() {
  const { publicKey, connected } = useWallet();
  const [address, setAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<SolanaTab>('overview');

  useEffect(() => {
    if (connected && publicKey) {
      setAddress(publicKey.toString());
    }
  }, [connected, publicKey]);

  const handleAnalyze = async () => {
    if (!address.trim()) return;
    
    if (!isValidSolanaAddress(address.trim())) {
      setError('Please enter a valid Solana address');
      return;
    }

    setError('');
    setIsAnalyzing(true);
    setResults(null);

    try {
      const data: any = await analyzeSolanaWallet(address.trim());
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze wallet');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="investigate-view">
      {/* Page Header */}
      <div className="page-head">
        <div className="page-title">Solana</div>
        <div className="page-desc">Analyze Solana wallets, track transactions, and explore token holdings</div>
      </div>

      {/* Stats Grid */}
      <div className="stats">
        <div className="stat">
          <div className="stat-label">Solana Mainnet</div>
          <div className="stat-val">Active</div>
          <div className="stat-note">Network status</div>
        </div>
        <div className="stat">
          <div className="stat-label">Transactions</div>
          <div className="stat-val">{results?.transactions?.length || 0}</div>
          <div className="stat-note">In result</div>
        </div>
        <div className="stat">
          <div className="stat-label">Tokens</div>
          <div className="stat-val">{results?.tokens?.length || 0}</div>
          <div className="stat-note">Held</div>
        </div>
        <div className="stat">
          <div className="stat-label">NFTs</div>
          <div className="stat-val">{results?.nfts?.length || 0}</div>
          <div className="stat-note">Owned</div>
        </div>
      </div>

      {/* Search */}
      <div className="panel">
        <div className="panel-content">
          <div className="search-section">
            <div className="search-row">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter Solana address..."
                className="search-input"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <button 
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze'}
              </button>
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      {results && (
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button 
            className={`tab ${activeTab === 'tokens' ? 'active' : ''}`}
            onClick={() => setActiveTab('tokens')}
          >
            Tokens
          </button>
          <button 
            className={`tab ${activeTab === 'nfts' ? 'active' : ''}`}
            onClick={() => setActiveTab('nfts')}
          >
            NFTs
          </button>
          <button 
            className={`tab ${activeTab === 'programs' ? 'active' : ''}`}
            onClick={() => setActiveTab('programs')}
          >
            Programs
          </button>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="panel">
          <div className="panel-content">
            {activeTab === 'overview' && (
              <div className="overview-section">
                <div className="info-grid">
                  <div className="info-card">
                    <div className="info-label">Wallet Address</div>
                    <div className="info-value mono">{results.walletAddress || 'N/A'}</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">SOL Balance</div>
                    <div className="info-value">{results.balance?.toFixed(4) || '0'} SOL</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">Total Transactions</div>
                    <div className="info-value">{results.transactions?.length || 0}</div>
                  </div>
                  <div className="info-card">
                    <div className="info-label">First Activity</div>
                    <div className="info-value">{results.firstActivity ? new Date(results.firstActivity * 1000).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transactions' && (
              <div className="transactions-section">
                <div className="tx-list">
                  {results.transactions?.slice(0, 20).map((tx: any, i: number) => (
                    <div key={i} className="tx-item">
                      <div className="tx-hash mono">{tx.signature?.slice(0, 8)}...{tx.signature?.slice(-4)}</div>
                      <div className="tx-time">{tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleDateString() : 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tokens' && (
              <div className="tokens-section">
                <div className="token-list">
                  {results.tokens?.map((token: any, i: number) => (
                    <div key={i} className="token-item">
                      <div className="token-name">{token.mint}</div>
                      <div className="token-amount">{token.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'nfts' && (
              <div className="nfts-section">
                <p className="empty-text">{results.nfts?.length || 0} NFTs found</p>
              </div>
            )}

            {activeTab === 'programs' && (
              <div className="programs-section">
                <p className="empty-text">Program interactions coming soon</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!results && !isAnalyzing && (
        <div className="panel">
          <div className="panel-content">
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
              </div>
              <h3>Enter a Solana Address</h3>
              <p>Enter a Solana wallet address to analyze its transactions, tokens, and NFTs</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SolanaView;
