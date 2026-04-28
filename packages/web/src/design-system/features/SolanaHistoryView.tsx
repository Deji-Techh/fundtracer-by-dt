import React from 'react';
import { Clock } from 'lucide-react';

interface SolanaHistoryViewProps {
  address: string;
}

function formatUsd(value: number): string {
  return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function SolanaHistoryView({ address }: SolanaHistoryViewProps) {
  if (!address) {
    return (
      <div className="solana-view-empty">
        <Clock size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  return (
    <div className="solana-history-view">
      <div className="history-header">
        <Clock size={24} />
        <span>Portfolio History</span>
      </div>

      <div className="history-timeline">
        <div className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <span className="timeline-date">Today</span>
            <span className="timeline-value">$0.00</span>
            <span className="timeline-change positive">+0%</span>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <span className="timeline-date">1 Week</span>
            <span className="timeline-value">$0.00</span>
            <span className="timeline-change negative">-0%</span>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <span className="timeline-date">1 Month</span>
            <span className="timeline-value">$0.00</span>
            <span className="timeline-change positive">+0%</span>
          </div>
        </div>
        <div className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <span className="timeline-date">3 Months</span>
            <span className="timeline-value">$0.00</span>
            <span className="timeline-change negative">-0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SolanaHistoryView;