import React from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import './NotificationBell.css';

export function NotificationBell() {
  const { unreadCount, setIsOpen, isOpen } = useNotifications();

  return (
    <button 
      className={`notification-bell ${isOpen ? 'active' : ''}`}
      onClick={() => setIsOpen(!isOpen)}
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
    >
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="notification-bell-icon"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      
      {unreadCount > 0 && (
        <span className="notification-bell-badge">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
      
      {unreadCount > 0 && (
        <span className="notification-bell-dot" />
      )}
    </button>
  );
}

export default NotificationBell;
