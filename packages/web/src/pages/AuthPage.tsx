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
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [authMode, setAuthMode] = useState<ActionMode>('signin');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  
  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');
  const urlAuthMode = searchParams.get('mode');

  useEffect(() => {
    // Check for Firebase action mode
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
    if (isAuthenticated) {
      navigate('/app-evm');
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
    try {
      setError(null);
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    }
  };

  const features = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
      ),
      title: 'Analyze Wallets',
      desc: 'Trace funding sources and transaction history'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M6 9l6 6 6-6"/>
          <path d="M6 3v18"/>
        </svg>
      ),
      title: 'Funding Trees',
      desc: 'Visualize where funds originate from'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          <path d="M12 8v4M12 16h.01"/>
        </svg>
      ),
      title: 'Sybil Detection',
      desc: 'Identify coordinated attack patterns'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 3v18h18"/>
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>
        </svg>
      ),
      title: 'Compare Wallets',
      desc: 'Side-by-side wallet analysis'
    }
  ];

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-grid" />
          <div className="auth-glow auth-glow--1" />
          <div className="auth-glow auth-glow--2" />
        </div>

        <div className="auth-container">
          {/* Left Side - Features */}
          <motion.div 
            className="auth-features"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div 
              className="auth-logo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <img src="/logo.png" alt="FundTracer" className="auth-logo-img" onError={(e: any) => { e.target.style.display = 'none'; }} />
              <span className="auth-logo-text">FundTracer</span>
            </motion.div>

            <motion.h1 
              className="auth-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Blockchain Intelligence{' '}
              <span className="auth-title-accent">Reimagined</span>
            </motion.h1>

            <motion.p 
              className="auth-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Trace wallet funding sources, detect Sybil clusters, and uncover 
              hidden relationships across the blockchain.
            </motion.p>

            <motion.div 
              className="auth-features-grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {features.map((feature, i) => (
                <motion.div 
                  key={i}
                  className="auth-feature-card"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  whileHover={{ scale: 1.02, x: 4 }}
                >
                  <div className="auth-feature-icon">{feature.icon}</div>
                  <div>
                    <h4>{feature.title}</h4>
                    <p>{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Side - Forms */}
          <motion.div 
            className="auth-form-container"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="auth-form">
              <AnimatePresence mode="wait">
                
                {/* Verify Email */}
                {authMode === 'verifyEmail' && (
                  <motion.div
                    key="verifyEmail"
                    className="action-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    {actionLoading ? (
                      <div className="action-loading">
                        <Loader2 size={48} className="spin" />
                        <p>Verifying your email...</p>
                      </div>
                    ) : success ? (
                      <motion.div 
                        className="action-success"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="success-icon">
                          <Check size={32} />
                        </div>
                        <h2>Email Verified!</h2>
                        <p>{success}</p>
                        <a href="/auth?mode=signin" className="action-btn primary">
                          Sign In
                          <ArrowRight size={18} />
                        </a>
                      </motion.div>
                    ) : error ? (
                      <motion.div 
                        className="action-error"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="error-icon">
                          <AlertCircle size={32} />
                        </div>
                        <h2>Verification Failed</h2>
                        <p>{error}</p>
                        <a href="/auth?mode=signin" className="action-btn secondary">
                          Go to Sign In
                        </a>
                      </motion.div>
                    ) : null}
                  </motion.div>
                )}

                {/* Reset Password */}
                {authMode === 'resetPassword' && (
                  <motion.div
                    key="resetPassword"
                    className="action-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="action-icon">
                        <Lock size={32} />
                      </div>
                      <h2>Reset Password</h2>
                      <p className="action-desc">Enter your new password below</p>

                      {error && (
                        <motion.div 
                          className="auth-error"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                        >
                          {error}
                        </motion.div>
                      )}

                      {success ? (
                        <motion.div 
                          className="action-success-inline"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Check size={20} />
                          <span>{success}</span>
                        </motion.div>
                      ) : (
                        <form onSubmit={handlePasswordResetSubmit} className="action-form">
                          <div className="input-group">
                            <label>New Password</label>
                            <div className="input-wrapper">
                              <Lock size={18} className="input-icon" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="At least 8 characters"
                                required
                                minLength={8}
                              />
                              <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>

                          <div className="input-group">
                            <label>Confirm Password</label>
                            <div className="input-wrapper">
                              <Lock size={18} className="input-icon" />
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm your password"
                                required
                              />
                              {confirmPassword && (
                                <span className={`password-match ${newPassword === confirmPassword ? 'match' : 'no-match'}`}>
                                  {newPassword === confirmPassword ? <Check size={16} /> : <AlertCircle size={16} />}
                                </span>
                              )}
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            className="action-btn primary"
                            disabled={actionLoading}
                          >
                            {actionLoading ? (
                              <Loader2 size={18} className="spin" />
                            ) : (
                              <>
                                Reset Password
                                <ArrowRight size={18} />
                              </>
                            )}
                          </button>
                        </form>
                      )}

                      <a href="/auth?mode=signin" className="back-link">
                        Back to Sign In
                      </a>
                    </motion.div>
                  </motion.div>
                )}

                {/* Forgot Password */}
                {authMode === 'forgotPassword' && (
                  <motion.div
                    key="forgotPassword"
                    className="action-card"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="action-icon">
                        <Mail size={32} />
                      </div>
                      <h2>Reset Password</h2>
                      <p className="action-desc">Enter your email and we'll send you a reset link</p>

                      {error && (
                        <motion.div 
                          className="auth-error"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                        >
                          {error}
                        </motion.div>
                      )}

                      {success ? (
                        <motion.div 
                          className="action-success-inline"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Check size={20} />
                          <span>{success}</span>
                        </motion.div>
                      ) : (
                        <form onSubmit={handleForgotPasswordSubmit} className="action-form">
                          <div className="input-group">
                            <label>Email</label>
                            <div className="input-wrapper">
                              <Mail size={18} className="input-icon" />
                              <input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                              />
                            </div>
                          </div>

                          <button 
                            type="submit" 
                            className="action-btn primary"
                            disabled={actionLoading}
                          >
                            {actionLoading ? (
                              <Loader2 size={18} className="spin" />
                            ) : (
                              'Send Reset Link'
                            )}
                          </button>
                        </form>
                      )}

                      <a href="/auth?mode=signin" className="back-link">
                        Back to Sign In
                      </a>
                    </motion.div>
                  </motion.div>
                )}

                {/* Sign In / Sign Up */}
                {(authMode === 'signin' || authMode === 'signup') && (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <h2>{authMode === 'signup' ? 'Create Account' : 'Welcome Back'}</h2>
                    <p className="auth-form-desc">
                      {authMode === 'signup' 
                        ? 'Sign up to access powerful blockchain analytics - it\'s free!' 
                        : 'Sign in to access powerful blockchain analytics'}
                    </p>

                    {error && (
                      <motion.div 
                        className="auth-error"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                      >
                        {error}
                      </motion.div>
                    )}

                    <div className="auth-buttons">
                      <motion.button
                        className="auth-btn auth-btn--google"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        {authMode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}
                      </motion.button>
                    </div>

                    <p className="auth-terms">
                      By continuing, you agree to our{' '}
                      <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>
                    </p>

                    {authMode === 'signin' && (
                      <a 
                        href="/auth?mode=forgotPassword" 
                        className="forgot-password-link"
                        onClick={(e) => {
                          e.preventDefault();
                          setAuthMode('forgotPassword');
                          setError(null);
                          setSuccess(null);
                        }}
                      >
                        Forgot password?
                      </a>
                    )}

                    <p className="auth-switch-mode">
                      {authMode === 'signup' ? (
                        <>Already have an account? <a href="/auth?mode=signin">Sign In</a></>
                      ) : (
                        <>Don't have an account? <a href="/auth?mode=signup">Sign Up</a></>
                      )}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </LandingLayout>
  );
}

export default AuthPage;
