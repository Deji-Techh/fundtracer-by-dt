import React from 'react';

interface Chain {
  id: string;
  name: string;
  icon?: string;
}

interface ChainFilterProps {
  chains?: Chain[];
  selectedChain: string;
  onChainSelect: (chainId: string) => void;
}

const defaultChains: Chain[] = [
  { id: 'all', name: 'All Chains' },
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'linea', name: 'Linea' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'base', name: 'Base' },
  { id: 'bsc', name: 'BSC' },
];

const ChainFilter: React.FC<ChainFilterProps> = ({
  chains = defaultChains,
  selectedChain,
  onChainSelect
}) => {
  return (
    <div className="chain-filter">
      <span className="chain-filter-label">Chains</span>
      {chains.map((chain) => (
        <button
          key={chain.id}
          className={`chain-pill ${selectedChain === chain.id ? 'active' : ''}`}
          onClick={() => onChainSelect(chain.id)}
        >
          {chain.icon && (
            <img 
              src={chain.icon} 
              alt={chain.name}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
          <span>{chain.name}</span>
        </button>
      ))}
    </div>
  );
};

export default ChainFilter;
