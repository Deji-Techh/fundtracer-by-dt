import React, { useEffect, useRef } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationItem } from './NotificationItem';
import './NotificationPanel.css';

export function NotificationPanel() {
  const { 
    notifications, 
    unreadCount, 
    isOpen, 
    setIsOpen, 
    markAllAsRead, 
    clearAll,
    preferences,
    updatePreferences,
    groupNotifications,
  } = useNotifications();

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const groupedNotifications = groupNotifications(notifications);

  return (
    <div className="notification-panel" ref={panelRef}>
      <div className="notification-panel-header">
        <div className="notification-panel-title">
          <h3>Notifications</h3>
          {unreadCount > 0 && (
            <span className="notification-panel-count">{unreadCount} new</span>
          )}
        </div>
        
        <div className="notification-panel-actions">
          {unreadCount > 0 && (
            <button 
              className="notification-panel-btn"
              onClick={markAllAsRead}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 4"/>
              </svg>
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="notification-panel-prefs">
        <label className="notification-pref-item">
          <input
            type="checkbox"
            checked={preferences.soundEnabled}
            onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 11 13 11 19 6 9 11 5"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
          <span>Sound</span>
        </label>
        <label className="notification-pref-item">
          <input
            type="checkbox"
            checked={preferences.pushEnabled}
            onChange={(e) => updatePreferences({ pushEnabled: e.target.checked })}
          />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span>Push</span>
        </label>
      </div>

      <div className="notification-panel-list">
        {groupedNotifications.length === 0 ? (
          <div className="notification-panel-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <p>No notifications yet</p>
            <span>We'll notify you when something happens</span>
          </div>
        ) : (
          groupedNotifications.map(notification => (
            <NotificationItem key={notification.id} notification={notification} />
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notification-panel-footer">
          <button 
            className="notification-panel-clear"
            onClick={clearAll}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            Clear all notifications
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
