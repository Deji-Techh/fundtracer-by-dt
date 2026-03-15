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
        <>
            {/* Left Section - Logo */}
            <div className="app-header-left">
                <div className="header-logo">
                    <img src={logo} alt="FundTracer" />
                    <span>FundTracer</span>
                    <span className="header-beta-badge">Beta</span>
                </div>
            </div>

            {/* Center Section - Navigation could go here if needed */}
            <div className="app-header-center">
                {/* Navigation tabs can be added here later */}
            </div>

            {/* Right Section - Actions */}
            <div className="app-header-right">
                {onUpgradeClick && (
                    <button
                        onClick={onUpgradeClick}
                        className="header-upgrade-btn"
                    >
                        <Zap size={16} />
                        <span>Upgrade</span>
                    </button>
                )}
                
                {isAuthenticated && <WalletButton />}
                
                {onFeedbackClick && (
                    <button
                        onClick={onFeedbackClick}
                        className="header-action-btn"
                        title="Send Feedback"
                    >
                        <MessageSquare size={20} />
                    </button>
                )}
                
                <a
                    href="https://github.com/Deji-Tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="header-action-btn"
                    title="GitHub"
                >
                    <Github size={20} />
                </a>
                
                <a
                    href="mailto:fundtracerbydt@gmail.com"
                    className="header-action-btn"
                    title="Contact us"
                >
                    <Mail size={20} />
                </a>
                
                {onProfileClick && (
                    <button
                        onClick={onProfileClick}
                        className="header-action-btn"
                        title="Your Profile"
                    >
                        <User size={20} />
                    </button>
                )}
            </div>
        </>
    );
}

export default Header;
