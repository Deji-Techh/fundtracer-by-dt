import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TokenChartProps {
  coinId: string;
  tokenName: string;
}

const TIMEFRAMES = [
  { label: '1H', value: '1H' },
  { label: '1D', value: '1D' },
  { label: '7D', value: '7D' },
  { label: '30D', value: '30D' },
  { label: '90D', value: '90D' },
  { label: '1Y', value: '1Y' },
  { label: 'ALL', value: 'ALL' },
];

export const TokenChart: React.FC<TokenChartProps> = ({ coinId, tokenName }) => {
  const [timeframe, setTimeframe] = useState('7D');
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  useEffect(() => {
    fetchChartData();
  }, [coinId, timeframe]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tokens/${coinId}/chart?days=${timeframe}&coinId=${coinId}`);
      const data = await response.json();

      if (data.prices) {
        const labels = data.prices.map((price: [number, number]) => {
          const date = new Date(price[0]);
          return formatLabel(date, timeframe);
        });

        const prices = data.prices.map((price: [number, number]) => price[1]);

        setChartData({
          labels,
          datasets: [
            {
              label: 'Price (USD)',
              data: prices,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 0,
              pointHoverRadius: 4,
              fill: true,
            },
          ],
        });

        // Calculate current price and change
        if (prices.length > 0) {
          const current = prices[prices.length - 1];
          const previous = prices[0];
          setCurrentPrice(current);
          setPriceChange(((current - previous) / previous) * 100);
        }
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (date: Date, tf: string) => {
    switch (tf) {
      case '1H':
      case '1D':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      case '7D':
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      case '30D':
      case '90D':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case '1Y':
      case 'ALL':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      default:
        return date.toLocaleDateString();
    }
  };

  const chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            return `$${context.parsed.y.toFixed(4)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
          color: '#9ca3af',
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          color: '#9ca3af',
          callback: (value: any) => {
            return '$' + value.toFixed(2);
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e5e5', padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h3 style={{ margin: '0 0 8px 0', color: '#111827' }}>{tokenName}</h3>
          {currentPrice && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>
                ${currentPrice.toFixed(4)}
              </span>
              {priceChange !== null && (
                <span style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: priceChange >= 0 ? '#16a34a' : '#dc2626',
                }}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>

        {/* Timeframe buttons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setTimeframe(tf.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: timeframe === tf.value ? '#2563eb' : '#f3f4f6',
                color: timeframe === tf.value ? '#ffffff' : '#6b7280',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: '400px' }}>
        {loading ? (
          <div className="skeleton" style={{ width: '100%', height: '100%' }} />
        ) : chartData ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#9ca3af',
          }}>
            No chart data available
          </div>
        )}
      </div>

      {/* Attribution */}
      <div style={{ 
        marginTop: '16px', 
        textAlign: 'right', 
        fontSize: '0.75rem', 
        color: '#9ca3af',
      }}>
        Powered by{' '}
        <a 
          href="https://www.coingecko.com" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ color: '#2563eb', textDecoration: 'none' }}
        >
          CoinGecko
        </a>
      </div>
    </div>
  );
};

export default TokenChart;
