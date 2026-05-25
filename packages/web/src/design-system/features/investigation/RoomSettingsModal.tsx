import React, { useState } from 'react';
import { Settings, X, UserPlus, Users, Trash2, FileText, Edit3, LogOut, ChevronRight } from 'lucide-react';
import { useNotify } from '../../../contexts/ToastContext';
import { API_BASE, getAuthToken } from '../../../api';

interface MemberData {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: 'owner' | 'admin' | 'member';
  isOnline: boolean;
  joinedAt: number;
}

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  roomDescription?: string;
  roomId: string;
  members: MemberData[];
  currentUserId?: string;
  currentUserRole?: string;
  onInvite: () => void;
  onExport?: () => void;
  onRemoveMember: (uid: string) => void;
  onPromoteMember: (uid: string, role: string) => void;
  onDeleteRoom: () => void;
  onUpdateDescription: (description: string) => void;
  onLeaveRoom: () => void;
}

export function RoomSettingsModal({
  isOpen, onClose, roomName, roomDescription, roomId, members,
  currentUserId, currentUserRole,
  onInvite, onExport, onRemoveMember, onPromoteMember,
  onDeleteRoom, onUpdateDescription, onLeaveRoom,
}: RoomSettingsModalProps) {
  const notify = useNotify();
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(roomDescription || '');

  if (!isOpen) return null;

  const handleSaveDescription = async () => {
    try {
      await onUpdateDescription(descValue);
      setEditingDesc(false);
      notify.success('Description updated');
    } catch {
      notify.error('Failed to update description');
    }
  };

  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'admin' || isOwner;

  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'owner') return -1;
    if (b.role === 'owner') return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return (
    <div className="ir-settings-overlay" onClick={onClose}>
      <div className="ir-settings-backdrop" />
      <div className="ir-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="ir-settings-header">
          <span className="ir-settings-title">Room Info</span>
          <button className="ir-settings-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="ir-settings-body">
          {/* Room Name */}
          <div className="ir-settings-section">
            <div className="ir-settings-room-name">{roomName}</div>
          </div>

          {/* Description */}
          <div className="ir-settings-section">
            <div className="ir-settings-label">Description</div>
            {editingDesc ? (
              <div className="ir-settings-desc-edit">
                <textarea
                  className="ir-settings-desc-input"
                  value={descValue}
                  onChange={e => setDescValue(e.target.value)}
                  rows={3}
                  placeholder="Add a room description..."
                />
                <div className="ir-settings-desc-actions">
                  <button className="ir-settings-btn ir-settings-btn-secondary" onClick={() => setEditingDesc(false)}>Cancel</button>
                  <button className="ir-settings-btn ir-settings-btn-primary" onClick={handleSaveDescription}>Save</button>
                </div>
              </div>
            ) : (
              <div className="ir-settings-desc-row" onClick={() => { setDescValue(roomDescription || ''); setEditingDesc(true); }}>
                <span className={`ir-settings-desc-text ${!roomDescription ? 'empty' : ''}`}>
                  {roomDescription || 'Add a description'}
                </span>
                <Edit3 size={14} className="ir-settings-row-icon" />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="ir-settings-actions">
            <button className="ir-settings-action" onClick={() => { onInvite(); onClose(); }}>
              <UserPlus size={16} />
              <span>Invite Members</span>
            </button>

            {onExport && (
              <button className="ir-settings-action" onClick={() => { onExport(); onClose(); }}>
                <FileText size={16} />
                <span>Export as PDF</span>
              </button>
            )}
          </div>

          {/* Members */}
          <div className="ir-settings-section">
            <div className="ir-settings-label">
              <Users size={14} />
              <span>{members.length} {members.length === 1 ? 'member' : 'members'}</span>
            </div>
            <div className="ir-settings-members">
              {sortedMembers.map(m => (
                <div key={m.uid} className="ir-settings-member">
                  <div className="ir-settings-member-avatar">
                    {m.photoURL ? <img src={m.photoURL} alt="" /> : m.displayName[0]?.toUpperCase()}
                  </div>
                  <div className="ir-settings-member-info">
                    <span className="ir-settings-member-name">
                      {m.displayName}
                      {m.uid === currentUserId && ' (you)'}
                    </span>
                    <span className="ir-settings-member-role">{m.role}</span>
                  </div>
                  {m.uid !== currentUserId && (isOwner || (isAdmin && m.role === 'member')) && (
                    <button
                      className="ir-settings-member-remove"
                      onClick={() => {
                        if (confirm(`Remove ${m.displayName} from this room?`)) {
                          onRemoveMember(m.uid);
                          notify.success(`${m.displayName} removed`);
                        }
                      }}
                      title="Remove member"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  {isOwner && m.role === 'member' && (
                    <button
                      className="ir-settings-member-promote"
                      onClick={() => {
                        onPromoteMember(m.uid, 'admin');
                        notify.success(`${m.displayName} promoted to admin`);
                      }}
                      title="Promote to admin"
                    >
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="ir-settings-section ir-settings-danger">
            {!isOwner && (
              <button className="ir-settings-action ir-settings-action-danger" onClick={() => {
                if (confirm('Leave this room?')) {
                  onLeaveRoom();
                  onClose();
                }
              }}>
                <LogOut size={16} />
                <span>Leave Room</span>
              </button>
            )}
            {isOwner && (
              <button className="ir-settings-action ir-settings-action-danger" onClick={() => {
                if (confirm('Delete this room permanently? This cannot be undone.')) {
                  onDeleteRoom();
                  onClose();
                }
              }}>
                <Trash2 size={16} />
                <span>Delete Room</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
