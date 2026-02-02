import React from 'react';
import { motion } from 'framer-motion';
import { getEnabledChains, getChainConfig, ChainKey } from '../../config/chains';

interface TerminalSidebarProps {
  activeChain: ChainKey;
  onChainSelect: (chain: ChainKey) => void;
}

const TerminalSidebar: React.FC<TerminalSidebarProps> = ({ 
  activeChain, 
  onChainSelect 
}) => {
  const chains = getEnabledChains();

  return (
    <div style={{
      width: 200,
      background: '#0a0a0a',
      borderRight: '1px solid #1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid #1a1a1a',
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Networks
        </div>
      </div>

      {/* Chain list */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '8px',
      }}>
        {chains.map((chainKey) => {
          const config = getChainConfig(chainKey);
          const isActive = activeChain === chainKey;

          return (
            <motion.button
              key={chainKey}
              onClick={() => onChainSelect(chainKey)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 12px',
                marginBottom: 4,
                borderRadius: 8,
                border: 'none',
                background: isActive ? '#1a1a1a' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 20,
                    background: config.color,
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}

              {/* Chain color dot */}
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: config.color,
                boxShadow: isActive ? `0 0 8px ${config.color}` : 'none',
              }} />

              {/* Chain name */}
              <span style={{
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : '#9ca3af',
                flex: 1,
                textAlign: 'left',
              }}>
                {config.displayName}
              </span>

              {/* Active checkmark */}
              {isActive && (
                <div style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#3b82f6',
                }} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Footer info */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #1a1a1a',
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: '#6b7280',
        }}>
          {chains.length} networks active
        </div>
      </div>
    </div>
  );
};

export default TerminalSidebar;
