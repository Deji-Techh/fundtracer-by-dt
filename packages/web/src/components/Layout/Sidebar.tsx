import React from 'react';
import {
  Home,
  PieChart,
  Clock,
  Coins,
  ShieldCheck,
  Search,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Home size={20} />, path: '/' },
  { id: 'portfolio', label: 'Portfolio', icon: <PieChart size={20} />, path: '/portfolio' },
  { id: 'history', label: 'History', icon: <Clock size={20} />, path: '/history' },
  { id: 'defi', label: 'DeFi', icon: <Coins size={20} />, path: '/defi' },
  { id: 'safety', label: 'Safety', icon: <ShieldCheck size={20} />, path: '/safety' },
  { id: 'explorer', label: 'Token Explorer', icon: <Search size={20} />, path: '/explorer' },
  { id: 'market', label: 'Market', icon: <BarChart3 size={20} />, path: '/market' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggle,
}) => {
  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <span className="sidebar-title">Menu</span>}
        <button
          onClick={onToggle}
          className="sidebar-toggle"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-content">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-text">{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
          title={isCollapsed ? 'Settings' : undefined}
        >
          <span className="nav-item-icon">
            <Settings size={20} />
          </span>
          <span className="nav-item-text">Settings</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
