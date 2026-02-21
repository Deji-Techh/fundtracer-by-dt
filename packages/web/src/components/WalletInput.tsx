import React from 'react';

interface WalletInputProps {
    value: string;
    onChange: (value: string) => void;
    onRemove?: () => void;
    placeholder?: string;
    style?: React.CSSProperties;
}

function WalletInput({ value, onChange, onRemove, placeholder, style }: WalletInputProps) {
    const isValid = !value || /^0x[a-fA-F0-9]{40}$/.test(value);

    return (
        <div className="input-group" style={style}>
            <span className="input-icon" style={{ zIndex: 1 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                </svg>
            </span>
            <input
                type="text"
                className="input"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder || 'Enter wallet address (0x...)'}
                spellCheck={false}
                style={{
                    borderColor: !isValid ? 'var(--color-error)' : undefined,
                    paddingRight: onRemove ? 'var(--space-12)' : undefined,
                }}
            />
            {onRemove && (
                <button
                    className="btn btn-ghost btn-icon"
                    onClick={onRemove}
                    style={{
                        position: 'absolute',
                        right: 'var(--space-2)',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        zIndex: 2,
                    }}
                    title="Remove"
                >
                    ✕
                </button>
            )}
        </div>
    );
}

export default WalletInput;
