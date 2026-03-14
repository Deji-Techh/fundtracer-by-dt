import { HugeiconsIcon } from '@hugeicons/react';
import { GithubIcon, Mail01Icon, FlashIcon, MessageChat01Icon, UserIcon } from '@hugeicons/core-free-icons';
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
                        <HugeiconsIcon icon={FlashIcon} size={16} strokeWidth={2} />
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
                        <HugeiconsIcon icon={MessageChat01Icon} size={20} strokeWidth={1.5} />
                    </button>
                )}
                
                <a
                    href="https://github.com/Deji-Tech"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="header-action-btn"
                    title="GitHub"
                >
                    <HugeiconsIcon icon={GithubIcon} size={20} strokeWidth={1.5} />
                </a>
                
                <a
                    href="mailto:fundtracerbydt@gmail.com"
                    className="header-action-btn"
                    title="Contact us"
                >
                    <HugeiconsIcon icon={Mail01Icon} size={20} strokeWidth={1.5} />
                </a>
                
                {onProfileClick && (
                    <button
                        onClick={onProfileClick}
                        className="header-action-btn"
                        title="Your Profile"
                    >
                        <HugeiconsIcon icon={UserIcon} size={20} strokeWidth={1.5} />
                    </button>
                )}
            </div>
        </>
    );
}

export default Header;
