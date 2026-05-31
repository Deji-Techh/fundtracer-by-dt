// @ts-nocheck — WebkitAppRegion is a Tauri-specific CSS property for drag regions
import { useState, useEffect, useCallback } from 'react';
import { getGasPrices } from '../../api/analyze';
import { Fuel, TrendingUp, TrendingDown, Activity, X } from 'lucide-react';

export function WidgetView() {
  const [gas, setGas] = useState<Record<string, { fast: number; standard: number }>>({});
  const [collapsed, setCollapsed] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await getGasPrices() as Record<string, unknown>;
      const prices = (data.result || data.prices || data) as Record<string, unknown>;
      if (prices && typeof prices === 'object') {
        const parsed: Record<string, { fast: number; standard: number }> = {};
        for (const [chain, info] of Object.entries(prices)) {
          const p = info as Record<string, unknown>;
          parsed[chain] = {
            standard: (p.standard || p.ProposeGasPrice || p.average || 0) as number,
            fast: (p.fast || p.FastGasPrice || p.high || 0) as number,
          };
        }
        setGas(parsed);
      }
    } catch { /* background — silent fail */ }
  }, []);

  useEffect(() => {
    fetchData();
    const i = setInterval(fetchData, 15000);
    return () => clearInterval(i);
  }, [fetchData]);

  return (
    <div style={{
      width: '100%', height: '100vh', background: 'var(--bg-deep)',
      color: 'var(--fg)', fontFamily: 'var(--font-sans)',
      display: 'flex', flexDirection: 'column', userSelect: 'none',
      WebkitAppRegion: 'drag',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--hairline)', WebkitAppRegion: 'drag',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Activity size={14} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>FundTracer</span>
        </div>
        <button onClick={() => setCollapsed(!collapsed)}
          style={{ ...btnStyle, WebkitAppRegion: 'no-drag' }}>
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflow: 'auto', padding: '10px 14px' }}>
          {/* Gas tracker */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 8, fontWeight: 600 }}>
              <Fuel size={10} style={{ display: 'inline', marginRight: 4 }} /> Gas Prices
            </div>
            {Object.keys(gas).length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--fg-tertiary)' }}>Loading...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {Object.entries(gas).slice(0, 6).map(([chain, p]) => (
                  <div key={chain} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 8px', borderRadius: 'var(--radius-md)', background: 'var(--card)',
                  }}>
                    <span style={{ fontSize: 11, textTransform: 'capitalize' }}>{chain}</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--fg-tertiary)' }}>
                        {p.standard}g
                      </span>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--destructive)' }}>
                        {p.fast}g
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick tip */}
          <div style={{
            fontSize: 10, color: 'var(--fg-tertiary)', padding: '8px', borderRadius: 'var(--radius-md)',
            background: 'var(--card)', lineHeight: 1.5,
          }}>
            <strong>Ctrl+Shift+Space</strong> — Analyze any highlighted address
          </div>
        </div>
      )}
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--fg-tertiary)', cursor: 'pointer',
  fontSize: 12, padding: '2px 6px', borderRadius: 'var(--radius-md)',
};
