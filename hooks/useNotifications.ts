// Debug version with extensive logging
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

class NotificationState {
  private static instance: NotificationState | null = null;
  private subscribers = new Set<(state: any) => void>();
  private isInitialized = false;
  private isDestroyed = false;
  
  public notifications: NotificationData[] = [];
  public unreadCount: number = 0;
  public permission: NotificationPermission | null = null;
  public isLoading: boolean = true;
  public fcmToken: string | null = null;
  public deviceType: string = 'UNKNOWN';
  
  private fetchPromise: Promise<void> | null = null;
  private lastFetchTime: number = 0;
  private isCurrentlyFetching: boolean = false;
  
  private tokenRefreshInitialized = false;
  private messageSubscribed = false;
  private appStartupHandled = false;

  private constructor() {}

  static getInstance(): NotificationState {
    if (!NotificationState.instance || NotificationState.instance.isDestroyed) {
      console.log('🏗️ Creating new NotificationState instance');
      NotificationState.instance = new NotificationState();
    }
    return NotificationState.instance;
  }

  subscribe(callback: (state: any) => void): () => void {
    console.log('📝 New subscriber added, total:', this.subscribers.size + 1);
    this.subscribers.add(callback);
    return () => {
      console.log('📝 Subscriber removed, remaining:', this.subscribers.size - 1);
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    if (this.isDestroyed) {
      console.log('⚠️ Attempted to notify but state is destroyed');
      return;
    }
    
    const state = {
      notifications: [...this.notifications],
      unreadCount: this.unreadCount,
      permission: this.permission,
      isLoading: this.isLoading,
      fcmToken: this.fcmToken,
      deviceType: this.deviceType
    };
    
    console.log('🔔 Notifying subscribers with state:', {
      notificationsCount: state.notifications.length,
      unreadCount: state.unreadCount,
      permission: state.permission,
      isLoading: state.isLoading,
      subscribersCount: this.subscribers.size
    });
    
    this.subscribers.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        console.error('❌ Error in notification subscriber:', error);
      }
    });
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initialize called', {
      isInitialized: this.isInitialized,
      isDestroyed: this.isDestroyed
    });
    
    if (this.isInitialized || this.isDestroyed) {
      console.log('⏭️ Skipping initialization - already initialized or destroyed');
      return;
    }

    this.isInitialized = true;
    console.log('🎯 Starting notification system initialization...');

    try {
      await notificationManager.ensureInitialized();
      this.deviceType = getDetailedDeviceType();
      console.log('📱 Device type:', this.deviceType);
      
      if (!this.appStartupHandled) {
        await handleAppStartup();
        this.appStartupHandled = true;
        console.log('🚀 App startup handled');
      }
      
      this.permission = getNotificationPermission();
      console.log('🔐 Permission status:', this.permission);
      
      const existingToken = localStorage.getItem('fcmToken');
      if (existingToken) {
        this.fcmToken = existingToken;
        console.log('🎫 Found existing FCM token:', existingToken.substring(0, 20) + '...');
      }

      this.loadFromLocalStorage();
      
      const userId = localStorage.getItem('userId');
      console.log('👤 User ID:', userId);
      
      if (userId) {
        console.log('📥 User logged in, fetching notifications...');
        await this.fetchNotifications();
      } else {
        console.log('⏭️ No user ID, skipping notification fetch');
      }

      if (this.permission === 'granted' && userId && !this.tokenRefreshInitialized) {
        initTokenRefreshHandler(this.deviceType);
        this.tokenRefreshInitialized = true;
        console.log('🔄 Token refresh handler initialized');
      }

      if (this.permission === 'granted' && !this.messageSubscribed) {
        this.subscribeToMessages();
        console.log('📧 Message subscription set up');
      }

    } catch (error) {
      console.error('❌ Error during initialization:', error);
    } finally {
      this.isLoading = false;
      console.log('✅ Initialization complete, notifying subscribers');
      this.notify();
    }
  }

  private loadFromLocalStorage() {
    console.log('💾 Loading notifications from localStorage...');
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.notifications = parsed;
        this.unreadCount = parsed.filter((n: NotificationData) => !n.read).length;
        console.log('💾 Loaded from localStorage:', {
          total: parsed.length,
          unread: this.unreadCount
        });
      } else {
        console.log('💾 No notifications found in localStorage');
      }
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
    }
  }

  async fetchNotifications(): Promise<void> {
    const now = Date.now();
    console.log('📥 fetchNotifications called', {
      hasFetchPromise: !!this.fetchPromise,
      timeSinceLastFetch: now - this.lastFetchTime,
      isCurrentlyFetching: this.isCurrentlyFetching
    });
    
    if (this.fetchPromise) {
      console.log('⏳ Fetch already in progress, waiting...');
      await this.fetchPromise;
      return;
    }

    if (now - this.lastFetchTime < 60000) {
      console.log('🕒 Recently fetched, skipping (cooldown)');
      return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.log('👤 No user ID, cannot fetch notifications');
      return;
    }

    this.fetchPromise = this.performFetch();
    
    try {
      await this.fetchPromise;
    } finally {
      this.fetchPromise = null;
    }
  }

  private async performFetch(): Promise<void> {
    if (this.isCurrentlyFetching) {
      console.log('🔄 Already fetching, skipping duplicate call');
      return;
    }

    console.log('🎯 Starting actual fetch operation...');
    this.isCurrentlyFetching = true;
    this.lastFetchTime = Date.now();
    
    try {
      console.log('📞 Calling notificationService.fetchAllNotifications()...');
      const response = await notificationService.fetchAllNotifications();
      
      console.log('📨 Service response received:', {
        response,
        responseType: typeof response,
        hasIsSuccess: response?.hasOwnProperty('isSuccess'),
        isSuccess: response?.isSuccess,
        hasData: response?.hasOwnProperty('data'),
        dataType: typeof response?.data,
        dataIsArray: Array.isArray(response?.data),
        dataLength: response?.data?.length
      });
      
      // Check response validity
      if (!response) {
        console.error('❌ No response received from service');
        return;
      }
      
      if (!response.hasOwnProperty('isSuccess')) {
        console.error('❌ Response missing isSuccess field:', response);
        return;
      }
      
      if (response.isSuccess !== true) {
        console.warn('⚠️ API indicated failure:', response.isSuccess, response.message);
        return;
      }
      
      if (!response.data) {
        console.warn('⚠️ Response has no data field:', response);
        return;
      }
      
      if (!Array.isArray(response.data)) {
        console.error('❌ Response data is not an array:', typeof response.data, response.data);
        return;
      }
      
      console.log('✅ Response validation passed, processing data...');
      console.log('📊 Raw data items:', response.data);
      
      // Map each notification
      const mappedNotifications = response.data.map((item, index) => {
        console.log(`🔄 Mapping item ${index}:`, item);
        const mapped = this.mapBackendNotification(item);
        console.log(`✅ Mapped item ${index}:`, mapped);
        return mapped;
      });
      
      console.log('🗂️ All mapped notifications:', mappedNotifications);
      
      // Sort by timestamp
      mappedNotifications.sort((a, b) => b.timestamp - a.timestamp);
      console.log('📅 Sorted notifications:', mappedNotifications);
      
      // Update state
      this.notifications = mappedNotifications;
      this.unreadCount = mappedNotifications.filter(n => !n.read).length;
      
      console.log('💾 Saving to localStorage...');
      localStorage.setItem('notifications', JSON.stringify(mappedNotifications));
      localStorage.setItem('lastNotificationFetch', this.lastFetchTime.toString());
      
      console.log('🎉 Fetch completed successfully:', {
        total: mappedNotifications.length,
        unread: this.unreadCount
      });
      
      this.notify();
      
    } catch (error) {
  if (error instanceof Error) {
    console.error('❌ Error in performFetch:', error.message);
    console.error('❌ Error stack:', error.stack);
  } else {
    console.error('❌ Unknown error in performFetch:', error);
  }
} finally {  this.isCurrentlyFetching = false;
      console.log('🏁 Fetch operation completed');
    }
  }

  private mapBackendNotification = (backendNotification: NotificationResponse): NotificationData => {
    console.log('🔄 Mapping backend notification:', backendNotification);
    console.log('🔍 Backend notification type:', typeof backendNotification);
    console.log('🔍 Backend notification keys:', Object.keys(backendNotification || {}));
    
    // Validate fields
    const id = backendNotification?.notificationId;
    const module = backendNotification?.module;
    const message = backendNotification?.notificationMessage;
    const read = backendNotification?.notificationRead;
    
    console.log('🔍 Extracted fields:', {
      id, module, message, read,
      idType: typeof id,
      moduleType: typeof module,
      messageType: typeof message,
      readType: typeof read
    });
    
    if (!id) {
      console.warn('⚠️ Missing notification ID:', backendNotification);
    }
    
    const mapped = {
      id: id || `unknown-${Date.now()}-${Math.random()}`,
      title: module || 'System Notification',
      body: message || 'No message',
      timestamp: Date.now(),
      read: read === true,
      module: module,
      data: {
        module: module,
        originalId: id
      }
    };
    
    console.log('✅ Mapped notification:', mapped);
    return mapped;
  }

  private subscribeToMessages() {
    if (this.messageSubscribed) {
      console.log('📧 Already subscribed to messages');
      return;
    }

    console.log('📧 Setting up message subscription...');
    const handleMessage = (payload: any) => {
      console.log("📨 Received foreground message:", payload);
      
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
      
      console.log('📨 New message processed, not triggering auto-fetch');
    };

    subscribeToMessages(handleMessage);
    this.messageSubscribed = true;
    console.log('📧 Message subscription complete');
  }

  async enableNotifications(userId?: string): Promise<{ success: boolean; message: string }> {
    console.log('🔔 enableNotifications called with userId:', userId);
    const userIdToUse = userId || localStorage.getItem('userId');
    
    if (!userIdToUse) {
      console.log('❌ No user ID available');
      return { success: false, message: 'User ID is required' };
    }

    console.log('🚀 Starting notification enablement process...');
    setUserEnablingNotifications(true);
    this.isLoading = true;
    this.notify();
    
    try {
      const result = await generateFCMToken(this.deviceType);
      console.log('🎫 FCM token generation result:', result);
      
      if (result.success && result.token) {
        const backendResult = await notificationService.saveFCMToken(result.token, this.deviceType);
        console.log('💾 Backend save result:', backendResult);
        
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
          
          await this.fetchNotifications();
          
          return { success: true, message: 'Notifications enabled successfully' };
        } else {
          return { success: false, message: backendResult.message };
        }
      } else {
        return { success: false, message: result.message || 'Failed to enable notifications' };
      }
    } catch (error) {
      console.error('❌ Error enabling notifications:', error);
      return { success: false, message: 'An error occurred while enabling notifications' };
    } finally {
      this.isLoading = false;
      setUserEnablingNotifications(false);
      this.notify();
    }
  }

  markAsRead(notificationId: string) {
    console.log('✅ Marking notification as read:', notificationId);
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

    notificationService.markNotificationAsRead(notificationId).catch(error => {
      console.error('❌ Error marking notification as read:', error);
    });
  }

  markAllAsRead() {
    console.log('✅ Marking all notifications as read');
    const updatedNotifications = this.notifications.map(n => ({ ...n, read: true }));
    
    this.notifications = updatedNotifications;
    this.unreadCount = 0;
    
    localStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    this.notify();
  }

  clearAll() {
    console.log('🗑️ Clearing all notifications');
    this.notifications = [];
    this.unreadCount = 0;
    localStorage.removeItem('notifications');
    this.notify();
  }

  removeNotification(notificationId: string) {
    console.log('🗑️ Removing notification:', notificationId);
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
    console.log('🔄 Refreshing token...');
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
      console.error('❌ Error refreshing token:', error);
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
    console.log('💥 Destroying notification state...');
    this.isDestroyed = true;
    this.isInitialized = false;
    this.subscribers.clear();
    cleanupNotifications();
    
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
    console.log('🎯 useNotifications effect triggered');
    
    if (!globalNotificationState || globalNotificationState.isDestroyedState()) {
      console.log('🏗️ Creating global notification state');
      globalNotificationState = NotificationState.getInstance();
      stateRef.current = globalNotificationState;
    }

    const notificationState = globalNotificationState;
    console.log('📝 Setting up subscription to notification state');
    const unsubscribe = notificationState.subscribe(setState);
    
    console.log('🚀 Calling initialize on notification state');
    notificationState.initialize();

    return () => {
      console.log('🧹 Cleaning up useNotifications effect');
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      console.log('👋 Handling logout event');
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

  console.log('🔄 useNotifications returning state:', {
    notificationsCount: state.notifications.length,
    unreadCount: state.unreadCount,
    permission: state.permission,
    isLoading: state.isLoading
  });

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

export const dispatchLogoutEvent = () => {
  if (globalNotificationState) {
    globalNotificationState.destroy();
    globalNotificationState = null;
  }
  window.dispatchEvent(new CustomEvent('user-logout'));
};