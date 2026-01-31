import { useAuth } from '../contexts/AuthContext';
import { saveAlchemyKey, removeAlchemyKey, checkUsername } from '../api';
import TerminalAnimation from './TerminalAnimation';
import { useState, useEffect } from 'react';
import { Mail, User, Lock, Wallet, LogIn, UserPlus, CheckCircle, ArrowLeft } from 'lucide-react';

interface AuthPanelProps {
    showApiKeyForm: boolean;
    setShowApiKeyForm: (show: boolean) => void;
}

type ViewState = 'landing' | 'signup-email' | 'signup-pending' | 'signup-complete' | 'signin';

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
    const [confirmPassword, setConfirmPassword] = useState('');
    const [tempPassword, setTempPassword] = useState('');
    const [keepSignedIn, setKeepSignedIn] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [emailVerified, setEmailVerified] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameChecking, setUsernameChecking] = useState(false);

    const [alchemyKeyInput, setAlchemyKeyInput] = useState('');
    const [alchemyKeyError, setAlchemyKeyError] = useState('');
    const [alchemyKeySaving, setAlchemyKeySaving] = useState(false);

    // Check for email verification on mount (when returning from email link)
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const oobCode = urlParams.get('oobCode');
        
        if (mode === 'verifyEmail' && oobCode) {
            // User clicked email verification link
            setEmailVerified(true);
            setView('signup-complete');
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    // Check username availability
    useEffect(() => {
        if (username.length >= 3 && /^[a-zA-Z0-9_]+$/.test(username)) {
            setUsernameChecking(true);
            const timeout = setTimeout(async () => {
                try {
                    const result = await checkUsername(username);
                    setUsernameAvailable(result.available);
                } catch {
                    setUsernameAvailable(null);
                } finally {
                    setUsernameChecking(false);
                }
            }, 500);
            return () => clearTimeout(timeout);
        } else {
            setUsernameAvailable(null);
        }
    }, [username]);

    const handleSendVerification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setAuthLoading(true);
        setAuthError('');

        try {
            // Generate a temporary password for Firebase user creation
            const tempPass = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
            setTempPassword(tempPass);
            
            // Create Firebase user with email + temp password
            await registerWithEmail(email.trim(), tempPass);
            
            // Send verification email
            await sendEmailVerification();
            
            setVerificationSent(true);
            setView('signup-pending');
        } catch (error: any) {
            setAuthError(error.message || 'Failed to send verification');
        } finally {
            setAuthLoading(false);
        }
    };

    const handleCompleteRegistration = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !password.trim() || !user?.uid) return;
        
        if (password !== confirmPassword) {
            setAuthError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setAuthError('Password must be at least 8 characters');
            return;
        }

        setAuthLoading(true);
        setAuthError('');

        try {
            await completeRegistration(user.uid, username.trim(), password, keepSignedIn);
            // Clear sensitive data
            setTempPassword('');
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
            setAuthError(error.message || 'Login failed');
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
            console.error('Save Alchemy key error:', error);
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

        // Sign Up Step 1: Email Only
        if (view === 'signup-email') {
            return (
                <div className="card animate-fade-in">
                    <div style={{ padding: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                            Create Your Account
                        </h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)', textAlign: 'center', fontSize: 'var(--text-sm)' }}>
                            Enter your email to get started. We'll send you a verification link.
                        </p>
                        <form onSubmit={handleSendVerification}>
                            <div style={{ marginBottom: 'var(--space-4)' }}>
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
                            {authError && (
                                <div className="alert danger" style={{ marginBottom: 'var(--space-3)' }}>
                                    {authError}
                                </div>
                            )}
                            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={authLoading}>
                                {authLoading ? 'Sending...' : 'Verify Email'}
                            </button>
                        </form>
                        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setView('landing')}>
                            <ArrowLeft size={16} /> Go Back
                        </button>
                    </div>
                </div>
            );
        }

        // Sign Up Step 2: Verification Pending
        if (view === 'signup-pending') {
            return (
                <div className="card animate-fade-in">
                    <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                        <Mail size={48} color="var(--color-primary)" style={{ marginBottom: 'var(--space-4)' }} />
                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-2)' }}>
                            Verification Email Sent
                        </h3>
                        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                            We've sent a verification link to <strong>{email}</strong>. 
                            Please check your inbox and click the link to continue.
                        </p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)' }}>
                            After verifying, return here to complete your registration.
                        </p>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', flexDirection: 'column' }}>
                            <button className="btn btn-secondary" onClick={handleSendVerification} disabled={authLoading}>
                                Resend Verification Email
                            </button>
                            <button className="btn btn-ghost" onClick={() => setView('landing')}>
                                Back to Home
                            </button>
                            {/* Dev mode: Skip to complete */}
                            {process.env.NODE_ENV === 'development' && (
                                <button className="btn btn-ghost" onClick={() => setView('signup-complete')} style={{ fontSize: '12px' }}>
                                    [Dev] Skip to Complete
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // Sign Up Step 3: Complete Registration (Username + Password)
        if (view === 'signup-complete') {
            return (
                <div className="card animate-fade-in">
                    <div style={{ padding: 'var(--space-6)' }}>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                            <CheckCircle size={48} color="#10B981" />
                            <h3 style={{ fontSize: 'var(--text-lg)', marginTop: 'var(--space-2)' }}>
                                Email Verified!
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                                Now create your username and password
                            </p>
                        </div>
                        <form onSubmit={handleCompleteRegistration}>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                    <User size={16} /> Username
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Choose a username (3-20 chars)"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    minLength={3}
                                    maxLength={20}
                                    pattern="[a-zA-Z0-9_]+"
                                    required
                                />
                                {usernameChecking && (
                                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Checking...</span>
                                )}
                                {usernameAvailable === true && (
                                    <span style={{ fontSize: '12px', color: '#10B981' }}>✓ Available</span>
                                )}
                                {usernameAvailable === false && (
                                    <span style={{ fontSize: '12px', color: '#EF4444' }}>✗ Username taken</span>
                                )}
                            </div>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                    <Lock size={16} /> Password
                                </label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Create a password (min 8 chars)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={8}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                    <Lock size={16} /> Confirm Password
                                </label>
                                <input
                                    type="password"
                                    className="input"
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                {password && confirmPassword && password !== confirmPassword && (
                                    <span style={{ fontSize: '12px', color: '#EF4444' }}>Passwords do not match</span>
                                )}
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={keepSignedIn}
                                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                                />
                                <span>Keep me signed in for 30 days</span>
                            </label>
                            {authError && (
                                <div className="alert danger" style={{ marginBottom: 'var(--space-3)' }}>
                                    {authError}
                                </div>
                            )}
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                style={{ width: '100%' }} 
                                disabled={authLoading || usernameAvailable === false || password !== confirmPassword}
                            >
                                {authLoading ? 'Creating Account...' : 'Complete Registration'}
                            </button>
                        </form>
                        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setView('landing')}>
                            Cancel
                        </button>
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
                                <span>Keep me signed in for 30 days</span>
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
                            <ArrowLeft size={16} /> Go Back
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        <Mail size={14} /> Email
                    </label>
                    <div style={{
                        padding: '8px 12px',
                        backgroundColor: 'var(--color-surface-hover)',
                        borderRadius: '6px',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-secondary)'
                    }}>
                        {user?.email}
                    </div>
                </div>

                {/* Wallet Section */}
                <div style={{ marginBottom: 'var(--space-3)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        <Wallet size={14} /> Wallet
                    </label>
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
                            {profile?.isVerified && (
                                <span className="risk-badge low" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', marginLeft: 0 }}>
                                    PoH Verified
                                </span>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            padding: '12px',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            borderRadius: '6px',
                            textAlign: 'center'
                        }}>
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                                No wallet connected
                            </p>
                            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                                <Wallet size={14} /> Connect Wallet
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Alchemy API Key Section */}
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-surface-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                        Alchemy API Key
                    </div>
                    {profile?.hasCustomApiKey ? (
                        <span className="risk-badge low" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success-text)' }}>
                            Active
                        </span>
                    ) : null}
                </div>

                {!profile?.hasCustomApiKey && !showApiKeyForm && (
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowApiKeyForm(true)}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                        Add API Key
                    </button>
                )}

                {showApiKeyForm && !profile?.hasCustomApiKey && (
                    <div style={{ marginTop: 'var(--space-2)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <input
                                type="password"
                                className="input"
                                placeholder="Enter Alchemy API key"
                                value={alchemyKeyInput}
                                onChange={(e) => setAlchemyKeyInput(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveAlchemyKey}
                                disabled={alchemyKeySaving}
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                            >
                                {alchemyKeySaving ? '...' : 'Save'}
                            </button>
                        </div>
                        {alchemyKeyError && (
                            <div className="alert danger" style={{ marginTop: 'var(--space-2)', fontSize: '12px', padding: '6px' }}>
                                {alchemyKeyError}
                            </div>
                        )}
                    </div>
                )}

                {profile?.hasCustomApiKey && (
                    <button
                        className="btn btn-ghost"
                        onClick={handleRemoveAlchemyKey}
                        style={{ color: 'var(--color-danger-text)', padding: '6px 12px', fontSize: '12px' }}
                    >
                        Remove Key
                    </button>
                )}
            </div>
        </div>
    );
}

export default AuthPanel;
