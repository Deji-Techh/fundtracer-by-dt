import React from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  Wallet01Icon,
  Clock01Icon,
  Shield01Icon,
  Settings01Icon,
} from '@hugeicons/core-free-icons';

interface MobileFooterProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileFooter({ activeTab, onTabChange }: MobileFooterProps) {
  const navItems = [
    { id: 'home', icon: Home01Icon },
    { id: 'portfolio', icon: Wallet01Icon },
    { id: 'sybil', icon: Shield01Icon },
    { id: 'history', icon: Clock01Icon },
    { id: 'settings', icon: Settings01Icon },
  ];

  return (
    <nav className="mobile-footer">
      <div className="mobile-footer-container">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`mobile-footer-item ${activeTab === item.id ? 'active' : ''}`}
          >
            <HugeiconsIcon
              icon={item.icon}
              size={20}
              strokeWidth={1.5}
            />
          </button>
        ))}
      </div>
    </nav>
  );
}

export default MobileFooter;
