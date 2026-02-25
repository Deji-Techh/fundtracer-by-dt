import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Home01Icon,
  Wallet01Icon,
  Clock01Icon,
  Shield01Icon,
  Settings01Icon,
  FavouriteIcon,
  SidebarLeft01Icon,
  SidebarRight01Icon,
} from '@hugeicons/core-free-icons';
import { useIsMobile } from '../../hooks/useIsMobile';

interface NavItem {
  id: string;
  label: string;
  icon: any;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home01Icon },
  { id: 'portfolio', label: 'Portfolio', icon: Wallet01Icon },
  { id: 'sybil', label: 'Sybil', icon: Shield01Icon },
  { id: 'history', label: 'History', icon: Clock01Icon },
];

const bottomNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: Settings01Icon },
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

  const isExpanded = !isCollapsed || isHovered;

  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isExpanded ? 240 : 72 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          position: 'fixed',
          left: 0,
          top: 64,
          bottom: 0,
          background: 'var(--color-bg)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          overflow: 'visible',
        }}
      >
        {/* Main Navigation */}
        <nav style={{ flex: 1, padding: '16px 12px', overflow: 'hidden' }}>
          <div style={{ marginBottom: 24 }}>
            <motion.div
              animate={{ opacity: isExpanded ? 1 : 0 }}
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
                height: isExpanded ? 'auto' : 0,
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
                onClick={() => {
                  console.log('Nav clicked:', item.id, 'current activeTab:', activeTab);
                  onTabChange(item.id);
                }}
              />
            ))}
          </div>

          <div>
            <motion.div
              animate={{ opacity: isExpanded ? 1 : 0 }}
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
                height: isExpanded ? 'auto' : 0,
                overflow: 'hidden',
              }}
            >
              Quick Access
            </motion.div>
            <NavItem
              item={{ id: 'watchlist', label: 'Watchlist', icon: FavouriteIcon }}
              isActive={false}
              isExpanded={isExpanded}
              onClick={() => {}}
              disabled
            />
          </div>
        </nav>

        {/* Bottom Section */}
        <div style={{ padding: '12px', borderTop: '1px solid var(--color-border)' }}>
          {bottomNavItems.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              isExpanded={isExpanded}
              onClick={() => onTabChange(item.id)}
            />
          ))}

          {/* Collapse Toggle */}
          <motion.button
            whileHover={{ backgroundColor: 'var(--color-bg-hover)' }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              marginTop: 8,
              transition: 'color 0.2s',
            }}
          >
            <HugeiconsIcon
              icon={isCollapsed ? SidebarRight01Icon : SidebarLeft01Icon}
              size={20}
              strokeWidth={1.5}
            />
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

      {/* Main Content */}
      <motion.main
        initial={false}
        animate={{ marginLeft: isExpanded ? 240 : 72 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        style={{
          flex: 1,
          marginTop: 64,
          minHeight: 'calc(100vh - 64px)',
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
  disabled?: boolean;
}

function NavItem({ item, isActive, isExpanded, onClick, disabled }: NavItemProps) {
  return (
    <motion.button
      whileHover={{ backgroundColor: disabled ? 'transparent' : 'var(--color-bg-hover)' }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '10px 12px',
        paddingLeft: isActive ? 9 : 12,
        borderRadius: 8,
        border: 'none',
        background: isActive ? 'var(--color-bg-elevated)' : 'transparent',
        color: isActive ? 'var(--color-text-primary)' : disabled ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        marginBottom: 4,
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {isActive && (
        <motion.div
          style={{
            position: 'absolute',
            left: 0,
            top: 4,
            bottom: 4,
            width: 3,
            background: 'var(--color-accent)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      <HugeiconsIcon icon={item.icon} size={20} strokeWidth={1.5} />
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
