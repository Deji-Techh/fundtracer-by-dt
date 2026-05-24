import React from 'react';
import { X, Link, FileText, Users } from 'lucide-react';

interface RoomHeaderProps {
  name: string;
  memberCount: number;
  onInvite: () => void;
  onExport?: () => void;
  onClose: () => void;
  showExport?: boolean;
}

export function RoomHeader({ name, memberCount, onInvite, onExport, onClose, showExport }: RoomHeaderProps) {
  return (
    <div className="ir-header">
      <div className="ir-header-left">
        <Users size={18} style={{ color: '#6ab2f2' }} />
        <span className="ir-room-name">{name}</span>
        <span style={{ fontSize: 12, color: '#6a6a7a' }}>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>

      <div className="ir-header-actions">
        <button className="ir-btn" onClick={onInvite} title="Generate invite link">
          <Link size={14} />
          <span>Invite</span>
        </button>

        {showExport && onExport && (
          <button className="ir-btn" onClick={onExport} title="Export as PDF (Pro)">
            <FileText size={14} />
            <span>Export</span>
          </button>
        )}

        <button className="ir-btn-close" onClick={onClose} title="Close room">
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
