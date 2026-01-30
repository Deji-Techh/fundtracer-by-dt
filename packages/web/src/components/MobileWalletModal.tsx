import React, { useState } from 'react';
import './MobileWalletModal.css';

interface WalletOption {
    id: string;
    name: string;
    icon: string;
}

interface MobileWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    onWalletConnect: () => void;
}

// Mobile wallets - using universal WalletConnect QR as primary method
// Direct deep links are unreliable across different wallets
const MOBILE_WALLETS: WalletOption[] = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊' },
    { id: 'trust', name: 'Trust Wallet', icon: '🛡️' },
    { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
    { id: 'coinbase', name: 'Coinbase', icon: '🔵' },
    { id: 'okx', name: 'OKX', icon: '⚫' },
    { id: 'phantom', name: 'Phantom', icon: '👻' },
];

const MobileWalletModal: React.FC<MobileWalletModalProps> = ({ 
    isOpen, 
    onClose, 
    onWalletConnect 
}) => {
    const [isConnecting, setIsConnecting] = useState(false);

    if (!isOpen) return null;

    const handleWalletConnect = () => {
        setIsConnecting(true);
        // Use the standard AppKit modal which handles mobile properly
        onWalletConnect();
    };

    return (
        <div className="mobile-wallet-overlay" onClick={onClose}>
            <div className="mobile-wallet-modal" onClick={e => e.stopPropagation()}>
                <div className="mobile-wallet-header">
                    <h2>Connect Wallet</h2>
                    <button className="mobile-wallet-close" onClick={onClose}>×</button>
                </div>

                <p className="mobile-wallet-subtitle">
                    Connect your wallet to continue
                </p>

                <div className="mobile-wallet-info">
                    <span>💡</span>
                    <p>On mobile, we recommend using WalletConnect which supports all major wallets</p>
                </div>

                <button 
                    className={`mobile-wallet-qr-btn ${isConnecting ? 'connecting' : ''}`}
                    onClick={handleWalletConnect}
                    disabled={isConnecting}
                >
                    {isConnecting ? (
                        <>
                            <span className="wallet-spinner">⟳</span>
                            Opening WalletConnect...
                        </>
                    ) : (
                        <>🔗 Connect with WalletConnect</>
                    )}
                </button>

                <div className="mobile-wallet-divider">
                    <span>or</span>
                </div>

                <p className="mobile-wallet-hint">
                    Don't have a wallet?{' '}
                    <a href="https://ethereum.org/wallets" target="_blank" rel="noopener noreferrer">
                        Get one here
                    </a>
                </p>
            </div>
        </div>
    );
};

export default MobileWalletModal;
