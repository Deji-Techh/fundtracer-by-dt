import React, { useState, useEffect } from 'react';
import { Activity, Users, TrendingUp, DollarSign, PieChart, ArrowUpRight } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

interface WalletAnalytics {
  address: string;
  persona: 'whale' | 'trader' | 'defi' | 'hodler' | 'newbie';
  totalTransactions: number;
  uniqueContracts: number;
  avgTransactionValue: number;
  mostUsedProtocol: string;
  firstTransactionDate: string;
  activityScore: number; // 0-100
}

interface SimilarWallet {
  address: string;
  similarity: number;
  persona: string;
}

export const WalletAnalytics = React.memo(function WalletAnalytics({ walletAddress }: { walletAddress: string }) {
  const [analytics, setAnalytics] = useState<WalletAnalytics | null>(null);
  const [similarWallets, setSimilarWallets] = useState<SimilarWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (walletAddress) {
      fetchAnalytics();
    }
  }, [walletAddress]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // This would typically call your backend which queries Dune
      // For now, we'll create mock data based on the wallet
      const mockAnalytics: WalletAnalytics = generateMockAnalytics(walletAddress);
      const mockSimilar = generateMockSimilarWallets(walletAddress);

      setAnalytics(mockAnalytics);
      setSimilarWallets(mockSimilar);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load wallet analytics');
      setLoading(false);
    }
  };

  const generateMockAnalytics = (address: string): WalletAnalytics => {
    // Generate deterministic "random" data based on address
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const personas: WalletAnalytics['persona'][] = ['whale', 'trader', 'defi', 'hodler', 'newbie'];
    const protocols = ['Uniswap', 'Aave', 'Compound', 'Curve', '1inch', 'OpenSea'];
    
    return {
      address,
      persona: personas[hash % personas.length],
      totalTransactions: 50 + (hash % 950),
      uniqueContracts: 5 + (hash % 45),
      avgTransactionValue: 0.1 + (hash % 100) / 10,
      mostUsedProtocol: protocols[hash % protocols.length],
      firstTransactionDate: new Date(Date.now() - (hash % 365) * 24 * 60 * 60 * 1000).toISOString(),
      activityScore: 20 + (hash % 80)
    };
  };

  const generateMockSimilarWallets = (address: string): SimilarWallet[] => {
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const personas = ['whale', 'trader', 'defi', 'hodler'];
    
    return [
      {
        address: `0x${(hash * 1).toString(16).padStart(40, '0').slice(0, 40)}`,
        similarity: 85 + (hash % 10),
        persona: personas[hash % personas.length]
      },
      {
        address: `0x${(hash * 2).toString(16).padStart(40, '0').slice(0, 40)}`,
        similarity: 70 + (hash % 15),
        persona: personas[(hash + 1) % personas.length]
      },
      {
        address: `0x${(hash * 3).toString(16).padStart(40, '0').slice(0, 40)}`,
        similarity: 60 + (hash % 20),
        persona: personas[(hash + 2) % personas.length]
      }
    ];
  };

  const getPersonaLabel = (persona: string) => {
    const labels: Record<string, { label: string; color: string; icon: string }> = {
      whale: { label: 'Whale', color: '#FFD700', icon: '🐋' },
      trader: { label: 'Active Trader', color: '#3B82F6', icon: '📊' },
      defi: { label: 'DeFi Power User', color: '#8B5CF6', icon: '🚀' },
      hodler: { label: 'Hodler', color: '#10B981', icon: '💎' },
      newbie: { label: 'Newcomer', color: '#6B7280', icon: '🌱' }
    };
    return labels[persona] || labels.newbie;
  };

  const getPersonaDescription = (persona: string) => {
    const descriptions: Record<string, string> = {
      whale: 'High-value transactions, significant portfolio, market mover',
      trader: 'Frequent transactions, diverse protocols, active trading',
      defi: 'Heavy DeFi usage, yield farming, liquidity providing',
      hodler: 'Long-term holding, minimal transactions, strategic moves',
      newbie: 'Recent entry, learning, exploring the ecosystem'
    };
    return descriptions[persona] || 'Exploring the Linea ecosystem';
  };

  if (loading) {
    return (
      <div className="analytics-card" style={{ padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: '12px' }}>
        <div className="loading-spinner" style={{ width: '24px', height: '24px' }}></div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="analytics-card" style={{ padding: '20px', background: 'var(--color-bg-secondary)', borderRadius: '12px' }}>
        <div style={{ color: 'var(--color-danger)' }}>{error || 'No analytics data'}</div>
      </div>
    );
  }

  const persona = getPersonaLabel(analytics.persona);

  return (
    <div className="analytics-card" style={{ 
      background: 'var(--color-bg-secondary)', 
      borderRadius: '12px',
      border: '1px solid var(--color-border)',
      overflow: 'hidden'
    }}>
      {/* Persona Header */}
      <div style={{ 
        padding: isMobile ? '16px' : '24px', 
        background: `linear-gradient(135deg, ${persona.color}20 0%, ${persona.color}05 100%)`,
        borderBottom: `2px solid ${persona.color}`,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: isMobile ? '36px' : '48px', marginBottom: '8px' }}>{persona.icon}</div>
        <h2 style={{ 
          fontSize: isMobile ? '18px' : '24px', 
          fontWeight: 700, 
          color: persona.color,
          marginBottom: '8px'
        }}>
          {persona.label}
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: isMobile ? '13px' : '14px' }}>
          {getPersonaDescription(analytics.persona)}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ padding: isMobile ? '16px' : '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: isMobile ? '12px' : '16px', marginBottom: '24px' }}>
          <div style={{ 
            padding: isMobile ? '12px' : '16px', 
            background: 'var(--color-bg-tertiary)', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <Activity size={20} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
            <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 700 }}>{analytics.totalTransactions}</div>
            <div style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--color-text-muted)' }}>Total Transactions</div>
          </div>

          <div style={{ 
            padding: isMobile ? '12px' : '16px', 
            background: 'var(--color-bg-tertiary)', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <Users size={20} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
            <div style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 700 }}>{analytics.uniqueContracts}</div>
            <div style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--color-text-muted)' }}>Unique Contracts</div>
          </div>

          <div style={{ 
            padding: isMobile ? '12px' : '16px', 
            background: 'var(--color-bg-tertiary)', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <DollarSign size={20} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
            <div style={{ fontSize: isMobile ? '16px' : '24px', fontWeight: 700 }}>{analytics.avgTransactionValue.toFixed(2)} ETH</div>
            <div style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--color-text-muted)' }}>Avg Transaction</div>
          </div>

          <div style={{ 
            padding: isMobile ? '12px' : '16px', 
            background: 'var(--color-bg-tertiary)', 
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <PieChart size={20} style={{ color: 'var(--color-primary)', marginBottom: '8px' }} />
            <div style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 700 }}>{analytics.mostUsedProtocol}</div>
            <div style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--color-text-muted)' }}>Most Used</div>
          </div>
        </div>

        {/* Activity Score */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>Activity Score</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>
              {analytics.activityScore}/100
            </span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: 'var(--color-bg-tertiary)', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${analytics.activityScore}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${persona.color} 0%, var(--color-primary) 100%)`,
              borderRadius: '4px',
              transition: 'width 1s ease'
            }}></div>
          </div>
        </div>

        {/* Similar Wallets */}
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} />
            Similar Wallets
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {similarWallets.map((wallet, index) => (
                <div
                key={wallet.address}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: isMobile ? '10px 12px' : '12px',
                  minHeight: '44px',
                  background: 'var(--color-bg-tertiary)',
                  borderRadius: '8px',
                  animation: `fadeIn 0.3s ease ${index * 0.1}s both`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>{getPersonaLabel(wallet.persona).icon}</span>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      {getPersonaLabel(wallet.persona).label}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-success)' }}>
                  <span style={{ fontWeight: 600 }}>{wallet.similarity}%</span>
                  <ArrowUpRight size={14} />
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px', textAlign: 'center' }}>
            These wallets have similar behavior patterns to yours
          </p>
        </div>
      </div>
    </div>
  );
}
);
