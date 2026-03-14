import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Wallet01Icon, Clock01Icon, Star01Icon, ArrowRight01Icon, CloseIcon } from '@hugeicons/core-free-icons';
import { getAddressBook } from '../utils/addressBook';
import { getHistory, type HistoryItem } from '../utils/history';

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string) => void;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  id: string;
  type: 'wallet' | 'history' | 'bookmark' | 'search';
  title: string;
  subtitle: string;
  address: string;
}

export function SearchAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search wallet address...',
  className = ''
}: SearchAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const getSuggestions = useCallback((query: string): Suggestion[] => {
    if (!query.trim()) return [];
    
    const results: Suggestion[] = [];
    const lowerQuery = query.toLowerCase();
    
    const addressBook = getAddressBook();
    const history = getHistory();
    
    Object.entries(addressBook).forEach(([address, label]) => {
      if (label.toLowerCase().includes(lowerQuery) || address.includes(lowerQuery)) {
        results.push({
          id: `bookmark-${address}`,
          type: 'bookmark',
          title: label,
          subtitle: `${address.slice(0, 6)}...${address.slice(-4)}`,
          address,
        });
      }
    });
    
    history.forEach((item: HistoryItem) => {
      if (results.length >= 10) return;
      const exists = results.some(r => r.address.toLowerCase() === item.address.toLowerCase());
      if (!exists && (item.address.toLowerCase().includes(lowerQuery) || item.label?.toLowerCase().includes(lowerQuery))) {
        results.push({
          id: `history-${item.address}`,
          type: 'history',
          title: item.label || `${item.address.slice(0, 6)}...${item.address.slice(-4)}`,
          subtitle: item.chain || 'Unknown chain',
          address: item.address,
        });
      }
    });
    
    if (results.length < 5 && query.startsWith('0x') && query.length >= 10) {
      results.push({
        id: `search-${query}`,
        type: 'search',
        title: `${query.slice(0, 6)}...${query.slice(-4)}`,
        subtitle: 'Search this address',
        address: query,
      });
    }
    
    return results.slice(0, 8);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (value) {
      const newSuggestions = getSuggestions(value);
      setSuggestions(newSuggestions);
      setIsOpen(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
    setSelectedIndex(-1);
  }, [value, getSuggestions]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          onSelect(suggestions[selectedIndex].address);
          setIsOpen(false);
        } else if (value.trim()) {
          onSelect(value.trim());
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const getIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'bookmark':
        return Star01Icon;
      case 'history':
        return Clock01Icon;
      case 'search':
        return Search01Icon;
      default:
        return Wallet01Icon;
    }
  };

  return (
    <div ref={containerRef} className={`search-autocomplete ${className}`} style={{ position: 'relative', width: '100%' }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}>
        <HugeiconsIcon 
          icon={Search01Icon} 
          size={18} 
          strokeWidth={2} 
          style={{
            position: 'absolute',
            left: '14px',
            color: 'var(--color-text-muted)',
            pointerEvents: 'none',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value && suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '12px 40px 12px 44px',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            color: 'var(--color-text-primary)',
            fontSize: '15px',
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--color-accent)';
            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--color-border)';
            e.target.style.boxShadow = 'none';
          }}
        />
        {value && (
          <button
            onClick={() => {
              onChange('');
              onSelect('');
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: '12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HugeiconsIcon icon={CloseIcon} size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            maxHeight: '320px',
            overflowY: 'auto',
            zIndex: 1000,
            padding: '8px',
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              onClick={() => {
                onSelect(suggestion.address);
                setIsOpen(false);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                background: index === selectedIndex ? 'var(--color-bg-hover)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  background: suggestion.type === 'bookmark' 
                    ? 'rgba(245, 158, 11, 0.1)' 
                    : suggestion.type === 'history'
                    ? 'rgba(59, 130, 246, 0.1)'
                    : 'var(--color-bg-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <HugeiconsIcon 
                  icon={getIcon(suggestion.type)} 
                  size={16} 
                  strokeWidth={2}
                  color={suggestion.type === 'bookmark' ? '#f59e0b' : suggestion.type === 'history' ? '#3b82f6' : 'var(--color-text-muted)'} 
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  color: 'var(--color-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {suggestion.title}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: 'var(--color-text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {suggestion.subtitle}
                </div>
              </div>
              {index === selectedIndex && (
                <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} color="var(--color-text-muted)" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchAutocomplete;
