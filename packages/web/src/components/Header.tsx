import { Github, Mail, Zap, MessageSquare, User } from 'lucide-react';
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

    return (
        <header style={{
            height: '60px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                    src={logo}
                    alt="FundTracer"
                    style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '4px' }}
                />
                <span style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1a1a1a' }}>
                    FundTracer
                </span>
                <span style={{ 
                    fontSize: '0.75rem', 
                    backgroundColor: '#f3f4f6', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    color: '#666666'
                }}>
                    BETA
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {onUpgradeClick && (
                    <button
                        onClick={onUpgradeClick}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: isUpgradeActive ? '#fee2e2' : '#f3f4f6',
                            color: isUpgradeActive ? '#dc2626' : '#666666',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                        }}
                    >
                        <Zap size={14} /> Upgrade
                    </button>
                )}
                
                {isAuthenticated && <WalletButton />}
                
                {onFeedbackClick && (
                    <button
                        onClick={onFeedbackClick}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#666666',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        title="Send Feedback"
                    >
                        <MessageSquare size={18} />
                    </button>
                )}
                
                <a
                    href="https://github.com/Deji-Tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        color: '#666666',
                        transition: 'all 0.2s ease',
                    }}
                    title="GitHub"
                >
                    <Github size={18} />
                </a>
                
                <a
                    href="mailto:fundtracerbydt@gmail.com"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        color: '#666666',
                        transition: 'all 0.2s ease',
                    }}
                    title="Contact us"
                >
                    <Mail size={18} />
                </a>
                
                {onProfileClick && (
                    <button
                        onClick={onProfileClick}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#666666',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        title="Your Profile"
                    >
                        <User size={18} />
                    </button>
                )}
            </div>
        </header>
    );
}

export default Header;
