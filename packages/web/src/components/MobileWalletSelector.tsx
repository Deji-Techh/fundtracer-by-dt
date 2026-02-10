import React from 'react';
import { useAppKit } from '@reown/appkit/react';
import './MobileWalletSelector.css';

interface MobileWalletSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect: () => void;
}

const wallets = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊', deeplink: 'https://metamask.app.link/dapp/' },
    { id: 'trust', name: 'Trust Wallet', icon: '🛡️', deeplink: 'https://link.trustwallet.com/open_url?url=' },
    { id: 'rainbow', name: 'Rainbow', icon: '🌈', deeplink: 'https://rnbwapp.com/' },
    { id: 'coinbase', name: 'Coinbase', icon: '🔵', deeplink: 'https://go.cb-w.com/dapp?cb_url=' },
    { id: 'okx', name: 'OKX', icon: '⚫', deeplink: null },
    { id: 'phantom', name: 'Phantom', icon: '👻', deeplink: 'https://phantom.app/ul/browse/' },
    { id: 'zerion', name: 'Zerion', icon: '🟣', deeplink: null },
    { id: 'bitget', name: 'Bitget', icon: '🔷', deeplink: null },
];

export const MobileWalletSelector: React.FC<MobileWalletSelectorProps> = ({ 
    isOpen, 
    onClose, 
    onConnect 
}) => {
    const { open } = useAppKit();

    if (!isOpen) return null;

    const handleWalletClick = async (walletId: string) => {
        try {
            // For MetaMask and other mobile wallets, use deep linking
            const wallet = wallets.find(w => w.id === walletId);
            const currentUrl = window.location.href;
            
            if (wallet?.deeplink) {
                // Open wallet app with current dapp URL
                const deeplinkUrl = wallet.deeplink + encodeURIComponent(currentUrl);
                window.location.href = deeplinkUrl;
                
                // Also open AppKit for connection
                setTimeout(() => {
                    open();
                }, 500);
            } else {
                // For wallets without deep linking, just open AppKit
                open();
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
                            <span className="mobile-wallet-icon">{wallet.icon}</span>
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
                        open();
                        onClose();
                    }}
                >
                    🔗 Use WalletConnect QR
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
