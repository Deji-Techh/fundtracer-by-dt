import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import '../global.css';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  UserIcon,
  Exchange01Icon,
  ArrowUp01Icon,
  EyeIcon,
  Search01Icon,
  Link01Icon,
  CheckmarkCircle02Icon,
  AlertDiamondIcon,
} from '@hugeicons/core-free-icons';
import { MultiWalletResult, ChainId, CHAINS } from '@fundtracer/core';
import { useIsMobile } from '../hooks/useIsMobile';
import { getChainTokenSymbol } from '../config/chains';

interface CompareGridViewProps {
    result: MultiWalletResult;
    chain: ChainId;
}

type PageType = 'overview' | 'common-funding' | 'direct-transfers';

export default function CompareGridView({ result, chain }: CompareGridViewProps) {
    const [currentPage, setCurrentPage] = useState<PageType>('overview');
    const [showAllSources, setShowAllSources] = useState(false);
    const [showAllDestinations, setShowAllDestinations] = useState(false);
    const [hoveredAddress, setHoveredAddress] = useState<{ address: string; x: number; y: number } | null>(null);
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    try {
        console.log('[CompareGridView] Rendering with result:', result);

        if (!result) {
            return (
                <div className="wallet-grid-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
                    <p>No compare data available</p>
                </div>
            );
        }

        // Force JSON serialization to remove all non-serializable values
        let safeResult: any;
        try {
            safeResult = JSON.parse(JSON.stringify(result));
            console.log('[CompareGridView] JSON serialization successful');
        } catch (e) {
            console.error('[CompareGridView] JSON parse failed:', e);
            safeResult = { error: 'Failed to parse result' };
        }
        
        // Validate and log the structure
        console.log('[CompareGridView] Result structure:', {
            hasWallets: Array.isArray(safeResult?.wallets),
            walletCount: safeResult?.wallets?.length,
            commonFundingSourcesType: typeof safeResult?.commonFundingSources,
            commonFundingSourcesIsArray: Array.isArray(safeResult?.commonFundingSources),
            commonFundingSources: safeResult?.commonFundingSources,
            commonDestinationsIsArray: Array.isArray(safeResult?.commonDestinations),
            sharedProjectsIsArray: Array.isArray(safeResult?.sharedProjects),
            directTransfersIsArray: Array.isArray(safeResult?.directTransfers),
            correlationScore: safeResult?.correlationScore,
            isSybilLikely: safeResult?.isSybilLikely,
        });
        
        // Use safeResult everywhere instead of result
        const wallets = safeResult?.wallets || [];
        const commonFundingSources = safeResult?.commonFundingSources || [];
        const commonDestinations = safeResult?.commonDestinations || [];
        const sharedProjects = safeResult?.sharedProjects || [];
        const directTransfers = safeResult?.directTransfers || [];
        const correlationScore = typeof safeResult?.correlationScore === 'number' ? safeResult.correlationScore : 0;
        const isSybilLikely = typeof safeResult?.isSybilLikely === 'boolean' ? safeResult.isSybilLikely : false;

        const chainConfig = CHAINS[chain] || { explorer: 'https://etherscan.io' };
        const tokenSymbol = getChainTokenSymbol(chain);

        const formatAddress = (addr: string) => `${(addr || '').slice(0, 6)}...${(addr || '').slice(-4)}`;

        // Safe number formatter
        const safeNumber = (val: any, decimals = 4): string => {
            if (val === null || val === undefined) return '0';
            const num = typeof val === 'number' ? val : parseFloat(String(val));
            return isNaN(num) ? '0' : num.toFixed(decimals);
        };

        // Safe string formatter
        const safeString = (val: any): string => {
            if (val === null || val === undefined) return '';
            return String(val);
        };

        const pages: PageType[] = ['overview', 'common-funding', 'direct-transfers'];
        const currentIndex = pages.indexOf(currentPage);
        const canGoBack = currentIndex > 0;
        const canGoForward = currentIndex < pages.length - 1;

        const correlationLevel = correlationScore > 60 ? 'high' : correlationScore > 30 ? 'medium' : 'low';

        const hasNoFindings = commonFundingSources.length === 0 
            && commonDestinations.length === 0 
            && directTransfers.length === 0 
            && sharedProjects.length === 0;

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
                        className={`sidebar-icon ${currentPage === 'common-funding' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('common-funding')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Common Funding"
                    >
                        <HugeiconsIcon icon={ArrowUp01Icon} size={20} strokeWidth={2} />
                    </motion.button>
                    <motion.button 
                        className={`sidebar-icon ${currentPage === 'direct-transfers' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('direct-transfers')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Direct Transfers"
                    >
                        <HugeiconsIcon icon={Exchange01Icon} size={20} strokeWidth={2} />
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
                                {/* Correlation Score */}
                                <motion.div 
                                    className="grid-box correlation-box"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div className="box-header">
                                        <h3>Correlation Analysis</h3>
                                        <HugeiconsIcon icon={Link01Icon} size={16} strokeWidth={2} />
                                    </div>
                                    <div className="correlation-content">
                                        <div className={`correlation-score ${correlationLevel}`}>
                                            <span className="score-value">{correlationScore}%</span>
                                            <span className="score-label">Similarity</span>
                                        </div>
                                        {isSybilLikely && (
                                            <div className="sybil-warning">
                                                <AlertDiamondIcon size={20} />
                                                <span>Potential Sybil Activity Detected</span>
                                            </div>
                                        )}
                                        <div className="wallets-compared">
                                            <span className="label">Wallets Analyzed</span>
                                            <span className="value">{wallets.length}</span>
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
                                        <h3>Shared Activity Stats</h3>
                                    </div>
                                    <div className="stats-grid-compact">
                                        <div className="stat-item">
                                            <span className="stat-label">Common Sources</span>
                                            <span className="stat-value">{commonFundingSources.length}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Common Destinations</span>
                                            <span className="stat-value">{commonDestinations.length}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Direct Transfers</span>
                                            <span className="stat-value">{directTransfers.length}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Shared Projects</span>
                                            <span className="stat-value">{sharedProjects.length}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Bottom Row */}
                            <div className="grid-row bottom-row">
                                {/* Common Funding Sources Preview */}
                                <motion.div 
                                    className="grid-box sources-box"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="box-header">
                                        <h3>Common Funding Sources</h3>
                                        <button 
                                            className="show-more"
                                            onClick={() => setShowAllSources(!showAllSources)}
                                        >
                                            {showAllSources ? 'Show Less' : 'Show All'}
                                        </button>
                                    </div>
                                    <div className="address-list">
                                        {commonFundingSources.length === 0 ? (
                                            <div className="empty-list">
                                                <CheckmarkCircle02Icon />
                                                <p>No common funding sources found</p>
                                            </div>
                                        ) : (
                                            (showAllSources ? commonFundingSources : commonFundingSources.slice(0, 5)).map((addr: string, i: number) => (
                                                <motion.div
                                                    key={addr}
                                                    className="address-item"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.4 + i * 0.05 }}
                                                    style={{ position: 'relative' }}
                                                    onMouseEnter={(e) => setHoveredAddress({ address: addr, x: e.clientX, y: e.clientY })}
                                                    onMouseLeave={() => setHoveredAddress(null)}
                                                >
                                                    <span className="address">{formatAddress(addr)}</span>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>

                                {/* Common Destinations Preview */}
                                <motion.div 
                                    className="grid-box destinations-box"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <div className="box-header">
                                        <h3>Common Destinations</h3>
                                        <button 
                                            className="show-more"
                                            onClick={() => setShowAllDestinations(!showAllDestinations)}
                                        >
                                            {showAllDestinations ? 'Show Less' : 'Show All'}
                                        </button>
                                    </div>
                                    <div className="address-list">
                                        {commonDestinations.length === 0 ? (
                                            <div className="empty-list">
                                                <CheckmarkCircle02Icon />
                                                <p>No common destinations found</p>
                                            </div>
                                        ) : (
                                            (showAllDestinations ? commonDestinations : commonDestinations.slice(0, 5)).map((addr: string, i: number) => (
                                                <motion.div
                                                    key={addr}
                                                    className="address-item"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.5 + i * 0.05 }}
                                                    style={{ position: 'relative' }}
                                                    onMouseEnter={(e) => setHoveredAddress({ address: addr, x: e.clientX, y: e.clientY })}
                                                    onMouseLeave={() => setHoveredAddress(null)}
                                                >
                                                    <span className="address">{formatAddress(addr)}</span>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {currentPage === 'common-funding' && (
                        <motion.div
                            key="common-funding"
                            className="common-funding-page"
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -300 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3>All Common Funding Sources</h3>
                            <div className="full-list">
                                {commonFundingSources.length === 0 ? (
                                    <div className="empty-state">
                                        <CheckmarkCircle02Icon size={48} />
                                        <p>No common funding sources found</p>
                                    </div>
                                ) : (
                                    commonFundingSources.map((addr: string, i: number) => (
                                        <motion.div
                                            key={addr}
                                            className="full-address-item"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            style={{ position: 'relative' }}
                                            onMouseEnter={(e) => setHoveredAddress({ address: addr, x: e.clientX, y: e.clientY })}
                                            onMouseLeave={() => setHoveredAddress(null)}
                                        >
                                            <span className="address">{addr}</span>
                                            <span className="label">Common source</span>
                                        </motion.div>
                                    ))
                                )}
                            </div>

                            <h3>All Common Destinations</h3>
                            <div className="full-list">
                                {commonDestinations.length === 0 ? (
                                    <div className="empty-state">
                                        <CheckmarkCircle02Icon size={48} />
                                        <p>No common destinations found</p>
                                    </div>
                                ) : (
                                    commonDestinations.map((addr: string, i: number) => (
                                        <motion.div
                                            key={addr}
                                            className="full-address-item"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            style={{ position: 'relative' }}
                                            onMouseEnter={(e) => setHoveredAddress({ address: addr, x: e.clientX, y: e.clientY })}
                                            onMouseLeave={() => setHoveredAddress(null)}
                                        >
                                            <span className="address">{addr}</span>
                                            <span className="label">Common destination</span>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}

                    {currentPage === 'direct-transfers' && (
                        <motion.div
                            key="direct-transfers"
                            className="transfers-page"
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -300 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h3>Direct Transfers Between Wallets</h3>
                            <div className="transfers-list">
                                {directTransfers.length === 0 ? (
                                    <div className="empty-state">
                                        <CheckmarkCircle02Icon size={48} />
                                        <p>No direct transfers found</p>
                                    </div>
                                ) : (
                                    directTransfers.map((transfer: any, i: number) => (
                                        <motion.div
                                            key={i}
                                            className="transfer-item"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                        >
                                            <div className="transfer-wallets">
                                                <span 
                                                    className="wallet"
                                                    onMouseEnter={(e: any) => setHoveredAddress({ address: safeString(transfer.from), x: e.clientX, y: e.clientY })}
                                                    onMouseLeave={() => setHoveredAddress(null)}
                                                >
                                                    {formatAddress(safeString(transfer.from))}
                                                </span>
                                                <ArrowRightIcon size={16} />
                                                <span 
                                                    className="wallet"
                                                    onMouseEnter={(e: any) => setHoveredAddress({ address: safeString(transfer.to), x: e.clientX, y: e.clientY })}
                                                    onMouseLeave={() => setHoveredAddress(null)}
                                                >
                                                    {formatAddress(safeString(transfer.to))}
                                                </span>
                                            </div>
                                            <div className="transfer-info">
                                                <span className="tx-count">{safeNumber(transfer.valueInEth)} {tokenSymbol}</span>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
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

                .show-more {
                    background: none;
                    border: none;
                    color: var(--color-primary);
                    font-size: var(--text-xs);
                    cursor: pointer;
                }

                .correlation-content {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-4);
                }

                .correlation-score {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: var(--space-4);
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-lg);
                }

                .correlation-score.high { border: 2px solid var(--color-danger-text); }
                .correlation-score.medium { border: 2px solid var(--color-warning-text); }
                .correlation-score.low { border: 2px solid var(--color-success-text); }

                .score-value {
                    font-size: var(--text-3xl);
                    font-weight: 700;
                    font-family: var(--font-mono);
                }

                .correlation-score.high .score-value { color: var(--color-danger-text); }
                .correlation-score.medium .score-value { color: var(--color-warning-text); }
                .correlation-score.low .score-value { color: var(--color-success-text); }

                .score-label {
                    font-size: var(--text-sm);
                    color: var(--color-text-muted);
                }

                .sybil-warning {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    padding: var(--space-2) var(--space-3);
                    background: var(--color-danger-bg);
                    border-radius: var(--radius-sm);
                    color: var(--color-danger-text);
                    font-size: var(--text-sm);
                }

                .wallets-compared {
                    display: flex;
                    justify-content: space-between;
                    font-size: var(--text-sm);
                }

                .wallets-compared .label {
                    color: var(--color-text-muted);
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

                .address-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .address-item {
                    padding: var(--space-2) var(--space-3);
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-sm);
                    display: flex;
                    justify-content: space-between;
                }

                .address {
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                }

                .empty-list {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100px;
                    color: var(--color-success-text);
                    gap: var(--space-2);
                }

                .common-funding-page h3,
                .transfers-page h3 {
                    margin-bottom: var(--space-4);
                    color: var(--color-text-primary);
                }

                .full-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                    margin-bottom: var(--space-6);
                }

                .full-address-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-2) var(--space-3);
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                .full-address-item .label {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                }

                .transfer-item {
                    padding: var(--space-3);
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-surface-border);
                    border-radius: var(--radius-md);
                    margin-bottom: var(--space-2);
                }

                .transfer-wallets {
                    display: flex;
                    align-items: center;
                    gap: var(--space-2);
                    margin-bottom: var(--space-2);
                }

                .transfer-wallets .wallet {
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                    cursor: pointer;
                    color: var(--color-primary);
                }

                .transfer-info {
                    display: flex;
                    justify-content: space-between;
                    font-size: var(--text-sm);
                }

                .tx-count {
                    color: var(--color-text-muted);
                }

                .total-value {
                    font-family: var(--font-mono);
                    font-weight: 600;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: var(--space-8);
                    color: var(--color-text-muted);
                    gap: var(--space-2);
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
        console.error('[CompareGridView] Render error:', err);
        return (
            <div className="wallet-grid-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexDirection: 'column', gap: '1rem' }}>
                <p>Error loading compare data</p>
                <p style={{ fontSize: '0.8rem' }}>{err?.message || 'Unknown error'}</p>
            </div>
        );
    }
}
