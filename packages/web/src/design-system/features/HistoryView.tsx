/**
 * HistoryView - Search history using new design system
 * Wraps existing HistoryPage with design system integration
 */

import React from 'react';
import './HistoryView.css';

// Import the existing component directly (not lazy - it's not heavy)
import HistoryPage from '../../components/HistoryPage';

interface HistoryViewProps {
  onSelectScan: (address: string, chain: string, type?: string) => void;
}

export function HistoryView({ onSelectScan }: HistoryViewProps) {
  return (
    <div className="history-view">
      <div className="view-watermark">
        <svg className="watermark-logo" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="2"/>
          <circle cx="20" cy="20" r="8" fill="currentColor"/>
          <circle cx="12" cy="12" r="4" fill="currentColor"/>
          <circle cx="28" cy="12" r="4" fill="currentColor"/>
          <circle cx="12" cy="28" r="4" fill="currentColor"/>
          <circle cx="28" cy="28" r="4" fill="currentColor"/>
          <line x1="12" y1="12" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="28" y1="12" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="12" y1="28" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="28" y1="28" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span className="watermark-text">FundTracer</span>
      </div>
      {/* Header */}
      <div className="history-view__header">
        <h1 className="history-view__title">History</h1>
        <p className="history-view__subtitle">
          Your recent investigations, searches, and scans across all chains
        </p>
      </div>

      {/* Content */}
      <div className="history-view__content">
        <HistoryPage onSelectScan={onSelectScan} />
      </div>
    </div>
  );
}

export default HistoryView;
