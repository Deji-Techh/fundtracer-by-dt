import React, { useState, useEffect, useRef } from 'react';
import { getLabel, setLabel } from '../utils/addressBook';
import { Tag, Edit2, Check, X } from 'lucide-react';

interface AddressLabelProps {
    address: string;
    editable?: boolean;
    showAddress?: boolean; // If true, show address alongside label. If false, just label (or address if no label)
    className?: string;
    style?: React.CSSProperties;
}

function AddressLabel({ address, editable = false, showAddress = false, className, style }: AddressLabelProps) {
    const [label, setLabelState] = useState<string | undefined>(undefined);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const updateLabel = () => {
        setLabelState(getLabel(address));
    };

    useEffect(() => {
        updateLabel();
        window.addEventListener('addressBookChanged', updateLabel);
        return () => window.removeEventListener('addressBookChanged', updateLabel);
    }, [address]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleSave = (e?: React.FormEvent) => {
        e?.preventDefault();
        setLabel(address, editValue);
        setIsEditing(false);
    };

    const startEditing = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditValue(label || '');
        setIsEditing(true);
    };

    const formattedAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    if (isEditing) {
        return (
            <form onSubmit={handleSave} className="flex items-center gap-1" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder="Set label..."
                    className="input-compact"
                    style={{
                        padding: '2px 6px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid var(--color-primary)',
                        background: 'var(--color-bg-elevated)',
                        color: 'var(--color-text-primary)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                />
                <button
                    type="submit"
                    className="btn btn-ghost btn-icon-xs"
                    style={{ padding: 2, color: 'var(--color-success-text)' }}
                    onClick={(e) => { e.stopPropagation(); handleSave(); }}
                >
                    <Check size={14} />
                </button>
                <button
                    type="button"
                    className="btn btn-ghost btn-icon-xs"
                    style={{ padding: 2, color: 'var(--color-text-muted)' }}
                    onClick={(e) => { e.stopPropagation(); setIsEditing(false); }}
                >
                    <X size={14} />
                </button>
            </form>
        );
    }

    const displayContent = label ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <span style={{
                color: 'var(--color-primary-text)',
                fontWeight: 500,
                background: 'rgba(59, 130, 246, 0.1)',
                padding: '0 4px',
                borderRadius: '4px'
            }}>
                {label}
            </span>
            {showAddress && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9em' }}>({formattedAddress})</span>}
        </span>
    ) : (
        <span>{formattedAddress}</span>
    );

    return (
        <span
            className={className}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...style }}
            title={address}
        >
            {displayContent}
            {editable && (
                <button
                    onClick={startEditing}
                    className="btn-edit-label"
                    style={{
                        opacity: 0.5,
                        cursor: 'pointer',
                        border: 'none',
                        background: 'none',
                        padding: 0,
                        color: 'var(--color-text-muted)',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title={label ? "Edit label" : "Add label"}
                >
                    {label ? <Edit2 size={12} /> : <Tag size={12} />}
                </button>
            )}
        </span>
    );
}

export default AddressLabel;
