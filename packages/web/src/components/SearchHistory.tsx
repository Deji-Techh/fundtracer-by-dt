import React, { useEffect, useState } from 'react';
import { HistoryItem, getHistory, removeFromHistory } from '../utils/history';
import { getLabel } from '../utils/addressBook';
import { Clock, X, ArrowRight } from 'lucide-react';

interface SearchHistoryProps {
    onSelect: (address: string, chain?: string) => void;
    currentAddress?: string;
}

function SearchHistory({ onSelect, currentAddress }: SearchHistoryProps) {
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        setHistory(getHistory());

        // Listen for storage changes in other tabs
        const handleStorage = () => setHistory(getHistory());
        window.addEventListener('storage', handleStorage);
        // Listen for address book changes (to update labels)
        const handleAddressBook = () => setHistory([...getHistory()]); // Force refresh
        window.addEventListener('addressBookChanged', handleAddressBook);

        return () => {
            window.removeEventListener('storage', handleStorage);
            window.removeEventListener('addressBookChanged', handleAddressBook);
        };
    }, [currentAddress]);

    const handleDelete = (e: React.MouseEvent, address: string) => {
        e.stopPropagation();
        setHistory(removeFromHistory(address));
    };

    const walletHistory = history.filter(item => !item.type || item.type === 'wallet');
    if (walletHistory.length === 0) return null;

    return (
        <div style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-2)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)'
            }}>
                <Clock size={12} />
                Recent Searches
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {walletHistory.map((item) => (
                    <div
                        key={`${item.address}-${item.timestamp}`}
                        className="animate-fade-in"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: 'var(--space-3)',
                            background: 'var(--color-bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-surface-border)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}
                        onClick={() => onSelect(item.address, item.chain)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--color-surface-border)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', overflow: 'hidden' }}>
                            <div style={{
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: 'var(--color-bg-elevated)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                color: 'var(--color-text-secondary)'
                            }}>
                                {item.chain?.substring(0, 1).toUpperCase() || '?'}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                <div style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: 'var(--text-sm)',
                                    color: 'var(--color-text-primary)',
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center'
                                }}>
                                    {getLabel(item.address) ? (
                                        <>
                                            <span style={{ fontWeight: 600, color: 'var(--color-primary-text)' }}>{getLabel(item.address)}</span>
                                            <span style={{ fontSize: '0.8em', color: 'var(--color-text-muted)' }}>({item.address.slice(0, 6)}...)</span>
                                        </>
                                    ) : (
                                        item.address
                                    )}
                                </div>
                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                    {new Date(item.timestamp).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <button
                                className="btn btn-ghost btn-icon"
                                onClick={(e) => handleDelete(e, item.address)}
                                style={{ padding: 4, height: 'auto', width: 'auto' }}
                                title="Remove from history"
                            >
                                <X size={14} />
                            </button>
                            <ArrowRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SearchHistory;
