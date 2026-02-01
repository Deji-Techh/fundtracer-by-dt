import React, { useState } from 'react';
import HeroSection from './HeroSection';
import ChainFilter from './ChainFilter';
import TokenTable from './TokenTable';
import TokenDetailModal from './TokenDetailModal';

interface HomePageProps {
  walletAddress?: string;
  onWalletClick: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ walletAddress, onWalletClick }) => {
  const [selectedChain, setSelectedChain] = useState('all');
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTokenClick = (token: any) => {
    setSelectedToken(token);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedToken(null);
  };

  return (
    <div className="main-content">
      <HeroSection 
        chain={selectedChain}
        onTokenClick={handleTokenClick}
      />
      
      <ChainFilter
        selectedChain={selectedChain}
        onChainSelect={setSelectedChain}
      />

      <div style={{ padding: '24px' }}>
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: 700, 
              color: '#fff',
              margin: 0
            }}>
              Market Overview
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Showing top 100 tokens
              </span>
            </div>
          </div>
          
          <TokenTable 
            chain={selectedChain}
            onTokenClick={handleTokenClick} 
          />
        </div>

        {!walletAddress && (
          <div 
            className="card" 
            style={{ 
              textAlign: 'center', 
              padding: '48px 24px',
              cursor: 'pointer'
            }}
            onClick={onWalletClick}
          >
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>👛</div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#fff', marginBottom: 8 }}>
              Connect Your Wallet
            </h3>
            <p style={{ color: '#9ca3af', marginBottom: 16 }}>
              Track your portfolio, view transaction history, and more
            </p>
            <button className="btn btn-primary">
              Connect Wallet
            </button>
          </div>
        )}
      </div>

      <TokenDetailModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        token={selectedToken} 
      />
    </div>
  );
};

export default HomePage;
