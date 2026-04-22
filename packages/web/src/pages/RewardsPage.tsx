/**
 * RewardsPage - Equity-based loyalty program with leaderboards
 * Insane animations and premium UI
 */

import React, { useState, useEffect, useRef } from 'react';
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
    id: 'wallet-analyzer',
    title: 'Wallet Analyzer',
    description: 'Analyze wallets to earn equity',
    icon: Target,
    color: '#f59e0b',
    reward: '5%',
    type: 'leaderboard',
    participants: 0,
    endsIn: null,
    prize: [
      { place: '1st', amount: '2.5%', icon: Crown },
      { place: '2nd', amount: '1.5%', icon: Medal },
      { place: '3rd', amount: '1.0%', icon: Medal },
    ],
    active: true
  }
];

const comingSoon = [
  {
    id: 'sybil-hunter',
    title: 'Sybil Hunter',
    icon: Shield,
    color: '#6b7280',
  },
  {
    id: 'streak',
    title: 'Streak Rewards',
    icon: Flame,
    color: '#6b7280',
  },
  {
    id: 'referral',
    title: 'Referral',
    icon: Wallet2,
    color: '#6b7280',
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

const REWARDS_TABLE = [
  { action: 'Analyze a wallet', points: 10, description: 'Per wallet analyzed' },
];

export default function RewardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('top-analyzer');
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [overallStats, setOverallStats] = useState({
    totalEquityPool: '5%',
    activeParticipants: 0,
    eventsTracked: 0,
    rewardsClaimed: '0%'
  });
  const [campaignStats, setCampaignStats] = useState<Record<string, { participants: number; totalEvents: number }>>({});
  const [userStats, setUserStats] = useState<{ points: number; rank: number; streak: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const leaderboardRef = useRef<HTMLDivElement>(null);

  const isLightTheme = theme === 'light';

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      // Search campaigns by title
      const campaignMatches = campaigns
        .filter(c => c.title.toLowerCase().includes(query.toLowerCase()) || c.description.toLowerCase().includes(query.toLowerCase()))
        .map(c => ({ type: 'campaign' as const, id: c.id, title: c.title, subtitle: c.description }));

      // Search leaderboard if a campaign is selected
      let userMatches: any[] = [];
      if (selectedCampaign) {
        try {
          const res = await fetch('/api/torque/v2/leaderboard');
          if (res.ok) {
            const data = await res.json();
            const q = query.toLowerCase();
            userMatches = (data.entries || [])
              .filter((e: any) => e.userId.toLowerCase().includes(q) || (e.displayName && e.displayName.toLowerCase().includes(q)))
              .slice(0, 5)
              .map((e: any) => ({ type: 'user' as const, id: e.userId, title: e.displayName || e.userId, subtitle: `Rank #${e.rank} - ${e.score} points` }));
          }
        } catch {}
      }

      setSearchResults([...campaignMatches, ...userMatches]);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search result selection
  const handleSearchSelect = (result: any) => {
    setSearchQuery('');
    setSearchResults([]);
    if (result.type === 'campaign') {
      setSelectedCampaign(result.id);
      setActiveTab('leaderboard');
    } else {
      // User result - make sure a campaign is selected, default to top-analyzer
      if (!selectedCampaign) {
        setSelectedCampaign('top-analyzer');
      }
      setActiveTab('leaderboard');
    }
    // Scroll to leaderboard section after state updates
    setTimeout(() => {
      leaderboardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  // Fetch real-time stats
  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('fundtracer_token');
      
      try {
        // Fetch overall stats
        const overallRes = await fetch('/api/torque/overall-stats');
        if (overallRes.ok) {
          const data = await overallRes.json();
          setOverallStats(data);
        }

        // Fetch campaign-specific stats
        const campaignIds = ['top-analyzer', 'sybil-hunter', 'early-adopter', 'streak', 'referral'];
        for (const id of campaignIds) {
          const res = await fetch(`/api/torque/campaign-stats/${id}`);
          if (res.ok) {
            const data = await res.json();
            setCampaignStats(prev => ({ ...prev, [id]: data }));
          }
        }

        // Fetch user stats if logged in
        if (token) {
          const userStatsRes = await fetch('/api/torque/stats', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          if (userStatsRes.ok) {
            const data = await userStatsRes.json();
            setUserStats(data.stats);
          }
        }
      } catch (error) {
        console.error('[RewardsPage] Failed to fetch stats:', error);
      }
    };

    fetchStats();
    
    // Refresh stats every 10 seconds
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <LandingLayout 
      navItems={navItems}
      onSearch={handleSearch}
      onSearchSelect={handleSearchSelect}
      searchResults={searchResults}
      searchLoading={searchLoading}
      showSearch={true}
    >
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

        {/* How Rewards Are Calculated */}
        <section className="rewards-table-section">
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            How Rewards Are Calculated
          </motion.h2>
          
          <p className="rewards-intro">
            Earn points for every action on FundTracer. Points determine your rank on leaderboards.
          </p>

          <div className="rewards-table-wrapper">
            <table className="rewards-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Points</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {REWARDS_TABLE.map((reward, index) => (
                  <motion.tr
                    key={reward.action}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <td>{reward.action}</td>
                    <td className="points-cell">
                      <span className="points-badge">+{reward.points}</span>
                    </td>
                    <td>{reward.description}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="torque-badge">
            <span>Powered by</span>
            <strong>Torque</strong>
            <Zap size={14} />
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
            {['campaigns', 'leaderboard'].map(tab => (
              <motion.button
                key={tab}
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {tab === 'campaigns' && <Gift size={16} />}
                {tab === 'leaderboard' && <Trophy size={16} />}
                {tab.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </motion.button>
            ))}
            <motion.button
              className="tab-btn"
              onClick={() => window.open('/app-evm?tab=settings#torque-stats', '_blank')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Wallet size={16} />
              My Stats
            </motion.button>
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
                      <span>{campaignStats[campaign.id]?.participants || '—'} analyzing</span>
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
                ref={leaderboardRef}
              >
                <div className="leaderboard-tabs">
                  <h3>Active Leaderboards & Campaigns</h3>
                  <div className="leaderboard-list">
                    {campaigns.map((campaign, index) => (
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
                          <span>{campaignStats[campaign.id]?.participants || '—'} competitors</span>
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
                      refreshInterval={10000}
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