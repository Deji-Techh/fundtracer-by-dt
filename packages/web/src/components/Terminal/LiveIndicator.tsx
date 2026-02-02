import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle01Icon, AlertCircleIcon, WifiOffIcon } from '@hugeicons/core-free-icons';

interface LiveIndicatorProps {
  refreshInterval?: number; // in seconds
  isConnected?: boolean;
  lastUpdateTime?: Date;
  isRefreshing?: boolean;
}

const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  refreshInterval = 15,
  isConnected = true,
  lastUpdateTime = new Date(),
  isRefreshing = false,
}) => {
  const [countdown, setCountdown] = useState(refreshInterval);
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Reset countdown when lastUpdateTime changes
  useEffect(() => {
    setCountdown(refreshInterval);
  }, [lastUpdateTime, refreshInterval]);

  const getStatusIcon = () => {
    if (!isConnected) {
      return <HugeiconsIcon icon={WifiOffIcon} size={14} color="#ef4444" />;
    }
    if (isRefreshing || countdown <= 3) {
      return <HugeiconsIcon icon={AlertCircleIcon} size={14} color="#3b82f6" />;
    }
    return <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} color="#10b981" />;
  };

  const getStatusColor = () => {
    if (!isConnected) return '#ef4444';
    if (isRefreshing) return '#3b82f6';
    if (countdown <= 3) return '#f59e0b';
    return '#10b981';
  };

  const getStatusText = () => {
    if (!isConnected) return 'Disconnected';
    if (isRefreshing) return 'Updating...';
    if (countdown <= 3) return 'Refreshing...';
    return 'Live';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '8px 16px',
      background: '#0f0f0f',
      borderRadius: 8,
      border: '1px solid #1a1a1a',
    }}>
      {/* Pulsing dot */}
      <div style={{
        position: 'relative',
        width: 10,
        height: 10,
      }}>
        {/* Static dot */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: getStatusColor(),
        }} />
        
        {/* Pulse animation */}
        {isConnected && showPulse && (
          <motion.div
            animate={{
              scale: [1, 2, 2],
              opacity: [0.5, 0.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: getStatusColor(),
            }}
          />
        )}
      </div>

      {/* Status text */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        {getStatusIcon()}
        <span style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: getStatusColor(),
        }}>
          {getStatusText()}
        </span>
      </div>

      {/* Divider */}
      <div style={{
        width: 1,
        height: 16,
        background: '#2a2a2a',
      }} />

      {/* Countdown */}
      <div style={{
        fontSize: '0.75rem',
        color: '#6b7280',
      }}>
        Next refresh in: <span style={{ color: '#9ca3af', fontWeight: 500 }}>{countdown}s</span>
      </div>

      {/* Last update time */}
      <div style={{
        fontSize: '0.75rem',
        color: '#6b7280',
        marginLeft: 'auto',
      }}>
        Updated: {lastUpdateTime.toLocaleTimeString()}
      </div>
    </div>
  );
};

export default LiveIndicator;
