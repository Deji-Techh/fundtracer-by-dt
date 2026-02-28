import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../common/ThemeToggle';
import { useIsMobile } from '../../hooks/useIsMobile';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { 
    id: 'home', 
    label: 'Home', 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    )
  },
  { 
    id: 'portfolio', 
    label: 'Portfolio', 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="18" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    )
  },
  { 
    id: 'sybil', 
    label: 'Sybil', 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    )
  },
  { 
    id: 'history', 
    label: 'History', 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    )
  },
];

const bottomNavItems: NavItem[] = [
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    )
  },
];

interface AppLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppLayout({ children, activeTab, onTabChange }: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const isExpanded = !isCollapsed || isHovered;

  const handleNavClick = (itemId: string) => {
    if (itemId === 'home') {
      navigate('/');
    } else {
      onTabChange(itemId);
    }
  };

  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', paddingTop: 64 }}>
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="ios-sidebar"
        style={{
          position: 'fixed',
          left: 16,
          top: 80,
          bottom: 16,
          width: isExpanded ? 240 : 72,
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          WebkitBackdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          overflow: 'hidden',
        }}
      >
        <nav style={{ flex: 1, padding: '16px 12px', overflow: 'hidden' }}>
          <motion.div
            animate={{ opacity: isExpanded ? 1 : 0, height: isExpanded ? 'auto' : 0 }}
            transition={{ duration: 0.15 }}
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              padding: '0 12px',
              marginBottom: 8,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            Navigation
          </motion.div>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              isExpanded={isExpanded}
              onClick={() => handleNavClick(item.id)}
            />
          ))}

          <motion.div
            animate={{ opacity: isExpanded ? 1 : 0, height: isExpanded ? 'auto' : 0 }}
            transition={{ duration: 0.15 }}
            style={{
              fontSize: '0.6875rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-text-muted)',
              padding: '0 12px',
              marginTop: 24,
              marginBottom: 8,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }}
          >
            Quick Access
          </motion.div>
        </nav>

        <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)' }}>
          <NavItem
            item={bottomNavItems[0]}
            isActive={activeTab === bottomNavItems[0].id}
            isExpanded={isExpanded}
            onClick={() => onTabChange(bottomNavItems[0].id)}
          />

          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: 'var(--color-bg-hover)' }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 'var(--radius-lg)',
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              marginTop: 8,
              transition: 'all 0.2s',
            }}
          >
            {isCollapsed ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            )}
            <motion.span
              animate={{ opacity: isExpanded ? 1 : 0 }}
              style={{
                fontSize: '0.875rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {isCollapsed ? 'Expand' : 'Collapse'}
            </motion.span>
          </motion.button>
        </div>
      </motion.aside>

      <motion.main
        initial={false}
        animate={{ marginLeft: isExpanded ? 264 : 96 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{
          flex: 1,
          minHeight: 'calc(100vh - 64px)',
          padding: 16,
        }}
      >
        {children}
      </motion.main>
    </div>
  );
}

interface NavItemProps {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
}

function NavItem({ item, isActive, isExpanded, onClick }: NavItemProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, backgroundColor: 'var(--color-bg-hover)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 12px',
        borderRadius: 'var(--radius-lg)',
        border: 'none',
        background: isActive ? 'var(--color-accent-muted)' : 'transparent',
        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        marginBottom: 4,
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 4,
            bottom: 4,
            width: 3,
            background: 'var(--color-accent)',
            borderRadius: 'var(--radius-full)',
          }}
        />
      )}
      <span style={{ color: isActive ? 'var(--color-accent)' : 'currentColor' }}>
        {item.icon}
      </span>
      <motion.span
        animate={{ opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.15 }}
        style={{
          fontSize: '0.875rem',
          fontWeight: isActive ? 600 : 500,
          whiteSpace: 'nowrap',
        }}
      >
        {item.label}
      </motion.span>
    </motion.button>
  );
}

export default AppLayout;
