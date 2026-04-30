/**
 * MyStatsTab - User stats with equity claim functionality
 * Stunning UI with point calculation display
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, Trophy, Target, Zap, Award, Lock, Unlock, 
  Calculator, Sparkles, CheckCircle, AlertCircle, Gift
} from 'lucide-react';
import { getAuthToken } from '../api';

// Constants
const TOTAL_POOL_POINTS = 500000;
const TOTAL_EQUITY_PERCENT = 5;

interface ClaimStatus {
  claimed: boolean;
  points: number;
  equityPercent: number;
  claimedAt: number | null;
}

interface PoolStats {
  totalEquityPool: string;
  remainingEquityPool: string;
  totalPointsClaimed: number;
  totalEquityClaimed: number;
  claimCount: number;
}

interface MyStatsTabProps {
  user: any;
  onClaim: () => void;
}

export default function MyStatsTab({ user, onClaim }: MyStatsTabProps) {
  const [loading, setLoading] = useState(true);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [userStats, setUserStats] = useState<{ points: number; rank: number } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate equity from points
  const calculateEquity = (points: number): string => {
    const equity = (points / TOTAL_POOL_POINTS) * TOTAL_EQUITY_PERCENT;
    return equity.toFixed(5);
  };

// Fetch data
  useEffect(() => {
    const abortController = new AbortController();
    
    const fetchData = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        let token = getAuthToken();
        
        if (!token) {
          console.log('[MyStatsTab] No token found, waiting for auth...');
          // Retry after a short delay to allow auth to complete
          await new Promise(r => setTimeout(r, 500));
          token = getAuthToken();
          if (!token) {
            console.log('[MyStatsTab] Still no token after retry');
            setLoading(false);
            return;
          }
          console.log('[MyStatsTab] Token found after retry');
        }

        // Fetch claim status
        const claimRes = await fetch('/api/torque-v2/claim/status', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortController.signal
        });
        console.log('[MyStatsTab] /claim/status:', claimRes.status);
        const claimData = await claimRes.json();
        console.log('[MyStatsTab] claimData:', claimData);
        setClaimStatus(claimData);

        // Fetch pool stats
        const poolRes = await fetch('/api/torque-v2/pool-stats');
        const poolData = await poolRes.json();
        setPoolStats(poolData);

// Fetch user stats
        console.log('[MyStatsTab] Fetching mystats, token:', token ? token.substring(0, 30) + '...' : 'NONE');
        const statsRes = await fetch('/api/torque-v2/mystats', {
          headers: { 'Authorization': `Bearer ${token}` },
          signal: abortController.signal
        });
        console.log('[MyStatsTab] mystats response:', statsRes.status);
        const statsData = await statsRes.json();
        setUserStats(statsData.stats);
      } catch (err: any) {
        // Ignore abort errors - they're expected when component unmounts
        if (err?.name === 'AbortError') {
          console.log('[MyStatsTab] Request aborted (component unmounted)');
          return;
        }
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    
    // Cleanup: abort any pending requests when component unmounts
    return () => abortController.abort();
  }, [user]);

  // Handle claim
  const handleClaim = async () => {
    if (!user?.uid || !userStats?.points || claimStatus?.claimed) return;

    setClaiming(true);
    setError(null);

    try {
      const { getAuthToken } = await import('../api');
      const token = getAuthToken();
      const res = await fetch('/api/torque-v2/claim', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: user.email })
      });

      const data = await res.json();

      if (data.success) {
        setClaimSuccess(true);
        setClaimStatus({
          claimed: true,
          points: userStats.points,
          equityPercent: parseFloat(data.equityPercent),
          claimedAt: Date.now()
        });
      } else {
        setError(data.error || 'Failed to claim');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setClaiming(false);
    }
  };

  const points = userStats?.points || 0;
  const equityPercent = calculateEquity(points);
  const remainingEquity = poolStats?.remainingEquityPool || '5%';
  const totalClaimed = poolStats?.claimCount || 0;
  const totalParticipants = totalClaimed + (user?.uid && !claimStatus?.claimed ? 1 : 0);

  // Not logged in state - check for either uid (Google) or walletAddress (wallet)
  const isLoggedIn = user?.uid || user?.walletAddress;
  if (!isLoggedIn) {
    return (
      <div className="my-stats-empty">
        <div className="empty-icon">
          <Wallet size={48} />
        </div>
        <h3>Sign In to View Your Stats</h3>
        <p>Connect your Google account to see your points and claim equity</p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="my-stats-loading">
        <div className="loading-spinner" />
        <p>Loading your stats...</p>
      </div>
    );
  }

  // Already claimed state
  if (claimStatus?.claimed) {
    return (
      <motion.div 
        className="my-stats-claimed"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="claimed-success">
          <CheckCircle size={64} />
          <h2>Equity Claimed!</h2>
          <div className="claimed-details">
            <div className="detail-row">
              <span>Points Claimed</span>
              <strong>{claimStatus.points} pts</strong>
            </div>
            <div className="detail-row highlight">
              <span>Equity Received</span>
              <strong>{claimStatus.equityPercent.toFixed(5)}%</strong>
            </div>
          </div>
          <p className="claimed-note">
            You're on the list! Equity will be distributed per our terms.
          </p>
        </div>
      </motion.div>
    );
  }

  // Claim available state
  return (
    <motion.div 
      className="my-stats-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* User Stats Card */}
      <div className="stats-card user-stats">
        <div className="card-header">
          <Wallet size={24} />
          <h3>Your Statistics</h3>
        </div>
        
        <div className="stats-grid">
          <div className="stat-item">
            <Target size={20} />
            <span className="stat-label">Wallets Analyzed</span>
            <span className="stat-value">{points}</span>
          </div>
          
          <div className="stat-item">
            <Trophy size={20} />
            <span className="stat-label">Current Rank</span>
            <span className="stat-value">#{userStats?.rank || '—'}</span>
          </div>
        </div>
      </div>

      {/* Equity Calculation Card */}
      <div className="stats-card equity-calculation">
        <div className="card-header">
          <Calculator size={24} />
          <h3>Equity Calculation</h3>
        </div>
        
        <div className="calculation-formula">
          <div className="formula-line">
            <span className="formula-label">Total Pool</span>
            <span className="formula-value">{TOTAL_POOL_POINTS.toLocaleString()} pts = {TOTAL_EQUITY_PERCENT}%</span>
          </div>
          
          <div className="formula-divider">
            <span>÷</span>
          </div>
          
          <div className="formula-line your-points">
            <span className="formula-label">Your Points</span>
            <span className="formula-value">{points} pts × 0.00001%</span>
          </div>
          
          <div className="formula-divider">
            <span>=</span>
          </div>
          
          <div className="formula-line result">
            <span className="formula-label">Your Equity</span>
            <span className="formula-value highlight">{equityPercent}%</span>
          </div>
        </div>

        <div className="calculation-note">
          <Sparkles size={14} />
          <span>1 point = 0.00001% equity</span>
        </div>
      </div>

      {/* Claim Button */}
      <div className="claim-section">
        {error && (
          <motion.div 
            className="claim-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}
        
        {points > 0 ? (
          <motion.button
            className="claim-btn"
            onClick={handleClaim}
            disabled={claiming}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {claiming ? (
              <>
                <div className="btn-spinner" />
                <span>Claiming...</span>
              </>
            ) : (
              <>
                <Gift size={20} />
                <span>Claim {equityPercent}% Equity</span>
              </>
            )}
          </motion.button>
        ) : (
          <div className="no-points">
            <Target size={24} />
            <p>Analyze wallets to earn points and claim equity!</p>
          </div>
        )}
      </div>

      {/* Pool Stats */}
      <div className="pool-stats">
        <h4>Pool Status</h4>
        <div className="pool-grid">
          <div className="pool-item">
            <span>Total Equity Pool</span>
            <strong>{poolStats?.totalEquityPool || '5%'}</strong>
          </div>
          <div className="pool-item">
            <span>Remaining</span>
            <strong>{remainingEquity}</strong>
          </div>
          <div className="pool-item">
            <span>Participants</span>
            <strong>{totalParticipants}</strong>
          </div>
          <div className="pool-item">
            <span>Claimed</span>
            <strong>{poolStats?.claimCount || 0}</strong>
          </div>
        </div>
      </div>
    </motion.div>
  );
}