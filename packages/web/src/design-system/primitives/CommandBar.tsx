/**
 * CommandBar - Global search with keyboard shortcuts
 * Ctrl+K style search for wallets, transactions, tokens
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import './CommandBar.css';

const WalletIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
  </svg>
);

const TxIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const TokenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v12M8 10h8M8 14h8"/>
  </svg>
);

const ContractIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const LabelIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="M21 21l-4.35-4.35"/>
  </svg>
);

export interface SearchResult {
  id: string;
  type: 'wallet' | 'transaction' | 'token' | 'contract' | 'label';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  meta?: string;
}

interface CommandBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onSelect?: (result: SearchResult) => void;
  results?: SearchResult[];
  loading?: boolean;
  recentSearches?: SearchResult[];
  hotkey?: string;
  className?: string;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export function CommandBar({
  placeholder = 'Search wallets, transactions, tokens...',
  onSearch,
  onSelect,
  results = [],
  loading = false,
  recentSearches = [],
  hotkey = 'Ctrl+K',
  className = '',
  expanded: controlledExpanded,
  onExpandChange
}: CommandBarProps) {
  const [query, setQuery] = useState('');
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const expanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const setExpanded = (value: boolean) => {
    if (onExpandChange) {
      onExpandChange(value);
    } else {
      setInternalExpanded(value);
    }
  };

  const displayResults = query ? results : recentSearches;

  // Keyboard shortcut to open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modKey && e.key === 'k') {
        e.preventDefault();
        setExpanded(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      
      if (e.key === 'Escape' && expanded) {
        setExpanded(false);
        setQuery('');
        setSelectedIndex(-1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expanded]);

  // Click outside to close (supports both mouse and touch events)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setExpanded(false);
        setQuery('');
        setSelectedIndex(-1);
      }
    };

    if (expanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [expanded]);

  // Navigation within results
  const handleKeyNavigation = useCallback((e: React.KeyboardEvent) => {
    if (!displayResults.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % displayResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + displayResults.length) % displayResults.length);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      onSelect?.(displayResults[selectedIndex]);
      setExpanded(false);
      setQuery('');
    }
  }, [displayResults, selectedIndex, onSelect]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);
    onSearch?.(value);
  };

  const handleResultClick = (result: SearchResult) => {
    onSelect?.(result);
    setExpanded(false);
    setQuery('');
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'wallet': return <WalletIcon />;
      case 'transaction': return <TxIcon />;
      case 'token': return <TokenIcon />;
      case 'contract': return <ContractIcon />;
      case 'label': return <LabelIcon />;
      default: return <SearchIcon />;
    }
  };

  return (
    <div className={`command-bar ${expanded ? 'command-bar--expanded' : ''} ${className}`} ref={containerRef}>
      {/* Search trigger (collapsed state) */}
      <button 
        className="command-bar__trigger"
        onClick={() => {
          setExpanded(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        <span className="command-bar__trigger-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <span className="command-bar__trigger-text">{placeholder}</span>
        <span className="command-bar__trigger-hotkey">{hotkey}</span>
      </button>

      {/* Expanded search modal */}
      {expanded && (
        <div className="command-bar__modal">
          <div className="command-bar__input-wrapper">
            <span className="command-bar__search-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              className="command-bar__input"
              placeholder={placeholder}
              value={query}
              onChange={handleInputChange}
              onKeyDown={handleKeyNavigation}
              autoFocus
            />
            {loading && (
              <span className="command-bar__loading">
                <span className="command-bar__spinner" />
              </span>
            )}
            <span className="command-bar__esc">ESC</span>
          </div>

          {/* Results */}
          {displayResults.length > 0 && (
            <div className="command-bar__results">
              {!query && recentSearches.length > 0 && (
                <div className="command-bar__results-label">Recent Searches</div>
              )}
              {displayResults.map((result, index) => (
                <div
                  key={result.id}
                  className={`command-bar__result ${selectedIndex === index ? 'command-bar__result--selected' : ''}`}
                  onClick={() => handleResultClick(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span className="command-bar__result-icon">
                    {result.icon || getTypeIcon(result.type)}
                  </span>
                  <div className="command-bar__result-content">
                    <span className="command-bar__result-title">{result.title}</span>
                    {result.subtitle && (
                      <span className="command-bar__result-subtitle">{result.subtitle}</span>
                    )}
                  </div>
                  {result.meta && (
                    <span className="command-bar__result-meta">{result.meta}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {query && !loading && displayResults.length === 0 && (
            <div className="command-bar__empty">
              No results found for "{query}"
            </div>
          )}

          {/* Footer */}
          <div className="command-bar__footer">
            <span className="command-bar__footer-hint">
              <kbd>↑</kbd><kbd>↓</kbd> Navigate
            </span>
            <span className="command-bar__footer-hint">
              <kbd>Enter</kbd> Select
            </span>
            <span className="command-bar__footer-hint">
              <kbd>ESC</kbd> Close
            </span>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {expanded && <div className="command-bar__backdrop" onClick={() => setExpanded(false)} />}
    </div>
  );
}

export default CommandBar;
