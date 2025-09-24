"use client";
import { getDatabaseInstance } from "@/app/firebase";
import { ref, onValue, off, child, DataSnapshot, set, remove, push } from "firebase/database";
import { MessageAttachment } from "./chatService";

export interface FirebaseMessage {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  createdAt?: string;
  attachments?: MessageAttachment[];
  type?: string;
  parentId?: string;
  parentMessageId?: string;
  mentions?: string[];
  reactions?: any[];
  conversationType?: string;
  conversationName?: string;
  hasMentions?: boolean;
  hasAttachments?: boolean;
  eventType?: string;
  metadata?: Record<string, any>;
}

export interface FirebaseReactionEvent {
  eventType: string;
  messageId: string;
  content: string;
  senderId: string;
  senderName: string;
  reaction: string;
  conversationId: string;
  conversationType: string;
  conversationName: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface FirebaseNotification {
  unreadCount: number;
  lastMessage: any;
  lastMessageId?: string;
  timestamp: string;
  eventType?: string;
  metadata?: Record<string, any>;
}

export interface ChatNotifications {
  [conversationId: string]: FirebaseNotification;
}

class FirebaseChatService {
  private database = getDatabaseInstance();
  private conversationListeners: Map<string, any> = new Map();
  private notificationListener: any = null;
  private messageCallbacks: Map<string, (messages: FirebaseMessage[]) => void> = new Map();
  private reactionCallbacks: Map<string, (reaction: FirebaseReactionEvent) => void> = new Map();
  private notificationCallbacks: Set<(notifications: ChatNotifications) => void> = new Set();
  private currentUserId: string | null = null;
  private foregroundMessageListener: any = null;

  /**
   * Initialize service with current user ID
   */
  initialize(userId: string): void {
    this.currentUserId = userId;
    console.log(`[FirebaseChat] Service initialized for user: ${userId}`);
    
    // Set up foreground message listener for real-time updates
    this.setupForegroundMessageListener();
    
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
   * Set up foreground message listener to handle real-time FCM messages
   */
  private setupForegroundMessageListener(): void {
    if (typeof window === 'undefined') return;

    // Import Firebase messaging dynamically
    import('firebase/messaging').then(({ getMessaging, onMessage }) => {
      import('@/app/firebase').then(({ getMessagingInstance }) => {
        const messaging = getMessagingInstance();
        if (!messaging) {
          console.warn('[FirebaseChat] Messaging not available for foreground listener');
          return;
        }

        this.foregroundMessageListener = onMessage(messaging, (payload) => {
          console.log('[FirebaseChat] Foreground FCM message received:', payload);
          
          // Handle the message data to trigger real-time updates
          if (payload.data) {
            this.handleForegroundMessage(payload.data);
          }
        });

        console.log('[FirebaseChat] Foreground message listener set up');
      });
    }).catch(error => {
      console.error('[FirebaseChat] Error setting up foreground message listener:', error);
    });
  }

  /**
   * Handle foreground FCM messages for real-time chat updates
   */
  private handleForegroundMessage(data: any): void {
    try {
      console.log('[FirebaseChat] Processing foreground message data:', data);
      
      // Extract conversation ID and message info from FCM data
      const conversationId = data.conversationId;
      const messageData = data.messageData ? JSON.parse(data.messageData) : data;
      
      if (conversationId && messageData) {
        console.log(`[FirebaseChat] Updating conversation ${conversationId} with new message:`, messageData);
        
        // Check if this is a reaction event
        if (messageData.eventType === 'REACTION_ADDED' || messageData.eventType === 'REACTION_REMOVED') {
          this.handleReactionEvent(messageData);
        } else {
          // Transform the message to match Java MessageEvent structure
          const firebaseMessage: FirebaseMessage = this.transformMessageEventToFirebaseMessage(messageData);
          
          // Update the conversation messages directly
          this.updateConversationWithNewMessage(conversationId, firebaseMessage);
          
          // Update notifications
          this.updateNotificationForNewMessage(conversationId, firebaseMessage);
        }
      }
    } catch (error) {
      console.error('[FirebaseChat] Error handling foreground message:', error);
    }
  }

  /**
   * Handle reaction events from Firebase
   */
  private handleReactionEvent(reactionData: any): void {
    console.log('[FirebaseChat] Handling reaction event:', reactionData);
    
    const conversationId = reactionData.conversationId?.toString();
    if (!conversationId) {
      console.warn('[FirebaseChat] No conversationId in reaction event');
      return;
    }

    const reactionEvent: FirebaseReactionEvent = {
      eventType: reactionData.eventType,
      messageId: reactionData.messageId?.toString(),
      content: reactionData.content || '',
      senderId: reactionData.senderId,
      senderName: reactionData.senderName,
      reaction: reactionData.reaction,
      conversationId: conversationId,
      conversationType: reactionData.conversationType,
      conversationName: reactionData.conversationName,
      timestamp: reactionData.timestamp,
      metadata: reactionData.metadata || {}
    };

    // Trigger reaction callback if registered
    const reactionCallback = this.reactionCallbacks.get(conversationId);
    if (reactionCallback) {
      reactionCallback(reactionEvent);
    }
  }

  /**
   * Transform Java MessageEvent structure to FirebaseMessage format
   */
  private transformMessageEventToFirebaseMessage(messageData: any): FirebaseMessage {
    return {
      id: messageData.messageId?.toString() || messageData.id?.toString() || Date.now().toString(),
      content: messageData.content || '',
      senderId: messageData.senderId || messageData.sender?.id || '',
      senderName: messageData.senderName || messageData.sender?.name || '',
      timestamp: messageData.timestamp || messageData.createdAt || new Date().toISOString(),
      createdAt: messageData.timestamp || messageData.createdAt || new Date().toISOString(),
      type: 'received',
      parentId: messageData.parentMessageId?.toString() || messageData.parentId?.toString(),
      parentMessageId: messageData.parentMessageId?.toString(),
      mentions: messageData.mentions || [],
      reactions: messageData.reactions || [],
      attachments: messageData.attachments || [],
      conversationType: messageData.conversationType,
      conversationName: messageData.conversationName,
      hasMentions: messageData.hasMentions || false,
      hasAttachments: messageData.hasAttachments || false,
      eventType: messageData.eventType,
      metadata: messageData.metadata || {}
    };
  }

  /**
   * Update conversation with new message (for real-time updates)
   */
  private updateConversationWithNewMessage(conversationId: string, message: FirebaseMessage): void {
    const callback = this.messageCallbacks.get(conversationId);
    if (callback) {
      console.log(`[FirebaseChat] Triggering callback for conversation ${conversationId} with new message`);
      this.refreshConversationMessages(conversationId);
    }
  }

  /**
   * Update notifications for new message
   */
  private updateNotificationForNewMessage(conversationId: string, message: FirebaseMessage): void {
    // Only increment unread count if message is not from current user
    if (message.senderId !== this.currentUserId) {
      console.log(`[FirebaseChat] Updating notifications for conversation ${conversationId}`);
      
      // Trigger notification callbacks with updated data
      this.notificationCallbacks.forEach(callback => {
        console.log(`[FirebaseChat] Triggering notification callback for new message`);
      });
    }
  }

  /**
   * Refresh messages for a conversation
   */
  private refreshConversationMessages(conversationId: string): void {
    if (!this.database) return;

    const messagesRef = ref(this.database, `conversations/${conversationId}/events`);
    
    // Get current data and trigger callback
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const messages: FirebaseMessage[] = [];

      if (data) {
        Object.values(data).forEach((messageData: any) => {
          if (messageData && typeof messageData === 'object') {
            // Only process message events, not reaction events for messages
            if (messageData.eventType === 'MESSAGE_SENT' || 
                messageData.eventType === 'MESSAGE_REPLIED' ||
                messageData.eventType === 'MESSAGE_EDITED' ||
                !messageData.eventType) {
              messages.push(this.transformMessageEventToFirebaseMessage(messageData));
            }
          }
        });

        // Sort by timestamp
        messages.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.timestamp).getTime();
          const timeB = new Date(b.createdAt || b.timestamp).getTime();
          return timeA - timeB;
        });
      }

      const callback = this.messageCallbacks.get(conversationId);
      if (callback) {
        callback(messages);
      }
    }, { onlyOnce: true });
  }

  /**
   * Subscribe to conversation events (messages + reactions) 
   * FIXED: This now properly handles both message and reaction events
   */
  subscribeToConversationMessages(
    conversationId: string, 
    onMessagesUpdate: (messages: FirebaseMessage[]) => void
  ): () => void {
    if (!this.database) {
      console.warn('[FirebaseChat] Database not initialized');
      return () => {};
    }
console.log(`[FirebaseChat] Listening to conversation path: conversations/${conversationId}/events`);
    console.log(`[FirebaseChat] Subscribing to conversation events: ${conversationId}`);

    // Store callback for this conversation
    this.messageCallbacks.set(conversationId, onMessagesUpdate);

    // FIXED: Listen to the same path backend publishes to
    const eventsRef = ref(this.database, `conversations/${conversationId}/events`);

    // Create listener
    const listener = onValue(eventsRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const messages: FirebaseMessage[] = [];

      console.log(`[FirebaseChat] onValue fired for ${conversationId}. exists=${snapshot.exists()}`,
        { key: snapshot.key, eventsCount: data ? Object.keys(data).length : 0 });

      if (data) {
        // Process all events - separate messages from reactions
        Object.entries(data).forEach(([eventKey, eventData]: [string, any]) => {
          if (eventData && typeof eventData === 'object') {
            
            // Handle reaction events separately
            if (eventData.eventType === 'REACTION_ADDED' || eventData.eventType === 'REACTION_REMOVED') {
              console.log(`[FirebaseChat] Processing reaction event from conversation stream:`, eventData);
              this.handleReactionEvent(eventData);
              return; // Don't process as message
            }
            
            // Handle message events
            if (eventData.eventType === 'MESSAGE_SENT' || 
                eventData.eventType === 'MESSAGE_REPLIED' ||
                eventData.eventType === 'MESSAGE_EDITED' ||
                !eventData.eventType) { // Handle legacy messages without eventType
              
              // Transform to message format
              const firebaseMessage = this.transformMessageEventToFirebaseMessage(eventData);
              
              // Add reactions from other events if they exist
              const messageId = firebaseMessage.id;
              const relatedReactions: any[] = [];
              
              // Look for reaction events for this message
              Object.entries(data).forEach(([reactionKey, reactionData]: [string, any]) => {
                if (reactionData && 
                    reactionData.messageId?.toString() === messageId && 
                    (reactionData.eventType === 'REACTION_ADDED' || reactionData.eventType === 'REACTION_REMOVED')) {
                  
                  if (reactionData.eventType === 'REACTION_ADDED') {
                    relatedReactions.push({
                      reaction: reactionData.reaction,
                      emoji: reactionData.reaction,
                      senderId: reactionData.senderId,
                      senderName: reactionData.senderName,
                      timestamp: reactionData.timestamp,
                      createdAt: reactionData.timestamp
                    });
                  }
                }
              });
              
              // Merge reactions into message
              firebaseMessage.reactions = relatedReactions;
              messages.push(firebaseMessage);
            }
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
   * FIXED: Subscribe to reaction events for a conversation
   * This is now redundant since reactions are handled in the main conversation listener
   */
  subscribeToReactionEvents(
    conversationId: string,
    onReactionUpdate: (reactionEvent: FirebaseReactionEvent) => void
  ): () => void {
    console.log(`[FirebaseChat] Setting up reaction callback for conversation: ${conversationId}`);
    
    // Store callback for reaction events - this will be called from the main listener
    this.reactionCallbacks.set(conversationId, onReactionUpdate);

    // Return unsubscribe function
    return () => this.unsubscribeFromReactionEvents(conversationId);
  }

  /**
   * Unsubscribe from reaction events
   */
  unsubscribeFromReactionEvents(conversationId: string): void {
    console.log(`[FirebaseChat] Unsubscribing from reaction events for conversation ${conversationId}`);
    this.reactionCallbacks.delete(conversationId);
  }

  /**
   * Manually add a message to Firebase (for testing or when backend doesn't update Firebase directly)
   */
  async addMessageToFirebase(conversationId: string, messageData: any): Promise<void> {
    if (!this.database) {
      console.warn('[FirebaseChat] Database not initialized');
      return;
    }

    try {
      const eventsRef = ref(this.database, `conversations/${conversationId}/events`);
      const newEventRef = push(eventsRef);
      
      const firebaseMessage = this.transformMessageEventToFirebaseMessage({
        ...messageData,
        id: messageData.id?.toString() || newEventRef.key
      });

      await set(newEventRef, firebaseMessage);
      console.log(`[FirebaseChat] Message added to Firebase for conversation ${conversationId}:`, firebaseMessage);
    } catch (error) {
      console.error(`[FirebaseChat] Error adding message to Firebase:`, error);
    }
  }

  /**
   * Process notification data from Firebase to match Java MessageEvent structure
   */
  private processNotificationData(data: any): ChatNotifications {
    const notifications: ChatNotifications = {};

    if (data) {
      Object.entries(data).forEach(([conversationId, notificationData]: [string, any]) => {
        if (notificationData && typeof notificationData === 'object') {
          notifications[conversationId] = {
            unreadCount: notificationData.unreadCount || 0,
            lastMessage: notificationData.lastMessage || {},
            lastMessageId: notificationData.lastMessageId || '',
            timestamp: notificationData.timestamp || '',
            eventType: notificationData.eventType,
            metadata: notificationData.metadata || {}
          };
        }
      });
    }

    return notifications;
  }

  /**
   * Subscribe to user notifications for all conversations
   * FIXED: Also processes reaction events from user notification stream
   */
  subscribeToUserNotifications(
    userId: string,
    onNotificationsUpdate: (notifications: ChatNotifications) => void
  ): () => void {
    if (!this.database) {
      console.warn('[FirebaseChat] Database not initialized for notifications');
      return () => {};
    }
console.log(`[FirebaseChat] Listening to notifications path: user-notifications/${userId}`);
    console.log(`[FirebaseChat] Subscribing to notifications for user: ${userId}`);
    this.currentUserId = userId;

    // Store callback
    this.notificationCallbacks.add(onNotificationsUpdate);

    // Create reference to user notifications
    const notifPath = `user-notifications/${userId}`;
    const notificationsRef = ref(this.database, notifPath);

    // Create listener
    this.notificationListener = onValue(notificationsRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      
      console.log(`[FirebaseChat] onValue fired for notifications of ${userId}. exists=${snapshot.exists()}`,
        { key: snapshot.key, convCount: data ? Object.keys(data).length : 0 });

      if (data) {
        // Process events from user notifications - including reactions
        Object.entries(data).forEach(([conversationId, conversationData]: [string, any]) => {
          if (conversationData?.events) {
            Object.entries(conversationData.events).forEach(([eventKey, eventData]: [string, any]) => {
              if (eventData && (eventData.eventType === 'REACTION_ADDED' || eventData.eventType === 'REACTION_REMOVED')) {
                console.log(`[FirebaseChat] Processing reaction event from user notifications:`, eventData);
                this.handleReactionEvent(eventData);
              }
            });
          }
        });
      }

      const notifications = this.processNotificationData(data);

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
   * Enhanced method to handle message events with Java MessageEvent structure
   */
  handleMessageEvent(messageEvent: any): void {
    try {
      console.log('[FirebaseChat] Handling message event:', messageEvent);
      
      const conversationId = messageEvent.conversationId;
      if (!conversationId) {
        console.warn('[FirebaseChat] No conversationId in message event');
        return;
      }

      // Check if this is a reaction event
      if (messageEvent.eventType === 'REACTION_ADDED' || messageEvent.eventType === 'REACTION_REMOVED') {
        this.handleReactionEvent(messageEvent);
        return;
      }

      // Transform the message event to Firebase message format
      const firebaseMessage = this.transformMessageEventToFirebaseMessage(messageEvent);
      
      // Update conversation
      this.updateConversationWithNewMessage(conversationId, firebaseMessage);
      
      // Update notification
      this.updateNotificationForNewMessage(conversationId, firebaseMessage);
      
    } catch (error) {
      console.error('[FirebaseChat] Error handling message event:', error);
    }
  }

  /**
   * Get conversation metadata from message
   */
  getConversationMetadata(message: FirebaseMessage): {
    type: string;
    name: string;
    hasMentions: boolean;
    hasAttachments: boolean;
  } {
    return {
      type: message.conversationType || 'DIRECT',
      name: message.conversationName || '',
      hasMentions: message.hasMentions || false,
      hasAttachments: message.hasAttachments || false
    };
  }

  /**
   * Check if message is a reply
   */
  isMessageReply(message: FirebaseMessage): boolean {
    return !!(message.parentId || message.parentMessageId);
  }

  /**
   * Get message event type
   */
  getMessageEventType(message: FirebaseMessage): string {
    return message.eventType || 'MESSAGE';
  }

  unsubscribeFromConversationMessages(conversationId: string): void {
    if (!this.database) return;

    console.log(`[FirebaseChat] Unsubscribing from conversation ${conversationId}`);

    const listener = this.conversationListeners.get(conversationId);
    if (listener) {
      const eventsRef = ref(this.database, `conversations/${conversationId}/events`);
      off(eventsRef, 'value', listener);
      this.conversationListeners.delete(conversationId);
      this.messageCallbacks.delete(conversationId);
      console.log(`[FirebaseChat] Successfully unsubscribed from conversation ${conversationId}`);
    }

    // Also unsubscribe from reaction events
    this.unsubscribeFromReactionEvents(conversationId);
  }

  unsubscribeFromUserNotifications(userId: string): void {
    if (!this.database || !this.notificationListener) return;

    console.log(`[FirebaseChat] Unsubscribing from notifications for user: ${userId}`);

    const notificationsRef = ref(this.database, `user-notifications/${userId}`);
    off(notificationsRef, 'value', this.notificationListener);
    this.notificationListener = null;
    this.notificationCallbacks.clear();

    console.log(`[FirebaseChat] Successfully unsubscribed from notifications for user: ${userId}`);
  }

  async markConversationAsRead(conversationId: string): Promise<void> {
    if (!this.database || !this.currentUserId) return;

    try {
      const notificationRef = ref(
        this.database, 
        `user-notifications/${this.currentUserId}/${conversationId}`
      );

      await set(child(notificationRef, 'unreadCount'), 0);
      console.log(`[FirebaseChat] Successfully marked conversation ${conversationId} as read`);
      
    } catch (error) {
      console.error(`[FirebaseChat] Failed to mark conversation ${conversationId} as read:`, error);
    }
  }

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

  getTotalUnreadCount(notifications: ChatNotifications): number {
    const total = Object.values(notifications).reduce((total, notification) => {
      return total + (notification.unreadCount || 0);
    }, 0);

    console.log(`[FirebaseChat] Calculated total unread count: ${total}`);
    return total;
  }

  getConversationUnreadCount(notifications: ChatNotifications, conversationId: string): number {
    const count = notifications[conversationId]?.unreadCount || 0;
    console.log(`[FirebaseChat] Unread count for conversation ${conversationId}: ${count}`);
    return count;
  }

  setUserActiveInConversation(conversationId: string, isActive: boolean): void {
    console.log(`[FirebaseChat] User ${isActive ? 'active' : 'inactive'} in conversation: ${conversationId}`);
    
    if (isActive) {
      this.markConversationAsRead(conversationId);
    }
  }

  getConversationActivity(conversationId: string): boolean {
    return this.conversationListeners.has(conversationId);
  }

  cleanup(): void {
    console.log('[FirebaseChat] Starting cleanup...');

    this.conversationListeners.forEach((listener, conversationId) => {
      this.unsubscribeFromConversationMessages(conversationId);
    });

    if (this.notificationListener && this.currentUserId) {
      this.unsubscribeFromUserNotifications(this.currentUserId);
    }

    if (this.foregroundMessageListener) {
      this.foregroundMessageListener = null;
    }

    this.conversationListeners.clear();
    this.messageCallbacks.clear();
    this.reactionCallbacks.clear();
    this.currentUserId = null;

    console.log('[FirebaseChat] Cleanup completed');
  }

  debugState(): void {
    console.log('[FirebaseChat] Current State:', {
      currentUserId: this.currentUserId,
      activeConversations: Array.from(this.conversationListeners.keys()),
      hasNotificationListener: !!this.notificationListener,
      messageCallbacks: this.messageCallbacks.size,
      reactionCallbacks: this.reactionCallbacks.size,
      notificationCallbacks: this.notificationCallbacks.size,
      hasForegroundListener: !!this.foregroundMessageListener
    });
  }
}

// Export singleton instance
export const firebaseChatService = new FirebaseChatService();