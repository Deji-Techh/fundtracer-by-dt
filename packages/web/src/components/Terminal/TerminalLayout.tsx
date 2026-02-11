import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import TradingChart from './TradingChart';
import LiveTradeFeed from './LiveTradeFeed';
import PoolCard from './PoolCard';
import TerminalSidebar from './TerminalSidebar';
import LiveIndicator from './LiveIndicator';
import ChartErrorBoundary from './ChartErrorBoundary';
import { getTrendingPoolsUrl, getChainConfig, ChainKey, DEFAULT_CHAIN } from '../../config/chains';
import { usePrefetchTrendingPools } from '../../hooks/useLiveCrypto';
import { useIsMobile } from '../../hooks/useIsMobile';
import { HugeiconsIcon } from '@hugeicons/react';
import { ChartLineData01Icon, DollarCircleIcon } from '@hugeicons/core-free-icons';
import { ArrowLeftRight, Menu, X } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

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

    if (!data?.data || !Array.isArray(data.data)) {
      console.warn('[TerminalLayout] Invalid pools data structure:', data);
      return [];
    }

    return data.data.filter((item: any) => item?.attributes != null).map((item: any) => ({
      address: item.attributes?.address || '',
      name: item.attributes?.name || 'Unknown',
      symbol: `${item.attributes?.base_token_symbol || '???'}/${item.attributes?.quote_token_symbol || '???'}`,
      price: parseFloat(item.attributes?.base_token_price_usd) || 0,
      volume24h: parseFloat(item.attributes?.volume_usd?.h24) || 0,
      liquidity: parseFloat(item.attributes?.reserve_in_usd) || 0,
      priceChange24h: parseFloat(item.attributes?.price_change_percentage?.h24) || 0,
      logoUrl: item.attributes?.base_token_logo_url || '',
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
      position: 'relative',
    }}>
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? 0 : -200) : 0,
        top: 0,
        bottom: 0,
        zIndex: 50,
        transition: 'left 0.3s ease',
      }}>
        <TerminalSidebar 
          activeChain={activeChain}
          onChainSelect={(chain) => {
            handleChainChange(chain);
            if (isMobile) setSidebarOpen(false);
          }}
        />
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: 0,
      }}>
        {/* Top price ticker bar */}
        <div style={{
          height: isMobile ? 'auto' : 56,
          minHeight: 56,
          background: '#0f0f0f',
          borderBottom: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          padding: isMobile ? '12px 16px' : '0 20px',
          gap: isMobile ? 16 : 24,
          overflow: 'hidden',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
          {/* Mobile Menu Button */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Menu size={20} />
            </button>
          )}
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
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          padding: isMobile ? 12 : 16,
          overflow: 'hidden',
          minHeight: 0,
        }}>
          {/* Chart section */}
          <div style={{
            flex: isMobile ? '1 1 50%' : '1 1 60%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
          }}>
            {selectedPool ? (
              <ChartErrorBoundary>
                <TradingChart
                  chainKey={activeChain}
                  poolAddress={selectedPool}
                  height={isMobile ? 300 : 500}
                />
              </ChartErrorBoundary>
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
            flex: isMobile ? '1 1 50%' : '0 0 400px',
            overflow: 'hidden',
            minHeight: 0,
          }}>
            {selectedPool ? (
              <LiveTradeFeed 
                chainKey={activeChain}
                poolAddress={selectedPool}
                maxTrades={isMobile ? 20 : 50}
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
          height: isMobile ? 160 : 200,
          borderTop: '1px solid #1a1a1a',
          padding: isMobile ? 12 : 16,
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
              display: isMobile ? 'flex' : 'grid',
              gridTemplateColumns: isMobile ? undefined : 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
              height: isMobile ? 120 : 140,
              overflowX: isMobile ? 'auto' : undefined,
            }}>
              {Array.from({ length: isMobile ? 3 : 6 }).map((_, i) => (
                <div key={i} style={{ minWidth: isMobile ? 200 : undefined }}>
                  <PoolSkeleton />
                </div>
              ))}
            </div>
          ) : poolsError ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: isMobile ? 120 : 140,
              gap: 12,
            }}>
              <span style={{ color: '#ef4444', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                Failed to load pools
              </span>
              <button 
                onClick={() => refetchPools()}
                style={{
                  padding: isMobile ? '6px 12px' : '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #2a2a2a',
                  background: '#1a1a1a',
                  color: '#fff',
                  fontSize: isMobile ? '0.75rem' : '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : pools && pools.length > 0 ? (
            <div style={{
              display: isMobile ? 'flex' : 'grid',
              gridTemplateColumns: isMobile ? undefined : 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
              overflowX: isMobile ? 'auto' : undefined,
              height: isMobile ? 120 : 140,
            }}>
              <AnimatePresence mode="popLayout">
                {pools.slice(0, isMobile ? 6 : 6).map((pool) => (
                  <motion.div
                    key={pool.address}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      minWidth: isMobile ? 200 : undefined,
                      flexShrink: 0,
                    }}
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
              height: isMobile ? 120 : 140,
              color: '#6b7280',
              fontSize: isMobile ? '0.875rem' : '1rem',
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
