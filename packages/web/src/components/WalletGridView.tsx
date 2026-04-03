import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { useNavigate } from 'react-router-dom';
import '../global.css';
import {
  Download02Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowLeftIcon,
  ArrowRightIcon,
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
  Settings01Icon,
  UserIcon,
  Exchange01Icon,
  FlashlightIcon,
  WalletIcon,
  BlockchainIcon,
  BitcoinIcon,
} from '@hugeicons/core-free-icons';
import { AnalysisResult, SuspiciousIndicator, FundingNode, CHAINS } from '@fundtracer/core';
import FundingTree from './FundingTree';
import TransactionList from './TransactionList';
import AddressLabel from './AddressLabel';
import { fetchFundingTree } from '../api';
import { portfolioApi, type PortfolioData } from '../services/api/portfolioApi';
import { useIsMobile } from '../hooks/useIsMobile';
import { getChainTokenSymbol } from '../config/chains';

interface WalletGridViewProps {
    result: AnalysisResult;
    pagination?: { total: number; offset: number; limit: number; hasMore: boolean } | null;
    loadingMore?: boolean;
    onLoadMore?: () => void;
}

type PageType = 'overview' | 'transactions' | 'funding-tree' | 'portfolio';
type OverviewTab = 'stats' | 'suspicious' | 'sources' | 'destinations';

export default function WalletGridView({ result, pagination, loadingMore, onLoadMore }: WalletGridViewProps) {
    const [currentPage, setCurrentPage] = useState<PageType>('overview');
    const [overviewTab, setOverviewTab] = useState<OverviewTab>('stats');
    const [hoveredAddress, setHoveredAddress] = useState<{ address: string; x: number; y: number } | null>(null);
    const [fundingSources, setFundingSources] = useState<FundingNode | null>(null);
    const [fundingDestinations, setFundingDestinations] = useState<FundingNode | null>(null);
    const [treeLoading, setTreeLoading] = useState(false);
    const [treeError, setTreeError] = useState<string | null>(null);
    const [treeDepth, setTreeDepth] = useState(2);
    const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
    const [portfolioLoading, setPortfolioLoading] = useState(false);
    const [portfolioError, setPortfolioError] = useState<string | null>(null);
    const isMobile = useIsMobile();
    const navigate = useNavigate();

    const chain = result.wallet.chain;
    const chainConfig = CHAINS[chain] || { explorer: 'https://etherscan.io' };
    const tokenSymbol = getChainTokenSymbol(chain);

    const handleGenerateTree = async () => {
        setTreeLoading(true);
        setTreeError(null);
        try {
            const response = await fetchFundingTree(result.wallet.address, result.wallet.chain, treeDepth);
            console.log('[WalletGridView] Funding tree response:', response);
            console.log('[WalletGridView] Funding sources:', response.result?.fundingSources);
            console.log('[WalletGridView] Funding destinations:', response.result?.fundingDestinations);
            if (response.result) {
                setFundingSources(response.result.fundingSources);
                setFundingDestinations(response.result.fundingDestinations);
            } else {
                setTreeError(response.error || 'Failed to generate funding tree');
            }
        } catch (err: any) {
            console.error('[WalletGridView] Funding tree error:', err);
            setTreeError(err.message || 'Failed to generate funding tree');
        } finally {
            setTreeLoading(false);
        }
    };

    const handleFetchPortfolio = async () => {
        setPortfolioLoading(true);
        setPortfolioError(null);
        try {
            const data = await portfolioApi.getPortfolio(result.wallet.address, result.wallet.chain);
            setPortfolioData(data);
        } catch (err: any) {
            setPortfolioError(err.message || 'Failed to fetch portfolio');
        } finally {
            setPortfolioLoading(false);
        }
    };

    const formatAddress = (addr: string) =>
        `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    const pages: PageType[] = ['overview', 'transactions', 'funding-tree', 'portfolio'];
    const currentIndex = pages.indexOf(currentPage);
    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex < pages.length - 1;

    const goToNextPage = () => {
        if (canGoForward) {
            setCurrentPage(pages[currentIndex + 1]);
        }
    };

    const goToPrevPage = () => {
        if (canGoBack) {
            setCurrentPage(pages[currentIndex - 1]);
        }
    };

    const pageVariants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 300 : -300,
            opacity: 0,
        }),
    };

    // Fetch portfolio when visiting portfolio page
    useEffect(() => {
        if (currentPage === 'portfolio' && !portfolioData && !portfolioLoading) {
            handleFetchPortfolio();
        }
    }, [currentPage]);

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
                        className={`sidebar-icon ${currentPage === 'transactions' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('transactions')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Transactions"
                    >
                        <HugeiconsIcon icon={Exchange01Icon} size={20} strokeWidth={2} />
                    </motion.button>
                    <motion.button 
                        className={`sidebar-icon ${currentPage === 'funding-tree' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('funding-tree')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Funding Tree"
                    >
                        <HugeiconsIcon icon={BlockchainIcon} size={20} strokeWidth={2} />
                    </motion.button>
                    <motion.button 
                        className={`sidebar-icon ${currentPage === 'portfolio' ? 'active' : ''}`}
                        onClick={() => setCurrentPage('portfolio')}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        title="Portfolio"
                    >
                        <HugeiconsIcon icon={WalletIcon} size={20} strokeWidth={2} />
                    </motion.button>
                </div>
            </motion.div>

            {/* Main Content Area */}
            <div className="grid-main">
                {/* Navigation Arrows */}
                <div className="grid-nav-arrows">
                    <motion.button 
                        className={`nav-arrow left ${!canGoBack ? 'disabled' : ''}`}
                        onClick={goToPrevPage}
                        disabled={!canGoBack}
                        whileHover={canGoBack ? { scale: 1.1 } : {}}
                        whileTap={canGoBack ? { scale: 0.9 } : {}}
                    >
                        <HugeiconsIcon icon={ArrowLeftIcon} size={24} strokeWidth={2} />
                    </motion.button>
                    
                    <motion.button 
                        className={`nav-arrow right ${!canGoForward ? 'disabled' : ''}`}
                        onClick={goToNextPage}
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
                            {/* Top Row - Two Equal Boxes */}
                            <div className="grid-row top-row">
                                {/* Box 1: Stats */}
                                <motion.div 
                                    className="grid-box stats-box"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    <div className="box-header">
                                        <h3>Wallet Statistics</h3>
                                        <AddressLabel
                                            address={result.wallet.address}
                                            editable={true}
                                            showAddress={false}
                                            style={{
                                                fontFamily: 'var(--font-mono)',
                                                fontSize: 'var(--text-xs)',
                                            }}
                                        />
                                    </div>
                                    <div className="stats-grid">
                                        <div className="stat-item">
                                            <span className="stat-label">Total Transactions</span>
                                            <span className="stat-value">{result.summary?.totalTransactions?.toLocaleString() || 0}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Successful / Failed</span>
                                            <span className="stat-value">
                                                {result.summary?.successfulTxs || 0} / {result.summary?.failedTxs || 0}
                                            </span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Total Received</span>
                                            <span className="stat-value positive">
                                                +{result.summary?.totalValueReceivedEth?.toFixed(4) || '0.0000'} {tokenSymbol}
                                            </span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Total Sent</span>
                                            <span className="stat-value negative">
                                                -{result.summary?.totalValueSentEth?.toFixed(4) || '0.0000'} {tokenSymbol}
                                            </span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Activity Period</span>
                                            <span className="stat-value">{result.summary?.activityPeriodDays || 0} days</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Unique Addresses</span>
                                            <span className="stat-value">{result.summary?.uniqueInteractedAddresses || 0}</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Box 2: Suspicious */}
                                <motion.div 
                                    className="grid-box suspicious-box"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <div className="box-header">
                                        <h3>Risk Assessment</h3>
                                        <span className={`risk-badge ${result.riskLevel}`}>{result.riskLevel}</span>
                                    </div>
                                    <div className="suspicious-content">
                                        {result.suspiciousIndicators?.length === 0 ? (
                                            <div className="no-suspicious">
                                                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={32} strokeWidth={2} />
                                                <p>No suspicious activity detected</p>
                                            </div>
                                        ) : (
                                            <div className="suspicious-list">
                                                {result.suspiciousIndicators?.slice(0, 5).map((indicator, i) => (
                                                    <motion.div 
                                                        key={i}
                                                        className={`suspicious-item ${indicator.severity}`}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.3 + i * 0.1 }}
                                                    >
                                                        <span className="indicator-type">
                                                            {indicator.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                        </span>
                                                        <span className="indicator-score">+{indicator.score} pts</span>
                                                    </motion.div>
                                                ))}
                                                {(result.suspiciousIndicators?.length || 0) > 5 && (
                                                    <p className="more-indicators">
                                                        +{(result.suspiciousIndicators?.length || 0) - 5} more indicators
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </div>

                            {/* Bottom Row - Two Equal Boxes */}
                            <div className="grid-row bottom-row">
                                {/* Box 3: Top Funding Sources */}
                                <motion.div 
                                    className="grid-box sources-box"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                >
                                    <div className="box-header">
                                        <h3>Top Funding Sources</h3>
                                        <HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={2} />
                                    </div>
                                    <div className="address-list">
                                        {result.summary?.topFundingSources?.length === 0 ? (
                                            <div className="empty-list">
                                                <p>No funding sources found</p>
                                            </div>
                                        ) : (
                                            result.summary?.topFundingSources?.slice(0, 5).map((source, i) => (
                                                <motion.div
                                                    key={source.address}
                                                    className="address-item"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.4 + i * 0.05 }}
                                                    style={{ position: 'relative' }}
                                                    onMouseEnter={(e) => setHoveredAddress({ address: source.address, x: e.clientX, y: e.clientY })}
                                                    onMouseLeave={() => setHoveredAddress(null)}
                                                >
                                                    <span className="tx-address">{formatAddress(source.address)}</span>
                                                    <span className="tx-value incoming">+{source.valueEth.toFixed(4)} {tokenSymbol}</span>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>

                                {/* Box 4: Top Destinations */}
                                <motion.div 
                                    className="grid-box destinations-box"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <div className="box-header">
                                        <h3>Top Destinations</h3>
                                        <HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={2} />
                                    </div>
                                    <div className="address-list">
                                        {result.summary?.topFundingDestinations?.length === 0 ? (
                                            <div className="empty-list">
                                                <p>No destinations found</p>
                                            </div>
                                        ) : (
                                            result.summary?.topFundingDestinations?.slice(0, 5).map((dest, i) => (
                                                <motion.div
                                                    key={dest.address}
                                                    className="address-item"
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: 0.4 + i * 0.05 }}
                                                    style={{ position: 'relative' }}
                                                    onMouseEnter={(e) => setHoveredAddress({ address: dest.address, x: e.clientX, y: e.clientY })}
                                                    onMouseLeave={() => setHoveredAddress(null)}
                                                >
                                                    <span className="tx-address">{formatAddress(dest.address)}</span>
                                                    <span className="tx-value outgoing">-{dest.valueEth.toFixed(4)} {tokenSymbol}</span>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}

                    {currentPage === 'transactions' && (
                        <motion.div
                            key="transactions"
                            className="transactions-page"
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -300 }}
                            transition={{ duration: 0.3 }}
                        >
                            <TransactionList 
                                transactions={result.transactions || []}
                                chain={chain}
                                loading={loadingMore}
                                onLoadMore={onLoadMore}
                            />
                        </motion.div>
                    )}

                    {currentPage === 'funding-tree' && (
                        <motion.div
                            key="funding-tree"
                            className="funding-tree-page"
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -300 }}
                            transition={{ duration: 0.3 }}
                        >
                            <div className="funding-tree-controls">
                                <div className="tree-depth-selector">
                                    <label>Tree Depth:</label>
                                    <select 
                                        value={treeDepth} 
                                        onChange={(e) => setTreeDepth(Number(e.target.value))}
                                        disabled={treeLoading}
                                    >
                                        <option value={1}>1 hop</option>
                                        <option value={2}>2 hops</option>
                                        <option value={3}>3 hops</option>
                                        <option value={4}>4 hops</option>
                                    </select>
                                </div>
                                <button 
                                    className={`generate-tree-btn ${treeLoading ? 'loading' : ''}`}
                                    onClick={handleGenerateTree}
                                    disabled={treeLoading}
                                >
                                    {treeLoading ? 'Generating...' : 'Generate Funding Tree'}
                                </button>
                            </div>
                            
                            {treeError && (
                                <div className="tree-error">{treeError}</div>
                            )}
                            
                            <FundingTree 
                                sourceData={fundingSources || result.fundingSources}
                                destData={fundingDestinations || result.fundingDestinations}
                                targetAddress={result.wallet.address}
                                chain={result.wallet.chain}
                            />
                        </motion.div>
                    )}

                    {currentPage === 'portfolio' && (
                        <motion.div
                            key="portfolio"
                            className="portfolio-page"
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -300 }}
                            transition={{ duration: 0.3 }}
                        >
                            {portfolioLoading && (
                                <div className="portfolio-loading">
                                    <div className="loading-spinner" />
                                    <p>Loading portfolio data...</p>
                                </div>
                            )}
                            {portfolioError && (
                                <div className="portfolio-error">
                                    <p>{portfolioError}</p>
                                    <button onClick={handleFetchPortfolio}>Retry</button>
                                </div>
                            )}
                            {portfolioData && !portfolioLoading && !portfolioError && (
                                <div className="portfolio-grid">
                                    {/* Total Value */}
                                    <div className="portfolio-box balance-box">
                                        <div className="box-header">
                                            <h3>Total Value</h3>
                                            <HugeiconsIcon icon={WalletIcon} size={16} strokeWidth={2} />
                                        </div>
                                        <div className="balance-info">
                                            <div className="main-balance">
                                                <span className="balance-value">${portfolioData.totalValue.toFixed(2)}</span>
                                                <span className="balance-symbol">USD</span>
                                            </div>
                                            <div className="balance-usd">
                                                Last updated: {new Date(portfolioData.lastUpdated).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Token Holdings */}
                                    <div className="portfolio-box tokens-box">
                                        <div className="box-header">
                                            <h3>Token Holdings</h3>
                                            <HugeiconsIcon icon={BitcoinIcon} size={16} strokeWidth={2} />
                                        </div>
                                        <div className="token-list">
                                            {(portfolioData.tokens || []).length === 0 ? (
                                                <div className="empty-list">
                                                    <p>No tokens found</p>
                                                </div>
                                            ) : (
                                                (portfolioData.tokens || []).slice(0, 10).map((token, i) => (
                                                    <div key={i} className="token-item">
                                                        <span className="token-name">{token.symbol}</span>
                                                        <span className="token-balance">{parseFloat(token.balance).toFixed(4)} ({token.symbol})</span>
                                                        <span className="token-value">${token.value.toFixed(2)}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* NFT Holdings */}
                                    <div className="portfolio-box contracts-box">
                                        <div className="box-header">
                                            <h3>NFT Holdings</h3>
                                            <HugeiconsIcon icon={Link01Icon} size={16} strokeWidth={2} />
                                        </div>
                                        <div className="contract-list">
                                            {(portfolioData.nfts || []).length === 0 ? (
                                                <div className="empty-list">
                                                    <p>No NFTs found</p>
                                                </div>
                                            ) : (
                                                (portfolioData.nfts || []).slice(0, 8).map((nft, i) => (
                                                    <motion.div 
                                                        key={i}
                                                        className="contract-item"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.05 }}
                                                    >
                                                        <div className="contract-info">
                                                            <span className="contract-address">
                                                                {nft.name || formatAddress(nft.contractAddress)}
                                                            </span>
                                                            <span className="contract-category">{nft.collectionName}</span>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Attribution */}
                                    <div className="portfolio-box activity-box">
                                        <div className="box-header">
                                            <h3>Data Source</h3>
                                            <HugeiconsIcon icon={Clock01Icon} size={16} strokeWidth={2} />
                                        </div>
                                        <div className="activity-stats">
                                            <div className="activity-item">
                                                <span className="activity-label">Provider</span>
                                                <span className="activity-value">
                                                    {portfolioData.attribution?.text || 'DeFi Llama'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
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

                .stats-grid {
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
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .stat-value {
                    font-size: var(--text-lg);
                    font-weight: 600;
                    font-family: var(--font-mono);
                    color: var(--color-text-primary);
                }

                .stat-value.positive { color: var(--color-success-text); }
                .stat-value.negative { color: var(--color-danger-text); }

                .risk-badge {
                    padding: var(--space-1) var(--space-2);
                    border-radius: var(--radius-sm);
                    font-size: var(--text-xs);
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .risk-badge.critical, .risk-badge.high {
                    background: var(--color-danger-bg);
                    color: var(--color-danger-text);
                }

                .risk-badge.medium {
                    background: var(--color-warning-bg);
                    color: var(--color-warning-text);
                }

                .risk-badge.low {
                    background: var(--color-success-bg);
                    color: var(--color-success-text);
                }

                .suspicious-content {
                    height: calc(100% - 60px);
                    overflow-y: auto;
                }

                .no-suspicious {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    color: var(--color-success-text);
                    gap: var(--space-2);
                }

                .suspicious-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .suspicious-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-2) var(--space-3);
                    border-radius: var(--radius-sm);
                    font-size: var(--text-xs);
                }

                .suspicious-item.critical,
                .suspicious-item.high {
                    background: var(--color-danger-bg);
                }

                .suspicious-item.medium {
                    background: var(--color-warning-bg);
                }

                .suspicious-item.low {
                    background: var(--color-bg-tertiary);
                }

                .indicator-type {
                    font-weight: 500;
                }

                .indicator-score {
                    font-family: var(--font-mono);
                    color: var(--color-text-muted);
                }

                .more-indicators {
                    text-align: center;
                    color: var(--color-text-muted);
                    font-size: var(--text-xs);
                    margin-top: var(--space-2);
                }

                .address-list {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                }

                .address-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-2) var(--space-3);
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: background 0.2s ease;
                }

                .address-item:hover {
                    background: var(--color-bg-elevated);
                }

                .tx-address {
                    font-family: var(--font-mono);
                    font-size: var(--text-xs);
                }

                .tx-value {
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                    font-weight: 500;
                }

                .tx-value.incoming { color: var(--color-success-text); }
                .tx-value.outgoing { color: var(--color-danger-text); }

                .empty-list {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100px;
                    color: var(--color-text-muted);
                }

                .transactions-page,
                .funding-tree-page,
                .portfolio-page {
                    flex: 1;
                    overflow: auto;
                }

                .portfolio-loading,
                .portfolio-error {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    gap: var(--space-4);
                    color: var(--color-text-muted);
                }

                .portfolio-loading .loading-spinner {
                    width: 32px;
                    height: 32px;
                    border: 3px solid var(--color-border);
                    border-top-color: var(--color-primary);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                .portfolio-error button {
                    padding: var(--space-2) var(--space-4);
                    background: var(--color-primary);
                    color: var(--color-primary-text);
                    border: none;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .portfolio-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--space-4);
                    height: 100%;
                }

                .portfolio-box {
                    background: var(--color-bg-secondary);
                    border: 1px solid var(--color-surface-border);
                    border-radius: var(--radius-lg);
                    padding: var(--space-4);
                    min-height: 200px;
                }

                .balance-info {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                    margin-top: var(--space-3);
                }

                .main-balance {
                    display: flex;
                    align-items: baseline;
                    gap: var(--space-2);
                }

                .balance-value {
                    font-size: var(--text-2xl);
                    font-weight: 700;
                    font-family: var(--font-mono);
                    color: var(--color-text-primary);
                }

                .balance-symbol {
                    font-size: var(--text-lg);
                    color: var(--color-text-muted);
                }

                .balance-usd {
                    font-size: var(--text-sm);
                    color: var(--color-text-muted);
                }

                .token-list,
                .contract-list,
                .activity-stats {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-2);
                    margin-top: var(--space-3);
                }

                .token-item {
                    display: flex;
                    justify-content: space-between;
                    padding: var(--space-2);
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                .token-item.main {
                    background: var(--color-primary);
                    background: rgba(var(--color-primary-rgb), 0.1);
                }

                .token-name {
                    font-weight: 500;
                    font-size: var(--text-sm);
                }

                .token-balance {
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                }

                .token-value {
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                    color: var(--color-text-muted);
                }

                .contract-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: var(--space-2) var(--space-3);
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                .contract-info {
                    display: flex;
                    flex-direction: column;
                    gap: var(--space-1);
                }

                .contract-address {
                    font-family: var(--font-mono);
                    font-size: var(--text-xs);
                }

                .contract-category {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                    text-transform: uppercase;
                }

                .contract-stats {
                    text-align: right;
                }

                .interaction-count {
                    font-size: var(--text-xs);
                    color: var(--color-text-muted);
                }

                .activity-item {
                    display: flex;
                    justify-content: space-between;
                    padding: var(--space-2);
                    background: var(--color-bg-tertiary);
                    border-radius: var(--radius-sm);
                }

                .activity-label {
                    font-size: var(--text-sm);
                    color: var(--color-text-muted);
                }

                .activity-value {
                    font-family: var(--font-mono);
                    font-size: var(--text-sm);
                    font-weight: 500;
                }

                .activity-value.risk-critical,
                .activity-value.risk-high {
                    color: var(--color-danger-text);
                }

                .activity-value.risk-medium {
                    color: var(--color-warning-text);
                }

                .activity-value.risk-low {
                    color: var(--color-success-text);
                }

                .generate-tree-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: var(--space-2);
                    padding: var(--space-3) var(--space-6);
                    background: linear-gradient(135deg, var(--color-primary) 0%, #8b5cf6 100%);
                    color: white;
                    border: none;
                    border-radius: var(--radius-lg);
                    font-size: var(--text-sm);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .generate-tree-btn:hover:not(:disabled) {
                    opacity: 0.95;
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
                }

                .generate-tree-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                    box-shadow: none;
                }

                .generate-tree-btn.loading {
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    animation: pulse 1.5s infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }

                .tree-error {
                    padding: var(--space-2) var(--space-3);
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: var(--radius-sm);
                    color: var(--color-danger-text);
                    font-size: var(--text-sm);
                    margin-top: var(--space-2);
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
}
