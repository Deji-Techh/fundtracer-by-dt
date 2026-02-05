import React, { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Home01Icon, 
  Briefcase01Icon, 
  Clock01Icon, 
  Search01Icon, 
  ChartLineData01Icon,
  Shield01Icon,
  Wallet01Icon
} from '@hugeicons/core-free-icons';
import { searchDEXScreenerPairs } from '../../api';
import { MobileFooter } from '../common/MobileFooter';

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onConnectWallet: () => void;
  isWalletConnected: boolean;
  walletAddress?: string;
}

interface SearchResult {
  id: string;
  name: string;
  symbol: string;
  thumb?: string;
  chainId: string;
  tokenAddress: string;
  priceUsd?: string;
  priceChange?: number;
}

const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onTabChange,
  onConnectWallet,
  isWalletConnected,
  walletAddress
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { id: 'home', label: 'Home', icon: Home01Icon },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet01Icon },
    { id: 'history', label: 'History', icon: Clock01Icon },
    { id: 'explorer', label: 'Explorer', icon: Search01Icon },
    { id: 'market', label: 'Market', icon: ChartLineData01Icon },
    { id: 'sybil', label: 'Sybil', icon: Shield01Icon },
  ];

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const response = await searchDEXScreenerPairs(searchQuery);
          const pairs = response.pairs || [];
          const mappedResults: SearchResult[] = pairs.map((pair: any) => ({
            id: `${pair.chainId}-${pair.pairAddress}`,
            name: pair.baseToken?.name || pair.baseToken?.symbol || 'Unknown',
            symbol: pair.baseToken?.symbol || '',
            thumb: pair.info?.imageUrl || pair.baseToken?.icon || '',
            chainId: pair.chainId || '',
            tokenAddress: pair.baseToken?.address || '',
            priceUsd: pair.priceUsd,
            priceChange: pair.priceChange?.h24
          }));
          setSearchResults(mappedResults);
          setShowResults(true);
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery(result.name);
    setShowResults(false);
    // Navigate to token detail
    onTabChange('explorer');
  };

  return (
    <>
      <nav className="top-nav">
        {/* Left: Logo & Desktop Nav */}
        <div className="top-nav-left">
          <a href="/" className="top-nav-logo">
            <img 
              src="/logo.png" 
              alt="FundTracer" 
              style={{ width: 32, height: 32, borderRadius: 8 }}
              onError={(e) => {
                // Fallback if logo fails to load
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span>FundTracer</span>
          </a>

          <div className="top-nav-links">
            {navLinks.map((link) => (
              <button
                key={link.id}
                className={`top-nav-link ${activeTab === link.id ? 'active' : ''}`}
                onClick={() => onTabChange(link.id)}
              >
                <HugeiconsIcon icon={link.icon} size={18} strokeWidth={1.5} />
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Search */}
        <div className="top-nav-center" ref={searchRef}>
          <div className="search-container" style={{ position: 'relative' }}>
            <span className="search-icon">
              <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
            </span>
            <input
              type="text"
              className="search-input"
              placeholder="Search tokens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
            />
            {isSearching && (
              <div className="loading-spinner" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16 }} />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 8,
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 8,
              maxHeight: 300,
              overflowY: 'auto',
              zIndex: 1001,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
              {searchResults.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    borderBottom: '1px solid #2a2a2a'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#2a2a2a')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <img 
                    src={result.thumb} 
                    alt={result.name}
                    style={{ width: 24, height: 24, borderRadius: '50%' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>{result.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{result.symbol?.toUpperCase()} • {result.chainId}</div>
                  </div>
                  {result.priceUsd && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.875rem' }}>
                        ${parseFloat(result.priceUsd).toFixed(6)}
                      </div>
                      {result.priceChange !== undefined && (
                        <div style={{ 
                          color: result.priceChange >= 0 ? '#10b981' : '#ef4444', 
                          fontSize: '0.75rem' 
                        }}>
                          {result.priceChange >= 0 ? '+' : ''}{result.priceChange.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Wallet & Mobile Menu */}
        <div className="top-nav-right">
          <button
            className={`connect-btn ${isWalletConnected ? 'connected' : ''}`}
            onClick={onConnectWallet}
          >
            <HugeiconsIcon icon={Wallet01Icon} size={18} strokeWidth={1.5} />
            <span>
              {isWalletConnected && walletAddress
                ? formatWalletAddress(walletAddress)
                : 'Connect Wallet'}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Footer - Only on mobile screens */}
      <MobileFooter activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );
}

export default TopNav;
