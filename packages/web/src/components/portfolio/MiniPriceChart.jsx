import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

export function MiniPriceChart({ data, color = '#627eea', height = 40 }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [data]);

  useEffect(() => {
    if (!isVisible || !chartContainerRef.current || !data || data.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      rightPriceScale: {
        visible: false,
      },
      timeScale: {
        visible: false,
      },
      crosshair: {
        horzLine: { visible: false },
        vertLine: { visible: false },
      },
    });

    const lineSeries = chart.addLineSeries({
      color: color,
      lineWidth: 2,
      priceLineVisible: false,
    });

    const chartData = data.map((d, i) => ({
      time: i,
      value: d.price || d.close || d,
    }));

    lineSeries.setData(chartData);

    chart.timeScale().fitContent();

    chartRef.current = chart;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [isVisible, data, color, height]);

  if (!data || data.length === 0) {
    return (
      <div
        ref={chartContainerRef}
        className="w-16 rounded"
        style={{ height }}
      >
        <div className="flex items-center justify-center h-full text-gray-500 text-xs">
          N/A
        </div>
      </div>
    );
  }

  return (
    <div
      ref={chartContainerRef}
      className="w-16 rounded overflow-hidden"
      style={{ height }}
    />
  );
}

export default MiniPriceChart;
