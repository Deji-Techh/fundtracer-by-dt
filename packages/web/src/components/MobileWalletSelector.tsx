import React from 'react';
import { usePrivy } from '@privy-io/react-auth';
import './MobileWalletSelector.css';

interface MobileWalletSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect: () => void;
}

const WalletIcon: React.FC<{ color: string; initial: string }> = ({ color, initial }) => (
    <svg width="28" height="28" viewBox="0 0 28 28">
        <rect width="28" height="28" rx="6" fill={color} />
        <text x="14" y="19" textAnchor="middle" fill="white" fontSize="14" fontWeight="600">{initial}</text>
    </svg>
);

const LinkIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
);

const wallets = [
    { id: 'metamask', name: 'MetaMask', color: '#f6851b', initial: 'M' },
    { id: 'trust', name: 'Trust Wallet', color: '#3375bb', initial: 'T' },
    { id: 'rainbow', name: 'Rainbow', color: '#001f3f', initial: 'R' },
    { id: 'coinbase', name: 'Coinbase', color: '#0052ff', initial: 'C' },
    { id: 'okx', name: 'OKX', color: '#000000', initial: 'O' },
    { id: 'phantom', name: 'Phantom', color: '#ab9ff2', initial: 'P' },
    { id: 'zerion', name: 'Zerion', color: '#2a5ada', initial: 'Z' },
    { id: 'bitget', name: 'Bitget', color: '#1672ff', initial: 'B' },
];

const deeplinks: Record<string, string | null> = {
    metamask: 'https://metamask.app.link/dapp/',
    trust: 'https://link.trustwallet.com/open_url?url=',
    rainbow: 'https://rnbwapp.com/',
    coinbase: 'https://go.cb-w.com/dapp?cb_url=',
    phantom: 'https://phantom.app/ul/browse/',
};

export const MobileWalletSelector: React.FC<MobileWalletSelectorProps> = ({ 
    isOpen, 
    onClose, 
    onConnect 
}) => {
    const { login: loginPrivy } = usePrivy();

    if (!isOpen) return null;

    const handleWalletClick = async (walletId: string) => {
        try {
            const currentUrl = window.location.href;
            const deeplink = deeplinks[walletId];
            
            if (deeplink) {
                const deeplinkUrl = deeplink + encodeURIComponent(currentUrl);
                window.location.href = deeplinkUrl;
                setTimeout(() => {
                    loginPrivy();
                }, 500);
            } else {
                loginPrivy();
            }
            
            onClose();
        } catch (error) {
            console.error(`Failed to connect to ${walletId}:`, error);
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
                    Select your preferred wallet
                </p>

                <div className="mobile-wallet-grid">
                    {wallets.map((wallet) => (
                        <button
                            key={wallet.id}
                            className="mobile-wallet-option"
                            onClick={() => handleWalletClick(wallet.id)}
                        >
                            <span className="mobile-wallet-icon">
                                <WalletIcon color={wallet.color} initial={wallet.initial} />
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
                    onClick={() => {
                        loginPrivy();
                        onClose();
                    }}
                >
                    <LinkIcon /> Use WalletConnect QR
                </button>

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

export default MobileWalletSelector;
