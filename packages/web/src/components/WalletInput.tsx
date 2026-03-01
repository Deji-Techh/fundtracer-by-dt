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
