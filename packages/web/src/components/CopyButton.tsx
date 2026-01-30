import React, { useState } from 'react';
import { useNotify } from '../contexts/ToastContext';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
  showToast?: boolean;
  toastMessage?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  className = '',
  showToast = true,
  toastMessage = 'Copied to clipboard!',
}) => {
  const [copied, setCopied] = useState(false);
  const notify = useNotify();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      
      if (showToast) {
        notify.success(toastMessage);
      }
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      notify.error('Failed to copy');
    }
  };

  return (
    <button
      className={`copy-button ${copied ? 'copied' : ''} ${className}`}
      onClick={handleCopy}
      title="Copy to clipboard"
      type="button"
    >
      {label && <span className="copy-label">{label}</span>}
      <span className="copy-icon">
        {copied ? '✓' : '📋'}
      </span>
    </button>
  );
};

// Address display with truncation and copy button
interface AddressDisplayProps {
  address: string;
  truncate?: boolean;
  showCopy?: boolean;
  prefixLength?: number;
  suffixLength?: number;
  className?: string;
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  truncate = true,
  showCopy = true,
  prefixLength = 6,
  suffixLength = 4,
  className = '',
}) => {
  const displayText = truncate
    ? `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
    : address;

  return (
    <span className={`address-display ${className}`}>
      <code className="address-code" title={address}>
        {displayText}
      </code>
      {showCopy && (
        <CopyButton
          text={address}
          className="address-copy-btn"
          toastMessage="Address copied!"
        />
      )}
    </span>
  );
};

export default CopyButton;
