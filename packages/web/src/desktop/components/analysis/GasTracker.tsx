import { useState, useEffect } from 'react';
import { Fuel, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { getGasPrices } from '../../api/analyze';

interface GasInfo {
  chain: string;
  slow: number;
  standard: number;
  fast: number;
  rapid?: number;
  timestamp: number;
  baseFee?: number;
  priorityFee?: number;
}

export function GasTracker() {
  const [prices, setPrices] = useState<GasInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchPrices = async () => {
    try {
      const data = await getGasPrices() as Record<string, unknown>;
      const allPrices = (data?.result || data?.prices || data) as Record<string, unknown>;

      const parsed: GasInfo[] = [];
      if (allPrices && typeof allPrices === 'object') {
        for (const [chain, info] of Object.entries(allPrices)) {
          const p = info as Record<string, unknown>;
          parsed.push({
            chain,
            slow: (p.slow || p.SafeGasPrice || p.low || 0) as number,
            standard: (p.standard || p.ProposeGasPrice || p.medium || p.average || 0) as number,
            fast: (p.fast || p.FastGasPrice || p.high || 0) as number,
            rapid: (p.rapid || p.RapidGasPrice || p.instant) as number | undefined,
            baseFee: p.baseFee as number | undefined,
            priorityFee: p.priorityFee as number | undefined,
            timestamp: Date.now(),
          });
        }
      }

      if (parsed.length === 0) {
        parsed.push({
          chain: 'ethereum',
          slow: (allPrices?.slow || allPrices?.SafeGasPrice || 0) as number,
          standard: (allPrices?.standard || allPrices?.ProposeGasPrice || 0) as number,
          fast: (allPrices?.fast || allPrices?.FastGasPrice || 0) as number,
          timestamp: Date.now(),
        });
      }

      setPrices(parsed);
      setLoading(false);
    } catch (err) {
      setError('Failed to load gas prices');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: 20, height: 20, border: '2px solid var(--hairline)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (error) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--destructive)', fontSize: 13 }}>{error}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Fuel size={16} style={{ color: 'var(--accent)' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>Gas Prices</span>
        <span style={{ fontSize: 11, color: 'var(--fg-tertiary)', display: 'flex', alignItems: 'center', gap: 3 }}>
          <Clock size={10} /> Auto-refreshes every 30s
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {prices.map(p => (
          <div key={p.chain} style={{
            padding: 14, borderRadius: 'var(--radius-lg)', background: 'var(--card)',
            border: '1px solid var(--hairline)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 10, textTransform: 'capitalize' }}>
              {p.chain}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <GasBadge label="Slow" value={p.slow} color="var(--accent)" />
              <GasBadge label="Standard" value={p.standard} color="var(--warning)" />
              <GasBadge label="Fast" value={p.fast} color="var(--destructive)" />
            </div>
            {p.baseFee !== undefined && (
              <div style={{ marginTop: 10, fontSize: 10, color: 'var(--fg-tertiary)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Base: {p.baseFee} gwei</span>
                {p.priorityFee !== undefined && <span>Priority: {p.priorityFee} gwei</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GasBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 'var(--radius-md)', background: 'var(--hover-overlay)' }}>
      <div style={{ fontSize: 10, color: 'var(--fg-tertiary)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--fg-tertiary)' }}>gwei</div>
    </div>
  );
}
