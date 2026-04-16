/**
 * RewardsPage - Equity-based loyalty program with leaderboards
 * Insane animations and premium UI
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingLayout } from '../design-system/layouts/LandingLayout';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Trophy, Medal, Crown, Zap, Flame, Star, Gift, TrendingUp, 
  ChevronRight, RefreshCw, Share2, Wallet, Target, Shield,
  Rocket, Sparkles, Award, Lock, Unlock, Infinity, Wallet2
} from 'lucide-react';
import TorqueLeaderboard from '../components/TorqueLeaderboard';
import { useAuth } from '../contexts/AuthContext';
import { LANDING_NAV_ITEMS } from '../constants/navigation';
import './RewardsPage.css';

const navItems = LANDING_NAV_ITEMS.map(item => 
  item.href === '/rewards' ? { ...item, active: true } : item
);

const campaigns = [
  {
    id: 'top-analyzer',
    title: 'Top Analyzer Championship',
    description: 'Most wallets analyzed wins the biggest equity share',
    icon: Target,
    color: '#f59e0b',
    reward: '2.7%',
    type: 'leaderboard',
    participants: 847,
    endsIn: null,
    prize: [
      { place: '1st', amount: '1.5%', icon: Crown },
      { place: '2nd', amount: '0.75%', icon: Medal },
      { place: '3rd', amount: '0.35%', icon: Medal },
    ]
  },
  {
    id: 'sybil-hunter',
    title: 'Sybil Hunter League',
    description: 'Detect the most sybil attacks and earn equity',
    icon: Shield,
    color: '#ef4444',
    reward: '1.75%',
    type: 'leaderboard',
    participants: 523,
    endsIn: 'Weekly',
    prize: [
      { place: '1st', amount: '1.0%', icon: Crown },
      { place: '2nd', amount: '0.5%', icon: Medal },
      { place: '3rd', amount: '0.25%', icon: Medal },
    ]
  },
  {
    id: 'early-adopter',
    title: 'Early Adopter Rewards',
    description: 'First 50 users to analyze wallets get equity rewards',
    icon: Rocket,
    color: '#8b5cf6',
    reward: '0.5%',
    type: 'raffle',
    participants: 42,
    endsIn: 'Open',
    prize: [
      { place: 'Winners', amount: '0.01% each', icon: Star },
    ]
  },
  {
    id: 'streak',
    title: 'Active Analyst Streak',
    description: 'Maintain a 7-day analysis streak for weekly rewards',
    icon: Flame,
    color: '#f97316',
    reward: '0.5%',
    type: 'streak',
    participants: 189,
    endsIn: 'Weekly',
    prize: [
      { place: '5 winners', amount: '0.1% each', icon: Award },
    ]
  },
  {
    id: 'viral',
    title: 'Viral Share Bonus',
    description: 'Share your analysis on X and earn equity',
    icon: Share2,
    color: '#06b6d4',
    reward: '0.25%',
    type: 'instant',
    participants: 76,
    endsIn: 'Always',
    prize: [
      { place: 'Per share', amount: '0.05%', icon: Gift },
    ]
  },
  {
    id: 'referral',
    title: 'Referral Program',
    description: 'Invite friends and earn equity for both of you',
    icon: Wallet2,
    color: '#10b981',
    reward: '0.3%',
    type: 'referral',
    participants: 134,
    endsIn: 'Always',
    prize: [
      { place: 'Referrer', amount: '0.15%', icon: Gift },
      { place: 'Referee', amount: '0.10%', icon: Gift },
    ]
  }
];

const defaultStats = [
  { label: 'Total Equity Pool', value: '5%', icon: Infinity },
  { label: 'Active Participants', value: '—', icon: Wallet },
  { label: 'Events Tracked', value: '—', icon: Zap },
  { label: 'Rewards Claimed', value: '0%', icon: Award },
];

const howItWorks = [
  {
    step: 1,
    title: 'Analyze Wallets',
    description: 'Use FundTracer to analyze any wallet on any supported chain',
    icon: Target,
    gradient: 'from-amber-500 to-orange-500'
  },
  {
    step: 2,
    title: 'Earn Points',
    description: 'Every analysis earns you points towards leaderboards and raffles',
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    step: 3,
    title: 'Climb Ranks',
    description: 'Top performers on leaderboards win equity rewards',
    icon: TrendingUp,
    gradient: 'from-green-500 to-emerald-500'
  },
  {
    step: 4,
    title: 'Claim Equity',
    description: 'Rewards vest over 12-24 months with cliff periods',
    icon: Lock,
    gradient: 'from-blue-500 to-cyan-500'
  }
];

export default function RewardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [overallStats, setOverallStats] = useState({
    totalEquityPool: '5%',
    activeParticipants: 0,
    eventsTracked: 0,
    rewardsClaimed: '0%'
  });
  const [campaignStats, setCampaignStats] = useState<Record<string, { participants: number; totalEvents: number }>>({});

  const isLightTheme = theme === 'light';

  // Fetch real-time stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch overall stats
        const overallRes = await fetch('/api/torque/overall-stats');
        if (overallRes.ok) {
          const data = await overallRes.json();
          setOverallStats(data);
        }

        // Fetch campaign-specific stats
        const campaignIds = ['top-analyzer', 'sybil-hunter', 'early-adopter', 'streak', 'viral', 'referral'];
        for (const id of campaignIds) {
          const res = await fetch(`/api/torque/campaign-stats/${id}`);
          if (res.ok) {
            const data = await res.json();
            setCampaignStats(prev => ({ ...prev, [id]: data }));
          }
        }
      } catch (error) {
        console.error('[RewardsPage] Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <LandingLayout navItems={navItems}>
      <div className="rewards-page">
        {/* Hero Section */}
        <section className="rewards-hero">
          <div className="hero-background">
            <div className="hero-grid" />
            <div className="hero-glow hero-glow-1" />
            <div className="hero-glow hero-glow-2" />
            <div className="hero-particles">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="particle"
                  initial={{ 
                    x: Math.random() * 100 + '%', 
                    y: Math.random() * 100 + '%',
                    opacity: Math.random() * 0.5 + 0.2
                  }}
                  animate={{
                    y: [null, Math.random() * -200 - 100],
                    opacity: [null, 0]
                  }}
                  transition={{
                    duration: Math.random() * 10 + 10,
                    repeat: Infinity,
                    ease: 'linear'
                  }}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`
                  }}
                />
              ))}
            </div>
          </div>

          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div 
              className="hero-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <Star size={14} />
              <span>5% Equity Pool</span>
            </motion.div>

            <motion.h1 
              className="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Earn Equity for
              <span className="gradient-text"> Analyzing Wallets</span>
            </motion.h1>

            <motion.p 
              className="hero-description"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              The more you analyze, the more equity you earn. Top performers win 
              life-changing shares in FundTracer. No capture required.
            </motion.p>

            <motion.div 
              className="hero-actions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button 
                className="btn-primary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/app-evm')}
              >
                <Zap size={18} />
                Start Analyzing
              </motion.button>
              <motion.button 
                className="btn-secondary"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab('leaderboard')}
              >
                <Trophy size={18} />
                View Leaderboards
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div 
              className="hero-stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {defaultStats.map((stat, index) => {
                let value = stat.value;
                if (stat.label === 'Active Participants' && overallStats.activeParticipants > 0) {
                  value = overallStats.activeParticipants.toLocaleString();
                } else if (stat.label === 'Events Tracked' && overallStats.eventsTracked > 0) {
                  value = overallStats.eventsTracked.toLocaleString();
                } else if (stat.label === 'Rewards Claimed') {
                  value = overallStats.rewardsClaimed;
                }
                return (
                  <motion.div 
                    key={stat.label}
                    className="stat-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <div className="stat-icon">
                      <stat.icon size={20} />
                    </div>
                    <div className="stat-content">
                      <span className="stat-value">{value}</span>
                      <span className="stat-label">{stat.label}</span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        </section>

        {/* How It Works */}
        <section className="how-it-works">
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>
          
          <div className="steps-grid">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.step}
                className="step-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <div className={`step-icon-wrapper ${item.gradient}`}>
                  <item.icon size={28} />
                </div>
                <div className="step-number">{String(item.step).padStart(2, '0')}</div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                {index < howItWorks.length - 1 && (
                  <motion.div 
                    className="step-arrow"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ChevronRight size={20} />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Campaigns */}
        <section className="campaigns-section">
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Active Campaigns
          </motion.h2>

          <div className="campaigns-tabs">
            {['campaigns', 'leaderboard', 'my-stats'].map(tab => (
              <motion.button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {tab === 'campaigns' && <Gift size={16} />}
                {tab === 'leaderboard' && <Trophy size={16} />}
                {tab === 'my-stats' && <Wallet size={16} />}
                {tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'campaigns' && (
              <motion.div 
                className="campaigns-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {campaigns.map((campaign, index) => (
                  <motion.div
                    key={campaign.id}
                    className="campaign-card"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                  >
                    <div className="campaign-header">
                      <div 
                        className="campaign-icon"
                        style={{ background: `linear-gradient(135deg, ${campaign.color}40, ${campaign.color}20)` }}
                      >
                        <campaign.icon size={24} style={{ color: campaign.color }} />
                      </div>
                      <div className="campaign-type">
                        <span className={`type-badge ${campaign.type}`}>
                          {campaign.type}
                        </span>
                      </div>
                    </div>

                    <h3>{campaign.title}</h3>
                    <p>{campaign.description}</p>

                    <div className="campaign-prize">
                      <span className="prize-label">Total Pool</span>
                      <span className="prize-value">{campaign.reward}</span>
                    </div>

                    <div className="campaign-participants">
                      <Wallet size={14} />
                      <span>{campaign.participants} analyzing</span>
                    </div>

                    <div className="campaign-prizes">
                      {campaign.prize.map((p, i) => (
                        <div key={i} className="prize-item">
                          <p.icon size={14} />
                          <span>{p.place}</span>
                          <strong>{p.amount}</strong>
                        </div>
                      ))}
                    </div>

                    <motion.button 
                      className="campaign-join"
                      style={{ '--accent-color': campaign.color } as React.CSSProperties}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCampaign(campaign.id)}
                    >
                      {campaign.type === 'leaderboard' ? 'View Rankings' : 'Join Campaign'}
                      <ChevronRight size={16} />
                    </motion.button>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'leaderboard' && (
              <motion.div 
                className="leaderboard-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="leaderboard-tabs">
                  <h3>Active Leaderboards</h3>
                  <div className="leaderboard-list">
                    {campaigns.filter(c => c.type === 'leaderboard').map((campaign, index) => (
                      <motion.div
                        key={campaign.id}
                        className={`leaderboard-card ${selectedCampaign === campaign.id ? 'selected' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedCampaign(campaign.id)}
                      >
                        <div className="lb-rank">
                          <Trophy size={20} style={{ color: index === 0 ? '#f59e0b' : index === 1 ? '#c0c0c0' : '#cd7f32' }} />
                        </div>
                        <div className="lb-info">
                          <h4>{campaign.title}</h4>
                          <span>{campaign.participants} competitors</span>
                        </div>
                        <div className="lb-prize">
                          <span>{campaign.reward}</span>
                          <small>pool</small>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="leaderboard-display">
                  {selectedCampaign ? (
                    <TorqueLeaderboard 
                      campaignId={selectedCampaign}
                      title={campaigns.find(c => c.id === selectedCampaign)?.title || 'Leaderboard'}
                      showPoints={true}
                    />
                  ) : (
                    <div className="leaderboard-empty">
                      <Trophy size={48} />
                      <h3>Select a Leaderboard</h3>
                      <p>Choose a competition from the list to see rankings</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'my-stats' && (
              <motion.div 
                className="my-stats-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {user ? (
                  <div className="user-stats-grid">
                    <div className="user-stat-card highlight">
                      <div className="stat-header">
                        <Crown size={24} />
                        <h3>Your Progress</h3>
                      </div>
                      <div className="stat-main">
                        <span className="big-number">0</span>
                        <span className="stat-unit">points</span>
                      </div>
                      <div className="stat-rank">
                        <span>#--</span>
                        <span>global rank</span>
                      </div>
                    </div>

                    <div className="user-stat-card">
                      <Flame size={24} />
                      <h3>Current Streak</h3>
                      <div className="streak-display">
                        <span className="streak-days">0</span>
                        <span className="streak-label">days</span>
                      </div>
                    </div>

                    <div className="user-stat-card">
                      <Target size={24} />
                      <h3>Wallets Analyzed</h3>
                      <span className="stat-value">0</span>
                    </div>

                    <div className="user-stat-card">
                      <Shield size={24} />
                      <h3>Sybils Detected</h3>
                      <span className="stat-value">0</span>
                    </div>

                    <div className="user-stat-card">
                      <Share2 size={24} />
                      <h3>Social Shares</h3>
                      <span className="stat-value">0</span>
                    </div>

                    <div className="user-stat-card">
                      <Wallet2 size={24} />
                      <h3>Referrals</h3>
                      <span className="stat-value">0</span>
                    </div>
                  </div>
                ) : (
                  <div className="login-prompt">
                    <Unlock size={48} />
                    <h3>Sign In to Track Progress</h3>
                    <p>Connect your wallet to track your rewards and climb the leaderboards</p>
                    <motion.button 
                      className="btn-primary"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate('/auth')}
                    >
                      Sign In
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* CTA Section */}
        <section className="cta-section">
          <motion.div 
            className="cta-content"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2>Ready to Start Earning?</h2>
            <p>Every wallet analysis brings you closer to equity rewards</p>
            <motion.button 
              className="btn-primary large"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/app-evm')}
            >
              <Rocket size={20} />
              Analyze Your First Wallet
            </motion.button>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="rewards-footer">
          <div className="footer-content">
            <p>5% equity pool • 12-24 month vesting • 3-12 month cliffs</p>
            <p className="disclaimer">All rewards subject to terms and conditions. Equity vests over time.</p>
          </div>
        </footer>
      </div>
    </LandingLayout>
  );
}