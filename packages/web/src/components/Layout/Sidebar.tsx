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
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && (
          <span style={{ fontWeight: 600, fontSize: '1.125rem', color: '#1a1a1a' }}>
            FundTracer
          </span>
        )}
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666666',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f5f5f5';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className="sidebar-content">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span className="nav-item-text">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <div
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => onTabChange('settings')}
        >
          <span className="nav-item-icon">
            <Settings size={20} />
          </span>
          <span className="nav-item-text">Settings</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
