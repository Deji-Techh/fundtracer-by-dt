import React from 'react';

interface MemberData {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: 'owner' | 'admin' | 'member';
  isOnline: boolean;
  joinedAt: number;
}

interface MemberListProps {
  members: MemberData[];
  currentUserId?: string;
  currentUserRole?: string;
  onRemoveMember?: (uid: string) => void;
  onPromoteMember?: (uid: string, role: string) => void;
}

export function MemberList({ members, currentUserId, currentUserRole, onRemoveMember, onPromoteMember }: MemberListProps) {
  if (members.length === 0) {
    return <div className="ir-empty"><p className="ir-empty-text">No members</p></div>;
  }

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <div>
      {members.map((member) => (
        <div key={member.uid} className="ir-member">
          <div className="ir-member-avatar">
            {member.photoURL ? (
              <img src={member.photoURL} alt={member.displayName} />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted, #555)',
              }}>
                {member.displayName?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div className="ir-member-info">
            <div className="ir-member-name">{member.displayName}</div>
            <div className="ir-member-role">{member.role}</div>
          </div>
          <div className={member.isOnline ? 'ir-member-online' : 'ir-member-offline'} />

          {canManage && member.uid !== currentUserId && member.role !== 'owner' && (
            <div className="ir-member-actions">
              {currentUserRole === 'owner' && member.role === 'member' && (
                <button
                  className="ir-member-btn"
                  onClick={() => onPromoteMember?.(member.uid, 'admin')}
                  title="Promote to admin"
                >
                  Promote
                </button>
              )}
              <button
                className="ir-member-btn"
                onClick={() => onRemoveMember?.(member.uid)}
                title="Remove member"
                style={{ color: '#E24B4A' }}
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
