/**
 * TelegramPage - Telegram bot integration page
 * Uses LandingLayout and design system for Arkham-style presentation
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { Badge, Panel } from '../design-system/primitives';
import './TelegramPage.css';

const API_BASE = import.meta.env.VITE_API_URL || '';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
];

export function TelegramPage() {
  const navigate = useNavigate();
  const { user, profile, wallet } = useAuth();
  const { open } = useAppKit();
  const { address: appKitAddress, isConnected: appKitConnected } = useAppKitAccount();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get wallet address from multiple sources
  const walletAddress = appKitAddress || wallet?.address || user?.walletAddress;
  const isWalletConnected = appKitConnected || !!wallet?.isConnected || !!user?.walletAddress;

  useEffect(() => {
    checkConnectionStatus();
  }, [user]);

  const checkConnectionStatus = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/telegram/status/${user.uid}`);
      const data = await res.json();
      if (data.linked) {
        setConnected(true);
      }
    } catch (e) {
      console.error('Failed to check telegram status:', e);
    }
    setLoading(false);
  };

  const generateCode = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet first');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const userId = user?.uid || walletAddress;
      const tier = profile?.tier || 'free';
      const res = await fetch(`${API_BASE}/api/telegram/link-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tier, walletAddress })
      });
      const data = await res.json();
      
      if (data.success) {
        setLinkCode(data.code);
      } else {
        setError(data.error || 'Failed to generate code');
      }
    } catch (e) {
      console.error('Failed to generate code:', e);
      setError('Failed to generate code. Please try again.');
    }
    setIsGenerating(false);
  };

  const handleConnectWallet = () => {
    open();
  };

  if (loading) {
    return (
      <LandingLayout navItems={navItems} showSearch={false}>
        <div className="telegram-page">
          <div className="telegram-loading">
            <div className="telegram-loading__spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
      </LandingLayout>
    );
  }

  return (
    <LandingLayout navItems={navItems} showSearch={false}>
      <div className="telegram-page">
        {/* Hero Section */}
        <section className="telegram-hero">
          <div className="telegram-hero__grid"></div>
          <div className="telegram-hero__content">
            <div className="telegram-hero__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
            </div>
            <Badge variant="info" size="sm">Telegram Integration</Badge>
            <h1 className="telegram-hero__title">
              Connect <span className="telegram-hero__title-accent">Telegram Bot</span>
            </h1>
            <p className="telegram-hero__subtitle">
              Get real-time wallet alerts directly on Telegram. Monitor whales, track wallets, 
              and receive AI-powered insights on every transaction.
            </p>
          </div>
        </section>

        {/* Setup / Connected Section */}
        <section className="telegram-section">
          <div className="telegram-section__container">
            {!connected ? (
              <div className="telegram-setup">
                {/* Step 1: Connect Wallet */}
                <Panel variant="bordered" className={`telegram-step ${isWalletConnected ? 'telegram-step--completed' : ''}`}>
                  <div className="telegram-step__number">{isWalletConnected ? '✓' : '1'}</div>
                  <div className="telegram-step__content">
                    <h3>Connect Your Wallet</h3>
                    {isWalletConnected && walletAddress ? (
                      <div className="telegram-wallet-connected">
                        <span className="telegram-wallet-address">
                          {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                        </span>
                        <Badge variant="success" size="xs">Connected</Badge>
                      </div>
                    ) : (
                      <>
                        <p>Connect your wallet to link your account. This wallet will be synced across Telegram and the web app.</p>
                        <button onClick={handleConnectWallet} className="telegram-btn telegram-btn--primary">
                          Connect Wallet
                        </button>
                      </>
                    )}
                  </div>
                </Panel>

                {/* Step 2: Open Telegram */}
                <Panel variant="bordered" className="telegram-step">
                  <div className="telegram-step__number">2</div>
                  <div className="telegram-step__content">
                    <h3>Open Telegram Bot</h3>
                    <p>Search for <strong>@fundtracer_bot</strong> or click the button below.</p>
                    <a href="https://t.me/fundtracer_bot" target="_blank" rel="noopener noreferrer" className="telegram-btn telegram-btn--primary">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      Open @fundtracer_bot
                    </a>
                  </div>
                </Panel>

                {/* Step 3: Generate Code */}
                <Panel variant="bordered" className="telegram-step">
                  <div className="telegram-step__number">3</div>
                  <div className="telegram-step__content">
                    <h3>Generate Link Code</h3>
                    {!isWalletConnected ? (
                      <p className="telegram-disabled">Connect your wallet first to generate a link code.</p>
                    ) : (
                      <>
                        <p>Generate a code and send it to the bot using /link command.</p>
                        <button 
                          className="telegram-btn telegram-btn--secondary" 
                          onClick={generateCode}
                          disabled={isGenerating || !isWalletConnected}
                        >
                          {isGenerating ? 'Generating...' : 'Generate Link Code'}
                        </button>
                        {error && <div className="telegram-error">{error}</div>}
                        {linkCode && (
                          <div className="telegram-code">
                            <span className="telegram-code__value">{linkCode}</span>
                            <span className="telegram-code__note">Send /link in the bot, then paste this code</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Panel>

                {/* Step 4: Link Account */}
                <Panel variant="bordered" className="telegram-step">
                  <div className="telegram-step__number">4</div>
                  <div className="telegram-step__content">
                    <h3>Link Your Account</h3>
                    <p>In the Telegram bot, type <code>/link</code> and then paste your code when prompted.</p>
                  </div>
                </Panel>
              </div>
            ) : (
              <div className="telegram-connected">
                <div className="telegram-connected__icon">✓</div>
                <h2>Telegram Connected!</h2>
                <p>Your Telegram is now linked to your FundTracer account.</p>

                <div className="telegram-commands">
                  <h3>Bot Commands</h3>
                  <div className="telegram-commands__grid">
                    {[
                      { cmd: '/add', desc: 'Add wallet to watchlist' },
                      { cmd: '/list', desc: 'View watched wallets' },
                      { cmd: '/remove', desc: 'Remove a wallet' },
                      { cmd: '/frequency', desc: 'Set alert frequency' },
                      { cmd: '/status', desc: 'View alert status' },
                      { cmd: '/unlink', desc: 'Disconnect Telegram' },
                    ].map((item, i) => (
                      <div key={i} className="telegram-command">
                        <code>{item.cmd}</code>
                        <span>{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <a href="https://t.me/fundtracer_bot" target="_blank" rel="noopener noreferrer" className="telegram-btn telegram-btn--primary telegram-btn--lg">
                  Open Telegram Bot
                </a>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="telegram-section telegram-section--alt">
          <div className="telegram-section__container">
            <div className="telegram-features__header">
              <Badge variant="success" size="sm">Features</Badge>
              <h2>What's Included</h2>
            </div>
            <div className="telegram-features__grid">
              {[
                { icon: '🔔', title: 'Real-Time Alerts', desc: 'Instant notifications when watched wallets move funds' },
                { icon: '🤖', title: 'AI Analysis', desc: 'Every alert includes smart insights on what\'s happening' },
                { icon: '📊', title: 'Flexible Frequency', desc: 'Real-time, 20min, 30min, or hourly digests' },
                { icon: '🔒', title: 'Secure Linking', desc: 'Account-linked for personalized alerts' },
              ].map((feature, i) => (
                <Panel key={i} variant="bordered" className="telegram-feature">
                  <span className="telegram-feature__icon">{feature.icon}</span>
                  <div>
                    <h4>{feature.title}</h4>
                    <p>{feature.desc}</p>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        </section>

        {/* Plans Section */}
        <section className="telegram-section">
          <div className="telegram-section__container">
            <div className="telegram-plans__header">
              <Badge variant="warning" size="sm">Plans</Badge>
              <h2>Alert Limits by Plan</h2>
            </div>
            <div className="telegram-plans__grid">
              <Panel variant="bordered" className="telegram-plan">
                <div className="telegram-plan__name">Free</div>
                <div className="telegram-plan__count">10</div>
                <div className="telegram-plan__label">wallets</div>
              </Panel>
              <Panel variant="bordered" className="telegram-plan telegram-plan--featured">
                <Badge variant="info" size="xs" className="telegram-plan__badge">Popular</Badge>
                <div className="telegram-plan__name">Pro</div>
                <div className="telegram-plan__count">100</div>
                <div className="telegram-plan__label">wallets</div>
              </Panel>
              <Panel variant="bordered" className="telegram-plan">
                <div className="telegram-plan__name">Max</div>
                <div className="telegram-plan__count">∞</div>
                <div className="telegram-plan__label">wallets</div>
              </Panel>
            </div>
          </div>
        </section>
      </div>
    </LandingLayout>
  );
}

export default TelegramPage;
