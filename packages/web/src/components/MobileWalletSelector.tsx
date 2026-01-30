import React from 'react';
import { useAppKitWallet } from '@reown/appkit-wallet-button/react';
import './MobileWalletSelector.css';

interface MobileWalletSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onConnect: () => void;
}

const wallets = [
    { id: 'metamask', name: 'MetaMask', icon: '🦊' },
    { id: 'trust', name: 'Trust Wallet', icon: '🛡️' },
    { id: 'rainbow', name: 'Rainbow', icon: '🌈' },
    { id: 'coinbase', name: 'Coinbase', icon: '🔵' },
    { id: 'okx', name: 'OKX', icon: '⚫' },
    { id: 'phantom', name: 'Phantom', icon: '👻' },
    { id: 'zerion', name: 'Zerion', icon: '🟣' },
    { id: 'bitget', name: 'Bitget', icon: '🔷' },
];

export const MobileWalletSelector: React.FC<MobileWalletSelectorProps> = ({ 
    isOpen, 
    onClose, 
    onConnect 
}) => {
    const { connect, isPending } = useAppKitWallet({
        onSuccess: () => {
            onConnect();
            onClose();
        },
        onError: (error) => {
            console.error('Wallet connection error:', error);
        }
    });

    if (!isOpen) return null;

    const handleWalletClick = async (walletId: string) => {
        try {
            await connect(walletId as any);
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
                            className={`mobile-wallet-option ${isPending ? 'disabled' : ''}`}
                            onClick={() => handleWalletClick(wallet.id)}
                            disabled={isPending}
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
                    onClick={() => handleWalletClick('walletConnect')}
                    disabled={isPending}
                >
                    {isPending ? 'Connecting...' : '🔗 Use WalletConnect QR'}
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
