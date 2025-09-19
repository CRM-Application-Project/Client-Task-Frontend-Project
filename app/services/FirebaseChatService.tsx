"use client";
import { getDatabaseInstance } from "@/app/firebase";
import { ref, onValue, off, child, DataSnapshot } from "firebase/database";

export interface FirebaseMessage {
  id: string;
  content: string;
  senderId: string;
  timestamp: string;
  createdAt?: string;
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

  /**
   * Listen to messages in a specific conversation
   */
  subscribeToConversationMessages(
    conversationId: string, 
    onMessagesUpdate: (messages: FirebaseMessage[]) => void
  ): () => void {
    if (!this.database) {
      console.warn('Firebase database not initialized');
      return () => {};
    }

    // Store callback for this conversation
    this.messageCallbacks.set(conversationId, onMessagesUpdate);

    // Create reference to conversation messages
    const messagesRef = ref(this.database, `conversations/${conversationId}/messages`);

    // Create listener
    const listener = onValue(messagesRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const messages: FirebaseMessage[] = [];

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
      }

      // Call the callback with updated messages
      onMessagesUpdate(messages);
    }, (error) => {
      console.error('Error listening to conversation messages:', error);
    });

    // Store listener for cleanup
    this.conversationListeners.set(conversationId, listener);

    // Return unsubscribe function
    return () => this.unsubscribeFromConversationMessages(conversationId);
  }

  /**
   * Unsubscribe from a specific conversation
   */
  unsubscribeFromConversationMessages(conversationId: string): void {
    if (!this.database) return;

    const listener = this.conversationListeners.get(conversationId);
    if (listener) {
      const messagesRef = ref(this.database, `conversations/${conversationId}/messages`);
      off(messagesRef, 'value', listener);
      this.conversationListeners.delete(conversationId);
      this.messageCallbacks.delete(conversationId);
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
      console.warn('Firebase database not initialized');
      return () => {};
    }

    // Store callback
    this.notificationCallbacks.add(onNotificationsUpdate);

    // Create reference to user notifications
    const notificationsRef = ref(this.database, `user-notifications/${userId}`);

    // Create listener
    this.notificationListener = onValue(notificationsRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const notifications: ChatNotifications = {};

      if (data) {
        // Convert Firebase object to our notification format
        Object.entries(data).forEach(([conversationId, notificationData]: [string, any]) => {
          if (notificationData && typeof notificationData === 'object') {
            notifications[conversationId] = {
              unreadCount: notificationData.unreadCount || 0,
              lastMessageId: notificationData.lastMessageId || '',
              timestamp: notificationData.timestamp || ''
            };
          }
        });
      }

      // Call all callbacks with updated notifications
      this.notificationCallbacks.forEach(callback => {
        callback(notifications);
      });
    }, (error) => {
      console.error('Error listening to user notifications:', error);
    });

    // Return unsubscribe function
    return () => this.unsubscribeFromUserNotifications(userId);
  }

  /**
   * Unsubscribe from user notifications
   */
  unsubscribeFromUserNotifications(userId: string): void {
    if (!this.database || !this.notificationListener) return;

    const notificationsRef = ref(this.database, `user-notifications/${userId}`);
    off(notificationsRef, 'value', this.notificationListener);
    this.notificationListener = null;
    this.notificationCallbacks.clear();
  }

  /**
   * Get total unread count across all conversations
   */
  getTotalUnreadCount(notifications: ChatNotifications): number {
    return Object.values(notifications).reduce((total, notification) => {
      return total + (notification.unreadCount || 0);
    }, 0);
  }

  /**
   * Get unread count for a specific conversation
   */
  getConversationUnreadCount(notifications: ChatNotifications, conversationId: string): number {
    return notifications[conversationId]?.unreadCount || 0;
  }

  /**
   * Clear all listeners (cleanup function)
   */
  cleanup(): void {
    // Unsubscribe from all conversation listeners
    this.conversationListeners.forEach((listener, conversationId) => {
      this.unsubscribeFromConversationMessages(conversationId);
    });

    // Unsubscribe from notifications
    if (this.notificationListener) {
      // We need user ID to unsubscribe properly, but we'll clear the listener anyway
      this.notificationListener = null;
      this.notificationCallbacks.clear();
    }

    this.conversationListeners.clear();
    this.messageCallbacks.clear();
  }

  /**
   * Mark conversation as read (this would typically call your API to reset unread count)
   */
  markConversationAsRead(conversationId: string, userId: string): void {
    // This should call your backend API to mark messages as read
    // The backend would then update Firebase accordingly
    console.log(`Marking conversation ${conversationId} as read for user ${userId}`);
    
    // You would implement this by calling your backend API:
    // await markConversationAsReadAPI(conversationId, userId);
  }
}

// Export singleton instance
export const firebaseChatService = new FirebaseChatService();