import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries, HistogramSeries, Time } from 'lightweight-charts';
import { getPoolOHLCVUrl, getChainConfig, ChainKey } from '../../config/chains';

interface TradingChartProps {
  chainKey: ChainKey;
  poolAddress: string;
  timeframe?: 'hour' | 'day' | 'minute';
  height?: number;
}

type TimeFrame = '1h' | '6h' | '24h' | '7d' | '30d';

interface OHLCVData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const timeframeMap: Record<TimeFrame, { label: string; apiTimeframe: 'minute' | 'hour' | 'day'; aggregate: string }> = {
  '1h': { label: '1H', apiTimeframe: 'minute', aggregate: '5' },
  '6h': { label: '6H', apiTimeframe: 'minute', aggregate: '15' },
  '24h': { label: '24H', apiTimeframe: 'hour', aggregate: '1' },
  '7d': { label: '7D', apiTimeframe: 'hour', aggregate: '4' },
  '30d': { label: '30D', apiTimeframe: 'day', aggregate: '1' },
};

const TradingChart: React.FC<TradingChartProps> = ({ 
  chainKey, 
  poolAddress,
  timeframe = 'hour',
  height = 500 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<TimeFrame>('24h');
  const lastUpdateRef = useRef<number>(Date.now());

  const chainConfig = getChainConfig(chainKey);

  const fetchOHLCV = async (): Promise<OHLCVData[]> => {
    const tf = timeframeMap[activeTimeframe];
    const url = `${getPoolOHLCVUrl(chainConfig.id, poolAddress, tf.apiTimeframe)}?aggregate=${tf.aggregate}&limit=100`;

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch OHLCV data');
    }

    const data = await response.json();

    if (!data?.data?.attributes?.ohlcv_list || !Array.isArray(data.data.attributes.ohlcv_list)) {
      console.warn('[TradingChart] Invalid OHLCV data structure:', data);
      return [];
    }

    return data.data.attributes.ohlcv_list.map((item: number[]) => ({
      time: item[0] as Time,
      open: item[1] || 0,
      high: item[2] || 0,
      low: item[3] || 0,
      close: item[4] || 0,
      volume: item[5] || 0,
    }));
  };

  const { data: ohlcvData, isLoading, error, refetch } = useQuery({
    queryKey: ['ohlcv', chainKey, poolAddress, activeTimeframe],
    queryFn: fetchOHLCV,
    refetchInterval: 15000, // Auto-update every 15 seconds
    staleTime: 10000,
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#9ca3af',
        fontFamily: 'Inter, -apple-system, sans-serif',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      leftPriceScale: {
        visible: true,
        borderColor: '#2a2a2a',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#3b82f6',
          labelBackgroundColor: '#3b82f6',
        },
        horzLine: {
          color: '#3b82f6',
          labelBackgroundColor: '#3b82f6',
        },
      },
      handleScroll: {
        vertTouchDrag: false,
      },
    });

    // Add candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    // Add volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'left',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: height,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height]);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !ohlcvData || ohlcvData.length === 0) {
      return;
    }

    const candleData: CandlestickData[] = ohlcvData.map(d => ({
      time: d.time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volumeData = ohlcvData.map(d => ({
      time: d.time,
      value: d.volume,
      color: d.close >= d.open ? '#10b981' : '#ef4444',
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }

    lastUpdateRef.current = Date.now();
  }, [ohlcvData]);

  // Auto-update last candle
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 15000);

    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <div style={{ width: '100%' }}>
      {/* Header with timeframe selector */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        padding: '0 4px'
      }}>
        <div style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#9ca3af',
        }}>
          Price Chart
        </div>
        <div style={{ 
          display: 'flex', 
          gap: 4,
        }}>
          {(Object.keys(timeframeMap) as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #2a2a2a',
                background: activeTimeframe === tf ? '#3b82f6' : 'transparent',
                color: activeTimeframe === tf ? '#fff' : '#9ca3af',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {timeframeMap[tf].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart container */}
      <div style={{ position: 'relative', height }}>
        <div 
          ref={chartContainerRef} 
          style={{ 
            width: '100%', 
            height,
            background: '#0a0a0a',
            borderRadius: 8,
            border: '1px solid #1a1a1a',
          }} 
        />
        
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10, 10, 10, 0.9)',
            borderRadius: 8,
          }}>
            <div className="loading-spinner" style={{ width: 32, height: 32 }} />
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(10, 10, 10, 0.9)',
            borderRadius: 8,
            gap: 12,
          }}>
            <span style={{ color: '#ef4444', fontSize: '0.875rem' }}>
              Failed to load chart data
            </span>
            <button 
              onClick={() => refetch()}
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
        )}
      </div>
    </div>
  );
};

export default TradingChart;
