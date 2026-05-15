/**
 * ReportsView - AI Investigation Report Generator
 * Full-page streaming AI reports for wallet/contract analysis
 */

import React, { useState, useRef, useCallback } from 'react';
import { ChainId } from '@fundtracer/core';
import { getAuthToken } from '../../api';
import { exportReportPdf } from '../../utils/exportReportPdf';
import './ReportsView.css';
import './InvestigateView.css';

interface ReportsViewProps {
  selectedChain?: ChainId;
}

type ReportStatus = 'idle' | 'loading' | 'streaming' | 'complete' | 'error';

export function ReportsView({ selectedChain = 'linea' }: ReportsViewProps) {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<ReportStatus>('idle');
  const [report, setReport] = useState('');
  const [error, setError] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!address.trim()) return;

    setStatus('loading');
    setReport('');
    setError('');
    setReportTitle(`Report: ${address.slice(0, 6)}...${address.slice(-4)}`);

    try {
      const token = getAuthToken();
      abortRef.current = new AbortController();

      const response = await fetch('/api/analyze/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ address: address.trim(), chain: selectedChain }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: 'Failed to generate report' }));
        throw new Error(err.message || 'Failed to generate report');
      }

      setStatus('streaming');

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE chunks
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setStatus('complete');
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                setReport(prev => prev + parsed.content);
              }
            } catch {
              // Raw text fallback
              setReport(prev => prev + data);
            }
          }
        }
      }

      setStatus('complete');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setError(err.message || 'Failed to generate report');
      setStatus('error');
    }
  }, [address, selectedChain]);

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(report);
  }, [report]);

  const handleExportPdf = useCallback(async () => {
    const el = reportRef.current;
    if (!el) return;
    const filename = `fundtracer-report-${address.slice(0, 8)}-${Date.now()}.pdf`;
    await exportReportPdf(el, filename);
  }, [address]);

  const handleNew = useCallback(() => {
    setAddress('');
    setReport('');
    setError('');
    setStatus('idle');
    setReportTitle('');
  }, []);

  return (
    <div className="reports-view">
      <div className="page-head">
        <div className="page-title">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
            <path d="M3 1h8l2 2v10H3V1z"/>
            <path d="M5 4h4M5 6.5h4M5 9h2"/>
            <path d="M11 3v2H9V3"/>
          </svg>
          Reports
        </div>
        <div className="page-desc">Generate professional AI investigation reports for any wallet or contract address</div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="field-label">Wallet or Contract Address</div>
          <div className="addr-field">
            <div className="addr-bar">
              <span className="addr-label">{selectedChain.toUpperCase()}</span>
            </div>
            <input
              className="ft-addr-input"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x… wallet address or ENS name"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && status !== 'loading' && status !== 'streaming') {
                  handleGenerate();
                }
              }}
              disabled={status === 'loading' || status === 'streaming'}
            />
          </div>

          <div className="hint">
            Generates a structured report with executive summary, fund flow analysis, risk assessment, and more.
          </div>

          <div className="actions">
            {(status === 'idle' || status === 'complete' || status === 'error') && address.trim() && (
              <button className="btn-analyze" onClick={handleGenerate} disabled={!address.trim()}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5l3 3"/>
                </svg>
                Generate Report
              </button>
            )}
            {(status === 'loading' || status === 'streaming') && (
              <button className="btn-ghost" onClick={handleCancel} style={{ color: '#ff4444' }}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="8" height="8" rx="1"/>
                </svg>
                Cancel
              </button>
            )}
            {status === 'complete' && (
              <>
                <button className="btn-ghost" onClick={handleCopy}>
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="1" width="8" height="10" rx="0.5"/>
                    <path d="M1 3v8h8"/>
                  </svg>
                  Copy
                </button>
                <button className="btn-ghost" onClick={handleExportPdf}>
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M6 1v8M2 6l4 4 4-4M1 11h10"/>
                  </svg>
                  Export PDF
                </button>
                <button className="btn-ghost" onClick={handleNew}>
                  <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="6" y1="2" x2="6" y2="10"/><line x1="2" y1="6" x2="10" y2="6"/>
                  </svg>
                  New Report
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {status === 'loading' && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="report-skeleton">
              <div className="skeleton-line" style={{ width: '60%', height: 24, marginBottom: 16 }} />
              <div className="skeleton-line" style={{ width: '40%', height: 16, marginBottom: 8 }} />
              <div className="skeleton-line" style={{ width: '80%', height: 16, marginBottom: 8 }} />
              <div className="skeleton-line" style={{ width: '70%', height: 16, marginBottom: 24 }} />
              <div className="skeleton-section">
                <div className="skeleton-line" style={{ width: '30%', height: 20, marginBottom: 12 }} />
                <div className="skeleton-line" style={{ width: '90%', height: 14, marginBottom: 6 }} />
                <div className="skeleton-line" style={{ width: '85%', height: 14, marginBottom: 6 }} />
                <div className="skeleton-line" style={{ width: '75%', height: 14, marginBottom: 6 }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report output */}
      {(report || status === 'streaming') && (
        <div className="panel report-panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="report-header">
              <div className="report-title">{reportTitle}</div>
              {status === 'streaming' && (
                <div className="report-streaming-indicator">
                  <span className="report-streaming-dot" />
                  Generating...
                </div>
              )}
            </div>
            <div
              ref={reportRef}
              className="report-content markdown-body"
              dangerouslySetInnerHTML={{
                __html: (() => {
                  const escaped = report
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                  return escaped
                    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\n/g, '<br/>');
                })(),
              }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-body">
            <div className="investigate-error">
              <div className="investigate-error__title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                Report Generation Failed
              </div>
              <p className="investigate-error__message">{error}</p>
              <button className="btn-analyze" onClick={handleGenerate} style={{ marginTop: 12 }}>
                Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportsView;
