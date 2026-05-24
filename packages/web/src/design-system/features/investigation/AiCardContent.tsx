import React from 'react';
import { Bot, ExternalLink } from 'lucide-react';

interface AiCardData {
  command: string;
  address: string;
  chain: string;
  resultSummary: string;
  resultData?: any;
}

interface AiCardContentProps {
  data: AiCardData;
}

const RISK_COLORS: Record<string, string> = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#f97316',
  critical: '#ef4444',
};

export function AiCardContent({ data }: AiCardContentProps) {
  const { command, address, chain, resultSummary, resultData } = data;
  const riskLevel = resultData?.riskLevel?.toLowerCase();
  const riskColor = riskLevel ? RISK_COLORS[riskLevel] || '#888' : '#888';

  return (
    <div className="ir-ai-card">
      <div className="ir-ai-card-header">
        <Bot size={14} />
        <span>FT Maverick — {command}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>
          {chain?.toUpperCase()}
        </span>
      </div>

      <div className="ir-ai-card-summary">{resultSummary}</div>

      {resultData && (
        <div className="ir-ai-card-data">
          {resultData.riskScore !== undefined && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 11, color: 'var(--color-text-muted, #555)' }}>Risk Score </span>
                <span style={{ color: riskColor, fontWeight: 600 }}>{resultData.riskScore}</span>
              </div>
              {resultData.riskLevel && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted, #555)' }}>Level </span>
                  <span style={{ color: riskColor, fontWeight: 500, textTransform: 'uppercase', fontSize: 11 }}>
                    {resultData.riskLevel}
                  </span>
                </div>
              )}
              {resultData.totalTransactions !== undefined && (
                <div>
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted, #555)' }}>Txns </span>
                  <span>{resultData.totalTransactions}</span>
                </div>
              )}
            </div>
          )}

          {resultData.flags && resultData.flags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
              {resultData.flags.map((flag: string, i: number) => (
                <span key={i} style={{
                  fontSize: 10,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: 'rgba(239,159,39,0.1)',
                  color: '#EF9F27',
                  border: '1px solid rgba(239,159,39,0.2)',
                }}>
                  {flag}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-text-muted, #555)', fontFamily: '"JetBrains Mono", monospace' }}>
            {address.slice(0, 10)}...{address.slice(-6)}
          </div>
        </div>
      )}
    </div>
  );
}

export function AiCardSkeleton() {
  return (
    <div className="ir-ai-card">
      <div className="ir-ai-card-header" style={{ marginBottom: 12 }}>
        <Bot size={14} />
        <div className="ir-ai-skeleton-row" style={{ width: 120, height: 10 }} />
      </div>
      <div className="ir-ai-skeleton">
        <div className="ir-ai-skeleton-row" style={{ width: '90%' }} />
        <div className="ir-ai-skeleton-row" style={{ width: '70%' }} />
        <div className="ir-ai-skeleton-row" style={{ width: '40%' }} />
      </div>
    </div>
  );
}
