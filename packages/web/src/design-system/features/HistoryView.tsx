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
