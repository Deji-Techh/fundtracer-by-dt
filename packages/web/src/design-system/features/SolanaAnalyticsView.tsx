import React from 'react';
import { BarChart3 } from 'lucide-react';

interface SolanaAnalyticsViewProps {
  address: string;
}

export function SolanaAnalyticsView({ address }: SolanaAnalyticsViewProps) {
  if (!address) {
    return (
      <div className="solana-view-empty">
        <BarChart3 size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  return (
    <div className="solana-analytics-view">
      <div className="analytics-header">
        <BarChart3 size={24} />
        <span>Dune Analytics</span>
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
            <BarChart3 size={100} />
          </div>
          <div className="allocation-legend">
            <div className="legend-item"><span className="legend-color" style={{background: '#9945ff'}} />SOL 65%</div>
            <div className="legend-item"><span className="legend-color" style={{background: '#6366f1'}} />USDC 20%</div>
            <div className="legend-item"><span className="legend-color" style={{background: '#8b5cf6'}} />Tokens 15%</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SolanaAnalyticsView;