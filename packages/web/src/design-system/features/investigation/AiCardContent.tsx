import React from 'react';
import { Bot } from 'lucide-react';
import { AiAnalysisTable } from '../AiAnalysisTable';

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

export function AiCardContent({ data }: AiCardContentProps) {
  const { command, chain, resultSummary, resultData } = data;

  // If we have structured analysis data, render the full table
  if (resultData && (resultData.type === 'wallet' || resultData.type === 'contract')) {
    return (
      <div className="ir-ai-card">
        <div className="ir-ai-card-header">
          <Bot size={14} />
          <span>FT Maverick — {command}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.6 }}>
            {chain?.toUpperCase()}
          </span>
        </div>
        <AiAnalysisTable data={resultData} />
      </div>
    );
  }

  // Fallback: simple summary text for non-analysis responses
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