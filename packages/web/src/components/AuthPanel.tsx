import { useAuth } from '../contexts/AuthContext';
import { saveAlchemyKey, removeAlchemyKey } from '../api';
import TerminalAnimation from './TerminalAnimation';
import { useState } from 'react';
import { Mail, User, Lock, Wallet, LogIn, UserPlus } from 'lucide-react';

interface AuthPanelProps {
    showApiKeyForm: boolean;
    setShowApiKeyForm: (show: boolean) => void;
}

type ViewState = 'landing' | 'signup-email' | 'signup-verified' | 'signin';

function AuthPanel({ showApiKeyForm, setShowApiKeyForm }: AuthPanelProps) {
    const {
        user,
        profile,
        isAuthenticated,
        loading,
        registerWithEmail,
        sendEmailVerification,
        completeRegistration,
        loginWithUsername,
        signOut,
        connectWallet
    } = useAuth();

    const [view, setView] = useState<ViewState>('landing');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [keepSignedIn, setKeepSignedIn] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);

    const [alchemyKeyInput, setAlchemyKeyInput] = useState('');
    const [alchemyKeyError, setAlchemyKeyError] = useState('');
    const [alchemyKeySaving, setAlchemyKeySaving] = useState(false);

    const handleRegisterInit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password.trim()) return;

        setAuthLoading(true);
        setAuthError('');

        try {
            await registerWithEmail(email.trim(), password);
            setVerificationSent(true);
        } catch (error: any) {
            setAuthError(error.message || 'Failed to initiate registration');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleCompleteRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim() || !user?.uid) return;

        setAuthLoading(true);
        setAuthError('');

        try {
            await completeRegistration(user.uid, username.trim(), password, keepSignedIn);
        } catch (error: any) {
            setAuthError(error.message || 'Failed to complete registration');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) return;

        setAuthLoading(true);
        setAuthError('');

        try {
            await loginWithUsername(username.trim(), password, keepSignedIn);
        } catch (error: any) {
            setAuthError(error.message || 'Invalid username or password');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSaveAlchemyKey = async () => {
        if (!alchemyKeyInput.trim()) {
            setAlchemyKeyError('Please enter an Alchemy API key');
            return;
        }

        setAlchemyKeySaving(true);
        setAlchemyKeyError('');

        try {
            const result = await saveAlchemyKey(alchemyKeyInput.trim());
            if (result.success) {
                setShowApiKeyForm(false);
                setAlchemyKeyInput('');
            }
        } catch (error: any) {
            setAlchemyKeyError(error.message || 'Failed to save Alchemy API key');
        } finally {
            setAlchemyKeySaving(false);
        }
    };

    const handleRemoveAlchemyKey = async () => {
        try {
            await removeAlchemyKey();
        } catch (error: any) {
            console.error('Failed to remove Alchemy key:', error);
        }
    };

    if (loading) {
        return (
            <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <div className="loading-spinner" style={{ margin: '0 auto' }} />
            </div>
        );
    }

    // Not authenticated views
    if (!isAuthenticated) {
        // Landing Page
        if (view === 'landing') {
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
                            Create an account or sign in to access FundTracer.
                        </p>

                        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                            <button className="btn btn-primary" onClick={() => setView('signup-email')}>
                                <UserPlus size={18} /> Sign Up
                            </button>
                            <button className="btn btn-secondary" onClick={() => setView('signin')}>
                                <LogIn size={18} /> Sign In
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        // Sign Up - Email Input
        if (view === 'signup-email') {
            if (verificationSent) {
                return (
                    <div className="card animate-fade-in">
                        <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                            <Mail size={48} color="var(--color-primary)" style={{ marginBottom: 'var(--space-4)' }} />
                            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
                                Verification Email Sent
                            </h3>
                            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                                Check your inbox at <strong>{email}</strong> and click the verification link to continue.
                            </p>
                            <button className="btn btn-ghost" onClick={() => { setView('landing'); setVerificationSent(false); setEmail(''); }}>
                                Back to Home
                            </button>
                        </div>
                    </div>
                );
            }

            return (
                <div className="card animate-fade-in">
                    <div style={{ padding: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                            Create Your Account
                        </h3>
                        <form onSubmit={handleRegisterInit}>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                    <Mail size={16} /> Email Address
                                </label>
                                <input
                                    type="email"
                                    className="input"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                    <Lock size={16} /> Password
                                </label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Create a password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            {authError && (
                                <div className="alert danger" style={{ marginBottom: 'var(--space-3)' }}>
                                    {authError}
                                </div>
                            )}
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
                                {authLoading ? 'Sending...' : 'Continue'}
                            </button>
                        </form>
                        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setView('landing')}>
                            Back
                        </button>
                    </div>
                </div>
            );
        }

        // Sign Up - Complete Registration (after email verification)
        if (view === 'signup-verified') {
            return (
                <div className="card animate-fade-in">
                    <div style={{ padding: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                            Complete Registration
                        </h3>
                        <form onSubmit={handleCompleteRegistration}>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                    <User size={16} /> Username
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Choose a username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={keepSignedIn}
                                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                                />
                                Keep me signed in
                            </label>
                            {authError && (
                                <div className="alert danger" style={{ marginBottom: 'var(--space-3)' }}>
                                    {authError}
                                </div>
                            )}
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
                                {authLoading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>
                    </div>
                </div>
            );
        }

        // Sign In
        if (view === 'signin') {
            return (
                <div className="card animate-fade-in">
                    <div style={{ padding: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                            Sign In
                        </h3>
                        <form onSubmit={handleLogin}>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                    <User size={16} /> Username
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Enter your username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                    <Lock size={16} /> Password
                                </label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={keepSignedIn}
                                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                                />
                                Keep me signed in
                            </label>
                            {authError && (
                                <div className="alert danger" style={{ marginBottom: 'var(--space-3)' }}>
                                    {authError}
                                </div>
                            )}
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
                                {authLoading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>
                        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setView('landing')}>
                            Back
                        </button>
                    </div>
                </div>
            );
        }
    }

    // Authenticated - Show User Info
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
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {user?.username || 'User'}
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

            {/* User Details */}
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-surface-border)' }}>
                <div style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        <Mail size={12} /> Email
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                        {user?.email}
                    </div>
                </div>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        <User size={12} /> Username
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                        {user?.username}
                    </div>
                </div>
            </div>

            {/* Wallet Section */}
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-surface-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)' }}>
                    <Wallet size={14} color="var(--color-text-muted)" />
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        Wallet
                    </span>
                </div>

                {profile?.walletAddress ? (
                    <div style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-surface-hover)',
                        borderRadius: '6px',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'monospace',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <span>{profile.walletAddress.slice(0, 8)}...{profile.walletAddress.slice(-6)}</span>
                        <span className="risk-badge low" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
                            Connected
                        </span>
                    </div>
                ) : (
                    <button className="btn btn-primary" onClick={connectWallet}>
                        <Wallet size={16} /> Connect Wallet
                    </button>
                )}
            </div>

            {/* Alchemy API Key Section */}
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-surface-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        Alchemy API Key
                    </div>
                    {profile?.hasCustomApiKey ? (
                        <span className="risk-badge low" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
                            Active - Unlimited Usage
                        </span>
                    ) : null}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>
                    Get a free Alchemy API key for fast, unlimited analysis from{' '}
                    <a href="https://alchemy.com/?r=badge:DU02ODk5NTQ4MjM2M" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-text-secondary)' }}>
                        alchemy.com
                    </a>
                </div>

                {!profile?.hasCustomApiKey && !showApiKeyForm && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowApiKeyForm(true)}
                    >
                        Add Alchemy Key
                    </button>
                )}

                {showApiKeyForm && !profile?.hasCustomApiKey && (
                    <div style={{ marginTop: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <input
                                type="password"
                                className="input"
                                placeholder="Enter your Alchemy API key"
                                value={alchemyKeyInput}
                                onChange={(e) => setAlchemyKeyInput(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveAlchemyKey}
                                disabled={alchemyKeySaving}
                            >
                                {alchemyKeySaving ? 'Validating...' : 'Save'}
                            </button>
                            <button
                                className="btn btn-ghost"
                                onClick={() => {
                                    setShowApiKeyForm(false);
                                    setAlchemyKeyInput('');
                                    setAlchemyKeyError('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>

                        {alchemyKeyError && (
                            <div className="alert danger" style={{ marginTop: 'var(--space-2)' }}>
                                {alchemyKeyError}
                            </div>
                        )}
                    </div>
                )}

                {profile?.hasCustomApiKey && (
                    <button
                        className="btn btn-ghost"
                        onClick={handleRemoveAlchemyKey}
                        style={{ color: 'var(--color-danger-text)' }}
                    >
                        Remove Alchemy Key
                    </button>
                )}
            </div>
        </div>
    );
}

export default AuthPanel;
