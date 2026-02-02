import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp01Icon, ArrowDown01Icon, Time01Icon, Wallet01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { getPoolTradesUrl, getChainConfig, ChainKey } from '../../config/chains';

interface LiveTradeFeedProps {
  chainKey: ChainKey;
  poolAddress: string;
  maxTrades?: number;
}

interface Trade {
  id: string;
  timestamp: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  usdValue: number;
  fromAddress: string;
  txHash: string;
}

const LiveTradeFeed: React.FC<LiveTradeFeedProps> = ({ 
  chainKey, 
  poolAddress,
  maxTrades = 50 
}) => {
  const chainConfig = getChainConfig(chainKey);

  const fetchTrades = async (): Promise<Trade[]> => {
    const url = `${getPoolTradesUrl(chainConfig.id, poolAddress)}?limit=${maxTrades}`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch trades');
    }

    const data = await response.json();

    if (!data?.data || !Array.isArray(data.data)) {
      console.warn('[LiveTradeFeed] Invalid trades data structure:', data);
      return [];
    }

    return data.data.map((item: any) => ({
      id: item.id || `${Date.now()}-${Math.random()}`,
      timestamp: item.attributes?.block_timestamp || new Date().toISOString(),
      type: item.attributes?.kind === 'buy' ? 'buy' : 'sell',
      price: parseFloat(item.attributes?.price_to_usd) || 0,
      amount: parseFloat(item.attributes?.from_token_amount) || 0,
      usdValue: parseFloat(item.attributes?.volume_in_usd) || 0,
      fromAddress: item.attributes?.tx_from_address || '0x0000000000000000000000000000000000000000',
      txHash: item.attributes?.tx_hash || '',
    }));
  };

  const { data: trades, isLoading, error } = useQuery({
    queryKey: ['trades', chainKey, poolAddress],
    queryFn: fetchTrades,
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 3000,
  });

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(decimals)}K`;
    return `$${num.toFixed(decimals)}`;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#0a0a0a',
      borderRadius: 8,
      border: '1px solid #1a1a1a',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#9ca3af',
        }}>
          Live Trades
        </div>
        <div style={{
          fontSize: '0.75rem',
          color: '#6b7280',
        }}>
          Last {maxTrades} trades
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 50px 1fr 1fr 1fr 100px',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #1a1a1a',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        <span>Time</span>
        <span>Type</span>
        <span style={{ textAlign: 'right' }}>Price</span>
        <span style={{ textAlign: 'right' }}>Amount</span>
        <span style={{ textAlign: 'right' }}>Value</span>
        <span style={{ textAlign: 'center' }}>From</span>
      </div>

      {/* Trades list */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px 0',
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
          }}>
            <div className="loading-spinner" style={{ width: 24, height: 24 }} />
          </div>
        ) : error ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#ef4444',
            fontSize: '0.875rem',
          }}>
            Failed to load trades
          </div>
        ) : trades && trades.length > 0 ? (
          <AnimatePresence initial={false}>
            {trades.map((trade, index) => (
              <motion.div
                key={trade.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.02 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 50px 1fr 1fr 1fr 100px',
                  gap: 12,
                  padding: '10px 16px',
                  borderBottom: '1px solid #0f0f0f',
                  fontSize: '0.8125rem',
                  alignItems: 'center',
                }}
              >
                <span style={{ color: '#6b7280' }}>
                  {formatTime(trade.timestamp)}
                </span>
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {trade.type === 'buy' ? (
                    <HugeiconsIcon 
                      icon={ArrowUp01Icon} 
                      size={16} 
                      color="#10b981"
                    />
                  ) : (
                    <HugeiconsIcon 
                      icon={ArrowDown01Icon} 
                      size={16} 
                      color="#ef4444"
                    />
                  )}
                </span>
                <span style={{ 
                  textAlign: 'right',
                  color: trade.type === 'buy' ? '#10b981' : '#ef4444',
                  fontWeight: 600,
                }}>
                  ${trade.price.toFixed(6)}
                </span>
                <span style={{ 
                  textAlign: 'right',
                  color: '#9ca3af',
                }}>
                  {trade.amount.toFixed(4)}
                </span>
                <span style={{ 
                  textAlign: 'right',
                  color: '#fff',
                  fontWeight: 500,
                }}>
                  {formatNumber(trade.usdValue)}
                </span>
                <a
                  href={`${chainConfig.explorerUrl}/address/${trade.fromAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    color: '#3b82f6',
                    textDecoration: 'none',
                    fontSize: '0.75rem',
                  }}
                >
                  <HugeiconsIcon icon={Wallet01Icon} size={12} />
                  {formatAddress(trade.fromAddress)}
                </a>
              </motion.div>
            ))}
          </AnimatePresence>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#6b7280',
            fontSize: '0.875rem',
          }}>
            No trades available
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveTradeFeed;
