// useNotifications.ts - Optimized version with global manager
"use client";
import { cleanupNotifications, generateFCMToken, getDetailedDeviceType, getNotificationPermission, handleAppStartup, initTokenRefreshHandler, subscribeToMessages, setUserEnablingNotifications } from '@/app/firebase';
import { NotificationResponse, notificationService } from '@/app/services/notificationService';
import { notificationManager } from '@/lib/notificationManager';
import { useState, useEffect, useCallback, useRef } from 'react';

interface NotificationData {
  id: string;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  module?: string;
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
  fetchNotifications: () => Promise<void>;
}

// Helper function to map backend notification to frontend format
const mapBackendNotificationToFrontend = (backendNotification: NotificationResponse): NotificationData => {
  return {
    id: backendNotification.notificationId,
    title: backendNotification.module || 'System Notification',
    body: backendNotification.notificationMessage,
    timestamp: Date.now(),
    read: backendNotification.isNotificationRead,
    module: backendNotification.module,
    data: {
      module: backendNotification.module,
      originalId: backendNotification.notificationId
    }
  };
};

export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState<string>('UNKNOWN');
  
  const tokenRefreshInitialized = useRef(false);
  const messageSubscribed = useRef(false);
  const tokenSetupComplete = useRef(false);
  const fetchInProgress = useRef(false);
  const notificationsInitialized = useRef(false);

  // Function to fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    // Prevent concurrent fetch requests
    if (fetchInProgress.current) {
      console.log('🔄 Fetch already in progress, skipping...');
      return;
    }

    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      // Load from localStorage if no user logged in
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
      setIsLoading(false);
      return;
    }

    // Check if notifications were fetched recently (within 1 minute)
    const lastFetchTime = localStorage.getItem('lastNotificationFetch');
    if (lastFetchTime) {
      const timeSinceLastFetch = Date.now() - parseInt(lastFetchTime);
      if (timeSinceLastFetch < 60000) { // 1 minute cooldown
        console.log('📝 Notifications fetched recently, skipping...');
        setIsLoading(false);
        return;
      }
    }

    fetchInProgress.current = true;

    try {
      setIsLoading(true);
      const response = await notificationService.fetchAllNotifications();
      
      if (response.success && response.data) {
        const mappedNotifications = response.data.map(mapBackendNotificationToFrontend);
        
        // Sort by timestamp (newest first)
        mappedNotifications.sort((a, b) => b.timestamp - a.timestamp);
        
        setNotifications(mappedNotifications);
        
        // Calculate unread count
        const unread = mappedNotifications.filter(n => !n.read).length;
        setUnreadCount(unread);
        
        // Store in localStorage for offline access
        localStorage.setItem('notifications', JSON.stringify(mappedNotifications));
        localStorage.setItem('lastNotificationFetch', Date.now().toString());
        
        console.log('✅ Notifications fetched successfully');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      
      // Fallback to local storage if API fails
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        try {
          const parsed = JSON.parse(savedNotifications);
          setNotifications(parsed);
          setUnreadCount(parsed.filter((n: NotificationData) => !n.read).length);
        } catch (parseError) {
          console.error('Error parsing saved notifications:', parseError);
        }
      }
    } finally {
      setIsLoading(false);
      fetchInProgress.current = false;
    }
  }, []);

  // Initialize device type and app startup
  useEffect(() => {
    // Prevent multiple initializations
    if (notificationsInitialized.current) {
      console.log('🔄 Notifications already initialized, skipping...');
      return;
    }

    const initNotifications = async () => {
      try {
        // Ensure global notification manager is initialized first
        await notificationManager.ensureInitialized();
        
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
          tokenSetupComplete.current = true;
        }

        const userId = localStorage.getItem('userId');
        
        // Fetch notifications only once during initialization
        if (userId) {
          await fetchNotifications();
        }

        // Initialize token refresh handler if permission is granted and user is logged in
        if (currentPermission === 'granted' && userId && !tokenRefreshInitialized.current) {
          initTokenRefreshHandler(detectedDeviceType);
          tokenRefreshInitialized.current = true;
        }

        notificationsInitialized.current = true;

      } catch (error) {
        console.error('Error initializing notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initNotifications();
  }, []); // Remove fetchNotifications dependency to prevent re-initialization

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
        
        // Only refresh from backend if we haven't fetched recently
        const lastFetchTime = localStorage.getItem('lastNotificationFetch');
        if (!lastFetchTime || (Date.now() - parseInt(lastFetchTime)) > 30000) { // 30 seconds cooldown
          setTimeout(() => {
            fetchNotifications();
          }, 2000);
        }
      };

      subscribeToMessages(handleMessage);
      messageSubscribed.current = true;
    }
  }, [permission, fetchNotifications]);

  // Optimized enableNotifications - saves token and fetches in one flow
  const enableNotifications = useCallback(async (userId?: string) => {
    const userIdToUse = userId || localStorage.getItem('userId');
    
    if (!userIdToUse) {
      return { success: false, message: 'User ID is required' };
    }

    // Check if notifications are already enabled with a recent token
    const existingToken = localStorage.getItem('fcmToken');
    const lastSentTime = localStorage.getItem('lastTokenSentTime');
    if (existingToken && lastSentTime && permission === 'granted' && tokenSetupComplete.current) {
      const timeSinceLastSend = Date.now() - parseInt(lastSentTime);
      if (timeSinceLastSend < 300000) { // 5 minutes
        console.log('🔄 Notifications already enabled recently');
        // Still fetch notifications if not fetched recently
        const lastFetchTime = localStorage.getItem('lastNotificationFetch');
        if (!lastFetchTime || (Date.now() - parseInt(lastFetchTime)) > 60000) {
          await fetchNotifications();
        }
        return { success: true, message: 'Notifications already enabled' };
      }
    }

    // Set flag to prevent concurrent token refresh
    setUserEnablingNotifications(true);
    setIsLoading(true);
    
    try {
      console.log('🔔 Generating FCM token...');
      const result = await generateFCMToken(deviceType);
      
      if (result.success && result.token) {
        console.log('🔔 Saving token and fetching notifications...');
        // Save token to backend
        const backendResult = await notificationService.saveFCMToken(result.token, deviceType);
        
        if (backendResult.success) {
          setPermission('granted');
          setFcmToken(result.token);
          tokenSetupComplete.current = true;
          
          console.log('✅ Token saved, fetching notifications directly...');
          
          // Initialize token refresh handler if not already done
          if (!tokenRefreshInitialized.current) {
            initTokenRefreshHandler(deviceType);
            tokenRefreshInitialized.current = true;
          }
          
          // Fetch notifications directly without additional delay
          await fetchNotifications();
          
          return { success: true, message: 'Notifications enabled successfully' };
        } else {
          tokenSetupComplete.current = false;
          return { success: false, message: backendResult.message };
        }
      } else {
        tokenSetupComplete.current = false;
        return { 
          success: false, 
          message: result.message || 'Failed to enable notifications' 
        };
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      tokenSetupComplete.current = false;
      return { 
        success: false, 
        message: 'An error occurred while enabling notifications' 
      };
    } finally {
      setIsLoading(false);
      setUserEnablingNotifications(false); // Clear flag
    }
  }, [deviceType, fetchNotifications]);

  const refreshToken = useCallback(async () => {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      return { success: false, message: 'User not logged in' };
    }

    if (permission !== 'granted') {
      return { success: false, message: 'Notification permission not granted' };
    }

    // Set flag to prevent concurrent token refresh
    setUserEnablingNotifications(true);
    setIsLoading(true);
    tokenSetupComplete.current = false;
    
    try {
      // Force generate a new token
      const result = await generateFCMToken(deviceType);
      
      if (result.success && result.token) {
        // Send new token to backend and fetch notifications
        const backendResult = await notificationService.saveFCMToken(result.token, deviceType);
        
        if (backendResult.success) {
          setFcmToken(result.token);
          tokenSetupComplete.current = true;
          console.log('FCM token refreshed successfully');
          
          // Fetch notifications directly
          await fetchNotifications();
          
          return { success: true, message: 'Token refreshed successfully' };
        } else {
          return { success: false, message: backendResult.message };
        }
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
      setUserEnablingNotifications(false); // Clear flag
    }
  }, [deviceType, permission, fetchNotifications]);

  // Enhanced markAsRead function that calls backend API
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // Optimistically update UI
      setNotifications(prev =>
        prev.map(n => {
          if (n.id === notificationId && !n.read) {
            setUnreadCount(count => Math.max(0, count - 1));
            return { ...n, read: true };
          }
          return n;
        })
      );

      // Update backend
      await notificationService.markNotificationAsRead(notificationId);
      
      // Update localStorage
      const updatedNotifications = notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
      
      // Revert optimistic update on error
      setNotifications(prev =>
        prev.map(n => {
          if (n.id === notificationId && n.read) {
            setUnreadCount(count => count + 1);
            return { ...n, read: false };
          }
          return n;
        })
      );
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      // Optimistically update UI
      const unreadNotifications = notifications.filter(n => !n.read);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);

      // Mark all unread notifications as read in backend
      const markReadPromises = unreadNotifications.map(notification => 
        notificationService.markNotificationAsRead(notification.id)
      );
      
      await Promise.all(markReadPromises);
      
      // Update localStorage
      const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
      localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      
      // Refresh from server on error
      await fetchNotifications();
    }
  }, [notifications, fetchNotifications]);

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
      const filtered = prev.filter(n => n.id !== notificationId);
      localStorage.setItem('notifications', JSON.stringify(filtered));
      return filtered;
    });
  }, []);

  // Auto-refresh notifications periodically when user is logged in (reduced frequency)
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const interval = setInterval(() => {
      // Only auto-fetch if we haven't fetched recently
      const lastFetchTime = localStorage.getItem('lastNotificationFetch');
      if (!lastFetchTime || (Date.now() - parseInt(lastFetchTime)) > 4 * 60 * 1000) { // 4 minutes
        fetchNotifications();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, []); // Remove fetchNotifications dependency

  // Cleanup on unmount or logout
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Don't cleanup tokens on page refresh, only on actual logout
    };

    const handleLogout = () => {
      cleanupNotifications();
      notificationManager.reset();
      setNotifications([]);
      setUnreadCount(0);
      setFcmToken(null);
      setPermission(null);
      tokenRefreshInitialized.current = false;
      messageSubscribed.current = false;
      tokenSetupComplete.current = false;
      notificationsInitialized.current = false;
      fetchInProgress.current = false;
      // Clear fetch timestamps
      localStorage.removeItem('lastNotificationFetch');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
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
    refreshToken,
    fetchNotifications
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