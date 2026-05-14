/**
 * ReportCard - AI-generated investigation report display with share options
 */

import React, { useState, useCallback, useRef } from 'react';
import { getAuthToken, API_BASE } from '../../api';
import './ReportCard.css';

interface ReportData {
  t: 'report';
  status: 'loading' | 'streaming' | 'complete' | 'error';
  address: string;
  chain: string;
  content?: string;
  error?: string;
}

type ShareFormat = 'pdf' | 'markdown' | 'link';

export function ReportCard({ data }: { data: ReportData }) {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareLoading, setShareLoading] = useState<ShareFormat | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const { status, address, chain, content = '', error } = data;
  const shortAddr = address.length > 12 ? `${address.slice(0, 6)}...${address.slice(-4)}` : address;

  const renderMarkdown = (md: string) => {
    let html = md
      .replace(/### (.+)$/gm, '<h3>$1</h3>')
      .replace(/## (.+)$/gm, '<h2>$1</h2>')
      .replace(/# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
    return html;
  };

  const handleShareLink = useCallback(async () => {
    setShareLoading('link');
    try {
      const token = getAuthToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${API_BASE}/api/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address,
          chain,
          type: 'report',
          data: { content, generatedAt: Date.now() },
        }),
      });

      if (!response.ok) throw new Error('Failed to create share link');

      const result = await response.json();
      const url = result.url || result.shareUrl;
      setShareUrl(url);
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch (err: any) {
      console.error('Share link error:', err);
      // Fallback: generate a direct link
      const fallbackUrl = `${window.location.origin}/share/report/${address}`;
      setShareUrl(fallbackUrl);
      try {
        await navigator.clipboard.writeText(fallbackUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2500);
      } catch {}
    } finally {
      setShareLoading(null);
      setShowShareMenu(false);
    }
  }, [address, chain, content]);

  const handleExportMarkdown = useCallback(() => {
    const timestamp = new Date().toISOString().split('T')[0];
    const md = `# FundTracer Investigation Report

**Address:** ${address}
**Chain:** ${chain.toUpperCase()}
**Generated:** ${timestamp}

---

${content}
`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fundtracer-report-${address.slice(0, 8)}-${timestamp}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowShareMenu(false);
  }, [address, chain, content]);

  const handleExportPdf = useCallback(async () => {
    setShareLoading('pdf');
    setShowShareMenu(false);
    try {
      const el = reportRef.current;
      if (!el) return;

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(el, {
        backgroundColor: '#0d0d0d',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const filename = `fundtracer-report-${address.slice(0, 8)}-${Date.now()}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setShareLoading(null);
    }
  }, [address]);

  // --- LOADING ---
  if (status === 'loading') {
    return (
      <div className="rc-card rc-loading">
        <div className="rc-header">
          <div className="rc-header-left">
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="rc-icon">
              <path d="M3 1h5l4 4v8H3V1z"/>
              <path d="M8 1v4h4M5 7h4M5 9.5h4"/>
            </svg>
            <span className="rc-title">Generating Report</span>
          </div>
          <span className="rc-addr">{shortAddr}</span>
        </div>
        <div className="rc-body">
          <div className="rc-skeleton" style={{ width: '60%', height: 20, marginBottom: 12 }} />
          <div className="rc-skeleton" style={{ width: '40%', height: 14, marginBottom: 8 }} />
          <div className="rc-skeleton" style={{ width: '80%', height: 14, marginBottom: 8 }} />
          <div className="rc-skeleton" style={{ width: '70%', height: 14, marginBottom: 24 }} />
          <div className="rc-skeleton" style={{ width: '30%', height: 18, marginBottom: 12 }} />
          <div className="rc-skeleton" style={{ width: '90%', height: 14, marginBottom: 6 }} />
          <div className="rc-skeleton" style={{ width: '85%', height: 14, marginBottom: 6 }} />
        </div>
      </div>
    );
  }

  // --- ERROR ---
  if (status === 'error') {
    return (
      <div className="rc-card rc-error">
        <div className="rc-error-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
        </div>
        <div className="rc-error-text">
          <div className="rc-error-title">Report Generation Failed</div>
          <div className="rc-error-msg">{error}</div>
        </div>
      </div>
    );
  }

  // --- STREAMING / COMPLETE ---
  const isStreaming = status === 'streaming';
  const hasContent = content.length > 0;

  return (
    <div className="rc-card">
      <div className="rc-header">
        <div className="rc-header-left">
          <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="rc-icon">
            <path d="M3 1h5l4 4v8H3V1z"/>
            <path d="M8 1v4h4M5 7h4M5 9.5h4"/>
          </svg>
          <span className="rc-title">Investigation Report</span>
          {isStreaming && (
            <span className="rc-streaming-badge">
              <span className="rc-dot" />
              Generating...
            </span>
          )}
          {status === 'complete' && (
            <span className="rc-complete-badge">Complete</span>
          )}
        </div>
        <span className="rc-addr">{shortAddr} · {chain.toUpperCase()}</span>
      </div>

      <div
        ref={reportRef}
        className="rc-body"
      >
        {hasContent ? (
          <div dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
        ) : (
          <div className="rc-stream-hint">
            {isStreaming ? 'Waiting for report...' : 'No report content generated.'}
          </div>
        )}
      </div>

      <div className="rc-footer">
        {/* Share button + dropdown */}
        <div className="rc-share-wrapper">
          <button
            className="rc-share-btn"
            onClick={() => setShowShareMenu(v => !v)}
            disabled={!hasContent && !isStreaming}
          >
            <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
              <circle cx="4" cy="7" r="2"/>
              <circle cx="10" cy="3" r="2"/>
              <circle cx="10" cy="11" r="2"/>
              <path d="M6 6l3-2M6 8l3 2"/>
            </svg>
            Share
          </button>

          {showShareMenu && (
            <div className="rc-share-menu">
              <button className="rc-share-item" onClick={handleExportPdf} disabled={shareLoading === 'pdf'}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                  <rect x="1" y="1" width="12" height="9" rx="1"/>
                  <path d="M4 5v5h6V5M7 2v6"/>
                </svg>
                <span>{shareLoading === 'pdf' ? 'Exporting...' : 'PDF'}</span>
              </button>
              <button className="rc-share-item" onClick={handleExportMarkdown}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                  <path d="M3 1h8l2 2v10H3V1z"/>
                  <path d="M5 4h4M5 6.5h4M5 9h2"/>
                </svg>
                <span>Markdown</span>
              </button>
              <button className="rc-share-item" onClick={handleShareLink} disabled={shareLoading === 'link'}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
                  <path d="M6 8l5-5M5 2H3a1 1 0 00-1 1v8a1 1 0 001 1h8a1 1 0 001-1V9"/>
                  <path d="M10 4h2.5V1.5"/>
                </svg>
                <span>{shareLoading === 'link' ? 'Creating...' : shareCopied ? 'Copied!' : 'Link'}</span>
              </button>
            </div>
          )}
        </div>

        {status === 'complete' && (
          <span className="rc-timestamp">{new Date().toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}

export default ReportCard;
