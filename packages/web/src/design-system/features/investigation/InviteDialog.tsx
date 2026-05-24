import React, { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';

interface InviteDialogProps {
  isOpen: boolean;
  inviteUrl: string;
  roomName: string;
  onClose: () => void;
}

export function InviteDialog({ isOpen, inviteUrl, roomName, onClose }: InviteDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for non-https
      const el = document.createElement('textarea');
      el.value = inviteUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="ir-invite-overlay" onClick={onClose}>
      <div className="ir-invite-backdrop" />
      <div className="ir-invite-dialog" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 className="ir-invite-title">Invite to Room</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8696a0', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <p className="ir-invite-text">
          Share this link with anyone you want to invite to <strong>{roomName}</strong>
        </p>
        <div className="ir-invite-link-box">
          <span className="ir-invite-link-text">{inviteUrl}</span>
          <button
            className={`ir-invite-copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <button className="ir-invite-close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
