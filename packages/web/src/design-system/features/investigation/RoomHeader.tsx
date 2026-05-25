import React from 'react';
import { X, Settings, Users } from 'lucide-react';

interface RoomHeaderProps {
  name: string;
  memberCount: number;
  onSettings: () => void;
  onClose: () => void;
}

export function RoomHeader({ name, memberCount, onSettings, onClose }: RoomHeaderProps) {
  return (
    <div className="ir-header">
      <div className="ir-header-left">
        <Users size={18} style={{ color: '#00a884' }} />
        <span className="ir-room-name">{name}</span>
        <span style={{ fontSize: 12, color: '#8696a0' }}>
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>

      <div className="ir-header-actions">
        <button className="ir-btn" onClick={onSettings} title="Room settings">
          <Settings size={16} />
        </button>

        <button className="ir-btn-close" onClick={onClose} title="Close room">
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
