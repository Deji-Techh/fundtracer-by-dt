import React, { useState } from 'react';
import { AnalysisResult, SuspiciousIndicator, FundingNode } from '@fundtracer/core';
import FundingTree from './FundingTree';
import TransactionList from './TransactionList';
import AddressLabel from './AddressLabel';
import { fetchFundingTree } from '../api';

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

    // Check if tree data was already included in the analysis result (non-empty children)
    const hasPreloadedTree = result.fundingSources?.children?.length > 0 || result.fundingDestinations?.children?.length > 0;
    const treeGenerated = hasPreloadedTree || fundingSources !== null;

    const handleGenerateTree = async () => {
        setTreeLoading(true);
        setTreeError(null);
        try {
            const response = await fetchFundingTree(result.wallet.address, result.wallet.chain);
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

    return (
        <div className="stagger-children">
            {/* Wallet Summary Card */}
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div>
                        <div style={{ marginBottom: 'var(--space-2)' }}>
                            <AddressLabel
                                address={result.wallet.address}
                                editable={true}
                                showAddress={true}
                                style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 'var(--text-lg)',
                                    fontWeight: 'bold',
                                    color: 'var(--color-text-primary)'
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

                {/* Actions Bar */}
                <div style={{ padding: '0 var(--space-4) var(--space-4)', display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => import('../utils/exportReport').then(mod => mod.generatePDFReport(result))}
                        title="Download PDF Report"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Export Report
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
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
            </div>

            {/* Tabs */}
            <div className="card">
                <div className="tabs">
                    <button
                        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab ${activeTab === 'funding' ? 'active' : ''}`}
                        onClick={() => setActiveTab('funding')}
                    >
                        Funding Tree
                    </button>
                    <button
                        className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('transactions')}
                    >
                        Transactions ({result.transactions.length})
                    </button>
                    <button
                        className={`tab ${activeTab === 'suspicious' ? 'active' : ''}`}
                        onClick={() => setActiveTab('suspicious')}
                    >
                        Suspicious ({result.suspiciousIndicators.length})
                    </button>
                </div>

                {/* Tab Content */}
                <div className="animate-fade-in">
                    {activeTab === 'overview' && (
                        <OverviewTab result={result} formatAddress={formatAddress} />
                    )}

                    {activeTab === 'funding' && (
                        <div>
                            {!treeGenerated ? (
                                /* Show "Generate" button when tree hasn't been loaded yet */
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 'var(--space-8)',
                                    gap: 'var(--space-4)',
                                }}>
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-text-muted)' }}>
                                        <path d="M12 2v6m0 0l3-3m-3 3L9 5" />
                                        <path d="M2 12h6m0 0L5 9m3 3l-3 3" />
                                        <path d="M12 22v-6m0 0l3 3m-3-3l-3 3" />
                                        <path d="M22 12h-6m0 0l3-3m-3 3l3 3" />
                                    </svg>
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

                                    <button
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
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M12 2v6m0 0l3-3m-3 3L9 5" />
                                                    <circle cx="12" cy="12" r="10" />
                                                </svg>
                                                Generate Funding Tree
                                            </>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                /* Show tree visualization once generated */
                                <div>
                                    <h3 style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Funding Sources</h3>
                                    <FundingTree node={displaySources} direction="source" />

                                    <h3 style={{ margin: 'var(--space-6) 0 var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>Funding Destinations</h3>
                                    <FundingTree node={displayDestinations} direction="destination" />
                                </div>
                            )}
                        </div>
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
                </div>
            </div>
        </div>
    );
}

// Overview Tab Component
function OverviewTab({
    result,
    formatAddress
}: {
    result: AnalysisResult;
    formatAddress: (addr: string) => string;
}) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-6)' }}>
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
            <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                <div className="empty-state-icon" style={{ color: 'var(--color-success-text)' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                </div>
                <h3 className="empty-state-title">No Suspicious Activity Detected</h3>
                <p className="empty-state-text">
                    This wallet shows no obvious signs of suspicious behavior.
                </p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {indicators.map((indicator, i) => (
                <div
                    key={i}
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
                </div>
            ))}
        </div>
    );
}

export default AnalysisView;
