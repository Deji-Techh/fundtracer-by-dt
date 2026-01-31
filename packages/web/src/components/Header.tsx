import { useState } from 'react';
import { Github, Mail, Zap, MessageSquare, User, Menu, X } from 'lucide-react';
import logo from '../assets/logo.png';
import { WalletButton } from './WalletButton';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
    onUpgradeClick?: () => void;
    onFeedbackClick?: () => void;
    onProfileClick?: () => void;
    isUpgradeActive?: boolean;
}

function Header({ onUpgradeClick, onFeedbackClick, onProfileClick, isUpgradeActive }: HeaderProps) {
    const { isAuthenticated } = useAuth();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <header className="header">
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

                {/* Desktop Navigation */}
                <div className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
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
                    {isAuthenticated && <WalletButton />}
                    
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
                </div>

                {/* Mobile Hamburger Button */}
                <button
                    className="mobile-menu-btn"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label="Toggle menu"
                    style={{
                        display: 'none', // Hidden on desktop, shown on mobile via CSS
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px',
                        zIndex: 1001,
                    }}
                >
                    <div className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}>
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="mobile-menu-overlay"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 999,
                        animation: 'fadeIn 0.3s ease',
                    }}
                >
                    <div 
                        className="mobile-menu"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            top: '60px',
                            right: '16px',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: '16px',
                            padding: '24px',
                            minWidth: '280px',
                            border: '1px solid var(--color-border)',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            animation: 'slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        <div className="mobile-menu-items" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {onUpgradeClick && (
                                <button
                                    className={`mobile-menu-item upgrade ${isUpgradeActive ? 'active' : ''}`}
                                    onClick={() => { onUpgradeClick(); setMobileMenuOpen(false); }}
                                    style={{ animationDelay: '0.1s' }}
                                >
                                    <Zap size={20} /> Upgrade to Premium
                                </button>
                            )}
                            
                            {isAuthenticated && (
                                <div className="mobile-menu-item" style={{ animationDelay: '0.15s' }}>
                                    <WalletButton />
                                </div>
                            )}
                            
                            {onProfileClick && (
                                <button
                                    className="mobile-menu-item"
                                    onClick={() => { onProfileClick(); setMobileMenuOpen(false); }}
                                    style={{ animationDelay: '0.2s' }}
                                >
                                    <User size={20} /> Your Profile
                                </button>
                            )}
                            
                            {onFeedbackClick && (
                                <button
                                    className="mobile-menu-item"
                                    onClick={() => { onFeedbackClick(); setMobileMenuOpen(false); }}
                                    style={{ animationDelay: '0.25s' }}
                                >
                                    <MessageSquare size={20} /> Send Feedback
                                </button>
                            )}
                            
                            <a
                                href="https://github.com/Deji-Tech"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mobile-menu-item"
                                onClick={() => setMobileMenuOpen(false)}
                                style={{ animationDelay: '0.3s' }}
                            >
                                <Github size={20} /> GitHub
                            </a>
                            
                            <a
                                href="mailto:fundtracerbydt@gmail.com"
                                className="mobile-menu-item"
                                onClick={() => setMobileMenuOpen(false)}
                                style={{ animationDelay: '0.35s' }}
                            >
                                <Mail size={20} /> Contact Us
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

export default Header;
