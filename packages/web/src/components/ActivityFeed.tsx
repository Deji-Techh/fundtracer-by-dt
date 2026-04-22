import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Zap, TrendingUp } from 'lucide-react';
import './ActivityFeed.css';

interface Activity {
  id: string;
  userId: string;
  displayName: string;
  walletAddress: string;
  chain: string;
  points: number;
  timestamp: number;
}

interface ActivityFeedProps {
  refreshInterval?: number;
}

export default function ActivityFeed({ refreshInterval = 20000 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevActivitiesRef = useRef<string[]>([]);

  const fetchActivity = async () => {
    try {
      const response = await fetch('/api/torque/v2/activity?limit=10');
      
      if (!response.ok) {
        setError('Failed to load activity');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      
      // Check for new activities
      const newIds = (data.activities || []).map((a: Activity) => a.id);
      const hasNew = newIds.some(id => !prevActivitiesRef.current.includes(id));
      
      if (hasNew) {
        setActivities(data.activities || []);
        prevActivitiesRef.current = newIds;
      }
      
      setError(null);
    } catch (err) {
      setError('Unable to load activity');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const formatAddress = (address: string) => {
    if (!address) return 'Unknown';
    return address.slice(0, 8) + '...' + address.slice(-4);
  };

  if (loading) {
    return (
      <div className="activity-feed loading">
        <div className="activity-spinner" />
      </div>
    );
  }

  if (error && activities.length === 0) {
    return (
      <div className="activity-feed error">
        <p>Activity unavailable</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="activity-feed empty">
        <Zap size={24} />
        <p>No recent scans yet</p>
        <small>Be the first to scan!</small>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      <AnimatePresence mode="popLayout">
        {activities.slice(0, 8).map((activity, index) => (
          <motion.div
            key={activity.id}
            className="activity-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="activity-icon">
              <Search size={14} />
            </div>
            <div className="activity-content">
              <span className="activity-user">{activity.displayName}</span>
              <span className="activity-wallet">{formatAddress(activity.walletAddress)}</span>
              <span className="activity-chain">{activity.chain?.toUpperCase()}</span>
            </div>
            <div className="activity-meta">
              <span className="activity-points">+{activity.points} pts</span>
              <span className="activity-time">{formatTime(activity.timestamp)}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}