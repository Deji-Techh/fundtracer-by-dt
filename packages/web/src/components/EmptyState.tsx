import React from 'react';
import { motion } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Search01Icon, 
  Wallet01Icon, 
  Clock01Icon, 
  Shield01Icon,
  ArrowRight01Icon,
  InformationCircleIcon
} from '@hugeicons/core-free-icons';

export type EmptyStateVariant = 'wallet' | 'history' | 'sybil' | 'portfolio' | 'generic';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  onAction?: () => void;
  actionLabel?: string;
  secondaryAction?: () => void;
  secondaryLabel?: string;
}

const emptyStateConfig: Record<EmptyStateVariant, {
  icon: any;
  title: string;
  description: string;
  actionLabel?: string;
}> = {
  wallet: {
    icon: Wallet01Icon,
    title: 'No Wallet Connected',
    description: 'Connect your wallet to view your portfolio, track transactions, and access premium features.',
    actionLabel: 'Connect Wallet',
  },
  history: {
    icon: Clock01Icon,
    title: 'No Scan History',
    description: 'Start by analyzing a wallet address. Your scan history will appear here for quick access.',
    actionLabel: 'Analyze Wallet',
  },
  sybil: {
    icon: Shield01Icon,
    title: 'Ready to Analyze',
    description: 'Enter a wallet address above to trace funding sources, analyze transactions, and detect suspicious patterns.',
    actionLabel: 'Start Analysis',
  },
  portfolio: {
    icon: Wallet01Icon,
    title: 'No Portfolio Data',
    description: 'Connect your wallet to see your DeFi positions, token holdings, and transaction history.',
    actionLabel: 'Connect Wallet',
  },
  generic: {
    icon: Search01Icon,
    title: 'Nothing Here Yet',
    description: 'Start exploring to see your results here.',
  },
};

export function EmptyState({ 
  variant = 'generic', 
  onAction, 
  actionLabel,
  secondaryAction,
  secondaryLabel 
}: EmptyStateProps) {
  const config = emptyStateConfig[variant];
  const displayActionLabel = actionLabel || config.actionLabel;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}
      >
        <HugeiconsIcon 
          icon={config.icon} 
          size={32} 
          strokeWidth={1.5} 
          color="var(--color-text-muted)" 
        />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 8,
        }}
      >
        {config.title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{
          fontSize: '0.9375rem',
          color: 'var(--color-text-secondary)',
          maxWidth: 360,
          lineHeight: 1.6,
          marginBottom: 24,
        }}
      >
        {config.description}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {displayActionLabel && onAction && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--color-accent)',
              color: '#000000',
              fontSize: '0.9375rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {displayActionLabel}
            <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={2} />
          </motion.button>
        )}
        
        {secondaryLabel && secondaryAction && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={secondaryAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 24px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {secondaryLabel}
          </motion.button>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        style={{
          marginTop: 32,
          padding: '12px 16px',
          background: 'var(--color-bg-subtle)',
          borderRadius: 8,
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          maxWidth: 400,
        }}
      >
        <HugeiconsIcon 
          icon={InformationCircleIcon} 
          size={18} 
          strokeWidth={1.5} 
          color="var(--color-accent)" 
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <p style={{
          fontSize: '0.8125rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
          textAlign: 'left',
        }}>
          Tip: Press <kbd style={{ 
            padding: '2px 6px', 
            background: 'var(--color-bg-elevated)', 
            borderRadius: 4, 
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
          }}>Ctrl+K</kbd> to quickly jump to analysis. Press <kbd style={{ 
            padding: '2px 6px', 
            background: 'var(--color-bg-elevated)', 
            borderRadius: 4, 
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem)',
          }}>?</kbd> for keyboard shortcuts.
        </p>
      </motion.div>
    </motion.div>
  );
}

export default EmptyState;
