"use client";
import { getDatabaseInstance } from "@/app/firebase";
import { ref, onValue, off, child, DataSnapshot, set, remove } from "firebase/database";

export interface FirebaseMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  createdAt?: string;
  attachments?: any[];
  type?: string;
  parentId?: string;
  mentions?: string[];
  reactions?: any[];
}

export interface FirebaseNotification {
  unreadCount: number;
  lastMessageId: string;
  timestamp: string;
}

export interface ChatNotifications {
  [conversationId: string]: FirebaseNotification;
}

class FirebaseChatService {
  private database = getDatabaseInstance();
  private conversationListeners: Map<string, any> = new Map();
  private notificationListener: any = null;
  private messageCallbacks: Map<string, (messages: FirebaseMessage[]) => void> = new Map();
  private notificationCallbacks: Set<(notifications: ChatNotifications) => void> = new Set();
  private currentUserId: string | null = null;

  /**
   * Initialize service with current user ID
   */
  initialize(userId: string): void {
    this.currentUserId = userId;
    console.log(`[FirebaseChat] Service initialized for user: ${userId}`);
    try {
      if (!this.database) {
        console.warn('[FirebaseChat] Database instance is null/undefined at initialize');
      } else {
        console.log('[FirebaseChat] Database instance OK');
      }
    } catch (e) {
      console.error('[FirebaseChat] Error checking database instance:', e);
    }
  }

  /**
   * Listen to messages in a specific conversation
   */
  subscribeToConversationMessages(
    conversationId: string, 
    onMessagesUpdate: (messages: FirebaseMessage[]) => void
  ): () => void {
    if (!this.database) {
      console.warn('[FirebaseChat] Database not initialized');
      return () => {};
    }

    console.log(`[FirebaseChat] Subscribing to conversation messages: ${conversationId}`);

    // Store callback for this conversation
    this.messageCallbacks.set(conversationId, onMessagesUpdate);

    // Create reference to conversation messages
    const path = `conversations/${conversationId}/messages`;
    const messagesRef = ref(this.database, path);
    console.log('[FirebaseChat] Messages ref path:', path);

    // Create listener
    const listener = onValue(messagesRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const messages: FirebaseMessage[] = [];

      console.log(`[FirebaseChat] onValue fired for ${conversationId}. exists=${snapshot.exists()}`,
        { key: snapshot.key, childrenCount: data ? Object.keys(data).length : 0 });
      if (!data) {
        console.log(`[FirebaseChat] No data under ${path} yet`);
      } else {
        try {
          const ids = Object.keys(data);
          console.log(`[FirebaseChat] Message keys for ${conversationId}:`, ids);
        } catch {}
      }

      if (data) {
        // Convert Firebase object to array and sort by timestamp
        Object.values(data).forEach((messageData: any) => {
          if (messageData && typeof messageData === 'object') {
            messages.push({
              id: messageData.id || '',
              content: messageData.content || '',
              senderId: messageData.senderId || '',
              timestamp: messageData.timestamp || '',
              createdAt: messageData.createdAt || messageData.timestamp,
              type: messageData.type || 'received',
              parentId: messageData.parentId,
              mentions: messageData.mentions || [],
              reactions: messageData.reactions || []
            });
          }
        });

        // Sort messages by timestamp
        messages.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.timestamp).getTime();
          const timeB = new Date(b.createdAt || b.timestamp).getTime();
          return timeA - timeB;
        });

        if (messages.length > 0) {
          const last = messages[messages.length - 1];
          console.log(`[FirebaseChat] Processed ${messages.length} messages for ${conversationId}. Last:`, {
            id: last.id, senderId: last.senderId, ts: last.timestamp
          });
        } else {
          console.log(`[FirebaseChat] Processed 0 messages for ${conversationId}`);
        }
      }

      // Call the callback with updated messages
      onMessagesUpdate(messages);

      // Auto-mark messages as read when conversation is active
      this.markConversationAsRead(conversationId);
    }, (error) => {
      console.error(`[FirebaseChat] Error listening to conversation ${conversationId}:`, error);
    });

    // Store listener for cleanup
    this.conversationListeners.set(conversationId, listener);

    console.log(`[FirebaseChat] Successfully subscribed to conversation ${conversationId}`);

    // Return unsubscribe function
    return () => this.unsubscribeFromConversationMessages(conversationId);
  }

  /**
   * Unsubscribe from a specific conversation
   */
  unsubscribeFromConversationMessages(conversationId: string): void {
    if (!this.database) return;

    console.log(`[FirebaseChat] Unsubscribing from conversation ${conversationId}`);

    const listener = this.conversationListeners.get(conversationId);
    if (listener) {
      const messagesRef = ref(this.database, `conversations/${conversationId}/messages`);
      off(messagesRef, 'value', listener);
      this.conversationListeners.delete(conversationId);
      this.messageCallbacks.delete(conversationId);
      console.log(`[FirebaseChat] Successfully unsubscribed from conversation ${conversationId}`);
    }
  }

  /**
   * Subscribe to user notifications for all conversations
   */
  subscribeToUserNotifications(
    userId: string,
    onNotificationsUpdate: (notifications: ChatNotifications) => void
  ): () => void {
    if (!this.database) {
      console.warn('[FirebaseChat] Database not initialized for notifications');
      return () => {};
    }

    console.log(`[FirebaseChat] Subscribing to notifications for user: ${userId}`);
    this.currentUserId = userId;

    // Store callback
    this.notificationCallbacks.add(onNotificationsUpdate);

    // Create reference to user notifications
    const notifPath = `user-notifications/${userId}`;
    const notificationsRef = ref(this.database, notifPath);
    console.log('[FirebaseChat] Notifications ref path:', notifPath);

    // Create listener
    this.notificationListener = onValue(notificationsRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const notifications: ChatNotifications = {};

      console.log(`[FirebaseChat] onValue fired for notifications of ${userId}. exists=${snapshot.exists()}`,
        { key: snapshot.key, convCount: data ? Object.keys(data).length : 0 });

      if (data) {
        // Convert Firebase object to our notification format
        Object.entries(data).forEach(([conversationId, notificationData]: [string, any]) => {
          if (notificationData && typeof notificationData === 'object') {
            notifications[conversationId] = {
              unreadCount: notificationData.unreadCount || 0,
              lastMessageId: notificationData.lastMessageId || '',
              timestamp: notificationData.timestamp || ''
            };

            console.log(`[FirebaseChat] Notif conv=${conversationId} unread=${notifications[conversationId].unreadCount} lastMessageId=${notifications[conversationId].lastMessageId}`);
          }
        });
      }

      // Calculate total unread count
      const totalUnread = this.getTotalUnreadCount(notifications);
      console.log(`[FirebaseChat] Total unread count for user ${userId}: ${totalUnread}`);

      // Call all callbacks with updated notifications
      this.notificationCallbacks.forEach(callback => {
        callback(notifications);
      });
    }, (error) => {
      console.error(`[FirebaseChat] Error listening to notifications for user ${userId}:`, error);
    });

    // Return unsubscribe function
    return () => this.unsubscribeFromUserNotifications(userId);
  }

  /**
   * Unsubscribe from user notifications
   */
  unsubscribeFromUserNotifications(userId: string): void {
    if (!this.database || !this.notificationListener) return;

    console.log(`[FirebaseChat] Unsubscribing from notifications for user: ${userId}`);

    const notificationsRef = ref(this.database, `user-notifications/${userId}`);
    off(notificationsRef, 'value', this.notificationListener);
    this.notificationListener = null;
    this.notificationCallbacks.clear();

    console.log(`[FirebaseChat] Successfully unsubscribed from notifications for user: ${userId}`);
  }

  /**
   * Mark conversation as read - This is the key method for WhatsApp-like behavior
   */
 async markConversationAsRead(conversationId: string): Promise<void> {
  if (!this.database || !this.currentUserId) {
    console.warn('[FirebaseChat] Cannot mark as read - missing database or user ID');
    return;
  }

  try {
    console.log(`[FirebaseChat] Marking conversation ${conversationId} as read for user ${this.currentUserId}`);

    const notificationRef = ref(
      this.database, 
      `user-notifications/${this.currentUserId}/${conversationId}`
    );

    // Reset unread count to 0
    console.log('[FirebaseChat] Writing unreadCount=0 at path:', `user-notifications/${this.currentUserId}/${conversationId}/unreadCount`);
    await set(child(notificationRef, 'unreadCount'), 0);
    
    // Update timestamp to current time
    const nowIso = new Date().toISOString();
    console.log('[FirebaseChat] Writing timestamp at path:', `user-notifications/${this.currentUserId}/${conversationId}/timestamp`, nowIso);
    await set(child(notificationRef, 'timestamp'), nowIso);

    console.log(`[FirebaseChat] Successfully marked conversation ${conversationId} as read`);

    // Optional: Call backend API to update read receipts
    // Check if we're in a browser environment before making the fetch call
    if (typeof window !== 'undefined') {
      try {
        // This would call your backend API to update message receipts
        console.log(`[FirebaseChat] Calling backend API to update read receipts for conversation ${conversationId}`);
        
        // Example API call (uncomment and modify based on your API):
        /*
        await fetch('/api/chat/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId,
            userId: this.currentUserId
          })
        });
        */
      } catch (apiError) {
        console.error(`[FirebaseChat] Failed to call backend API for conversation ${conversationId}:`, apiError);
      }
    }

  } catch (error) {
    console.error(`[FirebaseChat] Failed to mark conversation ${conversationId} as read:`, error);
  }
}

  /**
   * Clear all notifications for a user (useful for logout)
   */
  async clearAllNotifications(userId: string): Promise<void> {
    if (!this.database) {
      console.warn('[FirebaseChat] Cannot clear notifications - database not initialized');
      return;
    }

    try {
      console.log(`[FirebaseChat] Clearing all notifications for user: ${userId}`);
      
      const userNotificationsRef = ref(this.database, `user-notifications/${userId}`);
      await remove(userNotificationsRef);
      
      console.log(`[FirebaseChat] Successfully cleared all notifications for user: ${userId}`);
    } catch (error) {
      console.error(`[FirebaseChat] Failed to clear notifications for user ${userId}:`, error);
    }
  }

  /**
   * Get total unread count across all conversations
   */
  getTotalUnreadCount(notifications: ChatNotifications): number {
    const total = Object.values(notifications).reduce((total, notification) => {
      return total + (notification.unreadCount || 0);
    }, 0);

    console.log(`[FirebaseChat] Calculated total unread count: ${total}`);
    return total;
  }

  /**
   * Get unread count for a specific conversation
   */
  getConversationUnreadCount(notifications: ChatNotifications, conversationId: string): number {
    const count = notifications[conversationId]?.unreadCount || 0;
    console.log(`[FirebaseChat] Unread count for conversation ${conversationId}: ${count}`);
    return count;
  }

  /**
   * Check if user is active in a conversation (for auto-read functionality)
   */
  setUserActiveInConversation(conversationId: string, isActive: boolean): void {
    console.log(`[FirebaseChat] User ${isActive ? 'active' : 'inactive'} in conversation: ${conversationId}`);
    
    if (isActive) {
      // Mark as read when user becomes active in conversation
      this.markConversationAsRead(conversationId);
    }
  }

  /**
   * Get conversation activity status
   */
  getConversationActivity(conversationId: string): boolean {
    return this.conversationListeners.has(conversationId);
  }

  /**
   * Clear all listeners (cleanup function)
   */
  cleanup(): void {
    console.log('[FirebaseChat] Starting cleanup...');

    // Unsubscribe from all conversation listeners
    this.conversationListeners.forEach((listener, conversationId) => {
      this.unsubscribeFromConversationMessages(conversationId);
    });

    // Unsubscribe from notifications
    if (this.notificationListener && this.currentUserId) {
      this.unsubscribeFromUserNotifications(this.currentUserId);
    }

    this.conversationListeners.clear();
    this.messageCallbacks.clear();
    this.currentUserId = null;

    console.log('[FirebaseChat] Cleanup completed');
  }

  /**
   * Debug method to log current state
   */
  debugState(): void {
    console.log('[FirebaseChat] Current State:', {
      currentUserId: this.currentUserId,
      activeConversations: Array.from(this.conversationListeners.keys()),
      hasNotificationListener: !!this.notificationListener,
      messageCallbacks: this.messageCallbacks.size,
      notificationCallbacks: this.notificationCallbacks.size
    });
  }
}

// Export singleton instance
export const firebaseChatService = new FirebaseChatService();