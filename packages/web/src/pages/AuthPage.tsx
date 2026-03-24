import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { handleVerifyEmail, handlePasswordReset, handleRecoverEmail, sendPasswordReset } from '../firebase';
import { Mail, Lock, Check, AlertCircle, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import './AuthPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli' },
];

type ActionMode = 'signin' | 'signup' | 'verifyEmail' | 'resetPassword' | 'recoverEmail' | 'forgotPassword';

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithGoogle, isAuthenticated, setTokenFromExternal } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [tokenProcessed, setTokenProcessed] = useState(false);
  const [authMode, setAuthMode] = useState<ActionMode>('signin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  const urlAuthMode = searchParams.get('mode');

  useEffect(() => {
    if (mode && oobCode) {
      if (mode === 'verifyEmail') {
        setAuthMode('verifyEmail');
        handleVerifyEmailAction(oobCode);
      } else if (mode === 'resetPassword') {
        setAuthMode('resetPassword');
      } else if (mode === 'recoverEmail') {
        setAuthMode('recoverEmail');
        handleRecoverEmailAction(oobCode);
      }
    } else if (urlAuthMode === 'signup') {
      setAuthMode('signup');
    } else if (urlAuthMode === 'signin') {
      setAuthMode('signin');
    }
  }, [mode, oobCode, urlAuthMode]);

  useEffect(() => {
    const token = searchParams.get('token');
    const authError = searchParams.get('error');
    
    if (token && !tokenProcessed) {
      setTokenProcessed(true);
      setTokenFromExternal(token);
      const redirectTo = sessionStorage.getItem('authRedirect') || '/api/keys';
      sessionStorage.removeItem('authRedirect');
      navigate(redirectTo, { replace: true });
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (authError) {
      setError(`Authentication failed: ${authError}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, tokenProcessed, setTokenFromExternal, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = sessionStorage.getItem('authRedirect') || '/api/keys';
      sessionStorage.removeItem('authRedirect');
      navigate(redirectTo);
    }
  }, [isAuthenticated, navigate]);

  const handleVerifyEmailAction = async (code: string) => {
    setActionLoading(true);
    try {
      await handleVerifyEmail(code);
      setSuccess('Email verified successfully! You can now sign in.');
      setTimeout(() => {
        setAuthMode('signin');
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify email');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecoverEmailAction = async (code: string) => {
    setActionLoading(true);
    try {
      await handleRecoverEmail(code);
      setSuccess('Email recovered successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to recover email');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (!oobCode) {
      setError('Invalid reset code');
      return;
    }
    
    setActionLoading(true);
    try {
      await handlePasswordReset(oobCode, newPassword);
      setSuccess('Password reset successfully! You can now sign in.');
      setTimeout(() => {
        setAuthMode('signin');
        setSuccess(null);
        setNewPassword('');
        setConfirmPassword('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!resetEmail) {
      setError('Please enter your email');
      return;
    }
    
    setActionLoading(true);
    try {
      await sendPasswordReset(resetEmail);
      setSuccess('Password reset email sent! Check your inbox.');
      setTimeout(() => {
        setAuthMode('signin');
        setSuccess(null);
        setResetEmail('');
      }, 3000);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else {
        setError(err.message || 'Failed to send reset email');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('authRedirect', currentPath);
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
      setLoading(false);
    }
  };

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="auth-page-v2">
        <div className="auth-bg-v2">
          <div className="auth-glow-v2 glow-1" />
          <div className="auth-glow-v2 glow-2" />
        </div>

        <div className="auth-card-v2">
          <motion.div 
            className="auth-card-inner"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="auth-brand">
              <img src="/logo.png" alt="FundTracer" className="auth-brand-logo" onError={(e: any) => { e.target.style.display = 'none'; }} />
              <span className="auth-brand-name">FundTracer</span>
            </div>

            <AnimatePresence mode="wait">
              
              {authMode === 'verifyEmail' && (
                <motion.div
                  key="verifyEmail"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="auth-state-card"
                >
                  {actionLoading ? (
                    <div className="auth-state-loading">
                      <Loader2 size={40} className="spin" />
                      <p>Verifying your email...</p>
                    </div>
                  ) : success ? (
                    <div className="auth-state-success">
                      <div className="auth-state-icon success-icon-circle">
                        <Check size={28} />
                      </div>
                      <h2>Email Verified!</h2>
                      <p>{success}</p>
                      <a href="/auth?mode=signin" className="auth-btn-primary">
                        Sign In <ArrowRight size={16} />
                      </a>
                    </div>
                  ) : error ? (
                    <div className="auth-state-error">
                      <div className="auth-state-icon error-icon-circle">
                        <AlertCircle size={28} />
                      </div>
                      <h2>Verification Failed</h2>
                      <p>{error}</p>
                      <a href="/auth?mode=signin" className="auth-btn-secondary">
                        Go to Sign In
                      </a>
                    </div>
                  ) : null}
                </motion.div>
              )}

              {authMode === 'resetPassword' && (
                <motion.div
                  key="resetPassword"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="auth-icon-wrap">
                    <Lock size={28} />
                  </div>
                  <h2>Reset Password</h2>
                  <p className="auth-desc-text">Enter your new password below</p>

                  {error && <div className="auth-error-msg">{error}</div>}

                  {success ? (
                    <div className="auth-success-inline">
                      <Check size={18} />
                      <span>{success}</span>
                    </div>
                  ) : (
                    <form onSubmit={handlePasswordResetSubmit} className="auth-form-fields">
                      <div className="auth-field">
                        <label>New Password</label>
                        <div className="auth-input-wrap">
                          <Lock size={16} className="auth-input-icon" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            required
                            minLength={8}
                          />
                          <button type="button" className="auth-toggle-pw" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="auth-field">
                        <label>Confirm Password</label>
                        <div className="auth-input-wrap">
                          <Lock size={16} className="auth-input-icon" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your password"
                            required
                          />
                          {confirmPassword && (
                            <span className={`auth-pw-check ${newPassword === confirmPassword ? 'match' : 'no-match'}`}>
                              {newPassword === confirmPassword ? <Check size={14} /> : <AlertCircle size={14} />}
                            </span>
                          )}
                        </div>
                      </div>

                      <button type="submit" className="auth-btn-primary" disabled={actionLoading}>
                        {actionLoading ? <Loader2 size={16} className="spin" /> : <>Reset Password <ArrowRight size={16} /></>}
                      </button>
                    </form>
                  )}

                  <a href="/auth?mode=signin" className="auth-link-back">Back to Sign In</a>
                </motion.div>
              )}

              {authMode === 'forgotPassword' && (
                <motion.div
                  key="forgotPassword"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="auth-icon-wrap">
                    <Mail size={28} />
                  </div>
                  <h2>Reset Password</h2>
                  <p className="auth-desc-text">Enter your email and we'll send you a reset link</p>

                  {error && <div className="auth-error-msg">{error}</div>}

                  {success ? (
                    <div className="auth-success-inline">
                      <Check size={18} />
                      <span>{success}</span>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPasswordSubmit} className="auth-form-fields">
                      <div className="auth-field">
                        <label>Email</label>
                        <div className="auth-input-wrap">
                          <Mail size={16} className="auth-input-icon" />
                          <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                          />
                        </div>
                      </div>

                      <button type="submit" className="auth-btn-primary" disabled={actionLoading}>
                        {actionLoading ? <Loader2 size={16} className="spin" /> : 'Send Reset Link'}
                      </button>
                    </form>
                  )}

                  <a href="/auth?mode=signin" className="auth-link-back">Back to Sign In</a>
                </motion.div>
              )}

              {(authMode === 'signin' || authMode === 'signup') && (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="auth-main-form"
                >
                  <div className="auth-heading-group">
                    <h2>{authMode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
                    <p className="auth-desc-text">
                      {authMode === 'signup' 
                        ? 'Get started with FundTracer.' 
                        : 'Sign in to access your dashboard'}
                    </p>
                  </div>

                  {error && (
                    <div className="auth-error-msg">{error}</div>
                  )}

                  <button
                    className="auth-btn-google"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    {loading ? <Loader2 size={18} className="spin" /> : (authMode === 'signup' ? 'Continue with Google' : 'Continue with Google')}
                  </button>

                  <div className="auth-divider">
                    <span />
                    <p>or</p>
                    <span />
                  </div>

                  <p className="auth-email-note">
                    Email/password sign-in is available after creating your account with Google.
                  </p>

                  <div className="auth-trust-row">
                    <div className="auth-trust-item">
                      <Check size={14} />
                      <span>No credit card</span>
                    </div>
                    <div className="auth-trust-item">
                      <Check size={14} />
                      <span>7+ chains</span>
                    </div>
                    <div className="auth-trust-item">
                      <Check size={14} />
                      <span>Sybil detection</span>
                    </div>
                  </div>

                  <a 
                    href="/auth?mode=forgotPassword"
                    className="auth-link-forgot"
                    onClick={(e) => {
                      e.preventDefault();
                      setAuthMode('forgotPassword');
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Forgot password?
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </LandingLayout>
  );
}

export default AuthPage;
