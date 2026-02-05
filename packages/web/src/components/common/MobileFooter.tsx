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
              size={18}
              strokeWidth={2}
            />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default MobileFooter;
