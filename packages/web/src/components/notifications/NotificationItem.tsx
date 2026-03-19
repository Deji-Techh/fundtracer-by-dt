import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications, AppNotification, NotificationType } from '../../contexts/NotificationContext';
import './NotificationItem.css';

interface NotificationItemProps {
  notification: AppNotification;
}

const TYPE_CONFIG: Record<NotificationType, { emoji: string; color: string; icon: string }> = {
  scan_complete: { emoji: '🔍', color: '#6366f1', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  sybil_complete: { emoji: '👥', color: '#8b5cf6', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0' },
  contract_complete: { emoji: '📄', color: '#06b6d4', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  login: { emoji: '🔐', color: '#22c55e', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  error: { emoji: '❌', color: '#ef4444', icon: 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  price_alert: { emoji: '💰', color: '#f59e0b', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  wallet_activity: { emoji: '💸', color: '#ec4899', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification, snoozeType } = useNotifications();
  const [showMenu, setShowMenu] = useState(false);

  const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.scan_complete;

  const handleClick = () => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    if (notification.data?.navigateTo) {
      navigate(notification.data.navigateTo);
    }
  };

  const handleSnooze = (e: React.MouseEvent) => {
    e.stopPropagation();
    snoozeType(notification.type, 30 * 60 * 1000); // 30 mins
    setShowMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
    setShowMenu(false);
  };

  return (
    <div 
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      onClick={handleClick}
      style={{ '--notif-color': config.color } as React.CSSProperties}
    >
      <div className="notification-item-icon">
        {config.emoji}
      </div>
      
      <div className="notification-item-content">
        <div className="notification-item-header">
          <span className="notification-item-title">{notification.title}</span>
          <span className="notification-item-time">{formatTimeAgo(notification.createdAt)}</span>
        </div>
        <p className="notification-item-message">{notification.message}</p>
        {notification.groupCount && notification.groupCount > 1 && (
          <span className="notification-item-group">
            {notification.groupCount} notifications
          </span>
        )}
      </div>

      <div className="notification-item-actions">
        <button 
          className="notification-item-menu-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <circle cx="12" cy="6" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="12" cy="18" r="1.5" />
          </svg>
        </button>

        {showMenu && (
          <div className="notification-item-menu">
            <button onClick={handleSnooze}>Snooze 30min</button>
            <button onClick={handleDelete}>Delete</button>
          </div>
        )}
      </div>

      {!notification.read && <div className="notification-item-unread-dot" />}
    </div>
  );
}

export default NotificationItem;
