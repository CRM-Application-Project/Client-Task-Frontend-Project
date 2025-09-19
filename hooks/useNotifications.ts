// FIXED: Single instance notification hook with proper API call control
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

// Global singleton state to prevent multiple instances
class NotificationState {
  private static instance: NotificationState | null = null;
  private subscribers = new Set<(state: any) => void>();
  private isInitialized = false;
  private isDestroyed = false;
  
  // State
  public notifications: NotificationData[] = [];
  public unreadCount: number = 0;
  public permission: NotificationPermission | null = null;
  public isLoading: boolean = true;
  public fcmToken: string | null = null;
  public deviceType: string = 'UNKNOWN';
  
  // Control flags - these are the key fix
  private fetchPromise: Promise<void> | null = null;
  private lastFetchTime: number = 0;
  private isCurrentlyFetching: boolean = false;
  
  private tokenRefreshInitialized = false;
  private messageSubscribed = false;
  private appStartupHandled = false;

  private constructor() {}

  static getInstance(): NotificationState {
    if (!NotificationState.instance || NotificationState.instance.isDestroyed) {
      NotificationState.instance = new NotificationState();
    }
    return NotificationState.instance;
  }

  subscribe(callback: (state: any) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    if (this.isDestroyed) return;
    const state = {
      notifications: [...this.notifications],
      unreadCount: this.unreadCount,
      permission: this.permission,
      isLoading: this.isLoading,
      fcmToken: this.fcmToken,
      deviceType: this.deviceType
    };
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('Error in notification subscriber:', error);
      }
    });
  }

  // CRITICAL FIX: Single initialization
  async initialize(): Promise<void> {
    if (this.isInitialized || this.isDestroyed) {
      console.log('Notifications already initialized or destroyed, skipping');
      return;
    }

    this.isInitialized = true;
    console.log('Initializing notification system...');

    try {
      // Initialize notification manager
      await notificationManager.ensureInitialized();
      
      // Set device type
      this.deviceType = getDetailedDeviceType();
      
      // Handle app startup once
      if (!this.appStartupHandled) {
        await handleAppStartup();
        this.appStartupHandled = true;
      }
      
      // Check permission
      this.permission = getNotificationPermission();
      
      // Load existing token
      const existingToken = localStorage.getItem('fcmToken');
      if (existingToken) {
        this.fcmToken = existingToken;
      }

      // Load notifications from localStorage first
      this.loadFromLocalStorage();
      
      // Only fetch from API if user is logged in and we haven't fetched recently
      const userId = localStorage.getItem('userId');
      if (userId) {
        // Fetch notifications with proper debouncing
        await this.fetchNotifications();
      }

      // Initialize handlers if needed
      if (this.permission === 'granted' && userId && !this.tokenRefreshInitialized) {
        initTokenRefreshHandler(this.deviceType);
        this.tokenRefreshInitialized = true;
      }

      if (this.permission === 'granted' && !this.messageSubscribed) {
        this.subscribeToMessages();
      }

    } catch (error) {
      console.error('Error initializing notifications:', error);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  private loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.notifications = parsed;
        this.unreadCount = parsed.filter((n: NotificationData) => !n.read).length;
      }
    } catch (error) {
      console.error('Error loading notifications from localStorage:', error);
    }
  }

  // CRITICAL FIX: Prevent multiple simultaneous API calls
  async fetchNotifications(): Promise<void> {
    const now = Date.now();
    
    // If we're currently fetching, wait for that to complete
    if (this.fetchPromise) {
      console.log('Fetch already in progress, waiting for completion...');
      await this.fetchPromise;
      return;
    }

    // Don't fetch if we fetched very recently (1 minute cooldown)
    if (now - this.lastFetchTime < 60000) {
      console.log('Recently fetched notifications, skipping');
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.log('No user ID, not fetching notifications');
      return;
    }

    // Create the fetch promise and store it to prevent concurrent calls
    this.fetchPromise = this.performFetch();
    
    try {
      await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async performFetch(): Promise<void> {
    if (this.isCurrentlyFetching) {
      console.log('Already fetching, skipping duplicate call');
      return;
    }

    this.isCurrentlyFetching = true;
    this.lastFetchTime = Date.now();

    console.log('Starting notification fetch...');
    
    try {
      const response = await notificationService.fetchAllNotifications();
      
      if (response.success && response.data) {
        const mappedNotifications = response.data.map(this.mapBackendNotification);
        mappedNotifications.sort((a, b) => b.timestamp - a.timestamp);
        
        this.notifications = mappedNotifications;
        this.unreadCount = mappedNotifications.filter(n => !n.read).length;
        
        localStorage.setItem('notifications', JSON.stringify(mappedNotifications));
        localStorage.setItem('lastNotificationFetch', this.lastFetchTime.toString());
        
        console.log(`Fetched ${mappedNotifications.length} notifications successfully`);
        this.notify();
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      this.isCurrentlyFetching = false;
    }
  }

  private mapBackendNotification = (backendNotification: NotificationResponse): NotificationData => {
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
  }

  private subscribeToMessages() {
    if (this.messageSubscribed) return;

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

      this.notifications = [newNotification, ...this.notifications].slice(0, 50);
      this.unreadCount += 1;
      this.notify();
      
      // Don't auto-fetch after receiving message to avoid call storm
      console.log('New message received, not triggering auto-fetch');
    };

    subscribeToMessages(handleMessage);
    this.messageSubscribed = true;
  }

  async enableNotifications(userId?: string): Promise<{ success: boolean; message: string }> {
    const userIdToUse = userId || localStorage.getItem('userId');
    
    if (!userIdToUse) {
      return { success: false, message: 'User ID is required' };
    }

    setUserEnablingNotifications(true);
    this.isLoading = true;
    this.notify();
    
    try {
      const result = await generateFCMToken(this.deviceType);
      
      if (result.success && result.token) {
        const backendResult = await notificationService.saveFCMToken(result.token, this.deviceType);
        
        if (backendResult.success) {
          this.permission = 'granted';
          this.fcmToken = result.token;
          
          if (!this.tokenRefreshInitialized) {
            initTokenRefreshHandler(this.deviceType);
            this.tokenRefreshInitialized = true;
          }
          
          if (!this.messageSubscribed) {
            this.subscribeToMessages();
          }
          
          // Fetch notifications after enabling
          await this.fetchNotifications();
          
          return { success: true, message: 'Notifications enabled successfully' };
        } else {
          return { success: false, message: backendResult.message };
        }
      } else {
        return { success: false, message: result.message || 'Failed to enable notifications' };
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      return { success: false, message: 'An error occurred while enabling notifications' };
    } finally {
      this.isLoading = false;
      setUserEnablingNotifications(false);
      this.notify();
    }
  }

  markAsRead(notificationId: string) {
    const updatedNotifications = this.notifications.map(n => {
      if (n.id === notificationId && !n.read) {
        return { ...n, read: true };
      }
      return n;
    });

    const unreadCount = updatedNotifications.filter(n => !n.read).length;
    
    this.notifications = updatedNotifications;
    this.unreadCount = unreadCount;
    
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    this.notify();

    // Mark as read on backend (fire and forget)
    notificationService.markNotificationAsRead(notificationId).catch(error => {
      console.error('Error marking notification as read:', error);
    });
  }

  markAllAsRead() {
    const updatedNotifications = this.notifications.map(n => ({ ...n, read: true }));
    
    this.notifications = updatedNotifications;
    this.unreadCount = 0;
    
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    this.notify();
  }

  clearAll() {
    this.notifications = [];
    this.unreadCount = 0;
    localStorage.removeItem('notifications');
    this.notify();
  }

  removeNotification(notificationId: string) {
    const notification = this.notifications.find(n => n.id === notificationId);
    const filtered = this.notifications.filter(n => n.id !== notificationId);
    
    this.notifications = filtered;
    if (notification && !notification.read) {
      this.unreadCount = Math.max(0, this.unreadCount - 1);
    }
    
    localStorage.setItem('notifications', JSON.stringify(filtered));
    this.notify();
  }

  async refreshToken(): Promise<{ success: boolean; message: string }> {
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
      return { success: false, message: 'User not logged in' };
    }

    if (this.permission !== 'granted') {
      return { success: false, message: 'Notification permission not granted' };
    }

    setUserEnablingNotifications(true);
    this.isLoading = true;
    this.notify();
    
    try {
      const result = await generateFCMToken(this.deviceType);
      
      if (result.success && result.token) {
        const backendResult = await notificationService.saveFCMToken(result.token, this.deviceType);
        
        if (backendResult.success) {
          this.fcmToken = result.token;
          await this.fetchNotifications();
          
          return { success: true, message: 'Token refreshed successfully' };
        } else {
          return { success: false, message: backendResult.message };
        }
      } else {
        return { success: false, message: result.message || 'Failed to refresh token' };
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return { success: false, message: 'An error occurred while refreshing token' };
    } finally {
      this.isLoading = false;
      setUserEnablingNotifications(false);
      this.notify();
    }
  }

  isDestroyedState(): boolean {
    return this.isDestroyed;
  }

  destroy() {
    console.log('Destroying notification state...');
    this.isDestroyed = true;
    this.isInitialized = false;
    this.subscribers.clear();
    cleanupNotifications();
    
    // Clear all timing controls
    this.fetchPromise = null;
    this.lastFetchTime = 0;
    this.isCurrentlyFetching = false;
    
    this.tokenRefreshInitialized = false;
    this.messageSubscribed = false;
    this.appStartupHandled = false;
    
    localStorage.removeItem('lastNotificationFetch');
    localStorage.removeItem('lastTokenSentTime');
    localStorage.removeItem('lastSentFCMToken');
  }
}

// Global instance
let globalNotificationState: NotificationState | null = null;

export function useNotifications(): UseNotificationsReturn {
  const [state, setState] = useState({
    notifications: [] as NotificationData[],
    unreadCount: 0,
    permission: null as NotificationPermission | null,
    isLoading: true,
    fcmToken: null as string | null,
    deviceType: 'UNKNOWN'
  });

  const stateRef = useRef(globalNotificationState);

  useEffect(() => {
    // Get or create global instance
    if (!globalNotificationState || globalNotificationState.isDestroyedState()) {
      globalNotificationState = NotificationState.getInstance();
      stateRef.current = globalNotificationState;
    }

    const notificationState = globalNotificationState;

    // Subscribe to state changes
    const unsubscribe = notificationState.subscribe(setState);

    // Initialize only once
    notificationState.initialize();

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, []);

  // Handle logout cleanup
  useEffect(() => {
    const handleLogout = () => {
      if (stateRef.current) {
        stateRef.current.destroy();
        globalNotificationState = null;
        stateRef.current = null;
      }
    };

    window.addEventListener('user-logout', handleLogout);
    return () => window.removeEventListener('user-logout', handleLogout);
  }, []);

  const instance = stateRef.current || NotificationState.getInstance();

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    permission: state.permission,
    isLoading: state.isLoading,
    deviceType: state.deviceType,
    fcmToken: state.fcmToken,
    enableNotifications: instance.enableNotifications.bind(instance),
    markAsRead: instance.markAsRead.bind(instance),
    markAllAsRead: instance.markAllAsRead.bind(instance),
    clearAll: instance.clearAll.bind(instance),
    removeNotification: instance.removeNotification.bind(instance),
    refreshToken: instance.refreshToken.bind(instance),
    fetchNotifications: instance.fetchNotifications.bind(instance)
  };
}

// Helper function for logout
export const dispatchLogoutEvent = () => {
  if (globalNotificationState) {
    globalNotificationState.destroy();
    globalNotificationState = null;
  }
  window.dispatchEvent(new CustomEvent('user-logout'));
};