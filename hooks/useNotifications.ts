// hooks/useNotifications.ts
"use client";
import { cleanupNotifications, generateFCMToken, getDetailedDeviceType, getNotificationPermission, handleAppStartup, initTokenRefreshHandler, subscribeToMessages } from '@/app/firebase';
import { useState, useEffect, useCallback, useRef } from 'react';
// Update this path

interface NotificationData {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  data?: any;
}

interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  permission: NotificationPermission | null;
  isLoading: boolean;
  deviceType: string;
  fcmToken: string | null;
  enableNotifications: (userId?: string) => Promise<{ success: boolean; message: string }>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (notificationId: string) => void;
  refreshToken: () => Promise<{ success: boolean; message: string }>;
}

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState<string>('UNKNOWN');
  
  const tokenRefreshInitialized = useRef(false);
  const messageSubscribed = useRef(false);

  // Initialize device type and app startup
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Set device type
        const detectedDeviceType = getDetailedDeviceType();
        setDeviceType(detectedDeviceType);
        
        // Handle app startup (pre-register SW, check existing tokens)
        await handleAppStartup();
        
        // Check current permission status
        const currentPermission = getNotificationPermission();
        setPermission(currentPermission);

        // Load existing FCM token
        const existingToken = localStorage.getItem('fcmToken');
        if (existingToken) {
          setFcmToken(existingToken);
        }

        // Load notifications from localStorage if available
        const savedNotifications = localStorage.getItem('notifications');
        if (savedNotifications) {
          try {
            const parsed = JSON.parse(savedNotifications);
            setNotifications(parsed);
            setUnreadCount(parsed.filter((n: NotificationData) => !n.read).length);
          } catch (error) {
            console.error('Error parsing saved notifications:', error);
          }
        }

        // Initialize token refresh handler if permission is granted and user is logged in
        const userId = localStorage.getItem('userId');
        if (currentPermission === 'granted' && userId && !tokenRefreshInitialized.current) {
          initTokenRefreshHandler(detectedDeviceType);
          tokenRefreshInitialized.current = true;
        }

      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initNotifications();
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // Subscribe to foreground messages when permission is granted
  useEffect(() => {
    if (permission === 'granted' && !messageSubscribed.current) {
      const handleMessage = (payload: any) => {
        console.log("Received foreground message:", payload);
        
        const newNotification: NotificationData = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: payload.notification?.title || "New Notification",
          body: payload.notification?.body || "",
          timestamp: Date.now(),
          read: false,
          data: payload.data
        };

        setNotifications(prev => {
          // Avoid duplicates and limit to 50 notifications
          const filtered = prev.filter(n => n.id !== newNotification.id);
          return [newNotification, ...filtered].slice(0, 50);
        });
        
        setUnreadCount(prev => prev + 1);
      };

      subscribeToMessages(handleMessage);
      messageSubscribed.current = true;
    }
  }, [permission]);

  const enableNotifications = useCallback(async (userId?: string) => {
    const userIdToUse = userId || localStorage.getItem('userId');
    
    if (!userIdToUse) {
      return { success: false, message: 'User ID is required' };
    }

    setIsLoading(true);
    
    try {
      const result = await generateFCMToken(deviceType);
      
      if (result.success) {
        setPermission('granted');
        setFcmToken(result.token || null);
        
        // Initialize token refresh handler if not already done
        if (!tokenRefreshInitialized.current) {
          initTokenRefreshHandler(deviceType);
          tokenRefreshInitialized.current = true;
        }
        
        return { success: true, message: 'Notifications enabled successfully' };
      } else {
        return { 
          success: false, 
          message: result.message || 'Failed to enable notifications' 
        };
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      return { 
        success: false, 
        message: 'An error occurred while enabling notifications' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [deviceType]);

  const refreshToken = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      return { success: false, message: 'User not logged in' };
    }

    if (permission !== 'granted') {
      return { success: false, message: 'Notification permission not granted' };
    }

    setIsLoading(true);
    
    try {
      // Force generate a new token
      const result = await generateFCMToken(deviceType);
      
      if (result.success) {
        setFcmToken(result.token || null);
        console.log('FCM token refreshed successfully');
        return { success: true, message: 'Token refreshed successfully' };
      } else {
        return { 
          success: false, 
          message: result.message || 'Failed to refresh token' 
        };
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return { 
        success: false, 
        message: 'An error occurred while refreshing token' 
      };
    } finally {
      setIsLoading(false);
    }
  }, [deviceType, permission]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => {
        if (n.id === notificationId && !n.read) {
          setUnreadCount(count => Math.max(0, count - 1));
          return { ...n, read: true };
        }
        return n;
      })
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    localStorage.removeItem('notifications');
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  }, []);

  // Cleanup on unmount or logout
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't cleanup tokens on page refresh, only on actual logout
    };

    const handleLogout = () => {
      cleanupNotifications();
      setNotifications([]);
      setUnreadCount(0);
      setFcmToken(null);
      setPermission(null);
      tokenRefreshInitialized.current = false;
      messageSubscribed.current = false;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Listen for custom logout event
    window.addEventListener('user-logout', handleLogout);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('user-logout', handleLogout);
    };
  }, []);

  return {
    notifications,
    unreadCount,
    permission,
    isLoading,
    deviceType,
    fcmToken,
    enableNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    refreshToken
  };
}

// Helper function to dispatch logout event
export const dispatchLogoutEvent = () => {
  window.dispatchEvent(new CustomEvent('user-logout'));
};

// Hook for debugging notification info
export function useNotificationDebug() {
  const [debugInfo, setDebugInfo] = useState({
    permission: null as NotificationPermission | null,
    isSupported: false,
    deviceType: 'UNKNOWN',
    hasToken: false,
    tokenValue: null as string | null
  });

  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        permission: getNotificationPermission(),
        isSupported: 'Notification' in window,
        deviceType: getDetailedDeviceType(),
        hasToken: !!localStorage.getItem('fcmToken'),
        tokenValue: localStorage.getItem('fcmToken')
      });
    };

    updateDebugInfo();
    
    // Update debug info periodically
    const interval = setInterval(updateDebugInfo, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return debugInfo;
}