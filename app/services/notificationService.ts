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

class NotificationService {
  private getAuthHeaders() {
    const authToken = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    };
  }

  async fetchAllNotifications(): Promise<ApiResponse<NotificationResponse[]>> {
    try {
      const response = await fetch(`${BASE_URL}/notification/fetch`, {
        method: 'GET',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/api/v1/notification/${notificationId}/mark-read`, {
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
    // Check if we recently sent this exact token
    const lastSentToken = localStorage.getItem('lastSentFCMToken');
    const lastSentTime = localStorage.getItem('lastTokenSentTime');
    
    if (lastSentToken === fcmToken && lastSentTime) {
      const timeSinceLastSend = Date.now() - parseInt(lastSentTime);
      if (timeSinceLastSend < 60000) { // 1 minute cooldown
        console.log('🔄 Same token sent recently, skipping duplicate call');
        return { success: true, message: 'Token already sent recently' };
      }
    }

    try {
      const response = await fetch(`${BASE_URL}/notification/save-token`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          fcmToken: fcmToken,
          deviceType: deviceType
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
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
    }
  }
}

export const notificationService = new NotificationService();