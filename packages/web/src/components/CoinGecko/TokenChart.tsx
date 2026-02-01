import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, CandlestickSeries, Time } from 'lightweight-charts';

interface TokenChartProps {
  chainId: string;
  tokenAddress: string;
  height?: number;
}

type TimeFrame = '1h' | '6h' | '24h' | '7d' | '30d';

const TokenChart: React.FC<TokenChartProps> = ({ 
  chainId, 
  tokenAddress,
  height = 400 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<TimeFrame>('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeframes: { id: TimeFrame; label: string }[] = [
    { id: '1h', label: '1H' },
    { id: '6h', label: '6H' },
    { id: '24h', label: '24H' },
    { id: '7d', label: '7D' },
    { id: '30d', label: '30D' },
  ];

  // Generate mock OHLC data based on price history
  const generateMockData = (timeframe: TimeFrame): CandlestickData[] => {
    const data: CandlestickData[] = [];
    const now = new Date();
    let points = 50;
    let interval = 3600; // seconds

    switch (timeframe) {
      case '1h':
        points = 60;
        interval = 60; // 1 minute
        break;
      case '6h':
        points = 72;
        interval = 300; // 5 minutes
        break;
      case '24h':
        points = 96;
        interval = 900; // 15 minutes
        break;
      case '7d':
        points = 84;
        interval = 7200; // 2 hours
        break;
      case '30d':
        points = 60;
        interval = 43200; // 12 hours
        break;
    }

    let basePrice = 1.0;
    
    for (let i = points; i >= 0; i--) {
      const time = new Date(now.getTime() - i * interval * 1000);
      const volatility = 0.02;
      const change = (Math.random() - 0.5) * volatility;
      
      const open = basePrice;
      const close = basePrice * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      const timeValue = timeframe === '30d' || timeframe === '7d' 
        ? (time.toISOString().split('T')[0] as Time)
        : (Math.floor(time.getTime() / 1000) as Time);
      
      data.push({
        time: timeValue,
        open,
        high,
        low,
        close,
      });
      
      basePrice = close;
    }
    
    return data;
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' },
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
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
      autoSize: true,
    });

    // Add candlestick series
    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Load initial data
    setLoading(true);
    const data = generateMockData(activeTimeframe);
    series.setData(data);
    chart.timeScale().fitContent();
    setLoading(false);

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

  // Update data when timeframe changes
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;
    
    setLoading(true);
    const data = generateMockData(activeTimeframe);
    seriesRef.current.setData(data);
    chartRef.current.timeScale().fitContent();
    setLoading(false);
  }, [activeTimeframe]);

  return (
    <div style={{ width: '100%' }}>
      {/* Timeframe selector */}
      <div style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 16,
        padding: '0 4px'
      }}>
        {timeframes.map((tf) => (
          <button
            key={tf.id}
            onClick={() => setActiveTimeframe(tf.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: '1px solid #2a2a2a',
              background: activeTimeframe === tf.id ? '#3b82f6' : 'transparent',
              color: activeTimeframe === tf.id ? '#fff' : '#9ca3af',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart container */}
      <div style={{ position: 'relative', height }}>
        <div 
          ref={chartContainerRef} 
          style={{ 
            width: '100%', 
            height,
            background: '#1a1a1a',
            borderRadius: 8,
          }} 
        />
        
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(26, 26, 26, 0.8)',
            borderRadius: 8,
          }}>
            <div className="loading-spinner" style={{ width: 32, height: 32 }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenChart;
