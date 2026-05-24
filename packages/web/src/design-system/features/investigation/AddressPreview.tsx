import React from 'react';

interface AddressPreviewProps {
  address: string;
  chain?: string;
  onAnalyze: () => void;
}

export function AddressPreview({ address, chain = 'ethereum', onAnalyze }: AddressPreviewProps) {
  return (
    <div className="ir-address-preview">
      <div className="ir-address-header">
        <span>Wallet Detected</span>
        <button onClick={onAnalyze}>Analyze with FT MAVERIICK</button>
      </div>
      <code>{address}</code>
    </div>
  );
}
