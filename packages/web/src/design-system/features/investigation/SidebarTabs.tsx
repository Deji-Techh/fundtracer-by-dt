import React from 'react';

export type SidebarTab = 'history' | 'pins' | 'members';

interface SidebarTabsProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  pinCount?: number;
  onlineCount?: number;
  memberCount?: number;
}

export function SidebarTabs({ activeTab, onTabChange, pinCount, onlineCount, memberCount }: SidebarTabsProps) {
  const tabs: { id: SidebarTab; label: string; badge?: number }[] = [
    { id: 'history', label: 'History' },
    { id: 'pins', label: 'Evidence', badge: pinCount },
    { id: 'members', label: 'Members', badge: memberCount },
  ];

  return (
    <div className="ir-sidebar-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`ir-sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="ir-tab-badge">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
