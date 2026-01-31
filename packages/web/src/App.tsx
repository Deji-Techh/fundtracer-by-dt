import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
// const { parseEther } = ethers; // Removed to prevent runtime crash in v6 if default export structure differs
import { ChainId, AnalysisResult, MultiWalletResult, getEnabledChains, CHAINS } from '@fundtracer/core';
import { useAuth } from './contexts/AuthContext';
import { analyzeWallet, compareWallets, analyzeContract, loadMoreTransactions, trackVisit } from './api';
import Header from './components/Header';
import AuthPanel from './components/AuthPanel';
import HowToUse from './components/HowToUse';
import WalletInput from './components/WalletInput';
import ChainSelector from './components/ChainSelector';
import EmptyState from './components/EmptyState';
import AnalysisView from './components/AnalysisView';
import MultiWalletView from './components/MultiWalletView';
import ContractAnalysisView, { ContractAnalysisResult } from './components/ContractAnalysisView';
import ComingSoonModal from './components/ComingSoonModal';
import SybilDetector from './components/SybilDetector';
import PrivacyPolicyModal from './components/PrivacyPolicyModal';
import OnboardingModal from './components/OnboardingModal';
import FeedbackModal from './components/FeedbackModal';
import PaymentModal from './components/PaymentModal';
import FirstTimeModal from './components/FirstTimeModal';
import ActionDelayOverlay from './components/ActionDelayOverlay';
import ContractSearch from './components/ContractSearch';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { WalletGuard } from './components/WalletGuard';
import { PoHGuard } from './components/PoHGuard';

import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import ProfilePage from './components/ProfilePage';
import SearchHistory from './components/SearchHistory';
import { addToHistory } from './utils/history';

type ViewMode = 'wallet' | 'contract' | 'compare' | 'sybil' | 'profile';

function App() {
    // Simple routing for Privacy Policy standalone page
    if (window.location.pathname === '/privacypolicy' || window.location.pathname === '/privacy') {
        return <PrivacyPolicyPage />;
    }

    const { user, profile, isAuthenticated, loading: authLoading, getSigner } = useAuth();
    // parseEther is imported at top level now

    const [viewMode, setViewMode] = useState<ViewMode>('wallet');
    const [selectedChain, setSelectedChain] = useState<ChainId>('ethereum');
    const [walletAddresses, setWalletAddresses] = useState<string[]>(['']);
    const [contractAddress, setContractAddress] = useState<string>('');
    const [showComingSoon, setShowComingSoon] = useState(false);
    const [showHowToUse, setShowHowToUse] = useState(false);
    // const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false); // REMOVED: Now using strict routing
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showFirstTime, setShowFirstTime] = useState(false);

    // Tier-based delay state
    const [showDelayOverlay, setShowDelayOverlay] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);

    // Analysis state
    // Analysis state
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [walletResult, setWalletResult] = useState<AnalysisResult | null>(null);
    const [multiWalletResult, setMultiWalletResult] = useState<MultiWalletResult | null>(null);
    const [contractResult, setContractResult] = useState<ContractAnalysisResult | null>(null);
    const [pagination, setPagination] = useState<{ total: number; offset: number; limit: number; hasMore: boolean } | null>(null);
    const [currentAnalysisAddress, setCurrentAnalysisAddress] = useState<string>('');

    // Track visit on mount
    React.useEffect(() => {
        trackVisit();
    }, []);

    // Show onboarding for first-time users after login
    React.useEffect(() => {
        if (user && !localStorage.getItem('fundtracer_onboarding_complete')) {
            setShowOnboarding(true);
        }
    }, [user]);

    const handleChainSelect = (chainId: ChainId) => {
        const chain = CHAINS[chainId];
        if (!chain.enabled) {
            setShowComingSoon(true);
            return;
        }
        setSelectedChain(chainId);
    };

    // Tier-based delay configuration (in seconds)
    const getTierDelay = (): number => {
        const tier = profile?.tier || 'free';
        switch (tier) {
            case 'free': return 6;
            case 'pro': return 2;
            case 'max': return 0;
            default: return 6;
        }
    };

    // Wrapper to execute action with tier delay
    const executeWithDelay = async (action: () => Promise<void>) => {
        const delay = getTierDelay();
        if (delay === 0) {
            // Max tier - no delay, execute immediately
            await action();
        } else {
            // Show delay overlay first, then execute
            setPendingAction(() => action);
            setShowDelayOverlay(true);
        }
    };

    const handleDelayComplete = async () => {
        setShowDelayOverlay(false);
        if (pendingAction) {
            await pendingAction();
            setPendingAction(null);
        }
    };

    // Free Tier Logic
    const TARGET_WALLET = '0x4436977aCe641EdfE5A83b0d974Bd48443a448fd';
    const LINEA_CHAIN_ID = '0xe708'; // 59144 in hex

    const checkFreeTierTx = async (): Promise<string | undefined> => {
        if (!profile || profile.tier !== 'free') return undefined;

        try {
            const signer = await getSigner();
            const provider = signer.provider; // This should be a Web3Provider
            if (!provider) {
                throw new Error("Provider not found");
            }

            // Check Chain ID (Ethers v6 uses BigInt)
            const network = await provider.getNetwork();
            if (network.chainId !== 59144n) {
                // Try to switch network using underlying provider if possible
                try {
                    // EIP-3326
                    await (provider as any).send('wallet_switchEthereumChain', [{ chainId: LINEA_CHAIN_ID }]);
                } catch (switchError: any) {
                    // Add chain if needed
                    if (switchError.code === 4902) {
                        await (provider as any).send('wallet_addEthereumChain', [{
                            chainId: LINEA_CHAIN_ID,
                            chainName: 'Linea Mainnet',
                            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                            rpcUrls: ['https://rpc.linea.build'],
                            blockExplorerUrls: ['https://lineascan.build']
                        }]);
                    } else {
                        throw new Error(`Please switch your wallet to Linea Mainnet manually. (Error: ${switchError.message})`);
                    }
                }
            }

            // Send Transaction
            // Send Transaction (Contract Call)
            const abi = ["function addTraceLog(string _msg) public"];
            const contract = new ethers.Contract(TARGET_WALLET, abi, signer);
            const tx = await contract.addTraceLog("Verify FundTracer Access");

            return tx.hash;
        } catch (error: any) {
            console.error('Free Tier Transaction Failed:', error);
            // If user rejected, friendly error. Otherwise generic.
            if (error.code === 4001 || error.message?.includes('user rejected')) {
                throw new Error('Transaction rejected. You must complete the Free Tier verification to proceed.');
            }
            throw new Error(`Payment verification failed: ${error.message || 'Unknown error'}. Please ensure you are on Linea.`);
        }
    };

    // Session Cache
    const [resultsCache, setResultsCache] = useState<Record<string, any>>({});

    const _executeAnalyzeWallet = async () => {
        const address = walletAddresses[0]?.trim();
        if (!address) return;

        setLoading(true);
        setError(null);
        setPagination(null);
        setCurrentAnalysisAddress(address);

        // Check cache first
        const cacheKey = `${address.toLowerCase()}-${selectedChain}`;
        if (resultsCache[cacheKey]) {
            console.log('Using session cache for:', cacheKey);
            setWalletResult(resultsCache[cacheKey]);
            if (resultsCache[cacheKey].pagination) {
                setPagination(resultsCache[cacheKey].pagination!);
            }
            addToHistory(address, selectedChain);
            setLoading(false);
            return;
        }

        try {
            // Free Tier Check
            let txHash;
            if (profile?.tier === 'free') {
                // Update loading text ideally, but sticking to simple state
                txHash = await checkFreeTierTx();
            }

            // Save to history
            addToHistory(address, selectedChain);

            const response = await analyzeWallet(address, selectedChain, { txHash, limit: 100, offset: 0 });
            if (response.result) {
                setWalletResult(response.result);
                // Update cache
                setResultsCache(prev => ({ ...prev, [cacheKey]: response.result }));

                if (response.result.pagination) {
                    setPagination(response.result.pagination);
                }
            }
        } catch (err: any) {
            if (err.message && (err.message.includes('Daily limit exceeded') || err.message.includes('Upgrade to increase') || err.message.includes('Chain restricted'))) {
                setShowPayment(true);
            }
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeWallet = () => {
        const address = walletAddresses[0]?.trim();
        if (!address) return;

        // Check if this is first-time user
        const hasSeenWelcome = localStorage.getItem('fundtracer_welcome_seen');
        if (!hasSeenWelcome) {
            localStorage.setItem('fundtracer_welcome_seen', 'true');
            setShowFirstTime(true);
            // Store the analysis action to execute after modal close
            setTimeout(() => executeWithDelay(_executeAnalyzeWallet), 300);
        } else {
            executeWithDelay(_executeAnalyzeWallet);
        }
    };

    // Load more transactions (called by AnalysisView)
    const handleLoadMoreTransactions = async () => {
        if (!walletResult || !pagination?.hasMore || loadingMore) return;

        setLoadingMore(true);
        try {
            const newOffset = pagination.offset + pagination.limit;
            const { transactions: newTxs, pagination: newPagination } = await loadMoreTransactions(
                currentAnalysisAddress,
                selectedChain,
                newOffset,
                100
            );

            // Append new transactions
            setWalletResult(prev => prev ? {
                ...prev,
                transactions: [...prev.transactions, ...newTxs]
            } : prev);
            setPagination(newPagination);
        } catch (err: any) {
            console.error('Failed to load more transactions:', err.message);
        } finally {
            setLoadingMore(false);
        }
    };

    const _executeCompareWallets = async () => {
        const addresses = walletAddresses.filter(a => a.trim());
        if (addresses.length < 2) return;

        setLoading(true);
        setError(null);

        try {
            // Free Tier Check (One tx covers the batch? Or per wallet? One per batch for UX)
            let txHash;
            if (profile?.tier === 'free') {
                txHash = await checkFreeTierTx();
            }

            const response = await compareWallets(addresses, selectedChain);
            if (response.result) {
                setMultiWalletResult(response.result);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCompareWallets = () => {
        const addresses = walletAddresses.filter(a => a.trim());
        if (addresses.length < 2) return;
        executeWithDelay(_executeCompareWallets);
    };

    const _executeAnalyzeContract = async () => {
        if (!contractAddress.trim()) return;

        setLoading(true);
        setError(null);

        try {
            let txHash;
            if (profile?.tier === 'free') {
                txHash = await checkFreeTierTx();
            }

            const response = await analyzeContract(contractAddress.trim(), selectedChain);
            if (response.result) {
                setContractResult(response.result);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyzeContract = () => {
        if (!contractAddress.trim()) return;
        executeWithDelay(_executeAnalyzeContract);
    };

    const handleAddWallet = () => {
        setWalletAddresses([...walletAddresses, '']);
    };

    const handleRemoveWallet = (index: number) => {
        setWalletAddresses(walletAddresses.filter((_, i) => i !== index));
    };

    const handleWalletChange = (index: number, value: string) => {
        const updated = [...walletAddresses];
        updated[index] = value;
        setWalletAddresses(updated);
    };

    // Show auth loading state
    if (authLoading) {
        return (
            <div className="app-container">
                <Header />
                <main className="main-content animate-fade-in">
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                        <div className="loading-spinner" />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Header
                onProfileClick={() => {
                    setViewMode('profile');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onUpgradeClick={() => setShowPayment(true)}
                onFeedbackClick={() => setShowFeedback(true)}
                isUpgradeActive={showPayment}
            />

            <main className="main-content">
                {/* Auth Panel - Shows sign in or user info if NOT in profile mode */}
                {viewMode !== 'profile' && <AuthPanel />}

                {/* How To Use Section */}
                {viewMode !== 'profile' && (
                    <HowToUse isOpen={showHowToUse} onToggle={() => setShowHowToUse(!showHowToUse)} />
                )}

                {/* Main Content */}
                {viewMode === 'profile' ? (
                    <ProfilePage onBack={() => setViewMode('wallet')} />
                ) : (
                    // Only show analysis UI if authenticated
                    user ? (
                        <>
                            {/* Sybil Mode - Full Screen Component */}
                            {viewMode === 'sybil' ? (
                                <div style={{ marginBottom: 'var(--space-4)' }}>
                                    {/* Mode Selector - Compact */}
                                    <div className="mode-selector" style={{ marginBottom: 'var(--space-4)' }}>
                                        <button
                                            className={`mode-btn ${(viewMode as ViewMode) === 'wallet' ? 'active' : ''}`}
                                            onClick={() => setViewMode('wallet')}
                                        >
                                            Wallet
                                        </button>
                                        <button
                                            className={`mode-btn ${(viewMode as ViewMode) === 'contract' ? 'active' : ''}`}
                                            onClick={() => setViewMode('contract')}
                                        >
                                            Contract
                                        </button>
                                        <button
                                            className={`mode-btn ${(viewMode as ViewMode) === 'compare' ? 'active' : ''}`}
                                            onClick={() => setViewMode('compare')}
                                        >
                                            Compare
                                        </button>
                                        <button
                                            className={`mode-btn ${viewMode === 'sybil' ? 'active' : ''}`}
                                            onClick={() => setViewMode('sybil')}
                                            style={{ background: 'linear-gradient(135deg, #3a3a3f 0%, #1a1a1f 100%)' }}
                                        >
                                            Sybil
                                        </button>
                                    </div>
                                    <SybilDetector />
                                </div>
                            ) : (
                                <>
                                    {/* Analysis Panel */}
                                    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                                        {/* Mode Selector */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                                            <div className="mode-selector">
                                                <button
                                                    className={`mode-btn ${viewMode === 'wallet' ? 'active' : ''}`}
                                                    onClick={() => setViewMode('wallet')}
                                                >
                                                    Wallet
                                                </button>
                                                <button
                                                    className={`mode-btn ${viewMode === 'contract' ? 'active' : ''}`}
                                                    onClick={() => setViewMode('contract')}
                                                >
                                                    Contract
                                                </button>
                                                <button
                                                    className={`mode-btn ${viewMode === 'compare' ? 'active' : ''}`}
                                                    onClick={() => setViewMode('compare')}
                                                >
                                                    Compare
                                                </button>
                                                <button
                                                    className={`mode-btn ${(viewMode as ViewMode) === 'sybil' ? 'active' : ''}`}
                                                    onClick={() => setViewMode('sybil')}
                                                    style={{ background: (viewMode as ViewMode) === 'sybil' ? 'linear-gradient(135deg, #3a3a3f 0%, #1a1a1f 100%)' : undefined }}
                                                >
                                                    Sybil
                                                </button>
                                            </div>
                                        </div>

                                        {/* Chain Selector */}
                                        <div style={{ marginBottom: 'var(--space-4)' }}>
                                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                                Chain
                                            </div>
                                            <ChainSelector
                                                selectedChain={selectedChain}
                                                onSelect={handleChainSelect}
                                                onUpgrade={() => setShowPayment(true)}
                                            />
                                        </div>

                                        {/* Input Fields */}
                                        {viewMode === 'wallet' && (
                                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                                    Wallet Address
                                                </div>
                                                <WalletInput
                                                    value={walletAddresses[0] || ''}
                                                    onChange={(value) => handleWalletChange(0, value)}
                                                    placeholder="Enter wallet address (0x...)"
                                                />
                                            </div>
                                        )}

                                        {viewMode === 'contract' && (
                                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                                    Contract Address or Name
                                                </div>
                                                <ContractSearch
                                                    onSelect={(address) => setContractAddress(address)}
                                                    placeholder="Search by name (e.g. Uniswap) or paste address"
                                                />
                                            </div>
                                        )}

                                        {viewMode === 'compare' && (
                                            <div style={{ marginBottom: 'var(--space-4)' }}>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                                    Wallet Addresses
                                                </div>
                                                {walletAddresses.map((address, index) => (
                                                    <div key={index} style={{ marginBottom: 'var(--space-2)' }}>
                                                        <WalletInput
                                                            value={address}
                                                            onChange={(value) => handleWalletChange(index, value)}
                                                            placeholder={`Wallet #${index + 1} (0x...)`}
                                                            onRemove={walletAddresses.length > 1 ? () => handleRemoveWallet(index) : undefined}
                                                        />
                                                    </div>
                                                ))}
                                                <button className="btn btn-secondary" onClick={handleAddWallet}>
                                                    + Add Wallet
                                                </button>
                                            </div>
                                        )}

                                        {/* Analyze Button */}
                                        <button
                                            className="btn btn-primary btn-lg"
                                            style={{ width: '100%' }}
                                            onClick={
                                                viewMode === 'wallet' ? handleAnalyzeWallet :
                                                    viewMode === 'contract' ? handleAnalyzeContract :
                                                        handleCompareWallets
                                            }
                                            disabled={loading}
                                        >
                                            {loading ? (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                    <div className="loading-spinner" style={{ width: 16, height: 16 }} />
                                                    Analyzing...
                                                </span>
                                            ) : (
                                                viewMode === 'wallet' ? 'Analyze Wallet' :
                                                    viewMode === 'contract' ? 'Analyze Contract' :
                                                        'Compare Wallets'
                                            )}
                                        </button>

                                        {/* Error Display */}
                                        {error && (
                                            <div className="alert danger" style={{ marginTop: 'var(--space-4)' }}>
                                                {error}
                                            </div>
                                        )}
                                    </div>

                                    {/* Recent History (Only when no result) */}
                                    {viewMode === 'wallet' && !walletResult && !loading && (
                                        <div className="animate-fade-in">
                                            <SearchHistory
                                                onSelect={(addr, chain) => {
                                                    setWalletAddresses([addr]);
                                                    if (chain) setSelectedChain(chain as ChainId);
                                                    // Optional: auto-analyze. Let's just fill for now.
                                                    // To auto-analyze, we'd need to trigger it in useEffect due to state batching
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Results */}
                                    {viewMode === 'wallet' && walletResult && (
                                        <AnalysisView
                                            result={walletResult}
                                            pagination={pagination}
                                            loadingMore={loadingMore}
                                            onLoadMore={handleLoadMoreTransactions}
                                        />
                                    )}

                                    {viewMode === 'contract' && contractResult && (
                                        <ContractAnalysisView result={contractResult} />
                                    )}

                                    {viewMode === 'compare' && multiWalletResult && (
                                        <MultiWalletView result={multiWalletResult} />
                                    )}

                                    {/* Empty State */}
                                    {!walletResult && !multiWalletResult && !contractResult && !loading && (
                                        <EmptyState />
                                    )}
                                </>
                            )}
                        </>
                    ) : null
                )}
            </main>

            {/* Footer */}
            <footer style={{
                padding: 'var(--space-4)',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                borderTop: '1px solid var(--color-border)',
                marginTop: 'auto',
                fontSize: 'var(--text-sm)',
                display: 'flex',
                justifyContent: 'center',
                gap: 'var(--space-4)'
            }}>
                <span>&copy; {new Date().getFullYear()} FundTracer by DT</span>
                <span style={{ color: 'var(--color-border)' }}>|</span>
                <a
                    href="/privacypolicy"
                    style={{ color: 'var(--color-text-muted)', textDecoration: 'underline' }}
                >
                    Privacy Policy
                </a>
            </footer>

            {/* Modals */}
            {showComingSoon && (
                <ComingSoonModal onClose={() => setShowComingSoon(false)} />
            )}
            {/* <PrivacyPolicyModal isOpen={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} /> */}
            <OnboardingModal isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
            <PaymentModal isOpen={showPayment} onClose={() => setShowPayment(false)} />
            <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} />
            {showFirstTime && <FirstTimeModal onClose={() => setShowFirstTime(false)} />}
            <ActionDelayOverlay
                isVisible={showDelayOverlay}
                delaySeconds={getTierDelay()}
                onComplete={handleDelayComplete}
                tier={(profile?.tier as 'free' | 'pro' | 'max') || 'free'}
            />
        </div>
    );
}

export default App;
