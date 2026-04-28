import React, { useState, useCallback } from 'react';
import { GitCompare, Loader2 } from 'lucide-react';

interface SolanaCompareViewProps {
  address: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://fundtracer-by-dt-production.up.railway.app';

export function SolanaCompareView({ address }: SolanaCompareViewProps) {
  const [compareAddress, setCompareAddress] = useState('');
  const [compareData, setCompareData] = useState<{ sharedTxs?: number; commonTokens?: number; firstCommon?: string } | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');

  const handleCompare = useCallback(async () => {
    if (!compareAddress.trim() || !address) return;
    
    setComparing(true);
    setError('');
    setCompareData(null);
    
    const token = localStorage.getItem('fundtracer_token');
    
    try {
      const res = await fetch(`${API_BASE}/api/solana/compare/${address}/${compareAddress.trim()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to compare wallets');
      }
      
      const data = await res.json();
      setCompareData(data);
    } catch (err: any) {
      console.error('Compare error:', err);
      setError(err.message || 'Failed to compare');
    } finally {
      setComparing(false);
    }
  }, [compareAddress, address]);

  if (!address) {
    return (
      <div className="solana-view-empty">
        <GitCompare size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar first</p>
      </div>
    );
  }

  return (
    <div className="solana-compare-view">
      <div className="compare-header">
        <GitCompare size={24} />
        <span>Wallet Comparison</span>
      </div>
      
      <div className="compare-input-section">
        <input
          type="text"
          placeholder="Enter second wallet address to compare..."
          value={compareAddress}
          onChange={(e) => setCompareAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
        />
        <button className="compare-btn" onClick={handleCompare} disabled={!compareAddress.trim() || comparing}>
          {comparing ? <Loader2 size={16} className="spin" /> : <GitCompare size={16} />}
          Compare
        </button>
      </div>
      
      {compareData && (
        <div className="compare-results">
          <div className="comparison-summary">
            <h3>Comparison Summary</h3>
            <div className="comparison-stats">
              <div className="comp-stat">
                <span className="comp-label">Shared Transactions</span>
                <span className="comp-value">{compareData.sharedTxs || 0}</span>
              </div>
              <div className="comp-stat">
                <span className="comp-label">Common Tokens</span>
                <span className="comp-value">{compareData.commonTokens || 0}</span>
              </div>
              <div className="comp-stat">
                <span className="comp-label">First Common Interaction</span>
                <span className="comp-value">{compareData.firstCommon || 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!compareData && !comparing && (
        <div className="compare-empty">
          <GitCompare size={48} />
          <p>Enter another wallet address to compare holdings, transactions, and interactions.</p>
        </div>
      )}
    </div>
  );
}

export default SolanaCompareView;