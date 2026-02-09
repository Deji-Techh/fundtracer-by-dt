import React, { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Home01Icon, 
  Briefcase01Icon, 
  Clock01Icon, 
  Search01Icon, 
  ChartLineData01Icon,
  Shield01Icon,
  Wallet01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  Sun02Icon,
  Moon02Icon,
  Settings01Icon
} from '@hugeicons/core-free-icons';
import { searchDEXScreenerPairs } from '../../api';
import { MobileFooter } from '../common/MobileFooter';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WalletButton } from '../WalletButton';

interface TopNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
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
}) => {
  const isMobile = useIsMobile();
  const { theme, toggleTheme, isDark } = useTheme();
  const { profile } = useAuth();
  const tier = (profile?.tier || 'free').toUpperCase();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  const navLinks = [
    { id: 'home', label: 'Home', icon: Home01Icon },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet01Icon },
    { id: 'sybil', label: 'Sybil', icon: Shield01Icon },
    { id: 'history', label: 'History', icon: Clock01Icon },
    { id: 'settings', label: 'Settings', icon: Settings01Icon },
  ];

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
    setMobileSearchOpen(false);
    // Navigate to token detail
    onTabChange('explorer');
  };

  // Auto-focus mobile search input when overlay opens
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

  // Close mobile search on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileSearchOpen) {
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileSearchOpen]);

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
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              maxHeight: 300,
              overflowY: 'auto' as const,
              zIndex: 1001,
              boxShadow: '0 4px 12px var(--color-shadow-toast)'
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
                    borderBottom: '1px solid var(--color-border)'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
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
                    <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>{result.name}</div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{result.symbol?.toUpperCase()} • {result.chainId}</div>
                  </div>
                  {result.priceUsd && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>
                        ${parseFloat(result.priceUsd).toFixed(6)}
                      </div>
                      {result.priceChange !== undefined && (
                        <div style={{ 
                          color: result.priceChange >= 0 ? 'var(--color-positive)' : 'var(--color-negative)', 
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

        {/* Right: Wallet & Mobile Search */}
        <div className="top-nav-right">
          {/* Mobile search icon - visible only on mobile */}
          {isMobile && (
            <button
              onClick={() => setMobileSearchOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
                minHeight: 44,
                padding: 8,
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
              aria-label="Search"
            >
              <HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              minHeight: 44,
              padding: 8,
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <HugeiconsIcon icon={isDark ? Sun02Icon : Moon02Icon} size={20} strokeWidth={1.5} />
          </button>
          {/* Tier Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              lineHeight: 1,
              background: tier === 'MAX' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)'
                : tier === 'PRO' ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                : 'var(--color-bg-elevated)',
              color: tier === 'FREE' ? 'var(--color-text-muted)' : '#ffffff',
              border: tier === 'FREE' ? '1px solid var(--color-border)' : 'none',
            }}
          >
            {tier}
          </span>
          <WalletButton />
        </div>
      </nav>

      {/* Mobile Fullscreen Search Overlay */}
      {isMobile && mobileSearchOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--color-bg)',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Search header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setShowResults(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
                minHeight: 44,
                padding: 8,
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
              aria-label="Close search"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={22} strokeWidth={1.5} />
            </button>
            <div style={{ flex: 1, position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}>
                <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
              </span>
              <input
                ref={mobileSearchInputRef}
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 40px 12px 40px',
                  borderRadius: 8,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-elevated)',
                  color: 'var(--color-text-primary)',
                  fontSize: '1rem',
                  outline: 'none',
                  minHeight: 44,
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowResults(false);
                    mobileSearchInputRef.current?.focus();
                  }}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    cursor: 'pointer',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label="Clear search"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>

          {/* Search results */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}>
            {isSearching && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 32,
                color: 'var(--color-text-muted)',
                fontSize: '0.875rem',
              }}>
                <div className="loading-spinner" style={{ width: 20, height: 20, marginRight: 8 }} />
                Searching...
              </div>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery.length >= 2 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
              }}>
                <HugeiconsIcon icon={Search01Icon} size={32} strokeWidth={1.5} />
                <p style={{ marginTop: 12, fontSize: '0.875rem' }}>No results found for "{searchQuery}"</p>
              </div>
            )}

            {!isSearching && searchQuery.length < 2 && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 24px',
                color: 'var(--color-text-muted)',
                textAlign: 'center' as const,
              }}>
                <HugeiconsIcon icon={Search01Icon} size={32} strokeWidth={1.5} />
                <p style={{ marginTop: 12, fontSize: '0.875rem' }}>Search for tokens by name or symbol</p>
              </div>
            )}

            {searchResults.map((result) => (
              <div
                key={result.id}
                onClick={() => handleResultClick(result)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--color-bg-elevated)',
                  minHeight: 56,
                }}
              >
                <img
                  src={result.thumb}
                  alt={result.name}
                  style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {result.name}
                  </div>
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>
                    {result.symbol?.toUpperCase()} • {result.chainId}
                  </div>
                </div>
                {result.priceUsd && (
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>
                      ${parseFloat(result.priceUsd).toFixed(6)}
                    </div>
                    {result.priceChange !== undefined && (
                      <div style={{
                        color: result.priceChange >= 0 ? 'var(--color-positive)' : 'var(--color-negative)',
                        fontSize: '0.8125rem',
                        marginTop: 2,
                      }}>
                        {result.priceChange >= 0 ? '+' : ''}{result.priceChange.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Footer - Only on mobile screens */}
      <MobileFooter activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );
}

export default TopNav;
