/**
 * LiveFeed - Real-time scrolling transaction/event feed
 * Core component for the Arkham-style landing page
 */

import React, { useEffect, useRef, useState } from 'react';
import './LiveFeed.css';

export interface FeedItem {
  id: string;
  time: string | Date;
  type?: 'transfer' | 'swap' | 'mint' | 'burn' | 'contract' | 'approval';
  from: string;
  fromLabel?: string;
  to: string;
  toLabel?: string;
  value: string;
  token?: string;
  tokenSymbol?: string;
  chain?: string;
  risk?: 'low' | 'medium' | 'high' | 'critical';
  hash?: string;
}

interface LiveFeedProps {
  items: FeedItem[];
  maxItems?: number;
  autoScroll?: boolean;
  showHeader?: boolean;
  title?: string;
  onItemClick?: (item: FeedItem) => void;
  loading?: boolean;
  emptyMessage?: string;
  compact?: boolean;
  className?: string;
}

export function LiveFeed({
  items,
  maxItems = 50,
  autoScroll = true,
  showHeader = true,
  title = 'LIVE TRANSACTIONS',
  onItemClick,
  loading = false,
  emptyMessage = 'Waiting for transactions...',
  compact = false,
  className = ''
}: LiveFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  
  // Auto-scroll to top when new items come in (if not hovered)
  useEffect(() => {
    if (autoScroll && !isHovered && containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [items, autoScroll, isHovered]);

  const displayItems = items.slice(0, maxItems);

  const formatTime = (time: string | Date) => {
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const formatAddress = (address: string, label?: string) => {
    if (label) return label;
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'swap': return '⇄';
      case 'mint': return '+';
      case 'burn': return '🔥';
      case 'contract': return '📄';
      case 'approval': return '✓';
      default: return '→';
    }
  };

  const getRiskClass = (risk?: string) => {
    if (!risk) return '';
    return `live-feed__risk--${risk}`;
  };

  if (loading) {
    return (
      <div className={`live-feed live-feed--loading ${className}`}>
        {showHeader && (
          <div className="live-feed__header">
            <div className="live-feed__title">
              <span className="live-dot" />
              <span>{title}</span>
            </div>
          </div>
        )}
        <div className="live-feed__content">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="live-feed__item live-feed__item--skeleton">
              <div className="skeleton" style={{ width: '60px', height: '14px' }} />
              <div className="skeleton" style={{ width: '100px', height: '14px' }} />
              <div className="skeleton" style={{ width: '20px', height: '14px' }} />
              <div className="skeleton" style={{ width: '100px', height: '14px' }} />
              <div className="skeleton" style={{ width: '80px', height: '14px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`live-feed ${compact ? 'live-feed--compact' : ''} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showHeader && (
        <div className="live-feed__header">
          <div className="live-feed__title">
            <span className="live-dot" />
            <span>{title}</span>
          </div>
          <span className="live-feed__count">{items.length} TXS</span>
        </div>
      )}
      
      <div className="live-feed__content" ref={containerRef}>
        {displayItems.length === 0 ? (
          <div className="live-feed__empty">{emptyMessage}</div>
        ) : (
          displayItems.map((item, index) => (
            <div
              key={item.id}
              className={`live-feed__item ${onItemClick ? 'live-feed__item--clickable' : ''} ${index === 0 ? 'animate-slide-down' : ''}`}
              onClick={onItemClick ? () => onItemClick(item) : undefined}
            >
              <span className="live-feed__time">{formatTime(item.time)}</span>
              
              <span className={`live-feed__from ${item.fromLabel ? 'live-feed__labeled' : ''}`}>
                {formatAddress(item.from, item.fromLabel)}
              </span>
              
              <span className="live-feed__type">{getTypeIcon(item.type)}</span>
              
              <span className={`live-feed__to ${item.toLabel ? 'live-feed__labeled' : ''}`}>
                {formatAddress(item.to, item.toLabel)}
              </span>
              
              <span className="live-feed__value">
                {item.value}
                {item.tokenSymbol && <span className="live-feed__token">{item.tokenSymbol}</span>}
              </span>
              
              {item.risk && (
                <span className={`live-feed__risk ${getRiskClass(item.risk)}`}>
                  ●
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default LiveFeed;
