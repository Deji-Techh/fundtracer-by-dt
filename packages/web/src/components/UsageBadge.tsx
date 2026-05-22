import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export function UsageBadge() {
  const { profile, isAuthenticated } = useAuth();

  if (!isAuthenticated || !profile) return null;

  const tier = profile.tier || 'free';
  const usage = profile.usage;
  const dayLimit = usage?.dayLimit ?? (tier === 'pro' ? 10000 : 1000);
  const minuteLimit = usage?.minuteLimit ?? (tier === 'pro' ? 60 : 100);
  const usedDay = usage?.today || 0;
  const usedMinute = usage?.usedMinute ?? 0;
  const dayRemaining = typeof dayLimit === 'number' ? Math.max(0, dayLimit - usedDay) : '∞';
  const minuteRemaining = typeof minuteLimit === 'number' ? Math.max(0, minuteLimit - usedMinute) : '∞';

  const tierColors: Record<string, string> = {
    free: '#6b7280',
    pro: '#3b82f6',
    max: '#8b5cf6',
  };
  const color = tierColors[tier] || '#6b7280';

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontSize: 11,
      fontWeight: 600,
      fontFamily: "'SF Mono', 'Fira Code', monospace",
      color: 'var(--color-text-muted)',
      background: 'var(--color-surface-2)',
      borderRadius: 6,
      padding: '2px 8px',
      marginRight: 8,
    }}>
      <span style={{
        background: color,
        color: '#fff',
        borderRadius: 3,
        padding: '0 4px',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
      }}>
        {tier}
      </span>
      <span title="Per-minute usage">
        {usedMinute}/{minuteLimit}m
      </span>
      <span title="Daily usage">
        {usedDay}/{dayLimit}d
      </span>
    </div>
  );
}
