/**
 * Panel - Collapsible container component
 */

import React, { useState } from 'react';
import './Panel.css';

interface PanelProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  headerRight?: React.ReactNode;
  noPadding?: boolean;
  className?: string;
  variant?: 'default' | 'transparent' | 'bordered';
}

export function Panel({
  title,
  subtitle,
  icon,
  children,
  collapsible = false,
  defaultCollapsed = false,
  headerRight,
  noPadding = false,
  className = '',
  variant = 'default'
}: PanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  const hasHeader = title || subtitle || icon || headerRight;

  return (
    <div className={`intel-panel intel-panel--${variant} ${isCollapsed ? 'intel-panel--collapsed' : ''} ${className}`}>
      {hasHeader && (
        <div 
          className={`intel-panel__header ${collapsible ? 'intel-panel__header--clickable' : ''}`}
          onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        >
          <div className="intel-panel__header-left">
            {icon && <span className="intel-panel__icon">{icon}</span>}
            <div className="intel-panel__titles">
              {title && <h3 className="intel-panel__title">{title}</h3>}
              {subtitle && <p className="intel-panel__subtitle">{subtitle}</p>}
            </div>
          </div>
          
          <div className="intel-panel__header-right">
            {headerRight}
            {collapsible && (
              <span className={`intel-panel__chevron ${isCollapsed ? 'intel-panel__chevron--collapsed' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </div>
        </div>
      )}
      
      {!isCollapsed && (
        <div className={`intel-panel__content ${noPadding ? 'intel-panel__content--no-padding' : ''}`}>
          {children}
        </div>
      )}
    </div>
  );
}

// Simple panel header component for custom layouts
interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export function PanelHeader({ title, subtitle, icon, right, className = '' }: PanelHeaderProps) {
  return (
    <div className={`intel-panel-header ${className}`}>
      <div className="intel-panel-header__left">
        {icon && <span className="intel-panel-header__icon">{icon}</span>}
        <div>
          <h3 className="intel-panel-header__title">{title}</h3>
          {subtitle && <p className="intel-panel-header__subtitle">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="intel-panel-header__right">{right}</div>}
    </div>
  );
}

export default Panel;
