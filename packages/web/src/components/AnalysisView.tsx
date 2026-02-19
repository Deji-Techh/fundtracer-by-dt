import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
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
} from '@hugeicons/core-free-icons';
import { AnalysisResult, SuspiciousIndicator, FundingNode } from '@fundtracer/core';
import FundingTree from './FundingTree';
import TransactionList from './TransactionList';
import AddressLabel from './AddressLabel';
import { fetchFundingTree } from '../api';
import { useIsMobile } from '../hooks/useIsMobile';

interface AnalysisViewProps {
    result: AnalysisResult;
    pagination?: { total: number; offset: number; limit: number; hasMore: boolean } | null;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}

type TabId = 'overview' | 'funding' | 'transactions' | 'suspicious';

function AnalysisView({ result, pagination, loadingMore, onLoadMore }: AnalysisViewProps) {
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [fundingSources, setFundingSources] = useState<FundingNode | null>(null);
    const [fundingDestinations, setFundingDestinations] = useState<FundingNode | null>(null);
    const [treeLoading, setTreeLoading] = useState(false);
    const [treeError, setTreeError] = useState<string | null>(null);
    const [treeDepth, setTreeDepth] = useState(2);
    const isMobile = useIsMobile();

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
                                {result.wallet.balanceInEth.toFixed(4)} ETH
                            </span>
                            {result.wallet.isContract && (
                                <span className="risk-badge medium">Contract</span>
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
                        +{result.summary.totalValueReceivedEth.toFixed(4)} ETH
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Total Sent</div>
                    <div className="stat-value negative">
                        -{result.summary.totalValueSentEth.toFixed(4)} ETH
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
                        <HugeiconsIcon icon={InformationDiamondIcon} size={16} strokeWidth={2} />
                        <span>Overview</span>
                    </button>
                    <button
                        className={`tab-flat ${activeTab === 'funding' ? 'active' : ''}`}
                        onClick={() => setActiveTab('funding')}
                    >
                        <HugeiconsIcon icon={WorkflowSquare01Icon} size={16} strokeWidth={2} />
                        <span>Funding Tree</span>
                    </button>
                    <button
                        className={`tab-flat ${activeTab === 'transactions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('transactions')}
                    >
                        <HugeiconsIcon icon={ArrowAllDirectionIcon} size={16} strokeWidth={2} />
                        <span>Transactions ({result.transactions.length})</span>
                    </button>
                    <button
                        className={`tab-flat ${activeTab === 'suspicious' ? 'active' : ''}`}
                        onClick={() => setActiveTab('suspicious')}
                    >
                        <HugeiconsIcon icon={AlertDiamondIcon} size={16} strokeWidth={2} />
                        <span>Suspicious ({result.suspiciousIndicators.length})</span>
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
                        <OverviewTab result={result} formatAddress={formatAddress} isMobile={isMobile} />
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
                </motion.div>
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
    isMobile
}: {
    result: AnalysisResult;
    formatAddress: (addr: string) => string;
    isMobile: boolean;
}) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? '100%' : '280px'}, 1fr))`, gap: 'var(--space-6)' }}>
            {/* Top Funding Sources */}
            <div>
                <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Top Funding Sources
                </h4>
                {result.summary.topFundingSources.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {result.summary.topFundingSources.map((source) => (
                            <div
                                key={source.address}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: 'var(--space-3)',
                                    background: 'var(--color-bg-tertiary)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-surface-border)',
                                }}
                            >
                                <span className="tx-address">{formatAddress(source.address)}</span>
                                <span className="tx-value incoming">+{source.valueEth.toFixed(4)} ETH</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No funding sources found</p>
                )}
            </div>

            {/* Top Destinations */}
            <div>
                <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Top Destinations
                </h4>
                {result.summary.topFundingDestinations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {result.summary.topFundingDestinations.map((dest) => (
                            <div
                                key={dest.address}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: 'var(--space-3)',
                                    background: 'var(--color-bg-tertiary)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--color-surface-border)',
                                }}
                            >
                                <span className="tx-address">{formatAddress(dest.address)}</span>
                                <span className="tx-value outgoing">-{dest.valueEth.toFixed(4)} ETH</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No destinations found</p>
                )}
            </div>

            {/* Projects Interacted */}
            <div>
                <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Contracts Interacted
                </h4>
                {result.projectsInteracted.slice(0, 5).map((project) => (
                    <div
                        key={project.contractAddress}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 'var(--space-3)',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            marginBottom: 'var(--space-2)',
                            border: '1px solid var(--color-surface-border)',
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>
                                {project.projectName || formatAddress(project.contractAddress)}
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                {project.interactionCount} interactions
                            </div>
                        </div>
                        <span
                            style={{
                                padding: 'var(--space-1) var(--space-2)',
                                background: 'var(--color-bg-elevated)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--text-xs)',
                                color: 'var(--color-text-muted)',
                            }}
                        >
                            {project.category}
                        </span>
                    </div>
                ))}
            </div>

            {/* Same Block Activity */}
            {result.sameBlockTransactions.length > 0 && (
                <div>
                    <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Same Block Activity
                    </h4>
                    {result.sameBlockTransactions.slice(0, 3).map((group) => (
                        <div
                            key={group.blockNumber}
                            className={group.isSuspicious ? 'alert warning' : ''}
                            style={{
                                padding: 'var(--space-3)',
                                background: group.isSuspicious ? 'var(--color-warning-bg)' : 'var(--color-bg-tertiary)',
                                borderRadius: 'var(--radius-sm)',
                                marginBottom: 'var(--space-2)',
                                border: group.isSuspicious ? 'none' : '1px solid var(--color-surface-border)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                                    Block #{group.blockNumber}
                                </span>
                                <span style={{
                                    fontSize: 'var(--text-xs)',
                                    color: group.isSuspicious ? 'var(--color-warning-text)' : 'var(--color-text-muted)'
                                }}>
                                    {group.transactions.length} txs
                                </span>
                            </div>
                            {group.isSuspicious && (
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning-text)' }}>
                                    {group.reason}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Suspicious Tab Component
function SuspiciousTab({ indicators }: { indicators: SuspiciousIndicator[] }) {
    if (indicators.length === 0) {
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
            {indicators.map((indicator, i) => (
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
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
                        </div>
                    </div>

                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
                        {indicator.description}
                    </p>

                    {indicator.evidence.length > 0 && (
                        <div style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            Evidence:
                            <ul style={{ margin: 'var(--space-1) 0 0 var(--space-4)', padding: 0 }}>
                                {indicator.evidence.map((e, j) => (
                                    <li key={j}>{e}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </motion.div>
            ))}
        </motion.div>
    );
}

export default AnalysisView;
