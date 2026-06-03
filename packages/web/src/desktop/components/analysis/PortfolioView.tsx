import { useState, useEffect } from 'react';
import { getPortfolio } from '../../api/analyze';
import { useNotify } from '../../contexts/ToastContext';
import { Loader } from '../common/Loader';
import { ChainSelector } from '../common/ChainSelector';
import { Wallet, Coins, TrendingUp, DollarSign, ExternalLink } from 'lucide-react';
import type { ChainId } from '../../types';
import { CompactSearchForm } from './CompactSearchForm';

interface PortfolioViewProps {
  address?: string;
  chain?: ChainId;
}

export function PortfolioView({ address: initialAddress, chain: initialChain }: PortfolioViewProps) {
  const notify = useNotify();
  const [address, setAddress] = useState(initialAddress || '');
  const [chain, setChain] = useState<ChainId>(initialChain || 'ethereum');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [excludeSpam, setExcludeSpam] = useState(true);

  // Auto-fetch when address/chain provided from parent (wallet analysis context)
  useEffect(() => {
    if (initialAddress?.trim()) {
      setAddress(initialAddress);
      if (initialChain) setChain(initialChain);
      fetchPortfolio(initialAddress, initialChain || 'ethereum');
    }
  }, [initialAddress, initialChain]);

  const fetchPortfolio = async (addr: string, ch: ChainId, spam?: boolean) => {
    setLoading(true); setError(null); setResult(null);
    const hideSpam = spam ?? excludeSpam;
    try {
      const res = await getPortfolio(addr.trim(), ch, { excludeSpam: hideSpam, excludeUnpriced: hideSpam });
      setResult(res as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch portfolio');
    } finally { setLoading(false); }
  };

  const handleFetch = () => {
    if (!address.trim()) { notify.error('Please enter a wallet address'); return; }
    fetchPortfolio(address, chain);
  };

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Wallet size={20} style={{ color: 'var(--accent)' }} /> Token Portfolio
      </h2>
      <p style={{ fontSize: 12, color: 'var(--fg-tertiary)', marginBottom: 16 }}>
        View token holdings, DeFi positions, and NFT assets for any wallet address.
      </p>

      <div style={{ marginBottom: 20 }}>
        <CompactSearchForm
          value={address}
          onChange={setAddress}
          onSubmit={handleFetch}
          placeholder="0x... or ENS name"
          ariaLabel="Wallet address"
          loading={loading}
          disabled={loading}
          submitLabel="View"
          loadingLabel="Loading"
          hideSubmitOnMobile
          hideInputIcon
          leftSlot={<ChainSelector value={chain} onChange={setChain} compact />}
        />
      </div>

      {result && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, color: 'var(--fg-tertiary)' }}>
            <input
              type="checkbox"
              checked={excludeSpam}
              onChange={(e) => {
                setExcludeSpam(e.target.checked);
                if (address.trim()) fetchPortfolio(address, chain, e.target.checked);
              }}
              style={{ accentColor: 'var(--accent)' }}
            />
            Hide spam tokens
          </label>
        </div>
      )}

      {loading && <Loader />}
      {error && <div style={{ padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--card)', border: '1px solid var(--destructive)', color: 'var(--destructive)', fontSize: 13 }}>{error}</div>}

      {result && <PortfolioDisplay data={result} />}
    </div>
  );
}

function parseTokenBalance(rawBalance: string | number, decimals: number | undefined): number {
  const b = Number(rawBalance);
  const dec = Number(decimals || 0);
  if (!isFinite(b)) return 0;
  // Detect raw (wei-style) balances: if the balance exceeds a threshold that's
  // unreasonably large for a human-readable token amount, divide by decimals.
  // Cap the threshold at 10^13 so high-decimal tokens (18 dec) still get caught
  // even when the raw balance is below 10^dec (e.g. 0.27 tokens = 2.7e17 raw).
  const threshold = Math.pow(10, Math.min(dec, 13));
  if (dec > 0 && b >= threshold) return b / Math.pow(10, dec);
  return b;
}

function PortfolioDisplay({ data }: { data: Record<string, unknown> }) {
  const res = (data.result || data) as Record<string, unknown>;
  const totalValue = res.totalValue as number | undefined;
  const tokens = (res.tokens || res.holdings || res.assets || []) as Array<Record<string, unknown>>;
  const defiPositions = res.defiPositions || res.positions || [];
  const nfts = res.nfts || res.nftHoldings || [];

  // Recalculate total from individual tokens if server total looks wrong
  let calculatedTotal = 0;
  const enrichedTokens = Array.isArray(tokens) ? tokens.map(t => {
    const rawBalance = t.balance as string | number || '0';
    const decimals = t.decimals as number | undefined;
    const fb = parseTokenBalance(rawBalance, decimals);
    const pr = Number(t.price || t.priceUsd || 0);
    const sv = Number(t.value || t.valueUsd || 0);
    const dv = pr > 0 ? fb * pr : sv;
    calculatedTotal += dv;
    return { ...t, _balance: fb, _value: dv, _price: pr } as Record<string, unknown> & { _balance: number; _value: number; _price: number };
  }) : [];

  const displayTotal = totalValue && totalValue > 0.01 ? totalValue : calculatedTotal;

  return (
    <div>
      {/* Total */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--fg-tertiary)', marginBottom: 4, fontWeight: 600 }}>
          Total Portfolio Value
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
          {`$${Math.max(displayTotal, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </div>
      </div>

      {/* Token holdings */}
      {enrichedTokens.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Coins size={14} style={{ color: 'var(--accent)' }} /> Token Holdings ({tokens.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {enrichedTokens.slice(0, 30).map((token, i) => {
              const symbol = (token.symbol as string) || '???';
              const name = (token.name as string) || '';
              const balance = token._balance;
              const displayValue = token._value;
              const price = token._price;

              return (
                <div key={i} style={{
                  padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--card)',
                  border: '1px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>{symbol}</div>
                    {name && <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>{name}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                      {balance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                    </div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                      {displayValue >= 0.005
                        ? `$${displayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : price > 0 && balance * price >= 0.005
                          ? `$${(balance * price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : price > 0
                            ? '< $0.01'
                            : '—'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DeFi positions */}
      {Array.isArray(defiPositions) && defiPositions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} /> DeFi Positions
          </h4>
          {defiPositions.map((pos: unknown, i: number) => {
            const p = pos as Record<string, unknown>;
            return (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--card)',
                border: '1px solid var(--hairline)', marginBottom: 4,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>
                    {String(p.protocol || p.name || 'DeFi Position')}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--fg-tertiary)' }}>
                    {String(p.type || p.kind || '')}
                  </div>
                </div>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                  ${Number(p.value || p.usdValue || 0).toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
