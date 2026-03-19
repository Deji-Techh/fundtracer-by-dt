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
              Mark all read
            </button>
          )}
          <button 
            className="notification-panel-btn settings"
            onClick={() => {
              // Toggle settings view - could add a settings panel
            }}
            title="Notification Settings"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="notification-panel-prefs">
        <label className="notification-pref-item">
          <input
            type="checkbox"
            checked={preferences.soundEnabled}
            onChange={(e) => updatePreferences({ soundEnabled: e.target.checked })}
          />
          <span>Sound</span>
        </label>
        <label className="notification-pref-item">
          <input
            type="checkbox"
            checked={preferences.pushEnabled}
            onChange={(e) => updatePreferences({ pushEnabled: e.target.checked })}
          />
          <span>Push</span>
        </label>
      </div>

      <div className="notification-panel-list">
        {groupedNotifications.length === 0 ? (
          <div className="notification-panel-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
            Clear all notifications
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
