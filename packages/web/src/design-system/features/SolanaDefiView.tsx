import React, { useState, useEffect } from 'react';
import { Layers, Hexagon, Loader2 } from 'lucide-react';
import './SolanaDefiView.css';

interface DeFiPosition {
  protocol: string;
  type: string;
  amount: number;
  value: number;
  token: string;
  apy?: number;
  tvl?: number;
}

interface SolanaDefiViewProps {
  address: string;
}

function formatUsd(value: number): string {
  return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://fundtracer-by-dt-production.up.railway.app';

export function SolanaDefiView({ address }: SolanaDefiViewProps) {
  const [positions, setPositions] = useState<DeFiPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;
    fetchDefi();
  }, [address]);

  const fetchDefi = async () => {
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('fundtracer_token');
    
    try {
      const res = await fetch(`${API_BASE}/api/solana/defi/${address}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch DeFi positions');
      }
      
      const data = await res.json();
      setPositions(data.positions || []);
    } catch (err: any) {
      console.error('DeFi fetch error:', err);
      setError(err.message || 'Failed to load DeFi positions');
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="solana-view-empty">
        <Layers size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="solana-view-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading DeFi positions...</p>
      </div>
    );
  }

  if (error || positions.length === 0) {
    return (
      <div className="solana-view-empty">
        <Layers size={48} />
        <h3>No DeFi Positions</h3>
        <p>{error || 'This wallet has no DeFi positions'}</p>
      </div>
    );
  }

  return (
    <div className="solana-defi-view">
      <div className="defi-summary">
        <div className="defi-stat">
          <span className="defi-stat-label">Total DeFi Value</span>
          <span className="defi-stat-value">{formatUsd(positions.reduce((sum, p) => sum + p.value, 0))}</span>
        </div>
        <div className="defi-stat">
          <span className="defi-stat-label">Protocols</span>
          <span className="defi-stat-value">{new Set(positions.map(p => p.protocol)).size}</span>
        </div>
      </div>

      <div className="defi-positions">
        {positions.map((position, idx) => (
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
    </div>
  );
}

export default SolanaDefiView;