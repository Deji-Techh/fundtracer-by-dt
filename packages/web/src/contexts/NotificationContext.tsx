import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export type NotificationType = 
  | 'scan_complete' 
  | 'login' 
  | 'error' 
  | 'price_alert' 
  | 'wallet_activity'
  | 'sybil_complete'
  | 'contract_complete';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  groupId?: string;
  groupCount?: number;
  createdAt: Date;
  expiresAt?: Date;
}

export interface NotificationPreferences {
  scanComplete: boolean;
  loginAlerts: boolean;
  errors: boolean;
  priceAlerts: boolean;
  walletActivity: boolean;
  soundEnabled: boolean;
  pushEnabled: boolean;
  snoozedTypes: NotificationType[];
  snoozeUntil?: Date;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  snoozeType: (type: NotificationType, durationMs: number) => void;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => void;
  groupNotifications: (notifications: AppNotification[]) => AppNotification[];
}

const defaultPreferences: NotificationPreferences = {
  scanComplete: true,
  loginAlerts: true,
  errors: true,
  priceAlerts: true,
  walletActivity: true,
  soundEnabled: true,
  pushEnabled: false,
  snoozedTypes: [],
};

const STORAGE_KEY = 'fundtracer_notifications';
const PREFERENCES_KEY = 'fundtracer_notification_preferences';

function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleU05UH+3x7FmJxVCX8Dk2qs/');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch {}
}

async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

async function sendPushNotification(notification: AppNotification) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(notification.title, {
      body: notification.message,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: notification.id,
      data: notification.data,
    });
  } catch (error) {
    console.error('[Notifications] Push notification failed:', error);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = localStorage.getItem('fundtracer_auth_token');
    if (token) {
      return { 'Authorization': `Bearer ${token}` };
    }
  } catch {}
  return {};
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
  const [isOpen, setIsOpen] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
        })));
      }
      
      const storedPrefs = localStorage.getItem(PREFERENCES_KEY);
      if (storedPrefs) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(storedPrefs) });
      }
    } catch (error) {
      console.error('[Notifications] Failed to load from storage:', error);
    }
  }, []);

  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('[Notifications] Failed to save to storage:', error);
    }
  }, [notifications]);

  useEffect(() => {
    if (!initialized.current) return;
    try {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('[Notifications] Failed to save preferences:', error);
    }
  }, [preferences]);

  useEffect(() => {
    if (!user) return;
    
    const syncNotifications = async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/notifications', { headers });
        
        if (response.ok) {
          const data = await response.json();
          const synced = data.notifications.map((n: any) => ({
            ...n,
            createdAt: new Date(n.createdAt),
          }));
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newFromServer = synced.filter((n: AppNotification) => !existingIds.has(n.id));
            return [...prev, ...newFromServer].sort((a, b) => 
              b.createdAt.getTime() - a.createdAt.getTime()
            ).slice(0, 100);
          });
        }
      } catch (error) {
        console.error('[Notifications] Sync failed:', error);
      }
    };
    
    syncNotifications();
    const interval = setInterval(syncNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (preferences.snoozeUntil && preferences.snoozeUntil < new Date()) {
      setPreferences(prev => ({ ...prev, snoozedTypes: [], snoozeUntil: undefined }));
    }
  }, [preferences.snoozeUntil]);

  const isTypeSnoozed = useCallback((type: NotificationType) => {
    return preferences.snoozedTypes.includes(type);
  }, [preferences.snoozedTypes]);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    if (isTypeSnoozed(notification.type)) return;
    
    const id = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const newNotification: AppNotification = {
      ...notification,
      id,
      read: false,
      createdAt: new Date(),
    };
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 100));
    
    if (preferences.soundEnabled) {
      playNotificationSound();
    }
    
    if (preferences.pushEnabled) {
      sendPushNotification(newNotification);
    }
    
    if (user) {
      getAuthHeaders().then(headers => {
        fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify(newNotification),
        }).catch(() => {});
      });
    }
  }, [preferences.soundEnabled, preferences.pushEnabled, isTypeSnoozed, user]);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    
    if (user) {
      getAuthHeaders().then(headers => {
        fetch(`/api/notifications/${id}/read`, { method: 'PUT', headers }).catch(() => {});
      });
    }
  }, [user]);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    
    if (user) {
      getAuthHeaders().then(headers => {
        fetch('/api/notifications/read-all', { method: 'PUT', headers }).catch(() => {});
      });
    }
  }, [user]);

  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const snoozeType = useCallback((type: NotificationType, durationMs: number) => {
    const snoozeUntil = new Date(Date.now() + durationMs);
    setPreferences(prev => ({
      ...prev,
      snoozedTypes: [...new Set([...prev.snoozedTypes, type])],
      snoozeUntil,
    }));
  }, []);

  const updatePreferences = useCallback((prefs: Partial<NotificationPreferences>) => {
    setPreferences(prev => ({ ...prev, ...prefs }));
    
    if (prefs.pushEnabled && !preferences.pushEnabled) {
      requestPushPermission();
    }
  }, [preferences.pushEnabled]);

  const groupNotifications = useCallback((notifs: AppNotification[]): AppNotification[] => {
    const groups: Record<string, AppNotification[]> = {};
    
    notifs.forEach(n => {
      const key = `${n.type}-${n.title}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(n);
    });
    
    return Object.values(groups).flatMap(group => {
      if (group.length > 1 && ['scan_complete', 'sybil_complete', 'contract_complete'].includes(group[0].type)) {
        const merged: AppNotification = {
          ...group[0],
          id: `group-${group[0].type}-${Date.now()}`,
          message: `${group.length} ${group[0].title.toLowerCase()} notifications`,
          groupId: group[0].type,
          groupCount: group.length,
        };
        return [merged];
      }
      return group;
    });
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      preferences,
      isOpen,
      setIsOpen,
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
      snoozeType,
      updatePreferences,
      groupNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
