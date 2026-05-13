import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import '../global.css';
import {
  Download02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowAllDirectionIcon,
  CheckmarkCircle02Icon,
  Alert02Icon,
  AlertDiamondIcon,
  InformationDiamondIcon,
  WorkflowSquare01Icon,
  Clock01Icon,
  Link01Icon,
  FolderIcon,
  EyeIcon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { AnalysisResult, SuspiciousIndicator, FundingNode, CHAINS } from '@fundtracer/core';
import FundingTree from './FundingTree';
import TransactionList from './TransactionList';
import AddressLabel from './AddressLabel';
import { fetchFundingTree, getAuthToken, API_BASE } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';
import { getChainTokenSymbol } from '../config/chains';
import { exportReportPdf } from '../utils/exportReportPdf';

interface AnalysisViewProps {
    result: AnalysisResult;
    pagination?: { total: number; offset: number; limit: number; hasMore: boolean } | null;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}

type TabId = 'overview' | 'funding' | 'transactions' | 'suspicious' | 'report';

function AnalysisView({ result, pagination, loadingMore, onLoadMore }: AnalysisViewProps) {
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [fundingSources, setFundingSources] = useState<FundingNode | null>(null);
    const [fundingDestinations, setFundingDestinations] = useState<FundingNode | null>(null);
    const [treeLoading, setTreeLoading] = useState(false);
    const [treeError, setTreeError] = useState<string | null>(null);
    const [treeDepth, setTreeDepth] = useState(2);
    const [hoveredAddress, setHoveredAddress] = useState<{ address: string; x: number; y: number } | null>(null);
    const [reportStatus, setReportStatus] = useState<'idle' | 'loading' | 'streaming' | 'complete' | 'error'>('idle');
    const [reportContent, setReportContent] = useState('');
    const [reportError, setReportError] = useState('');
    const abortRef = useRef<AbortController | null>(null);
    const reportRef = useRef<HTMLDivElement>(null!) as React.RefObject<HTMLDivElement>;
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    const chain = result.wallet.chain;
    const chainConfig = CHAINS[chain] || { explorer: 'https://etherscan.io' };

    // Check if tree data was already included in the analysis result (non-empty children)
    const hasPreloadedTree = result.fundingSources?.children?.length > 0 || result.fundingDestinations?.children?.length > 0;
    const treeGenerated = hasPreloadedTree || fundingSources !== null;

    const handleGenerateTree = async () => {
        setTreeLoading(true);
        setTreeError(null);
        try {
            const response = await fetchFundingTree(result.wallet.address, result.wallet.chain, treeDepth);
            if (response.result) {
                setFundingSources(response.result.fundingSources);
                setFundingDestinations(response.result.fundingDestinations);
            } else {
                setTreeError(response.error || 'Failed to generate funding tree');
            }
        } catch (err: any) {
            setTreeError(err.message || 'Failed to generate funding tree');
        } finally {
            setTreeLoading(false);
        }
    };

    const handleGenerateReport = useCallback(async () => {
        setReportStatus('loading');
        setReportContent('');
        setReportError('');

        try {
            const token = getAuthToken();
            if (!token) {
                throw new Error('Authentication required. Please log in to generate reports.');
            }

            abortRef.current = new AbortController();

            // Use API_BASE for direct API access (same pattern as expand-node which works)
            // Also send x-auth-token as fallback since Cloudflare edge strips Authorization for /report path
            const url = `${API_BASE}/api/analyze/report`;
            console.log(`[REPORT] Sending to ${url}, API_BASE=${API_BASE}, token exists: ${!!token}, token prefix: ${token.substring(0, 10)}...`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'x-auth-token': token,
                },
                body: JSON.stringify({ address: result.wallet.address, chain: result.wallet.chain }),
                credentials: 'include',
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: 'Failed to generate report' }));
                if (response.status === 401) {
                    throw new Error('Session expired. Please log in again.');
                }
                throw new Error(err.error || err.message || 'Failed to generate report');
            }

            setReportStatus('streaming');

            const reader = response.body?.getReader();
            if (!reader) throw new Error('No response stream');

            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            setReportStatus('complete');
                            continue;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                setReportContent(prev => prev + parsed.content);
                            }
                        } catch {
                            setReportContent(prev => prev + data);
                        }
                    }
                }
            }

            setReportStatus('complete');
        } catch (err: any) {
            if (err.name === 'AbortError') {
                setReportStatus('idle');
                return;
            }
            setReportError(err.message || 'Failed to generate report');
            setReportStatus('error');
        }
    }, [result.wallet.address, result.wallet.chain]);

    const handleCancelReport = useCallback(() => {
        abortRef.current?.abort();
        setReportStatus('idle');
    }, []);

    const handleCopyReport = useCallback(() => {
        navigator.clipboard.writeText(reportContent);
    }, [reportContent]);

    const handleExportPdf = useCallback(async () => {
        const el = reportRef.current;
        if (!el) return;
        const filename = `fundtracer-report-${result.wallet.address.slice(0, 8)}-${Date.now()}.pdf`;
        await exportReportPdf(el, filename);
    }, [result.wallet.address]);

    // Use on-demand tree data if available, otherwise fall back to result data
    const displaySources = fundingSources || result.fundingSources;
    const displayDestinations = fundingDestinations || result.fundingDestinations;

    const formatAddress = (addr: string) =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    const riskColorClass =
        result.riskLevel === 'critical' || result.riskLevel === 'high' ? 'negative' :
            result.riskLevel === 'medium' ? '' : 'positive';

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Wallet Summary - Flat Section */}
            <motion.div
                variants={itemVariants}
                className="section-flat"
                style={{ marginBottom: 'var(--space-4)' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: isMobile ? 'var(--space-3)' : 'var(--space-4)' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                            <AddressLabel
                                address={result.wallet.address}
                                chain={result.wallet.chain}
                                editable={true}
                                showAddress={true}
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: isMobile ? 'var(--text-sm)' : 'var(--text-lg)',
                                    fontWeight: 'bold',
                                    color: 'var(--color-text-primary)',
                                    wordBreak: 'break-all' as const
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>
                                {result.wallet.chain}
                            </span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                                {result.wallet.balanceInEth.toFixed(4)} {getChainTokenSymbol(result.wallet.chain)}
                            </span>
                            {result.wallet.isContract && (
                                <span className="risk-badge medium">Contract</span>
                            )}
                            {(result as any).crossChainActivity && (
                                <span className="risk-badge" style={{ background: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff', border: '1px solid rgba(0, 212, 255, 0.3)' }}>
                                    Cross-Chain
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="risk-score">
                        <span className={`risk-score-value ${riskColorClass}`}>
                            {result.overallRiskScore}
                        </span>
                        <div>
                            <div className="risk-score-label">Risk Score</div>
                            <span className={`risk-badge ${result.riskLevel}`}>
                                {result.riskLevel}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn btn-secondary btn-sm"
                        onClick={() => import('../utils/exportReport').then(mod => mod.generatePDFReport(result))}
                        title="Download PDF Report"
                    >
                        <HugeiconsIcon icon={Download02Icon} size={16} strokeWidth={2} />
                        <span>Export Report</span>
                    </motion.button>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <motion.div variants={itemVariants} className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="stat-card">
                    <div className="stat-label">Total Transactions</div>
                    <div className="stat-value">{result.summary.totalTransactions}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Successful / Failed</div>
                    <div className="stat-value">
                        <span className="positive">{result.summary.successfulTxs}</span>
                        {' / '}
                        <span className="negative">{result.summary.failedTxs}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Received</div>
                    <div className="stat-value positive">
                        +{result.summary.totalValueReceivedEth.toFixed(4)} {getChainTokenSymbol(result.wallet.chain)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Sent</div>
                    <div className="stat-value negative">
                        -{result.summary.totalValueSentEth.toFixed(4)} {getChainTokenSymbol(result.wallet.chain)}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Activity Period</div>
                    <div className="stat-value">
                        {result.summary.activityPeriodDays} {result.summary.activityPeriodDays === 1 ? 'day' : 'days'}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Unique Addresses</div>
                    <div className="stat-value">{result.summary.uniqueInteractedAddresses}</div>
                </div>
            </motion.div>

            {/* Tabs */}
            <motion.div variants={itemVariants} className="section-flat">
                <div className="tabs-flat">
                    <button
                        className={`tab-flat ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <HugeiconsIcon icon={InformationDiamondIcon} size={18} strokeWidth={2} />
                        <span>Overview</span>
                    </button>
                    <button
                        className={`tab-flat ${activeTab === 'funding' ? 'active' : ''}`}
                        onClick={() => setActiveTab('funding')}
                    >
                        <HugeiconsIcon icon={WorkflowSquare01Icon} size={18} strokeWidth={2} />
                        <span>Funding Tree</span>
                    </button>
                    <button
                        className={`tab-flat ${activeTab === 'transactions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('transactions')}
                    >
                        <HugeiconsIcon icon={ArrowAllDirectionIcon} size={18} strokeWidth={2} />
                        <span>Transactions</span>
                        <span className="tab-badge">{result.transactions?.length || 0}</span>
                    </button>
                    <button
                        className={`tab-flat ${activeTab === 'suspicious' ? 'active' : ''}`}
                        onClick={() => setActiveTab('suspicious')}
                    >
                        <HugeiconsIcon icon={AlertDiamondIcon} size={18} strokeWidth={2} />
                        <span>Suspicious</span>
                        {(result.suspiciousIndicators?.length || 0) > 0 && (
                            <span className="tab-badge">{result.suspiciousIndicators?.length || 0}</span>
                        )}
                    </button>
                    <button
                        className={`tab-flat ${activeTab === 'report' ? 'active' : ''}`}
                        onClick={() => setActiveTab('report')}
                    >
                        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 18, height: 18 }}>
                            <path d="M3 1h5l4 4v8H3V1z"/>
                            <path d="M8 1v4h4M5 7h4M5 9.5h4"/>
                        </svg>
                        <span>Report</span>
                    </button>
                </div>

                {/* Tab Content */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && (
                        <OverviewTab 
                            result={result} 
                            formatAddress={formatAddress} 
                            isMobile={isMobile} 
                            chain={chain}
                            chainConfig={chainConfig}
                            navigate={navigate}
                        />
                    )}

                    {activeTab === 'funding' && (
                        <FundingTab
                            result={result}
                            treeGenerated={treeGenerated}
                            treeLoading={treeLoading}
                            treeError={treeError}
                            treeDepth={treeDepth}
                            setTreeDepth={setTreeDepth}
                            handleGenerateTree={handleGenerateTree}
                            displaySources={displaySources}
                            displayDestinations={displayDestinations}
                        />
                    )}

                    {activeTab === 'transactions' && (
                        <TransactionList
                            transactions={result.transactions}
                            chain={result.wallet.chain}
                            pagination={pagination}
                            loadingMore={loadingMore}
                            onLoadMore={onLoadMore}
                        />
                    )}

                    {activeTab === 'suspicious' && (
                        <SuspiciousTab indicators={result.suspiciousIndicators} />
                    )}

                    {activeTab === 'report' && (
                        <ReportTab
                            address={result.wallet.address}
                            chain={result.wallet.chain}
                            reportStatus={reportStatus}
                            reportContent={reportContent}
                            reportError={reportError}
                            reportRef={reportRef}
                            onGenerate={handleGenerateReport}
                            onCancel={handleCancelReport}
                            onCopy={handleCopyReport}
                            onExportPdf={handleExportPdf}
                            onNew={() => {
                                setReportStatus('idle');
                                setReportContent('');
                                setReportError('');
                            }}
                        />
                    )}
                </motion.div>

                {/* Hover Tooltip for addresses */}
                {hoveredAddress && (
                    <div
                        style={{
                            position: 'fixed',
                            left: hoveredAddress.x + 10,
                            top: hoveredAddress.y + 10,
                            zIndex: 1000,
                            background: 'var(--color-bg-elevated)',
                            border: '1px solid var(--color-surface-border)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-3)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            maxWidth: 300,
                        }}
                        onMouseEnter={() => setHoveredAddress(hoveredAddress)}
                        onMouseLeave={() => setHoveredAddress(null)}
                    >
                        <div style={{ 
                            fontFamily: 'var(--font-mono)', 
                            fontSize: 'var(--text-xs)', 
                            marginBottom: 'var(--space-2)',
                            wordBreak: 'break-all' 
                        }}>
                            {hoveredAddress.address}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <a
                                href={`${chainConfig.explorer}/address/${hoveredAddress.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)',
                                    padding: 'var(--space-1) var(--space-2)',
                                    background: 'var(--color-primary)',
                                    color: 'var(--color-primary-text)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--text-xs)',
                                    textDecoration: 'none',
                                }}
                            >
                                <HugeiconsIcon icon={EyeIcon} size={12} strokeWidth={2} />
                                View
                            </a>
                            <button
                                onClick={() => navigate(`/app-evm?address=${hoveredAddress.address}&chain=${chain}`)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)',
                                    padding: 'var(--space-1) var(--space-2)',
                                    background: 'var(--color-bg-tertiary)',
                                    color: 'var(--color-text-primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: 'var(--text-xs)',
                                    border: '1px solid var(--color-surface-border)',
                                    cursor: 'pointer',
                                }}
                            >
                                <HugeiconsIcon icon={Search01Icon} size={12} strokeWidth={2} />
                                Scan
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

// Funding Tab Component
function FundingTab({
    result,
    treeGenerated,
    treeLoading,
    treeError,
    treeDepth,
    setTreeDepth,
    handleGenerateTree,
    displaySources,
    displayDestinations,
}: {
    result: AnalysisResult;
    treeGenerated: boolean;
    treeLoading: boolean;
    treeError: string | null;
    treeDepth: number;
    setTreeDepth: (depth: number) => void;
    handleGenerateTree: () => void;
    displaySources: FundingNode | null | undefined;
    displayDestinations: FundingNode | null | undefined;
}) {
    return (
        <div>
            {!treeGenerated ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--space-8)',
                    gap: 'var(--space-4)',
                }}>
                    <HugeiconsIcon icon={WorkflowSquare01Icon} size={48} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />
                    <h3 style={{
                        fontSize: 'var(--text-lg)',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        margin: 0,
                    }}>
                        Funding Tree
                    </h3>
                    <p style={{
                        color: 'var(--color-text-muted)',
                        fontSize: 'var(--text-sm)',
                        textAlign: 'center',
                        maxWidth: 400,
                        margin: 0,
                    }}>
                        Trace where this wallet's funds came from and where they went.
                        This requires additional API calls and may take a few seconds.
                    </p>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                    }}>
                        <span style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-secondary)',
                            fontWeight: 500,
                            whiteSpace: 'nowrap' as const,
                        }}>
                            Trace Depth
                        </span>
                        <div style={{ display: 'flex', gap: 4 }}>
                            {[1, 2, 3, 4, 5].map((d) => (
                                <motion.button
                                    key={d}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setTreeDepth(d)}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 'var(--radius-sm)',
                                        border: treeDepth === d
                                            ? '1px solid var(--color-accent)'
                                            : '1px solid var(--color-border)',
                                        background: treeDepth === d
                                            ? 'var(--color-accent)'
                                            : 'var(--color-bg-elevated)',
                                        color: treeDepth === d
                                            ? '#ffffff'
                                            : 'var(--color-text-secondary)',
                                        fontSize: 'var(--text-sm)',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {d}
                                </motion.button>
                            ))}
                        </div>
                        <span style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                        }}>
                            {treeDepth <= 2 ? 'Fast' : treeDepth <= 3 ? 'Moderate' : 'Deep'}
                        </span>
                    </div>
                    {treeDepth > 3 && (
                        <div style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-warning-text)',
                            background: 'var(--color-warning-bg)',
                            padding: 'var(--space-2) var(--space-3)',
                            borderRadius: 'var(--radius-sm)',
                            maxWidth: 400,
                            textAlign: 'center',
                        }}>
                            Higher depths use more API calls and may take longer or hit rate limits.
                        </div>
                    )}

                    {treeError && (
                        <div style={{
                            padding: 'var(--space-3)',
                            background: 'var(--color-danger-bg)',
                            color: 'var(--color-danger-text)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--text-sm)',
                            maxWidth: 400,
                            width: '100%',
                            textAlign: 'center',
                        }}>
                            {treeError}
                        </div>
                    )}

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="btn btn-primary"
                        onClick={handleGenerateTree}
                        disabled={treeLoading}
                        style={{
                            padding: 'var(--space-3) var(--space-6)',
                            fontSize: 'var(--text-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                        }}
                    >
                        {treeLoading ? (
                            <>
                                <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                                Generating...
                            </>
                        ) : (
                            <>
                                <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} strokeWidth={2} />
                                Generate Funding Tree
                            </>
                        )}
                    </motion.button>
                </div>
            ) : (
                <div>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 'var(--space-3)',
                        marginBottom: 'var(--space-4)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Depth</span>
                            <div style={{ display: 'flex', gap: 3 }}>
                                {[1, 2, 3, 4, 5].map((d) => (
                                    <motion.button
                                        key={d}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setTreeDepth(d)}
                                        style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 'var(--radius-sm)',
                                            border: treeDepth === d
                                                ? '1px solid var(--color-accent)'
                                                : '1px solid var(--color-border)',
                                            background: treeDepth === d
                                                ? 'var(--color-accent)'
                                                : 'var(--color-bg-elevated)',
                                            color: treeDepth === d ? '#ffffff' : 'var(--color-text-secondary)',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {d}
                                    </motion.button>
                                ))}
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="btn btn-secondary btn-sm"
                            onClick={handleGenerateTree}
                            disabled={treeLoading}
                            style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-2) var(--space-3)' }}
                        >
                            {treeLoading ? (
                                <>
                                    <div className="loading-spinner" style={{ width: 12, height: 12 }} />
                                    Regenerating...
                                </>
                            ) : (
                                'Regenerate'
                            )}
                        </motion.button>
                    </div>

                    <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Funding Sources</h3>
                    {displaySources && <FundingTree node={displaySources} direction="source" />}

                    <h3 style={{ margin: 'var(--space-6) 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Funding Destinations</h3>
                    {displayDestinations && <FundingTree node={displayDestinations} direction="destination" />}
                </div>
            )}
        </div>
    );
}

// Overview Tab Component
function OverviewTab({
    result,
    formatAddress,
    isMobile,
    chain,
    chainConfig,
    navigate,
}: {
    result: AnalysisResult;
    formatAddress: (addr: string) => string;
    isMobile: boolean;
    chain: string;
    chainConfig: { explorer: string };
    navigate: (path: string) => void;
}) {
    const [hoveredAddress, setHoveredAddress] = useState<{ address: string; x: number; y: number } | null>(null);
    return (
        <div className="overview-grid">
            {/* Top Funding Sources */}
            <div className="overview-section">
                <h4 className="overview-section-title">
                    <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Top Funding Sources
                </h4>
                {result.summary?.topFundingSources?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {result.summary.topFundingSources.map((source, i) => (
                            <motion.div
                                key={source.address}
                                className="overview-item"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{ position: 'relative' }}
                                onMouseEnter={(e) => setHoveredAddress({ address: source.address, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoveredAddress(null)}
                            >
                                <span className="tx-address">
                                    <AddressLabel address={source.address} chain={result.wallet.chain} showAddress={true} />
                                </span>
                                <span className="tx-value incoming">+{source.valueEth.toFixed(4)} {getChainTokenSymbol(result.wallet.chain)}</span>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No funding sources found</p>
                )}
            </div>

            {/* Top Destinations */}
            <div className="overview-section">
                <h4 className="overview-section-title">
                    <HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={2} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Top Destinations
                </h4>
                {result.summary?.topFundingDestinations?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {result.summary.topFundingDestinations.map((dest, i) => (
                            <motion.div
                                key={dest.address}
                                className="overview-item"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                style={{ position: 'relative' }}
                                onMouseEnter={(e) => setHoveredAddress({ address: dest.address, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setHoveredAddress(null)}
                            >
                                <span className="tx-address">
                                    <AddressLabel address={dest.address} chain={result.wallet.chain} showAddress={true} />
                                </span>
                                <span className="tx-value outgoing">-{dest.valueEth.toFixed(4)} {getChainTokenSymbol(result.wallet.chain)}</span>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No destinations found</p>
                )}
            </div>

            {/* Projects Interacted */}
            <div className="overview-section">
                <h4 className="overview-section-title">
                    <HugeiconsIcon icon={FolderIcon} size={16} strokeWidth={2} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                    Contracts Interacted
                </h4>
                {(result.projectsInteracted || []).slice(0, 5).map((project, i) => (
                    <motion.div
                        key={project.contractAddress}
                        className="overview-item"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <div>
                            <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>
                                {project.projectName || formatAddress(project.contractAddress)}
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                {project.interactionCount} interactions
                            </div>
                        </div>
                        <span className="risk-badge low">{project.category}</span>
                    </motion.div>
                ))}
            </div>

            {/* Same Block Activity */}
            {result.sameBlockTransactions?.length > 0 && (
                <div className="overview-section">
                    <h4 className="overview-section-title">
                        <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={2} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                        Same Block Activity
                    </h4>
                    {result.sameBlockTransactions.slice(0, 3).map((group, i) => (
                        <motion.div
                            key={group.blockNumber}
                            className={`overview-item ${group.isSuspicious ? 'alert warning' : ''}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            style={{
                                background: group.isSuspicious ? 'var(--color-warning-bg)' : undefined,
                                borderLeft: group.isSuspicious ? '3px solid var(--color-warning-text)' : undefined,
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                                    Block #{group.blockNumber}
                                </span>
                                {group.isSuspicious && (
                                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-text)' }}>
                                        {group.reason}
                                    </span>
                                )}
                            </div>
                            <span className="risk-badge medium">{group.transactions?.length || 0} txs</span>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Suspicious Tab Component
function SuspiciousTab({ indicators }: { indicators: SuspiciousIndicator[] }) {
    const [expandedIndicators, setExpandedIndicators] = useState<Set<number>>(new Set());

    const toggleExpand = (index: number) => {
        setExpandedIndicators(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    };

    if ((indicators?.length || 0) === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="empty-state"
                style={{ padding: 'var(--space-8)' }}
            >
                <div className="empty-state-icon" style={{ color: 'var(--color-success-text)' }}>
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} strokeWidth={2} />
                </div>
                <h3 className="empty-state-title">No Suspicious Activity Detected</h3>
                <p className="empty-state-text">
                    This wallet shows no obvious signs of suspicious behavior.
                </p>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
        >
            {indicators.map((indicator, i) => {
                const isExpanded = expandedIndicators.has(i);
                return (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        style={{
                            padding: 'var(--space-4)',
                            background:
                                indicator.severity === 'critical' || indicator.severity === 'high'
                                    ? 'var(--color-danger-bg)'
                                    : indicator.severity === 'medium'
                                        ? 'var(--color-warning-bg)'
                                        : 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            borderLeft: `3px solid ${indicator.severity === 'critical' || indicator.severity === 'high'
                                ? 'var(--color-danger-text)'
                                : indicator.severity === 'medium'
                                    ? 'var(--color-warning-text)'
                                    : 'var(--color-text-muted)'
                                }`,
                        }}
                    >
                        <div 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', cursor: 'pointer' }}
                            onClick={() => toggleExpand(i)}
                        >
                            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', flex: 1 }}>
                                {indicator.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                                <span className={`risk-badge ${indicator.severity}`}>
                                    {indicator.severity}
                                </span>
                                <span style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-text-muted)'
                                }}>
                                    +{indicator.score} pts
                                </span>
                                <span style={{
                                    fontSize: 'var(--text-xs)',
                                    color: 'var(--color-text-muted)',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                }}>
                                    ▼
                                </span>
                            </div>
                        </div>

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--space-3)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                                        {indicator.description}
                                    </p>

                                    {(indicator.evidence?.length || 0) > 0 && (
                                        <div style={{
                                            fontSize: 'var(--text-xs)',
                                            color: 'var(--color-text-muted)',
                                            fontFamily: 'var(--font-mono)',
                                        }}>
                                            Evidence:
                                            <ul style={{ margin: 'var(--space-1) 0 0 var(--space-4)', padding: 0 }}>
                                                {indicator.evidence.map((e, j) => (
                                                    <li key={j} style={{ wordBreak: 'break-all' }}>{e}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}
        </motion.div>
    );
}

// Report Tab Component
function ReportTab({
    address,
    chain,
    reportStatus,
    reportContent,
    reportError,
    reportRef,
    onGenerate,
    onCancel,
    onCopy,
    onExportPdf,
    onNew,
}: {
    address: string;
    chain: string;
    reportStatus: 'idle' | 'loading' | 'streaming' | 'complete' | 'error';
    reportContent: string;
    reportError: string;
    reportRef: React.RefObject<HTMLDivElement>;
    onGenerate: () => void;
    onCancel: () => void;
    onCopy: () => void;
    onExportPdf: () => void;
    onNew: () => void;
}) {
    if (reportStatus === 'idle' && !reportContent) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-8)',
                gap: 'var(--space-4)',
            }}>
                <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 48, height: 48, color: 'var(--color-text-muted)' }}>
                    <path d="M3 1h5l4 4v8H3V1z"/>
                    <path d="M8 1v4h4M5 7h4M5 9.5h4"/>
                </svg>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                    AI Investigation Report
                </h3>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', textAlign: 'center', maxWidth: 400, margin: 0 }}>
                    Generate a professional investigation report with executive summary, fund flow analysis, risk assessment, and more.
                </p>
                <button
                    className="btn btn-primary"
                    onClick={onGenerate}
                    style={{ padding: 'var(--space-3) var(--space-6)', fontSize: 'var(--text-sm)' }}
                >
                    <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                        <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5l3 3"/>
                    </svg>
                    Generate Report
                </button>
            </div>
        );
    }

    if (reportStatus === 'loading') {
        return (
            <div style={{ padding: 'var(--space-4)' }}>
                <div className="report-skeleton">
                    <div className="skeleton-line" style={{ width: '60%', height: 24, marginBottom: 16 }} />
                    <div className="skeleton-line" style={{ width: '40%', height: 16, marginBottom: 8 }} />
                    <div className="skeleton-line" style={{ width: '80%', height: 16, marginBottom: 8 }} />
                    <div className="skeleton-line" style={{ width: '70%', height: 16, marginBottom: 24 }} />
                    <div className="skeleton-section" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
                        <div className="skeleton-line" style={{ width: '30%', height: 20, marginBottom: 12 }} />
                        <div className="skeleton-line" style={{ width: '90%', height: 14, marginBottom: 6 }} />
                        <div className="skeleton-line" style={{ width: '85%', height: 14, marginBottom: 6 }} />
                        <div className="skeleton-line" style={{ width: '75%', height: 14, marginBottom: 6 }} />
                    </div>
                </div>
            </div>
        );
    }

    if (reportStatus === 'error') {
        return (
            <div style={{
                padding: 'var(--space-6)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--space-3)',
                background: 'var(--color-danger-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-danger-text)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--color-danger-text)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                    </svg>
                    Report Generation Failed
                </div>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>{reportError}</p>
                <button className="btn btn-primary" onClick={onGenerate} style={{ marginTop: 8 }}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
                paddingBottom: 'var(--space-3)',
                borderBottom: '1px solid var(--color-border)',
            }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>
                    Report: {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                {reportStatus === 'streaming' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-accent)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)', animation: 'pulse-dot 1s ease-in-out infinite' }} />
                        Generating...
                    </div>
                )}
            </div>
            <div
                ref={reportRef}
                className="report-content"
                style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: 'var(--color-text-primary)',
                }}
                dangerouslySetInnerHTML={{
                    __html: reportContent
                        .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;margin:16px 0 8px;color:var(--color-accent)">$1</h3>')
                        .replace(/^## (.+)$/gm, '<h2 style="font-size:18px;font-weight:600;margin:20px 0 10px;color:var(--color-text-primary);border-bottom:1px solid var(--color-border);padding-bottom:6px">$1</h2>')
                        .replace(/^# (.+)$/gm, '<h1 style="font-size:22px;font-weight:700;margin:24px 0 12px;color:var(--color-text-primary)">$1</h1>')
                        .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--color-text-primary)">$1</strong>')
                        .replace(/\n/g, '<br/>'),
                }}
            />
            {reportStatus === 'complete' && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={onCopy}>
                        Copy
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={onExportPdf}>
                        Export PDF
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={onNew}>
                        New Report
                    </button>
                </div>
            )}
        </div>
    );
}

export default AnalysisView;
