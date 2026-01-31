import { useAuth } from '../contexts/AuthContext';
import { checkUsername } from '../api';
import TerminalAnimation from './TerminalAnimation';
import { useState, useEffect } from 'react';
import { Mail, User, Lock, LogIn, UserPlus, ArrowLeft } from 'lucide-react';

type ViewState = 'landing' | 'signup' | 'signin';

function AuthPanel() {
    const {
        user,
        profile,
        isAuthenticated,
        loading,
        register,
        login,
        signOut
    } = useAuth();

    const [view, setView] = useState<ViewState>('landing');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [keepSignedIn, setKeepSignedIn] = useState(false);
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameChecking, setUsernameChecking] = useState(false);

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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim() || !email.trim() || !password.trim()) return;
        
        if (password !== confirmPassword) {
            setAuthError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setAuthError('Password must be at least 8 characters');
            return;
        }

        if (usernameAvailable === false) {
            setAuthError('Username is already taken');
            return;
        }

        setAuthLoading(true);
        setAuthError('');

        try {
            await register(username.trim(), email.trim(), password, keepSignedIn);
            // Registration successful, user is now logged in automatically
        } catch (error: any) {
            setAuthError(error.message || 'Registration failed');
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
            await login(username.trim(), password, keepSignedIn);
        } catch (error: any) {
            setAuthError(error.message || 'Login failed');
        } finally {
            setAuthLoading(false);
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
                            <button className="btn btn-primary" onClick={() => setView('signup')}>
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

        // Sign Up Page
        if (view === 'signup') {
            return (
                <div className="card animate-fade-in">
                    <div style={{ padding: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
                            Create Your Account
                        </h3>
                        <form onSubmit={handleRegister}>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                                    <User size={16} /> Username
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Choose a username (3-20 chars, alphanumeric)"
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
                                {authLoading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>
                        <button className="btn btn-ghost" style={{ width: '100%', marginTop: 'var(--space-3)' }} onClick={() => setView('landing')}>
                            <ArrowLeft size={16} /> Go Back
                        </button>
                    </div>
                </div>
            );
        }

        // Sign In Page
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

            </div>

        </div>
    );
}

export default AuthPanel;