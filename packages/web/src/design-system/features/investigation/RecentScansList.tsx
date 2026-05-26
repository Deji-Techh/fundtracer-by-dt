import React from 'react';
import { History } from 'lucide-react';

interface RecentScan {
  address: string;
  chain?: string;
  timestamp: number;
  riskLevel?: string;
  riskScore?: number;
  label?: string;
  type?: string;
  totalTransactions?: number;
}

interface RecentScansListProps {
  scans: RecentScan[];
  onSelectScan: (scan: RecentScan) => void;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function RecentScansList({ scans, onSelectScan }: RecentScansListProps) {
  if (scans.length === 0) {
    return (
      <div className="ir-empty">
        <p className="ir-empty-text">No recent scans</p>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted, #555)' }}>
          Scanned wallets will appear here
        </span>
      </div>
    );
  }

  return (
    <div className="ir-session-list">
      {scans.slice(0, 20).map((scan) => (
        <button
          key={scan.address}
          className="ir-session-item"
          onClick={() => onSelectScan(scan)}
        >
          <History size={14} className="ir-session-icon" />
          <div className="ir-session-content">
            <span className="ir-session-title">
              {scan.label || `${scan.address.slice(0, 6)}...${scan.address.slice(-4)}`}
            </span>
            <span className="ir-session-preview">
              {scan.chain?.slice(0, 3).toUpperCase()}
              {scan.riskLevel ? ` · ${scan.riskLevel}` : ''}
              {scan.totalTransactions != null ? ` · ${scan.totalTransactions} txns` : ''}
            </span>
          </div>
          <span className="ir-session-time">{formatRelativeTime(scan.timestamp)}</span>
        </button>
      ))}
    </div>
  );
}
