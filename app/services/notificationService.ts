// Debug version with extensive logging
import { BASE_URL } from "../http-common";

export interface NotificationResponse {
  notificationId: string;
  module: string;
  notificationMessage: string;
  notificationRead: boolean;
}

export interface ApiResponse<T> {
  isSuccess: boolean;
  message: string;
  data: T;
}

class NotificationService {
  private getAuthHeaders() {
    const authToken = localStorage.getItem('authToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
    };
    console.log('🔧 Auth headers prepared:', { hasToken: !!authToken });
    return headers;
  }

  async fetchAllNotifications(): Promise<ApiResponse<NotificationResponse[]>> {
    const endpoint = `${BASE_URL}/notification/fetch`;
    console.log('🔄 Starting fetchAllNotifications');
    console.log('📍 Endpoint:', endpoint);
    console.log('🔧 BASE_URL:', BASE_URL);
    
    try {
      const headers = this.getAuthHeaders();
      console.log('📤 Request headers:', headers);
      
      const response = await fetch(endpoint, {
        method: 'GET',
        credentials: 'include',
        headers: headers,
      });

      console.log('📨 Response status:', response.status);
      console.log('📨 Response ok:', response.ok);
      console.log('📨 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response not OK - Status:', response.status);
        console.error('❌ Error text:', errorText);
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`);
      }

      // Get the raw response text first
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);
      console.log('📄 Response text length:', responseText.length);
      
      if (!responseText || responseText.trim() === '') {
        console.warn('⚠️ Empty response received');
        return {
          isSuccess: false,
          message: 'Empty response from server',
          data: []
        };
      }

      // Try to parse JSON
      let result;
      try {
        result = JSON.parse(responseText);
        console.log('✅ Successfully parsed JSON');
        console.log('📊 Parsed result:', result);
        console.log('📊 Result type:', typeof result);
        console.log('📊 Result keys:', Object.keys(result || {}));
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Failed to parse response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }

      // Validate response structure
      console.log('🔍 Validating response structure...');
      console.log('🔍 Has isSuccess:', result.hasOwnProperty('isSuccess'));
      console.log('🔍 isSuccess value:', result.isSuccess);
      console.log('🔍 isSuccess type:', typeof result.isSuccess);
      console.log('🔍 Has message:', result.hasOwnProperty('message'));
      console.log('🔍 message value:', result.message);
      console.log('🔍 Has data:', result.hasOwnProperty('data'));
      console.log('🔍 data value:', result.data);
      console.log('🔍 data type:', typeof result.data);
      console.log('🔍 data is array:', Array.isArray(result.data));
      
      if (result.data) {
        console.log('🔍 data length:', result.data.length);
        if (result.data.length > 0) {
          console.log('🔍 First item:', result.data[0]);
          console.log('🔍 First item keys:', Object.keys(result.data[0] || {}));
        }
      }

      return result;
    } catch (error) {
  const err = error as Error;
  console.error('❌ Fetch error:', err.message);
  console.error('❌ Error stack:', err.stack);
  throw err;
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

    const lastSentToken = localStorage.getItem('lastSentFCMToken');
    const lastSentTime = localStorage.getItem('lastTokenSentTime');
    
    if (lastSentToken === fcmToken && lastSentTime) {
      const timeSinceLastSend = Date.now() - parseInt(lastSentTime);
      if (timeSinceLastSend < 60000) {
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

      const contentType = response.headers.get('content-type');
      let responseData;
      
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        console.log('✅ FCM token saved successfully (JSON response):', responseData);
      } else {
        const textResponse = await response.text();
        console.log('✅ FCM token saved successfully (non-JSON response):', textResponse || 'Empty response');
        responseData = { success: true, message: 'Token saved successfully' };
      }

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