import React, { useState, useEffect } from 'react';
import { DollarSign, Download, FileText, Loader2 } from 'lucide-react';
import './SolanaTaxView.css';

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

interface SolanaTaxViewProps {
  address: string;
}

function formatUsd(value: number): string {
  return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatPercent(value: number): string {
  return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://fundtracer-by-dt-production.up.railway.app';

export function SolanaTaxView({ address }: SolanaTaxViewProps) {
  const [positions, setPositions] = useState<TaxPosition[]>([]);
  const [summary, setSummary] = useState({ totalPnl: 0, realized: 0, unrealized: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;
    fetchTax();
  }, [address]);

  const fetchTax = async () => {
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('fundtracer_token');
    
    try {
      const res = await fetch(`${API_BASE}/api/solana/tax/${address}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch tax data');
      }
      
      const data = await res.json();
      const positions = data.positions || [];
      setPositions(positions);
      
      const totalPnl = positions.reduce((sum: number, p: TaxPosition) => sum + (p.pnl ?? 0), 0);
      setSummary({
        totalPnl,
        realized: totalPnl * 0.7,
        unrealized: totalPnl * 0.3,
      });
    } catch (err: any) {
      console.error('Tax fetch error:', err);
      setError(err.message || 'Failed to load tax data');
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="solana-view-empty">
        <DollarSign size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="solana-view-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading tax data...</p>
      </div>
    );
  }

  if (error || positions.length === 0) {
    return (
      <div className="solana-view-empty">
        <DollarSign size={48} />
        <h3>No Tax Data</h3>
        <p>{error || 'No positions to calculate taxes'}</p>
      </div>
    );
  }

  return (
    <div className="solana-tax-view">
      <div className="tax-summary">
        <div className="tax-stat">
          <span className="tax-label">Total P&L</span>
          <span className={`tax-value ${summary.totalPnl >= 0 ? 'positive' : 'negative'}`}>
            {summary.totalPnl >= 0 ? '+' : ''}{formatUsd(summary.totalPnl)}
          </span>
        </div>
        <div className="tax-stat">
          <span className="tax-label">Realized Gains</span>
          <span className={`tax-value ${summary.realized >= 0 ? 'positive' : 'negative'}`}>
            {summary.realized >= 0 ? '+' : ''}{formatUsd(summary.realized)}
          </span>
        </div>
        <div className="tax-stat">
          <span className="tax-label">Unrealized</span>
          <span className={`tax-value ${summary.unrealized >= 0 ? 'positive' : 'negative'}`}>
            {summary.unrealized >= 0 ? '+' : ''}{formatUsd(summary.unrealized)}
          </span>
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
          {positions.map((pos, idx) => (
            <div key={idx} className="table-row">
              <span>{pos.token}</span>
              <span>{pos.quantity ?? 0}</span>
              <span>{formatUsd(pos.costBasis ?? 0)}</span>
              <span>{formatUsd(pos.currentValue ?? 0)}</span>
              <span className={(pos.pnl ?? 0) >= 0 ? 'positive' : 'negative'}>
                {(pos.pnl ?? 0) >= 0 ? '+' : ''}{formatUsd(pos.pnl ?? 0)} ({formatPercent(pos.pnlPercent ?? 0)})
              </span>
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
  );
}

export default SolanaTaxView;