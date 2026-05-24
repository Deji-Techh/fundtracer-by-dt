import React from 'react';
import { X } from 'lucide-react';

interface Pin {
  messageId: string;
  pinnedBy: string;
  pinnedByName?: string;
  pinnedAt: number;
  category: 'evidence' | 'finding' | 'note' | 'action_item';
  note?: string;
  content?: string;
  senderName?: string;
}

interface EvidenceBoardProps {
  pins: Pin[];
  onUnpin?: (messageId: string) => void;
  canUnpin?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  evidence: '#4ade80',
  finding: '#fbbf24',
  note: '#7F77DD',
  action_item: '#f97316',
};

export function EvidenceBoard({ pins, onUnpin, canUnpin }: EvidenceBoardProps) {
  if (pins.length === 0) {
    return (
      <div className="ir-empty">
        <p className="ir-empty-text">No evidence pinned</p>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted, #555)' }}>
          Pin messages with the pin icon to build the evidence board
        </span>
      </div>
    );
  }

  return (
    <div>
      {pins.map((pin) => (
        <div key={pin.messageId} className="ir-evidence-item">
          <div className="ir-evidence-category" style={{ color: CATEGORY_COLORS[pin.category] || '#7F77DD' }}>
            {pin.category.replace('_', ' ')}
          </div>
          {pin.content && (
            <div className="ir-evidence-text">{pin.content.slice(0, 200)}{pin.content.length > 200 ? '...' : ''}</div>
          )}
          {pin.note && (
            <div className="ir-evidence-text" style={{ fontStyle: 'italic', marginTop: 4 }}>
              Note: {pin.note}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--color-text-muted, #555)', marginTop: 4 }}>
            Pinned by {pin.pinnedByName || pin.pinnedBy} — {senderName ? `${senderName} · ` : ''}{new Date(pin.pinnedAt).toLocaleDateString()}
          </div>
          {canUnpin && onUnpin && (
            <div className="ir-evidence-actions">
              <button className="ir-evidence-btn" onClick={() => onUnpin(pin.messageId)}>
                <X size={10} style={{ marginRight: 3 }} /> Unpin
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
