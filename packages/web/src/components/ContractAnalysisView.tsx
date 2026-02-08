import React, { useMemo, useState } from 'react';
import { ChainId, CHAINS } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';

// Types for contract analysis
interface ContractInteractor {
    address: string;
    interactionCount: number;
    firstInteraction: number;
    lastInteraction: number;
    totalValueIn: number;
    totalValueOut: number;
    fundingSource: string | null;
}

interface SharedFundingGroup {
    funder: string;
    wallets: string[];
    totalFunded: number;
    pattern: 'same_amount' | 'similar_timing' | 'both';
}

interface ContractAnalysisResult {
    contractAddress: string;
    chain: ChainId;
    totalInteractors: number;
    interactors: ContractInteractor[];
    sharedFundingGroups: SharedFundingGroup[];
    suspiciousPatterns: {
        type: string;
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        wallets: string[];
    }[];
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
                return sorted.sort((a, b) => (b.totalValueIn + b.totalValueOut) - (a.totalValueIn + a.totalValueOut));
            case 'recent':
                return sorted.sort((a, b) => b.lastInteraction - a.lastInteraction);
            default:
                return sorted;
        }
    }, [result.interactors, sortBy]);

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const formatDate = (ts: number) => new Date(ts * 1000).toLocaleDateString();
    const formatValue = (val: number) => val < 0.0001 ? '<0.0001' : val.toFixed(4);

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
                    <div className="stat-value" style={{ color: result.sharedFundingGroups.length > 0 ? 'var(--color-warning-text)' : undefined }}>
                        {result.sharedFundingGroups.length}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Suspicious Patterns</div>
                    <div className="stat-value" style={{ color: result.suspiciousPatterns.length > 0 ? 'var(--color-danger-text)' : undefined }}>
                        {result.suspiciousPatterns.length}
                    </div>
                </div>
            </div>

            {/* Suspicious Patterns Alert */}
            {result.suspiciousPatterns.length > 0 && (
                <div className="alert danger" style={{ marginBottom: 'var(--space-4)' }}>
                    <strong style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                        Suspicious Activity Detected
                    </strong>
                    <div style={{ fontSize: 'var(--text-sm)' }}>
                        {result.suspiciousPatterns.length} pattern(s) detected that indicate coordinated behavior.
                    </div>
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
                                        background: 'var(--color-warning-bg)',
                                        borderRadius: 'var(--radius-md)',
                                        borderLeft: '3px solid var(--color-warning-text)',
                                    }}
                                >
                                    <div style={{ marginBottom: 'var(--space-3)' }}>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 'var(--space-1)' }}>
                                            Funder
                                        </div>
                                        <a
                                            href={`${chainConfig.explorer}/address/${group.funder}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tx-address"
                                            style={{ fontSize: 'var(--text-sm)' }}
                                        >
                                            {group.funder}
                                        </a>
                                    </div>

                                    <div style={{ marginBottom: 'var(--space-2)' }}>
                                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                                            Funded {group.wallets.length} wallets that interacted with this contract:
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

                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                        Pattern: {group.pattern === 'both' ? 'Same amount + Similar timing' :
                                            group.pattern === 'same_amount' ? 'Same funding amount' : 'Similar timing'}
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

                {isMobile ? (
                    /* Mobile: Card-based layout */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {sortedInteractors.map((interactor) => {
                            const hasSharedFunding = result.sharedFundingGroups.some(g => g.wallets.includes(interactor.address));
                            return (
                                <div
                                    key={interactor.address}
                                    style={{
                                        padding: 12,
                                        background: hasSharedFunding ? 'var(--color-warning-bg)' : 'var(--color-bg-tertiary)',
                                        borderRadius: 8,
                                        borderLeft: `3px solid ${hasSharedFunding ? 'var(--color-warning-text)' : 'var(--color-surface-border)'}`,
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
                                            <span className="tx-value incoming">{formatValue(interactor.totalValueIn)} ETH</span>
                                        </div>
                                        <div>
                                            <span style={{ color: 'var(--color-text-muted)' }}>Out: </span>
                                            <span className="tx-value outgoing">{formatValue(interactor.totalValueOut)} ETH</span>
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
                                                style={{ color: hasSharedFunding ? 'var(--color-warning-text)' : undefined, fontSize: 11 }}
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
                                            style={{ background: hasSharedFunding ? 'var(--color-warning-bg)' : undefined }}
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
                                                {formatValue(interactor.totalValueIn)} ETH
                                            </td>
                                            <td className="tx-value outgoing">
                                                {formatValue(interactor.totalValueOut)} ETH
                                            </td>
                                            <td>
                                                {interactor.fundingSource ? (
                                                    <a
                                                        href={`${chainConfig.explorer}/address/${interactor.fundingSource}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="tx-address"
                                                        style={{ color: hasSharedFunding ? 'var(--color-warning-text)' : undefined }}
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
