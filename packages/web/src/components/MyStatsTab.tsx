/**
 * MyStatsTab - User stats with equity claim functionality
 * Stunning UI with point calculation display
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Wallet, Trophy, Target, Zap, Award, 
  Calculator, Sparkles, CheckCircle, AlertCircle, Gift, X, History, ArrowLeft
} from 'lucide-react';
import { getAuthToken, apiRequest } from '../api';

// Constants
const TOTAL_POOL_POINTS = 500000;
const TOTAL_EQUITY_PERCENT = 5;

interface ClaimStatus {
  claimed: boolean;
  claimedPoints: number;
  equityPercent: number;
  canClaim: boolean;
  totalClaimed: number;
  totalEquityClaimed: number;
}

interface ClaimHistoryEntry {
  id: string;
  pointsClaimed: number;
  equityPercent: number;
  claimedAt: number;
}

interface MyStatsTabProps {
  user: any;
  onClaim: () => void;
}

export default function MyStatsTab({ user, onClaim }: MyStatsTabProps) {
  const [loading, setLoading] = useState(true);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [userStats, setUserStats] = useState<{ points: number; rank: number } | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClaimedView, setShowClaimedView] = useState(false);
  const [claimHistory, setClaimHistory] = useState<ClaimHistoryEntry[]>([]);

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

        // Fetch claim status using apiRequest (handles auth automatically)
        const claimData = await apiRequest<any>('/api/torque-v2/claim/status');
        setClaimStatus({
          ...claimData,
          canClaim: claimData.canClaim
        });

        // Fetch claim history
        try {
          const historyData = await apiRequest<any>('/api/torque-v2/claim/history');
          setClaimHistory(historyData.history || []);
        } catch (historyErr) {
          console.log('[MyStatsTab] No history available');
        }

        // Fetch user stats
        const statsData = await apiRequest<any>('/api/torque-v2/mystats');
        const stats = statsData.stats;
        // 1 wallet scanned = 10 points
        const walletsAnalyzed = stats.walletsScanned || 0;
        setUserStats({
          points: walletsAnalyzed * 10, // 10 points per wallet
          rank: stats.rank || 0
        });
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
    if (!user?.uid || !canClaimMore) return;

    setClaiming(true);
    setError(null);

    try {
      const data = await apiRequest<any>('/api/torque-v2/claim', 'POST', { email: user.email });

if (data.success) {
        setClaimSuccess(true);
        const newEquity = parseFloat(data.equityPercent);
        const claimedPoints = Math.round(newEquity / 0.00001);
        const newTotalClaimed = (claimStatus?.totalClaimed || 0) + claimedPoints;
        const newTotalEquity = (claimStatus?.totalEquityClaimed || 0) + newEquity;
        setClaimStatus({
          claimed: true,
          claimedPoints: claimedPoints,
          equityPercent: newEquity,
          canClaim: true,
          totalClaimed: newTotalClaimed,
          totalEquityClaimed: newTotalEquity
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

  // Show claimed success view with close button
  if (showClaimedView && claimStatus?.claimed) {
    const totalClaimedEquity = claimStatus.totalEquityClaimed || claimStatus.equityPercent;
    const totalClaimedPoints = claimStatus.totalClaimed || claimStatus.claimedPoints;
    const claimableEquity = calculateEquity(Math.max(0, points - totalClaimedPoints));
    
    return (
      <motion.div 
        className="my-stats-claimed"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <button 
          className="close-claimed-view"
          onClick={() => setShowClaimedView(false)}
          aria-label="Close"
        >
          <X size={20} />
        </button>
        <div className="claimed-success">
          <CheckCircle size={64} />
          <h2>Equity Claimed!</h2>
          <div className="claimed-details">
            <div className="detail-row">
              <span>Points Claimed</span>
              <strong>{claimStatus.claimedPoints} pts</strong>
            </div>
            <div className="detail-row highlight">
              <span>Equity Received</span>
              <strong>{claimStatus.equityPercent.toFixed(5)}%</strong>
            </div>
          </div>
          {totalClaimedPoints > 0 && (
            <div className="total-claimed-info">
              <span>Total Claimed: {totalClaimedEquity.toFixed(5)}% ({totalClaimedPoints} pts)</span>
            </div>
          )}
          {parseFloat(claimableEquity) > 0 && (
            <div className="claimable-info">
              <Sparkles size={14} />
              <span>You can claim {claimableEquity}% more!</span>
            </div>
          )}
          <p className="claimed-note">
            You're on the list! Equity will be distributed per our terms.
          </p>
          <motion.button 
            className="go-back-btn"
            onClick={() => setShowClaimedView(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowLeft size={16} />
            Back to Stats
          </motion.button>
        </div>
      </motion.div>
    );
  }

  const totalClaimedEquity = claimStatus?.totalEquityClaimed || claimStatus?.equityPercent || 0;
  const totalClaimedPoints = claimStatus?.totalClaimed || claimStatus?.claimedPoints || 0;
  const claimableEquity = calculateEquity(Math.max(0, points - totalClaimedPoints));
  const canClaimMore = parseFloat(claimableEquity) > 0 && points > 0;

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
            <span className="stat-label">Points Earned</span>
            <span className="stat-value">{points}</span>
          </div>
          
          <div className="stat-item">
            <CheckCircle size={20} />
            <span className="stat-label">Equity Claimed</span>
            <span className="stat-value">{totalClaimedEquity.toFixed(5)}%</span>
          </div>
          
          <div className="stat-item">
            <Trophy size={20} />
            <span className="stat-label">Current Rank</span>
            <span className="stat-value">#{userStats?.rank || '—'}</span>
          </div>

          {totalClaimedPoints > 0 && (
            <div className="stat-item highlight">
              <Sparkles size={20} />
              <span className="stat-label">Claimable Now</span>
              <span className="stat-value">{claimableEquity}%</span>
            </div>
          )}
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
            <span className="formula-label">Wallets Analyzed</span>
            <span className="formula-value">{Math.floor(points / 10)} × 10 × 0.00001%</span>
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
          <span>10 points = 0.00001% equity</span>
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
        
        {points > 0 && canClaimMore ? (
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
                <span>Claim {claimableEquity}% Equity</span>
              </>
            )}
          </motion.button>
        ) : points > 0 && !canClaimMore && claimStatus?.claimed ? (
          <motion.button
            className="view-claimed-btn"
            onClick={() => setShowClaimedView(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <CheckCircle size={20} />
            <span>View Claimed Equity</span>
          </motion.button>
        ) : points === 0 ? (
          <div className="no-points">
            <Target size={24} />
            <p>Analyze wallets to earn points and claim equity!</p>
          </div>
        ) : null}
      </div>

      {/* Claim History Section */}
      {claimHistory.length > 0 && (
        <div className="claim-history-section">
          <div className="card-header">
            <History size={24} />
            <h3>Claim History</h3>
          </div>
          <div className="claim-history-list">
            {claimHistory.map((entry, index) => (
              <motion.div 
                key={entry.id || index}
                className="history-entry"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="history-icon">
                  <Gift size={16} />
                </div>
                <div className="history-details">
                  <span className="history-points">{entry.pointsClaimed} pts</span>
                  <span className="history-equity">{entry.equityPercent.toFixed(5)}% equity</span>
                </div>
                <span className="history-date">
                  {new Date(entry.claimedAt).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}