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
    <div className="app-container">
      {/* Sticky Header - Full Width at Top Level */}
      {header && (
        <header className="app-header">
          {header}
        </header>
      )}

      {/* Main Layout with Sidebar and Content */}
      <div className="main-layout">
        <Sidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default FullScreenLayout;
