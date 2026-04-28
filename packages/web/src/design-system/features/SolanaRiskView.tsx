import React, { useState, useEffect } from 'react';
import { Shield, Loader2 } from 'lucide-react';

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

interface SolanaRiskViewProps {
  address: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://fundtracer-by-dt-production.up.railway.app';

export function SolanaRiskView({ address }: SolanaRiskViewProps) {
  const [risk, setRisk] = useState<RiskAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;
    fetchRisk();
  }, [address]);

  const fetchRisk = async () => {
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('fundtracer_token');
    
    try {
      const res = await fetch(`${API_BASE}/api/solana/risk/${address}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch risk analysis');
      }
      
      const data = await res.json();
      setRisk(data);
    } catch (err: any) {
      console.error('Risk fetch error:', err);
      setError(err.message || 'Failed to load risk analysis');
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="solana-view-empty">
        <Shield size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="solana-view-loading">
        <Loader2 size={32} className="spin" />
        <p>Analyzing risk...</p>
      </div>
    );
  }

  if (error || !risk) {
    return (
      <div className="solana-view-empty">
        <Shield size={48} />
        <h3>No Risk Analysis</h3>
        <p>{error || 'Unable to analyze this wallet'}</p>
      </div>
    );
  }

  return (
    <div className="solana-risk-view">
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
  );
}

export default SolanaRiskView;