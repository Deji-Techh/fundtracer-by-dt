import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (params: { name: string; description: string }) => void;
  isLoading?: boolean;
  error?: string;
  seedAddress?: string;
  seedChain?: string;
}

export function CreateRoomModal({
  isOpen,
  onClose,
  onCreate,
  isLoading,
  error,
  seedAddress,
  seedChain,
}: CreateRoomModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isLoading) return;
    onCreate({ name: name.trim(), description: description.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="ir-create-modal">
      <div className="ir-create-backdrop" onClick={onClose} />

      <motion.form
        className="ir-create-dialog"
        onSubmit={handleSubmit}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ir-create-title">Create Investigation Room</div>

        {seedAddress && (
          <div style={{
            fontSize: 12, padding: '8px 12px', borderRadius: 8,
            background: 'rgba(127,119,221,0.08)', border: '1px solid rgba(127,119,221,0.15)',
            marginBottom: 16, color: 'var(--color-text-secondary, #8a8a8a)',
          }}>
            Seed data: {seedAddress.slice(0, 10)}...{seedAddress.slice(-4)}
            {seedChain && ` on ${seedChain}`}
          </div>
        )}

        <div className="ir-create-field">
          <div className="ir-create-label">Room Name</div>
          <input
            className="ir-create-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. FTX Exploiter Investigation"
            autoFocus
            maxLength={100}
          />
        </div>

        <div className="ir-create-field">
          <div className="ir-create-label">Description (optional)</div>
          <input
            className="ir-create-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are we investigating?"
            maxLength={300}
          />
        </div>

        {error && (
          <div style={{ fontSize: 12, color: '#E24B4A', marginTop: 8 }}>{error}</div>
        )}

        <div className="ir-create-actions">
          <button type="button" className="ir-create-btn" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button type="submit" className="ir-create-btn ir-create-btn-primary" disabled={!name.trim() || isLoading}>
            {isLoading ? 'Creating...' : 'Create Room'}
          </button>
        </div>
      </motion.form>
    </div>
  );
}
