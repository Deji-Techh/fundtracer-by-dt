import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import TradingChart from './TradingChart';
import LiveTradeFeed from './LiveTradeFeed';
import PoolCard from './PoolCard';
import TerminalSidebar from './TerminalSidebar';
import LiveIndicator from './LiveIndicator';
import { getTrendingPoolsUrl, getChainConfig, ChainKey, DEFAULT_CHAIN } from '../../config/chains';
import { usePrefetchTrendingPools } from '../../hooks/useLiveCrypto';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartLineData01Icon, DollarCircleIcon } from '@hugeicons/core-free-icons';
import { ArrowLeftRight } from 'lucide-react';

interface Pool {
  address: string;
  name: string;
  symbol: string;
  price: number;
  volume24h: number;
  liquidity: number;
  priceChange24h: number;
  logoUrl?: string;
}

interface TickerData {
  symbol: string;
  price: number;
  change24h: number;
}

// Skeleton loader component for pools
const PoolSkeleton: React.FC = () => (
  <div style={{
    background: '#0f0f0f',
    borderRadius: 8,
    border: '1px solid #1a1a1a',
    padding: 16,
    height: 120,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  }}>
    <div style={{ height: 20, background: '#1a1a1a', borderRadius: 4, width: '60%' }} />
    <div style={{ height: 16, background: '#1a1a1a', borderRadius: 4, width: '40%', marginTop: 'auto' }} />
    <div style={{ height: 16, background: '#1a1a1a', borderRadius: 4, width: '80%' }} />
  </div>
);

const TerminalLayout: React.FC = () => {
  const [activeChain, setActiveChain] = useState<ChainKey>(DEFAULT_CHAIN);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const chainConfig = getChainConfig(activeChain);

  // Prefetch trending pools on mount and chain change
  usePrefetchTrendingPools(activeChain);

  // Fetch trending pools with aggressive caching
  const fetchPools = async (): Promise<Pool[]> => {
    const url = getTrendingPoolsUrl(chainConfig.id);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pools');
    }

    const data = await response.json();

    return data.data.map((item: any) => ({
      address: item.attributes.address,
      name: item.attributes.name,
      symbol: `${item.attributes.base_token_symbol}/${item.attributes.quote_token_symbol}`,
      price: parseFloat(item.attributes.base_token_price_usd),
      volume24h: parseFloat(item.attributes.volume_usd.h24),
      liquidity: parseFloat(item.attributes.reserve_in_usd),
      priceChange24h: parseFloat(item.attributes.price_change_percentage.h24),
      logoUrl: item.attributes.base_token_logo_url,
    }));
  };

  const { data: pools, isLoading: poolsLoading, isFetching: poolsFetching, error: poolsError, refetch: refetchPools } = useQuery({
    queryKey: ['pools', activeChain],
    queryFn: fetchPools,
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 300000,      // 5 minutes - show cached data immediately
    gcTime: 600000,         // 10 minutes - keep in cache
    placeholderData: (previousData: any) => previousData, // Show cached data while loading
    retry: 3,
    retryDelay: 1000,
  });

  // Update last update time when data refreshes
  useEffect(() => {
    if (pools) {
      setLastUpdate(new Date());
    }
  }, [pools]);

  // Set first pool as selected when pools load
  useEffect(() => {
    if (pools && pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0].address);
    }
  }, [pools, selectedPool]);

  // Handle chain change
  const handleChainChange = useCallback((chain: ChainKey) => {
    setActiveChain(chain);
    setSelectedPool(null);
  }, []);

  // Get selected pool data
  const selectedPoolData = pools?.find(p => p.address === selectedPool);

  // Format number helper
  const formatNumber = (num: number, decimals: number = 2) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(decimals)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(decimals)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(decimals)}K`;
    return num.toFixed(decimals);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0a0a0a',
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <TerminalSidebar 
        activeChain={activeChain}
        onChainSelect={handleChainChange}
      />

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Top price ticker bar */}
        <div style={{
          height: 56,
          background: '#0f0f0f',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 24,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <HugeiconsIcon icon={ChartLineData01Icon} size={18} color="#3b82f6" />
            <span style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#fff',
            }}>
              {chainConfig.displayName}
            </span>
          </div>

          {selectedPoolData && (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <HugeiconsIcon icon={DollarCircleIcon} size={16} color="#9ca3af" />
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Price:</span>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600,
                  color: '#fff',
                }}>
                  ${selectedPoolData.price.toFixed(6)}
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <ArrowLeftRight size={16} color="#9ca3af" />
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>24h Vol:</span>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600,
                  color: '#fff',
                }}>
                  {formatNumber(selectedPoolData.volume24h)}
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>24h Change:</span>
                <span style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600,
                  color: selectedPoolData.priceChange24h >= 0 ? '#10b981' : '#ef4444',
                }}>
                  {selectedPoolData.priceChange24h >= 0 ? '+' : ''}{selectedPoolData.priceChange24h.toFixed(2)}%
                </span>
              </div>
            </>
          )}
        </div>

        {/* Live indicator */}
        <div style={{
          padding: '8px 20px',
          borderBottom: '1px solid #1a1a1a',
        }}>
          <LiveIndicator
            refreshInterval={15}
            isConnected={!poolsError}
            lastUpdateTime={lastUpdate}
            isRefreshing={poolsFetching}
          />
        </div>

        {/* Main content area - Chart + Trade feed */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 400px',
          gap: 16,
          padding: 16,
          overflow: 'hidden',
        }}>
          {/* Chart section */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {selectedPool ? (
              <TradingChart 
                chainKey={activeChain}
                poolAddress={selectedPool}
                height={500}
              />
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f0f0f',
                borderRadius: 8,
                border: '1px solid #1a1a1a',
              }}>
                <span style={{ color: '#6b7280' }}>Select a pool to view chart</span>
              </div>
            )}
          </div>

          {/* Trade feed section */}
          <div style={{
            overflow: 'hidden',
          }}>
            {selectedPool ? (
              <LiveTradeFeed 
                chainKey={activeChain}
                poolAddress={selectedPool}
                maxTrades={50}
              />
            ) : (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f0f0f',
                borderRadius: 8,
                border: '1px solid #1a1a1a',
              }}>
                <span style={{ color: '#6b7280' }}>Select a pool to view trades</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom pool cards grid */}
        <div style={{
          height: 200,
          borderTop: '1px solid #1a1a1a',
          padding: 16,
          overflow: 'hidden',
        }}>
          <div style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: 12,
          }}>
            Trending Pools on {chainConfig.displayName}
          </div>

          {poolsLoading && !pools ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
              height: 140,
            }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <PoolSkeleton key={i} />
              ))}
            </div>
          ) : poolsError ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: 140,
              gap: 12,
            }}>
              <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                Failed to load pools
              </span>
              <button 
                onClick={() => refetchPools()}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #2a2a2a',
                  background: '#1a1a1a',
                  color: '#fff',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : pools && pools.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
              overflowX: 'auto',
              height: 140,
            }}>
              <AnimatePresence mode="popLayout">
                {pools.slice(0, 6).map((pool) => (
                  <motion.div
                    key={pool.address}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PoolCard 
                      pool={pool}
                      isActive={selectedPool === pool.address}
                      onClick={() => setSelectedPool(pool.address)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 140,
              color: '#6b7280',
            }}>
              No pools available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalLayout;
