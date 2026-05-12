import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import '../global.css';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Link01Icon,
  UserIcon,
  AlertDiamondIcon,
  CheckmarkCircle02Icon,
  EyeIcon,
  Search01Icon,
  Settings01Icon,
  ArrowUp01Icon,
  ArrowDown01Icon,
} from '@hugeicons/core-free-icons';
import { ChainId, CHAINS } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';
import { getChainTokenSymbol } from '../config/chains';

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

type PageType = 'overview' | 'interactors' | 'shared-funding';

interface ContractGridViewProps {
    result?: ContractAnalysisResult;
}

export default function ContractGridView({ result }: ContractGridViewProps) {
    const [currentPage, setCurrentPage] = useState<PageType>('overview');
    const [sortBy, setSortBy] = useState<'interactions' | 'value' | 'recent'>('interactions');
    const [hoveredAddress, setHoveredAddress] = useState<{ address: string; x: number; y: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    // Debug: log the incoming result
    if (typeof window !== 'undefined') {
            hasResult: !!result,
            hasInteractors: !!(result && result.interactors),
            interactorCount: result?.interactors?.length || 0,
            hasSharedFunding: !!(result && result.sharedFundingGroups),
            sharedFundingCount: result?.sharedFundingGroups?.length || 0,
            hasSuspiciousPatterns: !!(result && result.suspiciousPatterns),
            patternCount: result?.suspiciousPatterns?.length || 0,
        });
    }

    try {
        // Defensive: ensure result exists and has required fields
        if (!result) {
            return (
                <div className="wallet-grid-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                    <p>No contract data available</p>
                </div>
            );
        }

        // Defensive: ensure arrays exist
        const interactors = result?.interactors || [];
        const sharedFundingGroups = result?.sharedFundingGroups || [];
        const suspiciousPatterns = result?.suspiciousPatterns || [];

            interactors: interactors.length,
            sharedFundingGroups: sharedFundingGroups.length,
            suspiciousPatterns: suspiciousPatterns.length,
        });

    const chain = result?.chain || 'linea';
    const chainConfig = CHAINS[chain] || { explorer: 'https://etherscan.io' };
    const tokenSymbol = getChainTokenSymbol(chain);

    const formatAddress = (addr: string) => `${addr?.slice(0, 6)}...${addr?.slice(-4)}` || '';
    const formatDate = (ts: number) => ts ? new Date(ts * 1000).toLocaleDateString() : 'N/A';
    const formatValue = (val: number) => val < 0.0001 ? '<0.0001' : val?.toFixed(4) || '0';

    const pages: PageType[] = ['overview', 'interactors', 'shared-funding'];
    const currentIndex = pages.indexOf(currentPage);
    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex < pages.length - 1;

    const sortedInteractors = useMemo(() => {
        const sorted = [...interactors];
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
    }, [interactors, sortBy]);

    const severityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
            case 'high':
                return 'var(--color-danger-text)';
            case 'medium':
                return 'var(--color-warning-text)';
            case 'low':
                return 'var(--color-text-muted)';
            default:
                return 'var(--color-text-muted)';
        }
    };

    const riskLevel = (result?.riskScore || 0) >= 50 ? 'critical' : (result?.riskScore || 0) >= 20 ? 'medium' : 'low';

    return (
        <div className="wallet-grid-container">
            {/* Collapsed Sidebar */}
            <motion.div 
                className="grid-sidebar"
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
            >
                <div className="sidebar-icons">
                    <motion.button 
                        className={`sidebar-icon ${currentPage === 'overview' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('overview')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Overview"
                    >
                        <HugeiconsIcon icon={UserIcon} size={20} strokeWidth={2} />
                    </motion.button>
                    <motion.button 
                        className={`sidebar-icon ${currentPage === 'interactors' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('interactors')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Interactors"
                    >
                        <HugeiconsIcon icon={Link01Icon} size={20} strokeWidth={2} />
                    </motion.button>
                    <motion.button 
                        className={`sidebar-icon ${currentPage === 'shared-funding' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('shared-funding')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Shared Funding"
                    >
                        <HugeiconsIcon icon={ArrowUp01Icon} size={20} strokeWidth={2} />
                    </motion.button>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="grid-main">
                {/* Navigation Arrows */}
                <div className="grid-nav-arrows">
                    <motion.button 
                        className={`nav-arrow left ${!canGoBack ? 'disabled' : ''}`}
                        onClick={() => setCurrentPage(pages[currentIndex - 1])}
                        disabled={!canGoBack}
                        whileHover={canGoBack ? { scale: 1.1 } : {}}
                        whileTap={canGoBack ? { scale: 0.9 } : {}}
                    >
                        <HugeiconsIcon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
                    </motion.button>
                    <motion.button 
                        className={`nav-arrow right ${!canGoForward ? 'disabled' : ''}`}
                        onClick={() => setCurrentPage(pages[currentIndex + 1])}
                        disabled={!canGoForward}
                        whileHover={canGoForward ? { scale: 1.1 } : {}}
                        whileTap={canGoForward ? { scale: 0.9 } : {}}
                    >
                        <HugeiconsIcon icon={ArrowRightIcon} size={24} strokeWidth={2} />
                    </motion.button>
                </div>

                {/* Page Content */}
                <AnimatePresence mode="wait">
                    {currentPage === 'overview' && (
                        <motion.div
                            key="overview"
                            className="overview-grid"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Top Row */}
                            <div className="grid-row top-row">
                                {/* Contract Info */}
                                <motion.div 
                                    className="grid-box contract-info-box"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div className="box-header">
                                        <h3>Contract Details</h3>
                                        <HugeiconsIcon icon={Link01Icon} size={16} strokeWidth={2} />
                                    </div>
                                        <div className="contract-details">
                                        <div className="detail-item">
                                            <span className="detail-label">Address</span>
                                            <a 
                                                href={`${chainConfig.explorer}/address/${result.contractAddress || ''}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="detail-address"
                                            >
                                                {formatAddress(result.contractAddress || '')}
                                            </a>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Chain</span>
                                            <span className="detail-value">{result.chain || 'unknown'}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Risk Level</span>
                                            <span className={`risk-badge ${riskLevel}`}>{riskLevel}</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Stats */}
                                <motion.div 
                                    className="grid-box stats-box"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className="box-header">
                                        <h3>Statistics</h3>
                                    </div>
                                    <div className="stats-grid-compact">
                                        <div className="stat-item">
                                            <span className="stat-label">Total Interactors</span>
                                            <span className="stat-value">{result.totalInteractors ?? 0}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Shared Funding Groups</span>
                                            <span className="stat-value warning">{result.sharedFundingGroups?.length ?? 0}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Risk Score</span>
                                            <span className={`stat-value ${riskLevel === 'critical' || riskLevel === 'high' || riskLevel === 'medium' ? 'negative' : 'positive'}`}>
                                                {result.riskScore ?? 0}
                                            </span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Suspicious Patterns</span>
                                            <span className="stat-value negative">{result.suspiciousPatterns?.length ?? 0}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Bottom Row */}
                            <div className="grid-row bottom-row">
                                {/* Suspicious Patterns */}
                                <motion.div 
                                    className="grid-box suspicious-box"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="box-header">
                                        <h3>Suspicious Patterns</h3>
                                        <HugeiconsIcon icon={AlertDiamondIcon} size={16} strokeWidth={2} />
                                    </div>
                                    <div className="pattern-list">
                                        {(result.suspiciousPatterns || []).length === 0 ? (
                                            <div className="no-patterns">
                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} strokeWidth={2} />
                                                <p>No suspicious patterns detected</p>
                                            </div>
                                        ) : (
                                            (result.suspiciousPatterns || []).slice(0, 5).map((pattern: any, i: number) => (
                                                <motion.div 
                                                    key={i}
                                                    className={`pattern-item ${String(pattern.severity || 'low')}`}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.4 + i * 0.1 }}
                                                >
                                                    <span className="pattern-type">{(pattern.type || '').toString().replace(/_/g, ' ')}</span>
                                                    <span className="pattern-score">+{Number(pattern.score || 0)}</span>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>

                                {/* Top Interactors Preview */}
                                <motion.div 
                                    className="grid-box interactors-box"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <div className="box-header">
                                        <h3>Top Interactors</h3>
                                    </div>
                                    <div className="interactors-preview">
                                        {sortedInteractors.slice(0, 5).map((interactor, i) => (
                                            <motion.div
                                                key={interactor.address}
                                                className="interactor-item"
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.5 + i * 0.05 }}
                                                style={{ position: 'relative' }}
onMouseEnter={(e: React.MouseEvent) => setHoveredAddress({ address: interactor.address, x: e.clientX, y: e.clientY })}
                                                onMouseLeave={() => setHoveredAddress(null)}
                                            >
                                                <span className="address">{formatAddress(interactor.address)}</span>
                                                <span className="count">{interactor.interactionCount} txns</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {currentPage === 'interactors' && (
                        <motion.div
                            key="interactors"
                            className="interactors-page"
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -300 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="sort-controls">
                                <span>Sort by:</span>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
                                    <option value="interactions">Interactions</option>
                                    <option value="value">Value</option>
                                    <option value="recent">Recent</option>
                                </select>
                            </div>
                            <div className="interactors-table">
                                {sortedInteractors.map((interactor, i) => (
                                    <motion.div
                                        key={interactor.address}
                                        className="table-row"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.02 }}
                                        style={{ position: 'relative' }}
                                        onMouseEnter={(e: React.MouseEvent) => setHoveredAddress({ address: interactor.address, x: e.clientX, y: e.clientY })}
                                        onMouseLeave={() => setHoveredAddress(null)}
                                    >
                                        <span className="col-address">{formatAddress(interactor.address)}</span>
                                        <span className="col-count">{interactor.interactionCount}</span>
                                        <span className="col-value">{(interactor.totalValueInEth + interactor.totalValueOutEth).toFixed(4)} {tokenSymbol}</span>
                                        <span className="col-date">{formatDate(interactor.lastInteraction)}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                            {currentPage === 'shared-funding' && (
                                <motion.div
                                    key="shared-funding"
                                    className="shared-funding-page"
                                    initial={{ opacity: 0, x: 300 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -300 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    {(sharedFundingGroups.length === 0) ? (
                                        <div className="empty-state">
                                            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={48} strokeWidth={2} />
                                            <h3>No Shared Funding Detected</h3>
                                            <p>This contract has no suspicious shared funding patterns.</p>
                                        </div>
                                    ) : (
                                        <div className="shared-groups">
                                            {sharedFundingGroups.map((group: SharedFundingGroup, i: number) => {
                                                const wallets = group?.wallets || [];
                                                const fundingSource = group?.fundingSource;
                                                
                                                return (
                                                    <motion.div
                                                        key={i}
                                                        className="shared-group-card"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: i * 0.1 }}
                                                    >
                                                        <div className="group-header">
                                                            <span className="funding-source">
                                                                {fundingSource ? formatAddress(fundingSource) : 'Unknown'}
                                                            </span>
                                                            <span className="wallet-count">{group.count || 0} wallets</span>
                                                        </div>
                                                        <div className="wallets-list">
                                                            {wallets.length > 0 ? (
                                                                <>
                                                                    {wallets.slice(0, 5).map((wallet: string, j: number) => (
                                                                        <span key={j} className="wallet-chip" 
                                                                            onMouseEnter={(e) => setHoveredAddress({ address: wallet, x: e.clientX, y: e.clientY })}
                                                                            onMouseLeave={() => setHoveredAddress(null)}
                                                                        >
                                                                            {formatAddress(wallet)}
                                                                        </span>
                                                                    ))}
                                                                    {wallets.length > 5 && (
                                                                        <span className="more">+{wallets.length - 5} more</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="no-wallets">No wallet data available</span>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                </AnimatePresence>

                {/* Hover Tooltip */}
                <AnimatePresence>
                    {hoveredAddress && (
                        <motion.div
                            className="hover-tooltip"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
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
                            // Keep tooltip visible when mouse enters it (no state update needed)
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
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <style>{`
                .wallet-grid-container {
                    display: flex;
                    height: 100%;
                    min-height: 600px;
                    gap: var(--space-4);
                    padding: var(--space-4);
                }

                .grid-sidebar {
                    width: 60px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: var(--space-3) var(--space-2);
                    background: var(--color-bg-secondary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--color-surface-border);
                }

                .sidebar-icons {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .sidebar-icon {
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: transparent;
                    border: none;
                    border-radius: var(--radius-md);
                    color: var(--color-text-muted);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .sidebar-icon:hover,
                .sidebar-icon.active {
                    background: var(--color-primary);
                    color: var(--color-primary-text);
                }

                .grid-main {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    position: relative;
                }

                .grid-nav-arrows {
                    position: absolute;
                    top: 50%;
                    left: 0;
                    right: 0;
                    transform: translateY(-50%);
                    display: flex;
                    justify-content: space-between;
                    z-index: 10;
                    pointer-events: none;
                }

                .nav-arrow {
                    width: 44px;
                    height: 44px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--color-bg-elevated);
                    border: 1px solid var(--color-surface-border);
                    border-radius: 50%;
                    color: var(--color-text-primary);
                    cursor: pointer;
                    pointer-events: auto;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }

                .nav-arrow:hover:not(.disabled) {
                    background: var(--color-primary);
                    color: var(--color-primary-text);
                }

                .nav-arrow.disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                }

                .nav-arrow.left { margin-left: -22px; }
                .nav-arrow.right { margin-right: -22px; }

                .overview-grid {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                    height: 100%;
                }

                .grid-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4);
                }

                .grid-box {
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-surface-border);
                    border-radius: var(--radius-lg);
                    padding: var(--space-4);
                    min-height: 200px;
                }

                .box-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: var(--space-4);
                    padding-bottom: var(--space-3);
                    border-bottom: 1px solid var(--color-surface-border);
                }

                .box-header h3 {
                    font-size: var(--text-sm);
                    font-weight: 600;
                    color: var(--color-text-primary);
                    margin: 0;
                }

                .contract-details {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-3);
                }

                .detail-item {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-1);
                }

                .detail-label {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                    text-transform: uppercase;
                }

                .detail-value {
                    font-size: var(--text-sm);
                    font-weight: 500;
                }

                .detail-address {
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                    color: var(--color-primary);
                }

                .stats-grid-compact {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-3);
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-1);
                }

                .stat-label {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                }

                .stat-value {
                    font-size: var(--text-lg);
                    font-weight: 600;
                    font-family: var(--font-mono);
                }

                .stat-value.warning { color: var(--color-warning-text); }
                .stat-value.negative { color: var(--color-danger-text); }
                .stat-value.positive { color: var(--color-success-text); }

                .pattern-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .no-patterns {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--color-success-text);
                    gap: var(--space-2);
                }

                .pattern-item {
                    display: flex;
                    justify-content: space-between;
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--radius-sm);
                    font-size: var(--text-xs);
                }

                .pattern-item.critical,
                .pattern-item.high {
                    background: var(--color-danger-bg);
                }

                .pattern-item.medium {
                    background: var(--color-warning-bg);
                }

                .pattern-item.low {
                    background: var(--color-bg-tertiary);
                }

                .pattern-type {
                    font-weight: 500;
                }

                .pattern-score {
                    font-family: var(--font-mono);
                    color: var(--color-text-muted);
                }

                .interactors-preview,
                .interactors-table {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .interactor-item,
                .table-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-2) var(--space-3);
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-sm);
                    font-size: var(--text-sm);
                }

                .table-row {
                    grid-template-columns: 2fr 1fr 1fr 1fr;
                }

                .address {
                    font-family: var(--font-mono);
                }

                .count,
                .col-count {
                    font-family: var(--font-mono);
                    color: var(--color-text-muted);
                }

                .col-value {
                    font-family: var(--font-mono);
                }

                .col-date {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                }

                .sort-controls {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-4);
                }

                .sort-controls select {
                    padding: var(--space-1) var(--space-2);
                    background: var(--color-bg-tertiary);
                    border: 1px solid var(--color-surface-border);
                    border-radius: var(--radius-sm);
                    color: var(--color-text-primary);
                }

                .interactors-table {
                    flex: 1;
                    overflow-y: auto;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--color-text-muted);
                    gap: var(--space-4);
                }

                .shared-groups {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .shared-group-card {
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-surface-border);
                    border-radius: var(--radius-lg);
                    padding: var(--space-4);
                }

                .group-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: var(--space-3);
                }

                .funding-source {
                    font-family: var(--font-mono);
                    font-weight: 600;
                }

                .wallet-count {
                    font-size: var(--text-sm);
                    color: var(--color-text-muted);
                }

                .wallets-list {
                    display: flex;
                    flex-wrap: wrap;
                    gap: var(--space-2);
                }

                .wallet-chip {
                    padding: var(--space-1) var(--space-2);
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-sm);
                    font-size: var(--text-xs);
                    font-family: var(--font-mono);
                    cursor: pointer;
                }

                .wallet-chip:hover {
                    background: var(--color-primary);
                    color: var(--color-primary-text);
                }

                .more {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                    padding: var(--space-1);
                }

                @media (max-width: 768px) {
                    .wallet-grid-container {
                        flex-direction: column;
                    }
                    .grid-sidebar {
                        width: 100%;
                        flex-direction: row;
                        justify-content: center;
                    }
                    .sidebar-icons {
                        flex-direction: row;
                    }
                    .grid-row {
                        grid-template-columns: 1fr;
                    }
                    .grid-nav-arrows {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
    } catch (err: any) {
        console.error('[ContractGridView] Render error:', err);
        return (
            <div className="wallet-grid-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '1rem' }}>
                <p>Error loading contract data</p>
                <p style={{ fontSize: '0.8rem' }}>{err?.message || 'Unknown error'}</p>
            </div>
        );
    }
}
