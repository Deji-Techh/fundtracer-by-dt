import React from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  
  const navItems = [
    { id: 'home', icon: Home01Icon },
    { id: 'portfolio', icon: Wallet01Icon },
    { id: 'sybil', icon: Shield01Icon },
    { id: 'history', icon: Clock01Icon },
    { id: 'settings', icon: Settings01Icon },
  ];

  const handleNavClick = (itemId: string) => {
    if (itemId === 'home') {
      navigate('/');
    } else {
      onTabChange(itemId);
    }
  };

  return (
    <nav className="mobile-footer">
      <div className="mobile-footer-container">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavClick(item.id)}
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
