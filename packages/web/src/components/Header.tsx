import { Settings, Github, Mail, Zap, MessageSquare, User, Wallet, AlertCircle } from 'lucide-react';
import logo from '../assets/logo.png';
import { WalletButton } from './WalletButton';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
    onSettingsClick?: () => void;
    onUpgradeClick?: () => void;
    onFeedbackClick?: () => void;
    onProfileClick?: () => void;
    isUpgradeActive?: boolean;
}

function Header({ onSettingsClick, onUpgradeClick, onFeedbackClick, onProfileClick, isUpgradeActive }: HeaderProps) {
    const { isAuthenticated, wallet } = useAuth();
    const showWalletBanner = isAuthenticated && !wallet?.isConnected;

    return (
        <header className="header">
            {showWalletBanner && (
                <div 
                    className="wallet-banner"
                    style={{
                        background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.2) 0%, rgba(217, 119, 6, 0.2) 100%)',
                        borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
                        padding: '8px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        fontSize: '14px',
                        color: '#f59e0b',
                        animation: 'slideDown 0.3s ease-out',
                    }}
                >
                    <AlertCircle size={16} />
                    <span>Link your wallet to analyze contracts</span>
                    <WalletButton size="sm" showIcon={false} />
                </div>
            )}
            
            <div className="header-inner">
                <div className="logo">
                    <img
                        src={logo}
                        alt="FundTracer"
                        className="logo-img-blend"
                        style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px' }}
                    />
                    <span className="logo-text">FundTracer <span className="beta-tag">BETA</span></span>
                    <span className="logo-subtext">by DT</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {onUpgradeClick && (
                        <button
                            className={`upgrade-btn ${isUpgradeActive ? 'upgrade-btn-active animate-pulse-glow' : ''}`}
                            onClick={onUpgradeClick}
                            title="Upgrade to Premium"
                        >
                            <Zap size={14} /> Upgrade
                        </button>
                    )}
                    
                    {/* Wallet Button - Only show when authenticated */}
                    {isAuthenticated && <WalletButton size="md" />}
                    
                    {onFeedbackClick && (
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={onFeedbackClick}
                            aria-label="Feedback"
                            title="Send Feedback"
                        >
                            <MessageSquare size={18} />
                        </button>
                    )}
                    <a
                        href="https://github.com/Deji-Tech"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-icon"
                        aria-label="GitHub"
                        title="GitHub"
                    >
                        <Github size={18} />
                    </a>
                    <a
                        href="mailto:fundtracerbydt@gmail.com"
                        className="btn btn-ghost btn-icon"
                        aria-label="Email"
                        title="Contact us"
                    >
                        <Mail size={18} />
                    </a>
                    {onProfileClick && (
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={onProfileClick}
                            aria-label="Profile"
                            title="Your Profile"
                        >
                            <User size={18} />
                        </button>
                    )}
                    <button
                        className="btn btn-ghost btn-icon"
                        onClick={onSettingsClick}
                        aria-label="Settings"
                        title="Settings"
                    >
                        <Settings size={18} />
                    </button>
                </div>
            </div>
        </header>
    );
}

export default Header;
