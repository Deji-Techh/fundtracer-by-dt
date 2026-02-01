import React, { useState } from 'react';
import { usePortfolio } from '../../hooks/usePortfolio';
import { TokenList } from './TokenList';
import { NFTGallery } from './NFTGallery';
import { LoadingState } from '../common/LoadingState';

interface PortfolioDashboardProps {
  walletAddress?: string;
}

export const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({ walletAddress }) => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'nfts'>('tokens');
  const { data, loading, error } = usePortfolio(walletAddress || null, 'linea');

  if (!walletAddress) {
    return (
      <div className="card">
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9ca3af' }}>
          Please connect a wallet to view portfolio
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="card" style={{ marginBottom: '24px' }}>
          <LoadingState type="text" />
        </div>
        <LoadingState type="card" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div style={{ padding: '24px', color: '#dc2626' }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Summary Card */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h2 className="card-title">Portfolio Overview</h2>
          {data?.attribution && (
            <a 
              href={data.attribution.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '0.75rem', color: '#9ca3af' }}
            >
              {data.attribution.text}
            </a>
          )}
        </div>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '24px' 
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '4px' }}>
              Total Value
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>
              ${data?.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '4px' }}>
              Tokens
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>
              {data?.tokens.length || 0}
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '4px' }}>
              NFTs
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>
              {data?.nfts.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('tokens')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'tokens' ? '#2563eb' : '#f3f4f6',
            color: activeTab === 'tokens' ? '#ffffff' : '#6b7280',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Tokens
        </button>
        <button
          onClick={() => setActiveTab('nfts')}
          style={{
            padding: '12px 24px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'nfts' ? '#2563eb' : '#f3f4f6',
            color: activeTab === 'nfts' ? '#ffffff' : '#6b7280',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          NFTs
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tokens' ? (
        <TokenList 
          tokens={data?.tokens || []} 
          totalValue={data?.totalValue || 0}
          loading={loading}
        />
      ) : (
        <NFTGallery 
          nfts={data?.nfts || []}
          loading={loading}
        />
      )}
    </div>
  );
};

export default PortfolioDashboard;
