import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Star01Icon,
  Search01Icon,
  Wallet01Icon,
  Clock01Icon,
  Trash01Icon,
  Edit01Icon,
  ArrowRight01Icon,
  CloseIcon,
  PlusIcon,
  FilterIcon,
  SortAscending02Icon,
  InformationCircleIcon,
  CheckmarkCircle01Icon,
  Copy01Icon,
  Share01Icon,
} from '@hugeicons/core-free-icons';
import { getAddressBook, setLabel, removeLabel, type AddressLabel } from '../utils/addressBook';
import { getHistory, type HistoryItem } from '../utils/history';

interface FavoritesManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAddress: (address: string) => void;
}

type SortOption = 'recent' | 'name' | 'address';
type FilterOption = 'all' | 'favorites' | 'history';

export function FavoritesManager({ isOpen, onClose, onSelectAddress }: FavoritesManagerProps) {
  const [favorites, setFavorites] = useState<AddressLabel[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(() => {
    const book = getAddressBook();
    const favs = Object.entries(book).map(([address, label]) => ({
      address,
      label,
      timestamp: Date.now(),
    }));
    setFavorites(favs);

    const hist = getHistory();
    setHistory(hist);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  useEffect(() => {
    const handleStorageChange = () => loadData();
    window.addEventListener('addressBookChanged', handleStorageChange);
    return () => window.removeEventListener('addressBookChanged', handleStorageChange);
  }, [loadData]);

  const handleSaveLabel = (address: string) => {
    setLabel(address, editLabel);
    setEditingAddress(null);
    setEditLabel('');
    loadData();
  };

  const handleRemoveFavorite = (address: string) => {
    removeLabel(address);
    loadData();
  };

  const handleAddToFavorites = (address: string, label?: string) => {
    const defaultLabel = label || `${address.slice(0, 6)}...${address.slice(-4)}`;
    setLabel(address, defaultLabel);
    loadData();
  };

  const handleCopyAddress = async (address: string) => {
    await navigator.clipboard.writeText(address);
  };

  const filteredItems = React.useMemo(() => {
    let items: Array<{ type: 'favorite' | 'history'; data: AddressLabel | HistoryItem }> = [];

    if (filter === 'all' || filter === 'favorites') {
      favorites.forEach(fav => items.push({ type: 'favorite', data: fav }));
    }

    if (filter === 'all' || filter === 'history') {
      history.forEach(hist => {
        const exists = items.some(
          item => (item.data as AddressLabel).address?.toLowerCase() === hist.address.toLowerCase()
        );
        if (!exists) {
          items.push({ type: 'history', data: hist });
        }
      });
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const addr = item.data.address.toLowerCase();
        const label = (item.data as AddressLabel).label?.toLowerCase() || '';
        return addr.includes(query) || label.includes(query);
      });
    }

    if (sortBy === 'recent') {
      items.sort((a, b) => (b.data.timestamp || 0) - (a.data.timestamp || 0));
    } else if (sortBy === 'name') {
      items.sort((a, b) => {
        const labelA = (a.data as AddressLabel).label || '';
        const labelB = (b.data as AddressLabel).label || '';
        return labelA.localeCompare(labelB);
      });
    } else if (sortBy === 'address') {
      items.sort((a, b) => a.data.address.localeCompare(b.data.address));
    }

    return items;
  }, [favorites, history, filter, sortBy, searchQuery]);

  if (!isOpen) return null;

  return (
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
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '24px',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-bg-elevated)',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <HugeiconsIcon icon={Star01Icon} size={20} strokeWidth={2} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Favorites & History
              </h2>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-muted)' }}>
                {favorites.length} favorites, {history.length} recent
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 36,
              height: 36,
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
            }}
          >
            <HugeiconsIcon icon={CloseIcon} size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Search & Filters */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <HugeiconsIcon 
              icon={Search01Icon} 
              size={16} 
              strokeWidth={2} 
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search addresses..."
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                background: 'var(--color-bg-subtle)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                color: 'var(--color-text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterOption)}
            style={{
              padding: '10px 12px',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="all">All</option>
            <option value="favorites">Favorites</option>
            <option value="history">History</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{
              padding: '10px 12px',
              background: 'var(--color-bg-subtle)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="recent">Recent</option>
            <option value="name">Name</option>
            <option value="address">Address</option>
          </select>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredItems.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              color: 'var(--color-text-muted)',
            }}>
              <HugeiconsIcon icon={Star01Icon} size={48} strokeWidth={1} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>No items found</p>
              <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
                {filter === 'favorites' ? 'Add favorites by labeling addresses' : 'Start analyzing wallets to see history'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const address = item.data.address;
              const label = (item.data as AddressLabel).label;
              const isFavorite = item.type === 'favorite';
              const timestamp = item.data.timestamp;

              return (
                <motion.div
                  key={`${item.type}-${address}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    borderRadius: '10px',
                    marginBottom: '4px',
                    background: 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: '10px',
                    background: isFavorite 
                      ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
                      : 'var(--color-bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <HugeiconsIcon 
                      icon={isFavorite ? Star01Icon : Clock01Icon} 
                      size={18} 
                      strokeWidth={1.5} 
                      color={isFavorite ? '#fff' : 'var(--color-text-muted)'} 
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {editingAddress === address ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          placeholder="Enter label..."
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            background: 'var(--color-bg-subtle)',
                            border: '1px solid var(--color-accent)',
                            borderRadius: '6px',
                            color: 'var(--color-text-primary)',
                            fontSize: '13px',
                            outline: 'none',
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveLabel(address)}
                        />
                        <button
                          onClick={() => handleSaveLabel(address)}
                          style={{
                            padding: '6px 10px',
                            background: 'var(--color-accent)',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={14} strokeWidth={2} color="#000" />
                        </button>
                        <button
                          onClick={() => setEditingAddress(null)}
                          style={{
                            padding: '6px 10px',
                            background: 'var(--color-bg-subtle)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                          }}
                        >
                          <HugeiconsIcon icon={CloseIcon} size={14} strokeWidth={2} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--color-text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {label || `${address.slice(0, 6)}...${address.slice(-4)}`}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--color-text-muted)',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {address}
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => handleCopyAddress(address)}
                      title="Copy address"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '6px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={16} strokeWidth={1.5} />
                    </button>
                    
                    {!isFavorite && (
                      <button
                        onClick={() => handleAddToFavorites(address, label)}
                        title="Add to favorites"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '6px',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-text-muted)',
                        }}
                      >
                        <HugeiconsIcon icon={PlusIcon} size={16} strokeWidth={1.5} />
                      </button>
                    )}
                    
                    {isFavorite && (
                      <>
                        <button
                          onClick={() => {
                            setEditingAddress(address);
                            setEditLabel(label || '');
                          }}
                          title="Edit label"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-text-muted)',
                          }}
                        >
                          <HugeiconsIcon icon={Edit01Icon} size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => handleRemoveFavorite(address)}
                          title="Remove from favorites"
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '6px',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444',
                          }}
                        >
                          <HugeiconsIcon icon={Trash01Icon} size={16} strokeWidth={1.5} />
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => {
                        onSelectAddress(address);
                        onClose();
                      }}
                      title="Analyze"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '6px',
                        background: 'var(--color-accent)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#000',
                      }}
                    >
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
            <HugeiconsIcon icon={InformationCircleIcon} size={16} strokeWidth={1.5} />
            <span>Click star icon to favorite any address</span>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: '8px',
              color: '#000',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default FavoritesManager;
