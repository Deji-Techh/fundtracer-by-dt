import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

const TIMEFRAMES = {
  '1h': { label: '1H', interval: 'minute', aggregate: '5' },
  '6h': { label: '6H', interval: 'minute', aggregate: '15' },
  '24h': { label: '1D', interval: 'hour', aggregate: '1' },
  '7d': { label: '7D', interval: 'hour', aggregate: '4' },
  '30d': { label: '30D', interval: 'day', aggregate: '1' }
};

export function PriceChart({ data, poolName, isLoading, error, onTimeframeChange }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const [activeTimeframe, setActiveTimeframe] = useState('24h');

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#9ca3af',
        fontFamily: 'Inter, -apple-system, sans-serif'
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' }
      },
      rightPriceScale: {
        borderColor: '#2a2a2a',
        scaleMargins: { top: 0.1, bottom: 0.2 }
      },
      leftPriceScale: {
        visible: true,
        borderColor: '#2a2a2a',
        scaleMargins: { top: 0.8, bottom: 0 }
      },
      timeScale: {
        borderColor: '#2a2a2a',
        timeVisible: true,
        secondsVisible: false
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#3b82f6', labelBackgroundColor: '#3b82f6' },
        horzLine: { color: '#3b82f6', labelBackgroundColor: '#3b82f6' }
      },
      handleScroll: { vertTouchDrag: false }
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'left'
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: 400
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update chart data
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || !data || data.length === 0) {
      return;
    }

    try {
      const candleData = data.map(d => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close
      }));

      const volumeData = data.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? '#10b981' : '#ef4444'
      }));

      candleSeriesRef.current.setData(candleData);
      volumeSeriesRef.current.setData(volumeData);

      if (chartRef.current) {
        chartRef.current.timeScale().fitContent();
      }
    } catch (err) {
      console.error('[PriceChart] Error updating chart:', err);
    }
  }, [data]);

  const handleTimeframeChange = (tf) => {
    setActiveTimeframe(tf);
    if (onTimeframeChange) {
      onTimeframeChange(TIMEFRAMES[tf]);
    }
  };

  return (
    <div className="bg-[#0f0f0f] rounded-lg border border-[#1a1a1a] p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-white font-semibold">{poolName || 'Price Chart'}</h3>
          <p className="text-gray-500 text-sm">Live OHLCV Data</p>
        </div>
        <div className="flex gap-2">
          {Object.entries(TIMEFRAMES).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => handleTimeframeChange(key)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTimeframe === key
                  ? 'bg-blue-500 text-white'
                  : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#2a2a2a]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[400px]">
        <div ref={chartContainerRef} className="w-full h-full" />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/90 rounded-lg">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/90 rounded-lg gap-3">
            <span className="text-red-400 text-sm">Failed to load chart</span>
            <button className="px-4 py-2 bg-[#1a1a1a] text-white rounded text-sm hover:bg-[#2a2a2a]">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !error && (!data || data.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/90 rounded-lg">
            <span className="text-gray-500 text-sm">No chart data available</span>
          </div>
        )}
      </div>
    </div>
  );
}
