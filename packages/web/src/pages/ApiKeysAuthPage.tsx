import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check, X, Sparkles, Shield, Zap, Loader2 } from 'lucide-react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { signUpWithEmail, signInWithEmail, verifyEmail, signInWithGoogle } from '../firebase';
import { loginWithEmail as apiLoginWithEmail, loginWithGoogle as apiLoginWithGoogle } from '../api';
import './ApiKeysAuthPage.css';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'FAQ', href: '/faq' },
  { label: 'API', href: '/api-docs' },
  { label: 'CLI', href: '/cli' },
];

type AuthStep = 'welcome' | 'signup' | 'signin' | 'email-sent';

export function ApiKeysAuthPage() {
  const [step, setStep] = useState<AuthStep>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setShowPassword(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const result = await signUpWithEmail(email, password);
      await verifyEmail();
      setVerificationSent(true);
      setStep('email-sent');
    } catch (err: any) {
      const errorCode = err.code;
      if (errorCode === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (errorCode === 'auth/invalid-email') {
        setError('Please enter a valid email address');
      } else if (errorCode === 'auth/weak-password') {
        setError('Password should be at least 6 characters');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signInWithEmail(email, password);
      const firebaseToken = await result.user.getIdToken();
      
      const response = await apiLoginWithEmail(firebaseToken);
      localStorage.setItem('fundtracer_token', response.token);
      
      window.location.href = '/api/keys';
    } catch (err: any) {
      const errorCode = err.code;
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (errorCode === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (errorCode === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const idToken = await signInWithGoogle();
      const response = await apiLoginWithGoogle(idToken);
      localStorage.setItem('fundtracer_token', response.token);
      window.location.href = '/api/keys';
    } catch (err: any) {
      console.error('Google login error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await verifyEmail();
      setVerificationSent(true);
    } catch (err) {
      console.error('Failed to resend verification:', err);
    }
  };

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="api-keys-auth-page">
        <div className="auth-bg-effects">
          <div className="auth-orb auth-orb--1" />
          <div className="auth-orb auth-orb--2" />
          <div className="auth-grid-overlay" />
        </div>

        <motion.div 
          className="auth-card"
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <AnimatePresence mode="wait">
            {step === 'welcome' && (
              <motion.div
                key="welcome"
                className="auth-step"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div 
                  className="auth-icon-wrapper"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <Key size={40} strokeWidth={1.5} />
                </motion.div>

                <motion.h1
                  className="auth-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Create Your API Key
                </motion.h1>

                <motion.p
                  className="auth-subtitle"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Sign in or create an account to start using the FundTracer API
                </motion.p>

                <motion.div 
                  className="auth-benefits"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="benefit">
                    <Check size={18} />
                    <span>100 free requests daily</span>
                  </div>
                  <div className="benefit">
                    <Check size={18} />
                    <span>Multi-chain support</span>
                  </div>
                  <div className="benefit">
                    <Check size={18} />
                    <span>Real-time wallet analysis</span>
                  </div>
                </motion.div>

                <motion.div 
                  className="auth-actions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <button 
                    className="auth-btn auth-btn--primary"
                    onClick={() => setStep('signup')}
                  >
                    <span>Create Account</span>
                    <motion.span
                      className="btn-icon"
                      initial={{ x: 0 }}
                      whileHover={{ x: 4 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                    >
                      <ArrowRight size={18} />
                    </motion.span>
                  </button>

                  <button 
                    className="auth-btn auth-btn--secondary"
                    onClick={() => setStep('signin')}
                  >
                    Sign In
                  </button>
                </motion.div>

                <motion.div 
                  className="auth-divider"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  <span>Quick Access</span>
                </motion.div>

                <motion.div 
                  className="auth-social"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <button 
                    className="social-btn" 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 size={20} className="spin" />
                    ) : (
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
                  </button>
                </motion.div>
              </motion.div>
            )}

            {step === 'signup' && (
              <motion.div
                key="signup"
                className="auth-step"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <button 
                  className="back-btn"
                  onClick={() => { resetForm(); setStep('welcome'); }}
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>

                <motion.div 
                  className="auth-icon-wrapper auth-icon-wrapper--small"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <Sparkles size={24} strokeWidth={1.5} />
                </motion.div>

                <h1 className="auth-title">Create Account</h1>
                <p className="auth-subtitle">Start your API journey today</p>

                <form onSubmit={handleSignUp} className="auth-form">
                  <motion.div 
                    className="input-group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label>Email</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>
                  </motion.div>

                  <motion.div 
                    className="input-group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <label>Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                  </motion.div>

                  <motion.div 
                    className="input-group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
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
                        <span className={`password-match ${password === confirmPassword ? 'match' : 'no-match'}`}>
                          {password === confirmPassword ? <Check size={16} /> : <X size={16} />}
                        </span>
                      )}
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        className="error-message"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    className="auth-btn auth-btn--primary auth-btn--full"
                    disabled={loading}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <span className="loading-spinner" />
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </form>

                <p className="auth-footer-text">
                  By creating an account, you agree to our{' '}
                  <a href="/terms">Terms of Service</a> and{' '}
                  <a href="/privacy">Privacy Policy</a>
                </p>
              </motion.div>
            )}

            {step === 'signin' && (
              <motion.div
                key="signin"
                className="auth-step"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <button 
                  className="back-btn"
                  onClick={() => { resetForm(); setStep('welcome'); }}
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>

                <motion.div 
                  className="auth-icon-wrapper auth-icon-wrapper--small"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                >
                  <Zap size={24} strokeWidth={1.5} />
                </motion.div>

                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to access your API keys</p>

                <form onSubmit={handleSignIn} className="auth-form">
                  <motion.div 
                    className="input-group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label>Email</label>
                    <div className="input-wrapper">
                      <Mail size={18} className="input-icon" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoFocus
                      />
                    </div>
                  </motion.div>

                  <motion.div 
                    className="input-group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <label>Password</label>
                    <div className="input-wrapper">
                      <Lock size={18} className="input-icon" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        className="toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </motion.div>

                  <AnimatePresence>
                    {error && (
                      <motion.div 
                        className="error-message"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    className="auth-btn auth-btn--primary auth-btn--full"
                    disabled={loading}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <span className="loading-spinner" />
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </motion.button>
                </form>

                <p className="auth-footer-text">
                  <a href="#" className="forgot-link">Forgot password?</a>
                </p>
              </motion.div>
            )}

            {step === 'email-sent' && (
              <motion.div
                key="email-sent"
                className="auth-step auth-step--centered"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <motion.div 
                  className="success-icon-wrapper"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                >
                  <Mail size={48} strokeWidth={1.5} />
                </motion.div>

                <motion.h1
                  className="auth-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Check Your Email
                </motion.h1>

                <motion.p
                  className="auth-subtitle auth-subtitle--large"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  We've sent a verification email to<br />
                  <strong>{email}</strong>
                </motion.p>

                <motion.div
                  className="email-instructions"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="instruction">
                    <span className="step-number">1</span>
                    <span>Open the verification email</span>
                  </div>
                  <div className="instruction">
                    <span className="step-number">2</span>
                    <span>Click the verification link</span>
                  </div>
                  <div className="instruction">
                    <span className="step-number">3</span>
                    <span>Return here to create your API key</span>
                  </div>
                </motion.div>

                <motion.button
                  className="auth-btn auth-btn--secondary"
                  onClick={() => setStep('signin')}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  Already verified? Sign In
                </motion.button>

                <motion.button
                  className="resend-btn"
                  onClick={handleResendVerification}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.7 }}
                >
                  {verificationSent ? 'Verification email sent!' : 'Resend verification email'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div 
          className="auth-tips"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Shield size={16} />
          <span>Your data is encrypted and secure</span>
        </motion.div>
      </div>
    </LandingLayout>
  );
}

export default ApiKeysAuthPage;
