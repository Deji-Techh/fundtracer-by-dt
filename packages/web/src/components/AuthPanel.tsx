import { useAuth } from '../contexts/AuthContext';
import { WalletButton } from './WalletButton';
import TerminalAnimation from './TerminalAnimation';
import { Wallet } from 'lucide-react';

function AuthPanel() {
    const {
        user,
        profile,
        isAuthenticated,
        loading,
        signOut
    } = useAuth();

    if (loading) {
        return (
            <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }} />
            </div>
        );
    }

    // Not authenticated — show wallet connect prompt
    if (!isAuthenticated) {
        return (
            <div className="card animate-fade-in animate-slide-up">
                <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                    <div style={{ marginBottom: 'var(--space-5)' }}>
                        <TerminalAnimation />
                    </div>
                    <h2 style={{
                        fontSize: 'var(--text-xl)',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: 'var(--space-2)'
                    }}>
                        FundTracer <span style={{ fontSize: '0.6em', background: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', verticalAlign: 'middle' }}>BETA</span> by DT
                    </h2>
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-4)',
                        fontSize: 'var(--text-md)',
                        fontStyle: 'italic',
                        fontWeight: 500
                    }}>
                        "Trace with Precision. Scale with Confidence."
                    </p>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
                        Connect your wallet to access FundTracer.
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <WalletButton />
                    </div>
                </div>
            </div>
        );
    }

    // Authenticated — show wallet info
    const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
        <div className="card animate-fade-in" style={{ marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '14px'
                    }}>
                        <Wallet size={16} />
                    </div>
                    <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user?.walletAddress ? formatAddress(user.walletAddress) : 'Connected'}
                            <span className="risk-badge medium" style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6', marginLeft: 0 }}>
                                {profile?.tier?.toUpperCase() || 'FREE'} TIER
                            </span>
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                            {profile?.usage?.remaining === 'unlimited'
                                ? 'Unlimited usage'
                                : `${profile?.usage?.remaining}/${profile?.usage?.limit} analyses remaining today`}
                        </div>
                    </div>
                </div>

                <button className="btn btn-ghost" onClick={signOut}>
                    Sign Out
                </button>
            </div>

            {/* Wallet Address */}
            {user?.walletAddress && (
                <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-surface-border)' }}>
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                            <Wallet size={14} /> Wallet
                        </label>
                        <div style={{
                            padding: '8px 12px',
                            backgroundColor: 'var(--color-surface-hover)',
                            borderRadius: '6px',
                            fontSize: 'var(--text-sm)',
                            color: 'var(--color-text-secondary)',
                            fontFamily: 'var(--font-mono)',
                            wordBreak: 'break-all'
                        }}>
                            {user.walletAddress}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AuthPanel;
