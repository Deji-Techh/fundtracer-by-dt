import React, { useMemo, useState } from 'react';
import { ChainId, CHAINS } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';

// Types aligned with WalletAnalyzer.analyzeContract() return shape
interface ContractInteractor {
    address: string;
    interactionCount: number;
    firstInteraction: number;
    lastInteraction: number;
    totalValueInEth: number;
    totalValueOutEth: number;
    fundingSource?: string;
}

interface SharedFundingGroup {
    fundingSource: string;
    wallets: string[];
    count: number;
}

interface SuspiciousPattern {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    evidence?: string[];
    score?: number;
}

interface ContractAnalysisResult {
    contractAddress: string;
    chain: ChainId;
    totalInteractors: number;
    interactors: ContractInteractor[];
    sharedFundingGroups: SharedFundingGroup[];
    suspiciousPatterns: SuspiciousPattern[];
    riskScore: number;
}

interface ContractAnalysisViewProps {
    result: ContractAnalysisResult;
}

function ContractAnalysisView({ result }: ContractAnalysisViewProps) {
    const [sortBy, setSortBy] = useState<'interactions' | 'value' | 'recent'>('interactions');
    const [showSharedFunding, setShowSharedFunding] = useState(true);
    const isMobile = useIsMobile();

    const chainConfig = CHAINS[result.chain];

    const sortedInteractors = useMemo(() => {
        const sorted = [...result.interactors];
        switch (sortBy) {
            case 'interactions':
                return sorted.sort((a, b) => b.interactionCount - a.interactionCount);
            case 'value':
                return sorted.sort((a, b) => (b.totalValueInEth + b.totalValueOutEth) - (a.totalValueInEth + a.totalValueOutEth));
            case 'recent':
                return sorted.sort((a, b) => b.lastInteraction - a.lastInteraction);
            default:
                return sorted;
        }
    }, [result.interactors, sortBy]);

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString();
    const formatValue = (val: number) => val < 0.0001 ? '<0.0001' : val.toFixed(4);

    const severityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'var(--color-danger, #ef4444)';
            case 'high': return 'var(--color-danger, #ef4444)';
            case 'medium': return 'var(--color-warning, #f59e0b)';
            case 'low': return 'var(--color-text-muted)';
            default: return 'var(--color-text-muted)';
        }
    };

    return (
        <div className="stagger-children">
            {/* Contract Summary */}
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                    <div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-1)' }}>
                            Contract Address
                        </div>
                        <a
                            href={`${chainConfig.explorer}/address/${result.contractAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 'var(--text-sm)',
                                wordBreak: 'break-all'
                            }}
                        >
                            {result.contractAddress}
                        </a>
                        <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                            {result.chain}
                        </div>
                    </div>
                    {/* Risk Score */}
                    {result.riskScore > 0 && (
                        <div style={{
                            padding: '8px 16px',
                            borderRadius: 'var(--radius-md)',
                            background: result.riskScore >= 50 ? 'rgba(239, 68, 68, 0.1)' : result.riskScore >= 20 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                            border: `1px solid ${result.riskScore >= 50 ? 'var(--color-danger, #ef4444)' : result.riskScore >= 20 ? 'var(--color-warning, #f59e0b)' : 'var(--color-success, #10b981)'}`,
                            textAlign: 'center',
                        }}>
                            <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                fontFamily: 'var(--font-mono)',
                                color: result.riskScore >= 50 ? 'var(--color-danger, #ef4444)' : result.riskScore >= 20 ? 'var(--color-warning, #f59e0b)' : 'var(--color-success, #10b981)',
                            }}>
                                {result.riskScore}
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
                                Risk Score
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid" style={{ marginBottom: 'var(--space-4)' }}>
                <div className="stat-card">
                    <div className="stat-label">Total Interactors</div>
                    <div className="stat-value">{result.totalInteractors}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Shared Funding Groups</div>
                    <div className="stat-value" style={{ color: result.sharedFundingGroups.length > 0 ? 'var(--color-warning-text, var(--color-warning, #f59e0b))' : undefined }}>
                        {result.sharedFundingGroups.length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Suspicious Patterns</div>
                    <div className="stat-value" style={{ color: result.suspiciousPatterns.length > 0 ? 'var(--color-danger-text, var(--color-danger, #ef4444))' : undefined }}>
                        {result.suspiciousPatterns.length}
                    </div>
                </div>
            </div>

            {/* Suspicious Patterns Alert */}
            {result.suspiciousPatterns.length > 0 && (
                <div style={{ marginBottom: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {result.suspiciousPatterns.map((pattern, i) => (
                        <div
                            key={i}
                            style={{
                                padding: 'var(--space-4)',
                                background: 'var(--color-bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                                borderLeft: `3px solid ${severityColor(pattern.severity)}`,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                <span style={{
                                    fontSize: 'var(--text-xs)',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: severityColor(pattern.severity),
                                    letterSpacing: '0.05em'
                                }}>
                                    {pattern.severity} — {pattern.type.replace(/_/g, ' ')}
                                </span>
                                {pattern.score !== undefined && (
                                    <span style={{
                                        fontSize: 'var(--text-xs)',
                                        fontFamily: 'var(--font-mono)',
                                        color: 'var(--color-text-muted)',
                                    }}>
                                        +{pattern.score} pts
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                                {pattern.description}
                            </div>
                            {pattern.evidence && pattern.evidence.length > 0 && (
                                <div style={{ marginTop: 'var(--space-2)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                    {pattern.evidence.map((addr) => (
                                        <a
                                            key={addr}
                                            href={`${chainConfig.explorer}/address/${addr}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                padding: '2px 8px',
                                                background: 'var(--color-bg-tertiary)',
                                                borderRadius: 'var(--radius-sm)',
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 11,
                                                color: 'var(--color-text-secondary)',
                                            }}
                                        >
                                            {formatAddress(addr)}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Shared Funding Groups */}
            {result.sharedFundingGroups.length > 0 && (
                <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="card-header">
                        <h3 className="card-title">Shared Funding Sources</h3>
                        <button className="btn btn-ghost" onClick={() => setShowSharedFunding(!showSharedFunding)}>
                            {showSharedFunding ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    {showSharedFunding && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {result.sharedFundingGroups.map((group, i) => (
                                <div
                                    key={i}
                                    style={{
                                        padding: 'var(--space-4)',
                                        background: 'var(--color-warning-bg, rgba(245, 158, 11, 0.05))',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: '3px solid var(--color-warning-text, var(--color-warning, #f59e0b))',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                                        <div>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                                                Funding Source
                                            </div>
                                            <a
                                                href={`${chainConfig.explorer}/address/${group.fundingSource}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="tx-address"
                                                style={{ fontSize: 'var(--text-sm)' }}
                                            >
                                                {isMobile ? formatAddress(group.fundingSource) : group.fundingSource}
                                            </a>
                                        </div>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: 'var(--color-warning-bg, rgba(245, 158, 11, 0.1))',
                                            border: '1px solid var(--color-warning-text, var(--color-warning, #f59e0b))',
                                            borderRadius: 'var(--radius-sm)',
                                            fontFamily: 'var(--font-mono)',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: 700,
                                            color: 'var(--color-warning-text, var(--color-warning, #f59e0b))',
                                        }}>
                                            {group.count} wallets
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                        {group.wallets.map(wallet => (
                                            <a
                                                key={wallet}
                                                href={`${chainConfig.explorer}/address/${wallet}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    padding: 'var(--space-1) var(--space-2)',
                                                    background: 'var(--color-bg-tertiary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: 'var(--text-xs)',
                                                    color: 'var(--color-text-secondary)',
                                                }}
                                            >
                                                {formatAddress(wallet)}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Interactors Table */}
            <div className="card">
                <div className="card-header" style={{ flexWrap: 'wrap' }}>
                    <h3 className="card-title">All Interacting Wallets</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <button
                            className={`btn ${sortBy === 'interactions' ? 'btn-secondary' : 'btn-ghost'}`}
                            onClick={() => setSortBy('interactions')}
                        >
                            By Count
                        </button>
                        <button
                            className={`btn ${sortBy === 'value' ? 'btn-secondary' : 'btn-ghost'}`}
                            onClick={() => setSortBy('value')}
                        >
                            By Value
                        </button>
                        <button
                            className={`btn ${sortBy === 'recent' ? 'btn-secondary' : 'btn-ghost'}`}
                            onClick={() => setSortBy('recent')}
                        >
                            Recent
                        </button>
                    </div>
                </div>

                {sortedInteractors.length === 0 ? (
                    <div style={{
                        padding: 'var(--space-8)',
                        textAlign: 'center',
                        color: 'var(--color-text-muted)',
                        fontSize: 'var(--text-sm)',
                    }}>
                        No interacting wallets found for this contract.
                    </div>
                ) : isMobile ? (
                    /* Mobile: Card-based layout */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sortedInteractors.map((interactor) => {
                            const hasSharedFunding = result.sharedFundingGroups.some(g => g.wallets.includes(interactor.address));
                            return (
                                <div
                                    key={interactor.address}
                                    style={{
                                        padding: 12,
                                        background: hasSharedFunding ? 'var(--color-warning-bg, rgba(245, 158, 11, 0.05))' : 'var(--color-bg-tertiary)',
                                        borderRadius: 8,
                                        borderLeft: `3px solid ${hasSharedFunding ? 'var(--color-warning-text, var(--color-warning, #f59e0b))' : 'var(--color-surface-border)'}`,
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <a
                                            href={`${chainConfig.explorer}/address/${interactor.address}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tx-address"
                                            style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}
                                        >
                                            {formatAddress(interactor.address)}
                                        </a>
                                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                                            {interactor.interactionCount}x
                                        </span>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
                                        <div>
                                            <span style={{ color: 'var(--color-text-muted)' }}>In: </span>
                                            <span className="tx-value incoming">{formatValue(interactor.totalValueInEth)} ETH</span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Out: </span>
                                            <span className="tx-value outgoing">{formatValue(interactor.totalValueOutEth)} ETH</span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--color-text-muted)' }}>
                                        {formatDate(interactor.firstInteraction)} - {formatDate(interactor.lastInteraction)}
                                    </div>
                                    {interactor.fundingSource && (
                                        <div style={{ marginTop: 6, fontSize: 11 }}>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Funded by: </span>
                                            <a
                                                href={`${chainConfig.explorer}/address/${interactor.fundingSource}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="tx-address"
                                                style={{ color: hasSharedFunding ? 'var(--color-warning-text, var(--color-warning, #f59e0b))' : undefined, fontSize: 11 }}
                                            >
                                                {formatAddress(interactor.fundingSource)}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Desktop: Table layout */
                    <div style={{ overflowX: 'auto' }}>
                        <table className="tx-table">
                            <thead>
                                <tr>
                                    <th>Address</th>
                                    <th>Interactions</th>
                                    <th>First / Last</th>
                                    <th>Value In</th>
                                    <th>Value Out</th>
                                    <th>Funding Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedInteractors.map((interactor) => {
                                    const hasSharedFunding = result.sharedFundingGroups.some(g => g.wallets.includes(interactor.address));
                                    return (
                                        <tr
                                            key={interactor.address}
                                            style={{ background: hasSharedFunding ? 'var(--color-warning-bg, rgba(245, 158, 11, 0.05))' : undefined }}
                                        >
                                            <td>
                                                <a
                                                    href={`${chainConfig.explorer}/address/${interactor.address}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="tx-address"
                                                >
                                                    {formatAddress(interactor.address)}
                                                </a>
                                            </td>
                                            <td style={{ fontFamily: 'var(--font-mono)' }}>
                                                {interactor.interactionCount}
                                            </td>
                                            <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                                {formatDate(interactor.firstInteraction)} / {formatDate(interactor.lastInteraction)}
                                            </td>
                                            <td className="tx-value incoming">
                                                {formatValue(interactor.totalValueInEth)} ETH
                                            </td>
                                            <td className="tx-value outgoing">
                                                {formatValue(interactor.totalValueOutEth)} ETH
                                            </td>
                                            <td>
                                                {interactor.fundingSource ? (
                                                    <a
                                                        href={`${chainConfig.explorer}/address/${interactor.fundingSource}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="tx-address"
                                                        style={{ color: hasSharedFunding ? 'var(--color-warning-text, var(--color-warning, #f59e0b))' : undefined }}
                                                    >
                                                        {formatAddress(interactor.fundingSource)}
                                                    </a>
                                                ) : (
                                                    <span style={{ color: 'var(--color-text-muted)' }}>-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ContractAnalysisView;
export type { ContractAnalysisResult, ContractInteractor, SharedFundingGroup };
