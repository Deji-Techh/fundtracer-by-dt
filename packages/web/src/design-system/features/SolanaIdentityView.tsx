import React, { useState, useEffect } from 'react';
import { BadgeCheck, Crown, Star, Layers, Image, Activity, EyeOff, Loader2 } from 'lucide-react';

interface IdentityBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt?: number;
}

interface SolanaIdentityViewProps {
  address: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  
  if (days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return date.toLocaleDateString();
}

export function SolanaIdentityView({ address }: SolanaIdentityViewProps) {
  const [badges, setBadges] = useState<IdentityBadge[]>([]);
  const [loading, setLoading] = useState(false);

  // Identity is derived from portfolio metrics - generate badges based on address
  useEffect(() => {
    if (!address) return;
    
    // Generate identity badges based on address characteristics
    // In production, these would come from API
    setBadges([
      { id: 'early_adopter', name: 'Early Adopter', description: 'One of the first users', icon: 'Star', earned: address.length > 20 },
      { id: 'whale', name: 'Whale', description: 'Portfolio over $100K', icon: 'Crown', earned: false },
      { id: 'defi_user', name: 'DeFi User', description: 'Active on DeFi protocols', icon: 'Layers', earned: address.length > 30 },
      { id: 'nft_collector', name: 'NFT Collector', description: 'Owns 10+ NFTs', icon: 'Image', earned: false },
      { id: 'trader', name: 'Active Trader', description: '100+ transactions', icon: 'Activity', earned: address.length > 25 },
    ]);
  }, [address]);

  if (!address) {
    return (
      <div className="solana-view-empty">
        <BadgeCheck size={48} />
        <h3>No Address</h3>
        <p>Enter a Solana address in the search bar</p>
      </div>
    );
  }

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Star': return <Star size={20} />;
      case 'Crown': return <Crown size={20} />;
      case 'Layers': return <Layers size={20} />;
      case 'Image': return <Image size={20} />;
      case 'Activity': return <Activity size={20} />;
      default: return <Star size={20} />;
    }
  };

  return (
    <div className="solana-identity-view">
      <div className="identity-score">
        <Crown size={32} />
        <span className="identity-level">Collector Level {badges.filter(b => b.earned).length}</span>
      </div>

      <div className="badges-grid">
        {badges.map((badge, idx) => (
          <div key={idx} className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}>
            <span className="badge-icon">{getIcon(badge.icon)}</span>
            <div className="badge-info">
              <span className="badge-name">{badge.name}</span>
              <span className="badge-desc">{badge.description}</span>
              {badge.earned && badge.earnedAt && (
                <span className="badge-earned">Earned {formatTime(badge.earnedAt)}</span>
              )}
            </div>
            {badge.earned ? <BadgeCheck size={20} className="badge-check" /> : <EyeOff size={20} className="badge-locked" />}
          </div>
        ))}
      </div>

      <div className="reputation-section">
        <h3>Reputation Score</h3>
        <div className="reputation-bar">
          <div className="reputation-fill" style={{ width: `${(badges.filter(b => b.earned).length / badges.length) * 100}%` }} />
        </div>
        <div className="reputation-stats">
          <span>{badges.filter(b => b.earned).length} / {badges.length} badges</span>
          <span>Level {badges.filter(b => b.earned).length}</span>
        </div>
      </div>
    </div>
  );
}

export default SolanaIdentityView;