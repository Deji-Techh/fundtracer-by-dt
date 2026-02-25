import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Search01Icon,
  ArrowLeft01Icon,
  Cancel01Icon,
  Sun02Icon,
  Moon02Icon,
} from '@hugeicons/core-free-icons';
import { searchDEXScreenerPairs } from '../../api';
import { MobileFooter } from '../common/MobileFooter';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { WalletButton } from '../WalletButton';
import { TokenDetailModal } from '../TokenDetailModal';

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
  const [selectedToken, setSelectedToken] = useState<SearchResult | null>(null);
  const lastSearchRef = useRef<string>('');

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    
    if (trimmedQuery.length < 2 || trimmedQuery === lastSearchRef.current) {
      return;
    }
    
    lastSearchRef.current = trimmedQuery;
    
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await searchDEXScreenerPairs(trimmedQuery);
        const pairs = response.pairs || [];
        const mappedResults: SearchResult[] = pairs.slice(0, 10).map((pair: any) => ({
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
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [searchQuery]);

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
    setSelectedToken(result);
  };

  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [mobileSearchOpen]);

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
      <motion.nav 
        className="top-nav"
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="top-nav-left">
          <motion.a 
            href="/" 
            className="top-nav-logo"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <img 
              src="/logo.png" 
              alt="FundTracer" 
              style={{ width: 32, height: 32, borderRadius: 8 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span>FundTracer</span>
          </motion.a>
        </div>

        {!isMobile && (
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

            {showResults && searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 8,
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  maxHeight: 320,
                  overflowY: 'auto' as const,
                  zIndex: 1001,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                }}
              >
                {searchResults.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleResultClick(result)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '14px 16px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                      borderBottom: index < searchResults.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <img 
                      src={result.thumb} 
                      alt={result.name}
                      style={{ width: 32, height: 32, borderRadius: '50%' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>{result.name}</div>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>{result.symbol?.toUpperCase()} • {result.chainId}</div>
                    </div>
                    {result.priceUsd && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>
                          ${parseFloat(result.priceUsd).toFixed(6)}
                        </div>
                        {result.priceChange !== undefined && (
                          <div style={{ 
                            color: result.priceChange >= 0 ? 'var(--color-positive)' : 'var(--color-negative)', 
                            fontSize: '0.8125rem',
                            fontWeight: 500,
                          }}>
                            {result.priceChange >= 0 ? '+' : ''}{result.priceChange.toFixed(2)}%
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        <div className="top-nav-right">
          {isMobile && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMobileSearchOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 44,
                minHeight: 44,
                padding: 8,
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
              aria-label="Search"
            >
              <HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={1.5} />
            </motion.button>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              minHeight: 44,
              padding: 8,
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <HugeiconsIcon icon={isDark ? Sun02Icon : Moon02Icon} size={20} strokeWidth={1.5} />
          </motion.button>
          
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '6px 12px',
              borderRadius: 8,
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              lineHeight: 1,
              background: tier === 'MAX' ? '#8b5cf6'
                : tier === 'PRO' ? '#3b82f6'
                : 'var(--color-bg-elevated)',
              color: tier === 'FREE' ? 'var(--color-text-muted)' : '#ffffff',
              border: tier === 'FREE' ? '1px solid var(--color-border)' : 'none',
            }}
          >
            {tier}
          </motion.span>
          
          <WalletButton />
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMobile && mobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
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
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
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
              </motion.button>
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
                    borderRadius: 10,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-elevated)',
                    color: 'var(--color-text-primary)',
                    fontSize: '1rem',
                    outline: 'none',
                    minHeight: 44,
                  }}
                />
                {searchQuery && (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
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
                    <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} />
                  </motion.button>
                )}
              </div>
            </div>

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

              {searchResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
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
                    style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }}
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
                          fontWeight: 500,
                          marginTop: 2,
                        }}>
                          {result.priceChange >= 0 ? '+' : ''}{result.priceChange.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileFooter activeTab={activeTab} onTabChange={onTabChange} />

      {selectedToken && (
        <TokenDetailModal
          token={selectedToken}
          isOpen={!!selectedToken}
          onClose={() => setSelectedToken(null)}
        />
      )}
    </>
  );
}

export default TopNav;