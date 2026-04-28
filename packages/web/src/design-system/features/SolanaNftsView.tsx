import React, { useState, useEffect } from 'react';
import { Image, Loader2 } from 'lucide-react';

interface SolanaNFT {
  id: string;
  mint: string;
  name: string;
  imageUrl?: string;
  collection?: string;
  collectionImage?: string;
  attributes?: Record<string, string>;
  rarity?: string;
  floorPrice?: number;
}

interface SolanaNftsViewProps {
  address: string;
}

function formatAddress(addr: string): string {
  if (!addr) return '';
  return addr.slice(0, 4) + '..' + addr.slice(-4);
}

function formatUsd(value: number): string {
  return '$' + value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const API_BASE = import.meta.env.VITE_API_URL || 'https://fundtracer-by-dt-production.up.railway.app';

export function SolanaNftsView({ address }: SolanaNftsViewProps) {
  const [nfts, setNfts] = useState<SolanaNFT[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!address) return;
    fetchNfts();
  }, [address]);

  const fetchNfts = async () => {
    setLoading(true);
    setError('');
    
    const token = localStorage.getItem('fundtracer_token');
    
    try {
      const res = await fetch(`${API_BASE}/api/solana/nfts/${address}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch NFTs');
      }
      
      const data = await res.json();
      setNfts(data.nfts || []);
    } catch (err: any) {
      console.error('NFTs fetch error:', err);
      setError(err.message || 'Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return (
      <div className="solana-view-empty">
        <Image size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="solana-view-loading">
        <Loader2 size={32} className="spin" />
        <p>Loading NFTs...</p>
      </div>
    );
  }

  if (error || nfts.length === 0) {
    return (
      <div className="solana-view-empty">
        <Image size={48} />
        <h3>No NFTs</h3>
        <p>{error || 'This wallet has no NFTs'}</p>
      </div>
    );
  }

  return (
    <div className="solana-nfts-view">
      <div className="nft-stats">
        <div className="nft-stat">
          <span className="nft-stat-label">Total NFTs</span>
          <span className="nft-stat-value">{nfts.length}</span>
        </div>
        <div className="nft-stat">
          <span className="nft-stat-label">Collections</span>
          <span className="nft-stat-value">{new Set(nfts.map(n => n.collection)).size}</span>
        </div>
      </div>

      <div className="nfts-gallery">
        {nfts.map((nft, idx) => (
          <div key={idx} className="nft-card">
            <div className="nft-image-wrap">
              {nft.imageUrl ? (
                <img src={nft.imageUrl} alt={nft.name} />
              ) : (
                <div className="nft-placeholder"><Image size={24} /></div>
              )}
              {nft.rarity && <span className="nft-rarity-badge">{nft.rarity}</span>}
            </div>
            <div className="nft-card-info">
              <span className="nft-name">{nft.name}</span>
              {nft.collection && <span className="nft-collection">{nft.collection}</span>}
              {nft.floorPrice && <span className="nft-floor">Floor: {formatUsd(nft.floorPrice)}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SolanaNftsView;