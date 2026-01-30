import React, { useState } from 'react';
import { useAppKitWallet } from '@reown/appkit-wallet-button/react';
import './MobileWalletModal.css';

interface WalletOption {
    id: string;
    name: string;
    icon: string;
    walletId: string; // AppKit wallet identifier
}

interface MobileWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    onWalletConnect: () => void; // Fallback to WalletConnect modal
    onSuccess?: () => void; // Called when wallet connects successfully
}

// Mobile wallets with AppKit wallet identifiers
const MOBILE_WALLETS: WalletOption[] = [
    {
        id: 'metamask',
        name: 'MetaMask',
        icon: '🦊',
        walletId: 'metamask'
    },
    {
        id: 'trust',
        name: 'Trust Wallet',
        icon: '🛡️',
        walletId: 'trust'
    },
    {
        id: 'rainbow',
        name: 'Rainbow',
        icon: '🌈',
        walletId: 'rainbow'
    },
    {
        id: 'coinbase',
        name: 'Coinbase Wallet',
        icon: '🔵',
        walletId: 'coinbase'
    },
    {
        id: 'okx',
        name: 'OKX Wallet',
        icon: '⚫',
        walletId: 'okx'
    },
    {
        id: 'bitget',
        name: 'Bitget Wallet',
        icon: '🔷',
        walletId: 'bitget'
    },
    {
        id: 'zerion',
        name: 'Zerion',
        icon: '🟣',
        walletId: 'zerion'
    },
    {
        id: 'phantom',
        name: 'Phantom',
        icon: '👻',
        walletId: 'phantom'
    },
    {
        id: 'rabby',
        name: 'Rabby Wallet',
        icon: '🐰',
        walletId: 'rabby'
    },
    {
        id: 'imtoken',
        name: 'imToken',
        icon: '🔶',
        walletId: 'imtoken'
    }
];

const MobileWalletModal: React.FC<MobileWalletModalProps> = ({ 
    isOpen, 
    onClose, 
    onWalletConnect,
    onSuccess 
}) => {
    const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Use AppKit wallet button hook for proper session handling
    const { connect } = useAppKitWallet({
        onSuccess: (data) => {
            console.log('[MobileWalletModal] Wallet connected successfully:', data);
            setConnectingWallet(null);
            onSuccess?.();
            onClose();
        },
        onError: (err) => {
            console.error('[MobileWalletModal] Connection error:', err);
            setConnectingWallet(null);
            setError(err.message || 'Failed to connect wallet');
        }
    });

    if (!isOpen) return null;

    const handleWalletClick = async (wallet: WalletOption) => {
        setError(null);
        setConnectingWallet(wallet.id);
        
        try {
            console.log(`[MobileWalletModal] Connecting to ${wallet.name}...`);
            // This creates the WalletConnect session and handles deep linking
            await connect(wallet.walletId);
            // onSuccess callback will handle the rest
        } catch (err: any) {
            console.error(`[MobileWalletModal] Failed to connect ${wallet.name}:`, err);
            setConnectingWallet(null);
            setError(err.message || `Failed to connect to ${wallet.name}`);
        }
    };

    return (
        <div className="mobile-wallet-overlay" onClick={onClose}>
            <div className="mobile-wallet-modal" onClick={e => e.stopPropagation()}>
                <div className="mobile-wallet-header">
                    <h2>Connect Wallet</h2>
                    <button className="mobile-wallet-close" onClick={onClose}>×</button>
                </div>

                <p className="mobile-wallet-subtitle">
                    Select your preferred wallet app
                </p>

                {error && (
                    <div className="mobile-wallet-error">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div className="mobile-wallet-grid">
                    {MOBILE_WALLETS.map(wallet => (
                        <button
                            key={wallet.id}
                            className={`mobile-wallet-option ${connectingWallet === wallet.id ? 'connecting' : ''}`}
                            onClick={() => handleWalletClick(wallet)}
                            disabled={connectingWallet !== null}
                        >
                            <span className="mobile-wallet-icon">
                                {connectingWallet === wallet.id ? (
                                    <span className="wallet-spinner">⟳</span>
                                ) : (
                                    wallet.icon
                                )}
                            </span>
                            <span className="mobile-wallet-name">{wallet.name}</span>
                        </button>
                    ))}
                </div>

                <div className="mobile-wallet-divider">
                    <span>or</span>
                </div>

                <button 
                    className="mobile-wallet-qr-btn" 
                    onClick={onWalletConnect}
                    disabled={connectingWallet !== null}
                >
                    🔗 Use WalletConnect QR Code
                </button>

                <p className="mobile-wallet-hint">
                    Don't have a wallet? <a href="https://ethereum.org/wallets" target="_blank" rel="noopener noreferrer">Get one here</a>
                </p>
            </div>
        </div>
    );
};

export default MobileWalletModal;
