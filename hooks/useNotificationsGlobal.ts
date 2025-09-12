// Global notification state manager to prevent multiple hook instances
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

// Global notification state
class GlobalNotificationState {
  private static instance: GlobalNotificationState;
  private subscribers: Set<Function> = new Set();
  private state = {
    notifications: [] as NotificationData[],
    unreadCount: 0,
    permission: null as NotificationPermission | null,
    isLoading: true,
    fcmToken: null as string | null,
    deviceType: 'UNKNOWN'
  };

  // Control flags
  private tokenRefreshInitialized = false;
  private messageSubscribed = false;
  private tokenSetupComplete = false;
  private fetchInProgress = false;
  private notificationsInitialized = false;
  private globalInitialized = false;

  private constructor() {}

  public static getInstance(): GlobalNotificationState {
    if (!GlobalNotificationState.instance) {
      GlobalNotificationState.instance = new GlobalNotificationState();
    }
    return GlobalNotificationState.instance;
  }

  public subscribe(callback: Function): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach(callback => callback(this.state));
  }

  private setState(newState: Partial<typeof this.state>) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  public getState() {
    return { ...this.state };
  }

  // Initialize global notification system (called only once)
  public async initialize(): Promise<void> {
    if (this.globalInitialized) {
      console.log('🔄 Global notifications already initialized');
      return;
    }

    console.log('🔄 Initializing global notification system...');
    this.globalInitialized = true;

    try {
      // Ensure global notification manager is initialized
      await notificationManager.ensureInitialized();
      
      // Set device type
      const detectedDeviceType = getDetailedDeviceType();
      this.setState({ deviceType: detectedDeviceType });
      
      // Handle app startup (pre-register SW, check existing tokens)
      await handleAppStartup();
      
      // Check current permission status
      const currentPermission = getNotificationPermission();
      this.setState({ permission: currentPermission });

      // Load existing FCM token
      const existingToken = localStorage.getItem('fcmToken');
      if (existingToken) {
        this.setState({ fcmToken: existingToken });
        this.tokenSetupComplete = true;
      }

      const userId = localStorage.getItem('userId');
      
      // Fetch notifications only once during initialization
      if (userId) {
        await this.fetchNotifications();
      }

      // Initialize token refresh handler if permission is granted and user is logged in
      if (currentPermission === 'granted' && userId && !this.tokenRefreshInitialized) {
        initTokenRefreshHandler(detectedDeviceType);
        this.tokenRefreshInitialized = true;
      }

      // Subscribe to foreground messages
      if (currentPermission === 'granted' && !this.messageSubscribed) {
        this.subscribeToMessages();
      }

      console.log('✅ Global notification system initialized');
    } catch (error) {
      console.error('❌ Error initializing global notifications:', error);
    } finally {
      this.setState({ isLoading: false });
    }
  }

  // Fetch notifications with global protection
  public async fetchNotifications(): Promise<void> {
    if (this.fetchInProgress) {
      console.log('🔄 Fetch already in progress globally, skipping...');
      return;
    }

    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        try {
          const parsed = JSON.parse(savedNotifications);
          this.setState({ 
            notifications: parsed,
            unreadCount: parsed.filter((n: NotificationData) => !n.read).length
          });
        } catch (error) {
          console.error('Error parsing saved notifications:', error);
        }
      }
      this.setState({ isLoading: false });
      return;
    }

    // Check if notifications were fetched recently
    const lastFetchTime = localStorage.getItem('lastNotificationFetch');
    if (lastFetchTime) {
      const timeSinceLastFetch = Date.now() - parseInt(lastFetchTime);
      if (timeSinceLastFetch < 60000) { // 1 minute cooldown
        console.log('📝 Notifications fetched recently globally, skipping...');
        this.setState({ isLoading: false });
        return;
      }
    }

    this.fetchInProgress = true;
    this.setState({ isLoading: true });

    try {
      console.log('🔄 Fetching notifications globally...');
      const response = await notificationService.fetchAllNotifications();
      
      if (response.success && response.data) {
        const mappedNotifications = response.data.map(mapBackendNotificationToFrontend);
        
        // Sort by timestamp (newest first)
        mappedNotifications.sort((a, b) => b.timestamp - a.timestamp);
        
        const unread = mappedNotifications.filter(n => !n.read).length;
        
        this.setState({
          notifications: mappedNotifications,
          unreadCount: unread
        });
        
        // Store in localStorage for offline access
        localStorage.setItem('notifications', JSON.stringify(mappedNotifications));
        localStorage.setItem('lastNotificationFetch', Date.now().toString());
        
        console.log('✅ Notifications fetched successfully globally');
      }
    } catch (error) {
      console.error('❌ Error fetching notifications globally:', error);
      
      // Fallback to local storage if API fails
      const savedNotifications = localStorage.getItem('notifications');
      if (savedNotifications) {
        try {
          const parsed = JSON.parse(savedNotifications);
          this.setState({
            notifications: parsed,
            unreadCount: parsed.filter((n: NotificationData) => !n.read).length
          });
        } catch (parseError) {
          console.error('Error parsing saved notifications:', parseError);
        }
      }
    } finally {
      this.setState({ isLoading: false });
      this.fetchInProgress = false;
    }
  }

  // Enable notifications globally
  public async enableNotifications(userId?: string): Promise<{ success: boolean; message: string }> {
    const userIdToUse = userId || localStorage.getItem('userId');
    
    if (!userIdToUse) {
      return { success: false, message: 'User ID is required' };
    }

    // Check if notifications are already enabled with a recent token
    const existingToken = localStorage.getItem('fcmToken');
    const lastSentTime = localStorage.getItem('lastTokenSentTime');
    if (existingToken && lastSentTime && this.state.permission === 'granted' && this.tokenSetupComplete) {
      const timeSinceLastSend = Date.now() - parseInt(lastSentTime);
      if (timeSinceLastSend < 300000) { // 5 minutes
        console.log('🔄 Notifications already enabled recently globally');
        return { success: true, message: 'Notifications already enabled' };
      }
    }

    setUserEnablingNotifications(true);
    this.setState({ isLoading: true });
    
    try {
      console.log('🔔 Generating FCM token globally...');
      const result = await generateFCMToken(this.state.deviceType);
      
      if (result.success && result.token) {
        console.log('🔔 Saving token globally...');
        const backendResult = await notificationService.saveFCMToken(result.token, this.state.deviceType);
        
        if (backendResult.success) {
          this.setState({ 
            permission: 'granted',
            fcmToken: result.token 
          });
          this.tokenSetupComplete = true;
          
          console.log('✅ Token saved globally, fetching notifications...');
          
          // Initialize token refresh handler if not already done
          if (!this.tokenRefreshInitialized) {
            initTokenRefreshHandler(this.state.deviceType);
            this.tokenRefreshInitialized = true;
          }
          
          // Subscribe to messages if not already done
          if (!this.messageSubscribed) {
            this.subscribeToMessages();
          }
          
          // Fetch notifications
          await this.fetchNotifications();
          
          return { success: true, message: 'Notifications enabled successfully' };
        } else {
          this.tokenSetupComplete = false;
          return { success: false, message: backendResult.message };
        }
      } else {
        this.tokenSetupComplete = false;
        return { 
          success: false, 
          message: result.message || 'Failed to enable notifications' 
        };
      }
    } catch (error) {
      console.error('❌ Error enabling notifications globally:', error);
      this.tokenSetupComplete = false;
      return { 
        success: false, 
        message: 'An error occurred while enabling notifications' 
      };
    } finally {
      this.setState({ isLoading: false });
      setUserEnablingNotifications(false);
    }
  }

  // Subscribe to foreground messages
  private subscribeToMessages(): void {
    if (this.messageSubscribed) return;

    const handleMessage = (payload: any) => {
      console.log("📩 Received foreground message globally:", payload);
      
      const newNotification: NotificationData = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: payload.notification?.title || "New Notification",
        body: payload.notification?.body || "",
        timestamp: Date.now(),
        read: false,
        data: payload.data
      };

      this.setState({
        notifications: [newNotification, ...this.state.notifications].slice(0, 50),
        unreadCount: this.state.unreadCount + 1
      });
      
      // Refresh from backend if we haven't fetched recently
      const lastFetchTime = localStorage.getItem('lastNotificationFetch');
      if (!lastFetchTime || (Date.now() - parseInt(lastFetchTime)) > 30000) {
        setTimeout(() => {
          this.fetchNotifications();
        }, 2000);
      }
    };

    subscribeToMessages(handleMessage);
    this.messageSubscribed = true;
  }

  // Mark notification as read
  public markAsRead(notificationId: string): void {
    const updatedNotifications = this.state.notifications.map(notification => {
      if (notification.id === notificationId && !notification.read) {
        return { ...notification, read: true };
      }
      return notification;
    });

    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    
    this.setState({
      notifications: updatedNotifications,
      unreadCount
    });

    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));

    // Mark as read on backend
    try {
      notificationService.markNotificationAsRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  // Mark all as read
  public markAllAsRead(): void {
    const updatedNotifications = this.state.notifications.map(notification => ({
      ...notification,
      read: true
    }));

    this.setState({
      notifications: updatedNotifications,
      unreadCount: 0
    });

    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
  }

  // Clear all notifications
  public clearAll(): void {
    this.setState({
      notifications: [],
      unreadCount: 0
    });
    localStorage.removeItem('notifications');
  }

  // Remove notification
  public removeNotification(notificationId: string): void {
    const notification = this.state.notifications.find(n => n.id === notificationId);
    const filtered = this.state.notifications.filter(n => n.id !== notificationId);
    
    this.setState({
      notifications: filtered,
      unreadCount: notification && !notification.read 
        ? Math.max(0, this.state.unreadCount - 1)
        : this.state.unreadCount
    });

    localStorage.setItem('notifications', JSON.stringify(filtered));
  }

  // Refresh token
  public async refreshToken(): Promise<{ success: boolean; message: string }> {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      return { success: false, message: 'User not logged in' };
    }

    if (this.state.permission !== 'granted') {
      return { success: false, message: 'Notification permission not granted' };
    }

    setUserEnablingNotifications(true);
    this.setState({ isLoading: true });
    this.tokenSetupComplete = false;
    
    try {
      const result = await generateFCMToken(this.state.deviceType);
      
      if (result.success && result.token) {
        const backendResult = await notificationService.saveFCMToken(result.token, this.state.deviceType);
        
        if (backendResult.success) {
          this.setState({ fcmToken: result.token });
          this.tokenSetupComplete = true;
          console.log('FCM token refreshed successfully globally');
          
          await this.fetchNotifications();
          
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
      console.error('Error refreshing token globally:', error);
      return { 
        success: false, 
        message: 'An error occurred while refreshing token' 
      };
    } finally {
      this.setState({ isLoading: false });
      setUserEnablingNotifications(false);
    }
  }

  // Reset global state (on logout)
  public reset(): void {
    console.log('🧹 Resetting global notification state...');
    cleanupNotifications();
    notificationManager.reset();
    
    this.state = {
      notifications: [],
      unreadCount: 0,
      permission: null,
      isLoading: true,
      fcmToken: null,
      deviceType: 'UNKNOWN'
    };
    
    this.tokenRefreshInitialized = false;
    this.messageSubscribed = false;
    this.tokenSetupComplete = false;
    this.fetchInProgress = false;
    this.notificationsInitialized = false;
    this.globalInitialized = false;
    
    // Clear all timing data
    localStorage.removeItem('lastNotificationFetch');
    localStorage.removeItem('lastTokenSentTime');
    localStorage.removeItem('lastSentFCMToken');
    localStorage.removeItem('lastTokenCheckTime');
    localStorage.removeItem('lastNotificationEnabled');
    localStorage.removeItem('lastNotificationRefresh');
    
    this.notify();
  }
}

const globalNotificationState = GlobalNotificationState.getInstance();

// Custom hook that uses the global state
export function useNotifications(): UseNotificationsReturn {
  const [state, setState] = useState(globalNotificationState.getState());

  useEffect(() => {
    // Subscribe to global state changes
    const unsubscribe = globalNotificationState.subscribe(setState);

    // Initialize global system only once
    globalNotificationState.initialize();

    return unsubscribe;
  }, []);

  // Return methods bound to global state
  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    permission: state.permission,
    isLoading: state.isLoading,
    deviceType: state.deviceType,
    fcmToken: state.fcmToken,
    enableNotifications: globalNotificationState.enableNotifications.bind(globalNotificationState),
    markAsRead: globalNotificationState.markAsRead.bind(globalNotificationState),
    markAllAsRead: globalNotificationState.markAllAsRead.bind(globalNotificationState),
    clearAll: globalNotificationState.clearAll.bind(globalNotificationState),
    removeNotification: globalNotificationState.removeNotification.bind(globalNotificationState),
    refreshToken: globalNotificationState.refreshToken.bind(globalNotificationState),
    fetchNotifications: globalNotificationState.fetchNotifications.bind(globalNotificationState)
  };
}

// Helper function to dispatch logout event
export const dispatchLogoutEvent = () => {
  globalNotificationState.reset();
  window.dispatchEvent(new CustomEvent('user-logout'));
};
