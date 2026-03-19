import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Transaction, ChainId, TxStatus, CHAINS } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';
import { getLabel } from '../utils/addressBook';

const TokenIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v12M8 10h8M8 14h8"/>
  </svg>
);

const ProtocolIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
);

const ContractIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

interface TransactionListProps {
    transactions: Transaction[];
    chain: ChainId;
    pagination?: { total: number; offset: number; limit: number; hasMore: boolean } | null;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}

type SortField = 'timestamp' | 'value' | 'status';
type SortDirection = 'asc' | 'desc';

function TransactionList({ transactions, chain, pagination, loadingMore, onLoadMore }: TransactionListProps) {
    const [sortField, setSortField] = useState<SortField>('timestamp');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [filterType, setFilterType] = useState<'all' | 'transfer' | 'token_transfer' | 'incoming' | 'outgoing'>('all');
    const [filterStatus, setFilterStatus] = useState<TxStatus | 'all'>('all');
    const [page, setPage] = useState(0);
    const pageSize = 25;

    // Ref for infinite scroll sentinel
    const sentinelRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();

    const chainConfig = CHAINS[chain];

    const filteredAndSorted = useMemo(() => {
        let result = [...transactions];

        // Apply simplified filters
        if (filterType === 'transfer') {
            result = result.filter(tx => tx.category === 'transfer');
        } else if (filterType === 'token_transfer') {
            result = result.filter(tx => tx.category === 'token_transfer');
        } else if (filterType === 'incoming') {
            result = result.filter(tx => tx.isIncoming);
        } else if (filterType === 'outgoing') {
            result = result.filter(tx => !tx.isIncoming);
        }

        if (filterStatus !== 'all') {
            result = result.filter(tx => tx.status === filterStatus);
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'timestamp':
                    comparison = a.timestamp - b.timestamp;
                    break;
                case 'value':
                    comparison = a.valueInEth - b.valueInEth;
                    break;
                case 'status':
                    comparison = a.status.localeCompare(b.status);
                    break;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [transactions, filterType, filterStatus, sortField, sortDirection]);

    const paginatedTxs = filteredAndSorted.slice(page * pageSize, (page + 1) * pageSize);
    const totalPages = Math.ceil(filteredAndSorted.length / pageSize);

    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    const formatDate = (timestamp: number) => new Date(timestamp * 1000).toLocaleString();
    const formatHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    // Infinite scroll: observe sentinel element
    useEffect(() => {
        if (!sentinelRef.current || !onLoadMore || !pagination?.hasMore || loadingMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && pagination?.hasMore && !loadingMore) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [onLoadMore, pagination?.hasMore, loadingMore]);

    return (
        <div>
            {/* Filters */}
            <div className="filter-panel">
                <div className="filter-group">
                    <label className="filter-label">Category</label>
                    <select
                        className="filter-select"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                    >
                        <option value="all">All Categories</option>
                        <option value="transfer">Transfer</option>
                        <option value="token_transfer">Token Transfer</option>
                        <option value="incoming">Incoming tx</option>
                        <option value="outgoing">Outgoing tx</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Status</label>
                    <select
                        className="filter-select"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as TxStatus | 'all')}
                    >
                        <option value="all">All</option>
                        <option value="success">Success</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>

                <div style={{ flex: 1 }} />

                <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', alignSelf: 'flex-end' }}>
                    Showing {filteredAndSorted.length} of {transactions.length} transactions
                </div>
            </div>

            {/* Mobile: Card-based layout */}
            {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {paginatedTxs.map((tx) => (
                        <div
                            key={tx.hash}
                            style={{
                                background: 'var(--color-bg-tertiary)',
                                borderRadius: 8,
                                padding: 12,
                                borderLeft: `3px solid ${tx.isIncoming ? 'var(--color-positive)' : 'var(--color-negative)'}`,
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span className={`tx-value ${tx.isIncoming ? 'incoming' : 'outgoing'}`} style={{ fontSize: 14, fontWeight: 600 }}>
                                    {tx.isIncoming ? '+' : '-'}{tx.valueInEth.toFixed(4)} ETH
                                </span>
                                <span className={`tx-status ${tx.status}`} style={{ fontSize: 12 }}>
                                    {tx.status === 'success' ? '✓' : '✗'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--color-text-muted)' }}>
                                <span>{tx.timestamp > 0 ? new Date(tx.timestamp * 1000).toLocaleDateString() : '-'}</span>
                                <a
                                    href={`${chainConfig.explorer}/tx/${tx.hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: 'var(--color-text-secondary)', padding: '4px 0', minHeight: 44, display: 'flex', alignItems: 'center' }}
                                >
                                    {tx.hash.slice(0, 8)}...
                                </a>
                            </div>
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
                                <div style={{ marginBottom: 2 }}>
                                    From: <span style={{ fontFamily: 'monospace' }}>
                                        {getLabel(tx.from) || (tx as any).fromLabel || tx.from.slice(0, 10) + '...'}
                                    </span>
                                </div>
                                {tx.to && (
                                    <div>
                                        To: <span style={{ fontFamily: 'monospace' }}>
                                            {getLabel(tx.to) || (tx as any).toLabel || tx.to.slice(0, 10) + '...'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Desktop: Table layout */
                <div style={{ overflowX: 'auto' }}>
                    <table className="tx-table">
                        <thead>
                            <tr>
                                <th>Hash</th>
                                <th
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleSort('timestamp')}
                                >
                                    Time {sortField === 'timestamp' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>From</th>
                                <th>To</th>
                                <th
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleSort('value')}
                                >
                                    Value {sortField === 'value' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                                <th>Category</th>
                                <th
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleSort('status')}
                                >
                                    Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedTxs.map((tx) => (
                                <tr key={tx.hash}>
                                    <td>
                                        <a
                                            href={`${chainConfig.explorer}/tx/${tx.hash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tx-hash"
                                        >
                                            {formatHash(tx.hash)}
                                        </a>
                                    </td>
                                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                                        {tx.timestamp > 0 ? formatDate(tx.timestamp) : <span title="Timestamp missing">-</span>}
                                    </td>
                                    <td>
                                        <a
                                            href={`${chainConfig.explorer}/address/${tx.from}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="tx-address"
                                            style={{ color: getLabel(tx.from) ? 'var(--color-primary-text)' : 'var(--color-text-primary)', fontWeight: getLabel(tx.from) ? 600 : 400 }}
                                            title={tx.from}
                                        >
                                            {getLabel(tx.from) || (tx as any).fromLabel || formatAddress(tx.from)}
                                        </a>
                                        {(tx as any).fromType === 'token' && (
                                            <span style={{ marginLeft: '4px', color: 'var(--color-primary)' }} title="Token">
                                              <TokenIcon />
                                            </span>
                                        )}
                                        {(tx as any).fromType === 'protocol' && (
                                            <span style={{ marginLeft: '4px', color: 'var(--color-accent)' }} title="Protocol">
                                              <ProtocolIcon />
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {tx.to ? (
                                            <>
                                                <a
                                                    href={`${chainConfig.explorer}/address/${tx.to}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="tx-address"
                                                    style={{
                                                        color: getLabel(tx.to) || (tx as any).toLabel ? 'var(--color-primary)' : 'var(--color-text-primary)',
                                                        fontWeight: getLabel(tx.to) || (tx as any).toLabel ? 500 : 400
                                                    }}
                                                    title={tx.to}
                                                >
                                                    {getLabel(tx.to) || (tx as any).toLabel || formatAddress(tx.to)}
                                                </a>
                                                {(tx as any).toType === 'token' && (
                                                    <span style={{ marginLeft: '4px', color: 'var(--color-primary)' }} title="Token Contract">
                                                      <TokenIcon />
                                                    </span>
                                                )}
                                                {(tx as any).toType === 'protocol' && (
                                                    <span style={{ marginLeft: '4px', color: 'var(--color-accent)' }} title="Protocol">
                                                      <ProtocolIcon />
                                                    </span>
                                                )}
                                                {(tx as any).toType === 'contract' && (
                                                    <span style={{ marginLeft: '4px', color: 'var(--color-text-muted)' }} title="Known Contract">
                                                      <ContractIcon />
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span style={{ color: 'var(--color-text-muted)' }}>Contract Creation</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`tx-value ${tx.isIncoming ? 'incoming' : 'outgoing'}`}>
                                            {tx.isIncoming ? '+' : '-'}{tx.valueInEth.toFixed(4)} {
                                                (tx.category === 'token_transfer' && tx.tokenTransfers && tx.tokenTransfers.length > 0)
                                                    ? tx.tokenTransfers[0].tokenSymbol
                                                    : 'ETH'
                                            }
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            fontSize: 'var(--text-xs)',
                                            padding: 'var(--space-1) var(--space-2)',
                                            background: 'var(--color-bg-elevated)',
                                            borderRadius: 'var(--radius-sm)',
                                            color: 'var(--color-text-muted)',
                                        }}>
                                            {tx.category.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`tx-status ${tx.status}`}>
                                            {tx.status === 'success' ? '✓' : '✗'} {tx.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    marginTop: 'var(--space-4)'
                }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        ← Prev
                    </button>

                    <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                        Page {page + 1} of {totalPages}
                    </span>

                    <button
                        className="btn btn-ghost"
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                    >
                        Next →
                    </button>
                </div>
            )}

            {/* Infinite Scroll: Pagination Info & Loading */}
            {pagination && (
                <div style={{
                    padding: 'var(--space-4)',
                    textAlign: 'center',
                    borderTop: '1px solid var(--color-surface-border)',
                    marginTop: 'var(--space-4)',
                }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                        Showing {transactions.length} of {pagination.total} transactions
                    </div>

                    {loadingMore && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                            <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                                Loading more transactions...
                            </span>
                        </div>
                    )}

                    {!pagination.hasMore && pagination.total > 0 && (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
                            All transactions loaded
                        </span>
                    )}
                </div>
            )}

            {/* Sentinel element for infinite scroll */}
            {pagination?.hasMore && !loadingMore && (
                <div ref={sentinelRef} style={{ height: 1 }} />
            )}
        </div>
    );
}

export default TransactionList;
