import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, TrendingUp, RefreshCw } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  score: number;
  change: number;
  isCurrentUser?: boolean;
}

interface TorqueLeaderboardProps {
  campaignId: string;
  title?: string;
  showPoints?: boolean;
  refreshInterval?: number;
}

export default function TorqueLeaderboard({
  campaignId,
  title = 'Leaderboard',
  showPoints = true,
  refreshInterval = 30000
}: TorqueLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/torque/leaderboard/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      
      const data = await response.json();
      setEntries(data.entries || []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Unable to load leaderboard');
      console.error('[Leaderboard] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, refreshInterval);
    return () => clearInterval(interval);
  }, [campaignId, refreshInterval]);

  const formatAddress = (addr: string) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="rank-icon gold" size={20} />;
      case 2:
        return <Medal className="rank-icon silver" size={18} />;
      case 3:
        return <Medal className="rank-icon bronze" size={18} />;
      default:
        return <span className="rank-number">{rank}</span>;
    }
  };

  const getPointsLabel = () => {
    switch (campaignId) {
      case 'sybil-hunter':
        return 'Sybils Found';
      case 'top-analyzer':
        return 'Wallets Analyzed';
      case 'streak':
        return 'Day Streak';
      default:
        return 'Points';
    }
  };

  return (
    <div className="torque-leaderboard">
      <div className="leaderboard-header">
        <div className="header-left">
          <Trophy className="trophy-icon" size={24} />
          <h3>{title}</h3>
        </div>
        <button 
          className="refresh-btn"
          onClick={fetchLeaderboard}
          disabled={loading}
        >
          <RefreshCw className={loading ? 'spinning' : ''} size={16} />
        </button>
      </div>

      {lastUpdated && (
        <div className="last-updated">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            className="leaderboard-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <RefreshCw className="spinning" size={24} />
            <span>Loading leaderboard...</span>
          </motion.div>
        ) : error ? (
          <motion.div 
            className="leaderboard-error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p>{error}</p>
            <button onClick={fetchLeaderboard}>Retry</button>
          </motion.div>
        ) : entries.length === 0 ? (
          <motion.div 
            className="leaderboard-empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p>No data yet. Be the first to analyze!</p>
          </motion.div>
        ) : (
          <motion.div 
            className="leaderboard-entries"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {entries.map((entry, index) => (
              <motion.div
                key={entry.userId}
                className={`leaderboard-entry ${entry.isCurrentUser ? 'current-user' : ''} rank-${entry.rank}`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="entry-rank">
                  {getRankIcon(entry.rank)}
                </div>
                <div className="entry-address">
                  <span className="address">{formatAddress(entry.userId)}</span>
                  {entry.change !== 0 && (
                    <span className={`change ${entry.change > 0 ? 'up' : 'down'}`}>
                      <TrendingUp size={12} />
                      {Math.abs(entry.change)}
                    </span>
                  )}
                </div>
                {showPoints && (
                  <div className="entry-score">
                    <span className="score">{entry.score.toLocaleString()}</span>
                    <span className="label">{getPointsLabel()}</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .torque-leaderboard {
          background: var(--color-bg-elevated);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid var(--color-border);
        }

        .leaderboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-left h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .trophy-icon {
          color: var(--color-warning);
        }

        .refresh-btn {
          background: transparent;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .refresh-btn:hover {
          background: var(--color-bg-hover);
          color: var(--color-text-primary);
        }

        .refresh-btn .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .last-updated {
          font-size: 11px;
          color: var(--color-text-muted);
          margin-bottom: 12px;
        }

        .leaderboard-loading,
        .leaderboard-error,
        .leaderboard-empty {
          text-align: center;
          padding: 24px;
          color: var(--color-text-muted);
        }

        .leaderboard-error button {
          margin-top: 8px;
          padding: 8px 16px;
          background: var(--color-accent);
          color: #000;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }

        .leaderboard-entries {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .leaderboard-entry {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          background: var(--color-bg);
          border-radius: 8px;
          transition: all 0.2s;
        }

        .leaderboard-entry:hover {
          background: var(--color-bg-hover);
        }

        .leaderboard-entry.current-user {
          border: 1px solid var(--color-accent);
        }

        .leaderboard-entry.rank-1 {
          background: linear-gradient(135deg, var(--color-warning-muted) 0%, transparent 100%);
        }

        .leaderboard-entry.rank-2 {
          background: linear-gradient(135deg, rgba(192, 192, 192, 0.1) 0%, transparent 100%);
        }

        .leaderboard-entry.rank-3 {
          background: linear-gradient(135deg, rgba(205, 127, 50, 0.1) 0%, transparent 100%);
        }

        .entry-rank {
          width: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .rank-icon.gold {
          color: #fbbf24;
          filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.5));
        }

        .rank-icon.silver {
          color: #c0c0c0;
        }

        .rank-icon.bronze {
          color: #cd7f32;
        }

        .rank-number {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-muted);
        }

        .entry-address {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .entry-address .address {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--color-text-primary);
        }

        .entry-address .change {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 11px;
        }

        .entry-address .change.up {
          color: var(--color-success);
        }

        .entry-address .change.down {
          color: var(--color-danger);
        }

        .entry-score {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .entry-score .score {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .entry-score .label {
          font-size: 10px;
          color: var(--color-text-muted);
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
}