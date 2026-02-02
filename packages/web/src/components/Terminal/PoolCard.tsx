import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { DropletIcon, ActivityIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

interface PoolCardProps {
  pool: {
    address: string;
    name: string;
    symbol: string;
    price: number;
    volume24h: number;
    liquidity: number;
    priceChange24h: number;
    logoUrl?: string;
  };
  isActive: boolean;
  onClick: () => void;
}

const PoolCard: React.FC<PoolCardProps> = ({ pool, isActive, onClick }) => {
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const prevPriceRef = useRef(pool.price);

  // Flash animation on price update
  useEffect(() => {
    if (prevPriceRef.current !== pool.price) {
      const color = pool.price > prevPriceRef.current ? '#10b981' : '#ef4444';
      setFlashColor(color);
      
      const timer = setTimeout(() => {
        setFlashColor(null);
      }, 500);
      
      prevPriceRef.current = pool.price;
      return () => clearTimeout(timer);
    }
  }, [pool.price]);

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  const isPositive = pool.priceChange24h >= 0;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        background: isActive ? '#1a1a1a' : '#0f0f0f',
        border: `1px solid ${isActive ? '#3b82f6' : '#1a1a1a'}`,
        borderRadius: 12,
        padding: 16,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Flash overlay */}
      {flashColor && (
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: flashColor,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Active indicator */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: '#3b82f6',
        }} />
      )}

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
      }}>
        {pool.logoUrl ? (
          <img 
            src={pool.logoUrl} 
            alt={pool.symbol}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#2a2a2a',
            }}
          />
        ) : (
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#2a2a2a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.875rem',
            fontWeight: 700,
            color: '#9ca3af',
          }}>
            {pool.symbol.slice(0, 2)}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: 600,
            fontSize: '0.9375rem',
            color: '#fff',
          }}>
            {pool.name}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
          }}>
            {pool.symbol}
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 6,
          background: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        }}>
                {isPositive ? (
                  <TrendingUp size={14} color="#10b981" />
                ) : (
                  <TrendingDown size={14} color="#ef4444" />
                )}
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: isPositive ? '#10b981' : '#ef4444',
          }}>
            {isPositive ? '+' : ''}{pool.priceChange24h.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Price */}
      <div style={{
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#fff',
        marginBottom: 12,
      }}>
        ${pool.price.toFixed(6)}
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.75rem',
            color: '#6b7280',
            marginBottom: 4,
          }}>
            <HugeiconsIcon icon={ActivityIcon} size={12} />
            Volume 24h
          </div>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#9ca3af',
          }}>
            {formatNumber(pool.volume24h)}
          </div>
        </div>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.75rem',
            color: '#6b7280',
            marginBottom: 4,
          }}>
            <HugeiconsIcon icon={DropletIcon} size={12} />
            Liquidity
          </div>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#9ca3af',
          }}>
            {formatNumber(pool.liquidity)}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PoolCard;
