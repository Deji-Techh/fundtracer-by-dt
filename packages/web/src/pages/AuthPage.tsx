import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { LandingLayout } from '../design-system/layouts/LandingLayout';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
];

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithGoogle, loginWithTwitter, isAuthenticated, loading, setTokenFromExternal } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Handle OAuth callback - check for token in URL
  useEffect(() => {
    const token = searchParams.get('token');
    const errorParam = searchParams.get('error');
    
    if (errorParam) {
      setError(errorParam === 'oauth_failed' ? 'Authentication failed. Please try again.' : 
               errorParam === 'token_exchange_failed' ? 'Failed to complete authentication.' :
               'An error occurred during sign in.');
      return;
    }
    
    if (token && !isAuthenticated) {
      // Set token from OAuth callback
      setTokenFromExternal(token);
    }
  }, [searchParams, isAuthenticated, setTokenFromExternal]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app-evm');
    }
  }, [isAuthenticated, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      await loginWithGoogle();
      // Redirect happens via window.location.href in AuthContext
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
    }
  };

  const handleTwitterLogin = async () => {
    try {
      setError(null);
      await loginWithTwitter();
      // Redirect happens via window.location.href in AuthContext
    } catch (err: any) {
      setError(err.message || 'Twitter sign in failed');
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
        {/* Background Effects */}
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

          {/* Right Side - Sign In */}
          <motion.div 
            className="auth-form-container"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="auth-form">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h2>Welcome Back</h2>
                <p className="auth-form-desc">Sign in to access powerful blockchain analytics</p>

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
                    Continue with Google
                  </motion.button>

                  <motion.button
                    className="auth-btn auth-btn--twitter"
                    onClick={handleTwitterLogin}
                    disabled={loading}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Continue with X
                  </motion.button>
                </div>

                <div className="auth-divider">
                  <span>or</span>
                </div>

                <motion.button 
                  className="auth-btn auth-btn--wallet-secondary"
                  onClick={() => navigate('/app-evm')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
                    <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
                  </svg>
                  Connect Wallet (Optional)
                </motion.button>

                <p className="auth-terms">
                  By continuing, you agree to our{' '}
                  <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </LandingLayout>
  );
}

export default AuthPage;
