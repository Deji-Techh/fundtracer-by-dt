import { useState, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { FuelIcon, TrendingUpIcon, TrendingDownIcon, ActivityIcon } from '@hugeicons/core-free-icons';

interface GasPrice {
  slow: number;
  standard: number;
  fast: number;
  rapid: number;
  timestamp: number;
}

export function GasTracker() {
  const [gasPrice, setGasPrice] = useState<GasPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGasPrice();
    const interval = setInterval(fetchGasPrice, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchGasPrice = async () => {
    try {
      // Use LineaScan API to get gas prices
      const response = await fetch('https://api.lineascan.build/api?module=gastracker&action=gasoracle');
      const data = await response.json();
      
      if (data.result) {
        setGasPrice({
          slow: parseInt(data.result.SafeGasPrice),
          standard: parseInt(data.result.ProposeGasPrice),
          fast: parseInt(data.result.FastGasPrice),
          rapid: parseInt(data.result.RapidGasPrice) || parseInt(data.result.FastGasPrice) + 5,
          timestamp: Date.now()
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch gas price:', err);
      setError('Failed to load gas prices');
      setLoading(false);
    }
  };

  const getPriceColor = (price: number) => {
    if (price < 10) return 'var(--color-success)';
    if (price < 20) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  if (loading) {
    return (
      <div className="gas-tracker-card" style={{ padding: '16px', background: 'var(--color-bg-secondary)', borderRadius: '12px' }}>
        <div className="loading-spinner" style={{ width: '20px', height: '20px' }}></div>
      </div>
    );
  }

  if (error || !gasPrice) {
    return null;
  }

  return (
    <div className="gas-tracker-card" style={{ 
      padding: '16px', 
      background: 'var(--color-bg-secondary)', 
      borderRadius: '12px',
      border: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <HugeiconsIcon icon={FuelIcon} size={18} strokeWidth={2} style={{ color: 'var(--color-primary)' }} />
        <span style={{ fontWeight: 600 }}>Linea Gas Prices</span>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
          Updated {formatTime(gasPrice.timestamp)}
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        <div style={{ textAlign: 'center', padding: '8px', background: 'var(--color-bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Slow</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: getPriceColor(gasPrice.slow) }}>
            {gasPrice.slow}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>gwei</div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '8px', background: 'var(--color-bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Standard</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: getPriceColor(gasPrice.standard) }}>
            {gasPrice.standard}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>gwei</div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '8px', background: 'var(--color-bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Fast</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: getPriceColor(gasPrice.fast) }}>
            {gasPrice.fast}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>gwei</div>
        </div>
        
        <div style={{ textAlign: 'center', padding: '8px', background: 'var(--color-bg-tertiary)', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Rapid</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: getPriceColor(gasPrice.rapid) }}>
            {gasPrice.rapid}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>gwei</div>
        </div>
      </div>
    </div>
  );
}
