import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  Wallet01Icon,
  Clock01Icon,
  Search01Icon,
  ChartLineData01Icon,
  Shield01Icon,
} from '@hugeicons/core-free-icons';

interface MobileFooterProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileFooter({ activeTab, onTabChange }: MobileFooterProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home01Icon },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet01Icon },
    { id: 'history', label: 'History', icon: Clock01Icon },
    { id: 'explorer', label: 'Explorer', icon: Search01Icon },
    { id: 'market', label: 'Market', icon: ChartLineData01Icon },
    { id: 'sybil', label: 'Sybil', icon: Shield01Icon },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0a0a0a',
        borderTop: '1px solid #2a2a2a',
        zIndex:  1001,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '2px',
          padding: '0',
          overflowX: 'auto',
          maxWidth: '100%',
        }}
      >
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            style={{
              flex: '0 0 auto',
              minWidth: '70px',
              maxWidth: '100px',
              padding: '12px 16px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: activeTab === item.id ? '#3b82f6' : '#6b7280',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={20}
              strokeWidth={2}
              style={{
                color: activeTab === item.id ? '#3b82f6' : '#6b7280',
              }}
            />
            <span
              style={{
                color: activeTab === item.id ? '#ffffff' : '#9ca3af',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default MobileFooter;
