import React, { useState } from 'react';
import { Sidebar } from './Sidebar';

interface FullScreenLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  header?: React.ReactNode;
}

export const FullScreenLayout: React.FC<FullScreenLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
  header,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Sticky Header - Full Width at Top Level */}
      {header && (
        <header className="app-header">
          {header}
        </header>
      )}

      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default FullScreenLayout;
