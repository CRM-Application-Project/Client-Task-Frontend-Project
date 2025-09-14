// Enhanced notification service with better logging and error handling
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
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    };
    console.log('Auth headers prepared:', { hasToken: !!authToken });
    return headers;
  }

  async fetchAllNotifications(): Promise<ApiResponse<NotificationResponse[]>> {
    console.log('🔄 Fetching notifications from:', `${BASE_URL}/notification/fetch`);
    
    try {
      const response = await fetch(`${BASE_URL}/notification/fetch`, {
        method: 'GET',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });

      console.log('📨 Fetch notifications response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch notifications:', response.status, errorText);
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Fetch notifications success:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        message: result.message
      });
      
      return result;
    } catch (error) {
      console.error('❌ Error in fetchAllNotifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    console.log('🔄 Marking notification as read:', notificationId);
    
    try {
      const response = await fetch(`${BASE_URL}/api/v1/notification/${notificationId}/mark-read`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
      });

      console.log('📨 Mark as read response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to mark notification as read:', response.status, errorText);
        throw new Error(`Failed to mark notification as read: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Notification marked as read successfully');
    } catch (error) {
      console.error('❌ Error in markNotificationAsRead:', error);
      throw error;
    }
  }

  async saveFCMToken(fcmToken: string, deviceType: string): Promise<{ success: boolean; message: string; error?: unknown }> {
    console.log('🔄 Saving FCM token to backend:', {
      tokenLength: fcmToken.length,
      deviceType,
      endpoint: `${BASE_URL}/notification/save-token`
    });

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
      const requestBody = {
        fcmToken: fcmToken,
        deviceType: deviceType
      };

      console.log('📤 Sending request to save FCM token:', requestBody);

      const response = await fetch(`${BASE_URL}/notification/save-token`, {
        method: 'POST',
        credentials: 'include',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody),
      });

      console.log('📨 Save token response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to save FCM token - Response:', errorText);
        throw new Error(`Failed to send token to backend: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('✅ FCM token saved successfully:', responseData);
     
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