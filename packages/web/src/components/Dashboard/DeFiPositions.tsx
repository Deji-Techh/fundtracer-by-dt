import React from 'react';

interface DeFiPositionsProps {
  walletAddress?: string;
}

export const DeFiPositions: React.FC<DeFiPositionsProps> = ({ walletAddress }) => {
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">DeFi Positions</h2>
      </div>
      <p style={{ color: '#666' }}>
        DeFi positions will appear here. Wallet: {walletAddress || 'Not connected'}
      </p>
      <p style={{ color: '#666', marginTop: '16px' }}>
        Coming soon: DeBank integration
      </p>
    </div>
  );
};

export default DeFiPositions;
