import { BASE_URL } from "../http-common";

export interface NotificationResponse {
  notificationId: string;
  module: string;
  notificationMessage: string;
  isNotificationRead: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  status: number;
}

// Import debugger only in development
let notificationDebugger: any = null;
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  import('../../lib/notificationDebugger').then(module => {
    notificationDebugger = module.notificationDebugger;
  });
}

class NotificationService {
  private tokenSaveInProgress: boolean = false;
  private fetchInProgress: boolean = false;

  private getAuthHeaders() {
    const authToken = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    };
  }

  async fetchAllNotifications(): Promise<ApiResponse<NotificationResponse[]>> {
    // Log call for debugging
    notificationDebugger?.logCall('fetchAllNotifications');
    
    // Prevent concurrent fetch requests
    if (this.fetchInProgress) {
      console.log('🔄 Fetch notifications already in progress, skipping...');
      throw new Error('Fetch already in progress');
    }

    // Check auth token before making request
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('No authentication token available for fetch');
    }

    this.fetchInProgress = true;
    
    try {
      const response = await fetch(`${BASE_URL}/notification/fetch`, {
        method: 'GET',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        // Handle 403 specifically
        if (response.status === 403) {
          console.error('❌ Authentication failed for notifications fetch - user may need to re-login');
          throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }
        
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    } finally {
      this.fetchInProgress = false;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/notification/${notificationId}/mark-read`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to mark notification as read: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async saveFCMToken(fcmToken: string, deviceType: string): Promise<{ success: boolean; message: string; error?: unknown }> {
    // Log call for debugging
    notificationDebugger?.logCall('saveFCMToken', fcmToken, deviceType);
    
    // Prevent concurrent token save requests
    if (this.tokenSaveInProgress) {
      console.log('🔄 Token save already in progress, skipping duplicate call...');
      return { success: false, message: 'Token save already in progress' };
    }

    // Check if we recently sent this exact token
    const lastSentToken = localStorage.getItem('lastSentFCMToken');
    const lastSentTime = localStorage.getItem('lastTokenSentTime');
    
    if (lastSentToken === fcmToken && lastSentTime) {
      const timeSinceLastSend = Date.now() - parseInt(lastSentTime);
      if (timeSinceLastSend < 5 * 60 * 1000) { // 5 minute cooldown (increased from 1 minute)
        console.log('🔄 Same token sent recently, skipping duplicate call');
        return { success: true, message: 'Token already sent recently' };
      }
    }

    this.tokenSaveInProgress = true;
    console.log('🔄 Starting token save request...');

    try {
      // Ensure we have fresh auth headers
      const headers = this.getAuthHeaders();
      const authToken = localStorage.getItem('authToken');
      
      if (!authToken) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${BASE_URL}/notification/save-token`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          fcmToken: fcmToken,
          deviceType: deviceType
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        
        // Handle 403 specifically
        if (response.status === 403) {
          console.error('❌ Authentication failed for token save - user may need to re-login');
          throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
        }
        
        throw new Error(`Failed to send token to backend: ${response.status} ${errorText}`);
      }

      console.log('✅ FCM token sent to backend successfully');
      
      // Store token locally for comparison during refresh
      localStorage.setItem('fcmToken', fcmToken);
      localStorage.setItem('fcmTokenDeviceType', deviceType);
      localStorage.setItem('lastSentFCMToken', fcmToken);
      localStorage.setItem('lastTokenSentTime', Date.now().toString());
      
      return { success: true, message: 'Token saved successfully' };
    } catch (error) {
      console.error('❌ Failed to send FCM token to backend:', error);
      return { success: false, message: 'Failed to save token to backend', error };
    } finally {
      this.tokenSaveInProgress = false;
      console.log('🔄 Token save request completed');
    }
  }

  // Method to reset locks (useful for testing or error recovery)
  resetLocks(): void {
    this.tokenSaveInProgress = false;
    this.fetchInProgress = false;
    console.log('🔄 Notification service locks reset');
  }
}

export const notificationService = new NotificationService();