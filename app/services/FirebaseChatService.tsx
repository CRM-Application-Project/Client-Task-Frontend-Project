// Enhanced FirebaseChatService with proper real-time messaging and smart deduplication
import { getDatabaseInstance } from "@/app/firebase";
import { ref, onValue, off, child, DataSnapshot, set, remove, push } from "firebase/database";
import { MessageAttachment } from "./chatService";
import { updateMessageReceipt } from "./chatService";
import { getConversation } from '@/app/services/chatService';

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
export interface ConversationEvent {
  eventType: 'CONVERSATION_CREATED' | 'PARTICIPANT_ADDED' | 'PARTICIPANT_REMOVED' | 'ROLE_CHANGED';
  conversationId: string;
  conversationName: string;
  conversationType: 'PRIVATE' | 'GROUP';
  triggeredByUserId: string; // The user who triggered the event
  targetUserId?: string; // For participant events
  targetUserName?: string;
  newRole?: 'ADMIN' | 'MEMBER';
  timestamp: string;
  // Additional metadata from backend
  [key: string]: any;
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
export interface ConversationEvent {
  type: 'CONVERSATION_CREATED' | 'PARTICIPANT_ADDED' | 'CONVERSATION_UPDATED' | 'PARTICIPANT_REMOVED';
  conversationId: string;
  triggeredByUserId: string;
  targetUserId?: string; // For participant events
  timestamp: string;
  conversationData?: any;
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
  
  // Enhanced conversation state management
  private activeConversations: Set<string> = new Set();
  private pendingReceiptUpdates: Map<string, { messageIds: string[], conversationId: string }> = new Map();
  
  // FIXED: Only track FCM message deduplication, not Firebase listener events
  private processedFCMMessages: Set<string> = new Set();
  private lastNotificationProcessTime: Map<string, number> = new Map();

  /**
   * Initialize service with current user ID
   */
  initialize(userId: string): void {
    this.currentUserId = userId;
    console.log(`[FirebaseChat] Service initialized for user: ${userId}`);
    
    // Set up foreground message listener for real-time updates
    this.setupForegroundMessageListener();
    
    // Clear previous FCM processing state only
    this.processedFCMMessages.clear();
    this.lastNotificationProcessTime.clear();
    
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
   * Mark conversation as active (chat is open)
   */
  setConversationActive(conversationId: string, isActive: boolean): void {
    console.log(`[FirebaseChat] Setting conversation ${conversationId} as ${isActive ? 'active' : 'inactive'}`);
    
    if (isActive) {
      this.activeConversations.add(conversationId);
      // Process any pending receipt updates for this conversation
      this.processPendingReceipts(conversationId);
    } else {
      this.activeConversations.delete(conversationId);
    }
  }

  /**
   * Check if conversation is currently active
   */
  private isConversationActive(conversationId: string): boolean {
    return this.activeConversations.has(conversationId);
  }

  /**
   * Process pending receipt updates for a conversation
   */
  private async processPendingReceipts(conversationId: string): Promise<void> {
    const pendingKey = `pending_${conversationId}`;
    const pending = this.pendingReceiptUpdates.get(pendingKey);
    
    if (pending && pending.messageIds.length > 0) {
      console.log(`[FirebaseChat] Processing ${pending.messageIds.length} pending receipts for conversation ${conversationId}`);
      
      try {
        await this.updateMessageReceipts(pending.messageIds, 'READ');
        console.log(`[FirebaseChat] Successfully marked ${pending.messageIds.length} messages as read`);
        
        // Clear pending receipts
        this.pendingReceiptUpdates.delete(pendingKey);
      } catch (error) {
        console.error(`[FirebaseChat] Error updating pending receipts:`, error);
      }
    }
  }

  /**
   * Update message receipts with proper status
   */
  private async updateMessageReceipts(messageIds: string[], status: 'DELIVERED' | 'READ'): Promise<void> {
    if (messageIds.length === 0) return;

    try {
      await updateMessageReceipt({
        messageIds: messageIds.map(id => parseInt(id)),
        status
      });
      console.log(`[FirebaseChat] Updated ${messageIds.length} message receipts to ${status}`);
    } catch (error) {
      console.error(`[FirebaseChat] Error updating message receipts to ${status}:`, error);
      throw error;
    }
  }

  /**
   * Handle incoming message receipt updates based on conversation state
   */
  private async handleIncomingMessageReceipts(conversationId: string, messageIds: string[]): Promise<void> {
    if (!messageIds || messageIds.length === 0) return;
    
    // Filter out messages from current user (don't update receipts for own messages)
    const filteredMessageIds = messageIds.filter(id => {
      // Add logic to check if message is from current user if needed
      return true; // For now, process all message IDs
    });

    if (filteredMessageIds.length === 0) return;

    const isActive = this.isConversationActive(conversationId);
    
    console.log(`[FirebaseChat] Handling receipts for ${filteredMessageIds.length} messages in conversation ${conversationId}`, {
      isActive,
      messageIds: filteredMessageIds
    });

    if (isActive) {
      // Conversation is open - mark as read
      try {
        await this.updateMessageReceipts(filteredMessageIds, 'READ');
      } catch (error) {
        console.error(`[FirebaseChat] Error marking messages as read:`, error);
      }
    } else {
      // Conversation is not open - mark as DELIVERED and store for later read update
      try {
        await this.updateMessageReceipts(filteredMessageIds, 'DELIVERED');
        
        // Store for later read update when conversation becomes active
        const pendingKey = `pending_${conversationId}`;
        const existing = this.pendingReceiptUpdates.get(pendingKey);
        
        if (existing) {
          const combinedIds = Array.from(new Set([...existing.messageIds, ...filteredMessageIds]));
          this.pendingReceiptUpdates.set(pendingKey, {
            messageIds: combinedIds,
            conversationId
          });
        } else {
          this.pendingReceiptUpdates.set(pendingKey, {
            messageIds: filteredMessageIds,
            conversationId
          });
        }
        
        console.log(`[FirebaseChat] Stored ${filteredMessageIds.length} messages for later read update`);
      } catch (error) {
        console.error(`[FirebaseChat] Error marking messages as delivered:`, error);
      }
    }
  }

  /**
   * FIXED: FCM foreground message handler with minimal deduplication
   */
  private async handleForegroundMessage(data: any): Promise<void> {
    try {
      console.log('[FirebaseChat] Processing foreground FCM message:', data);
      
      const conversationId = data.conversationId;
      if (!conversationId) {
        console.warn('[FirebaseChat] No conversationId in foreground message');
        return;
      }

      // FIXED: Only deduplicate FCM messages, not Firebase listener events
      const fcmEventId = `fcm-${conversationId}-${data.messageId || data.timestamp || Date.now()}`;
      if (this.processedFCMMessages.has(fcmEventId)) {
        console.log(`[FirebaseChat] FCM event ${fcmEventId} already processed, skipping`);
        return;
      }
      
      // Mark FCM message as processed
      this.processedFCMMessages.add(fcmEventId);
      
      // Clean up old FCM messages (keep only last 100)
      if (this.processedFCMMessages.size > 100) {
        const oldestEntries = Array.from(this.processedFCMMessages).slice(0, 50);
        oldestEntries.forEach(entry => this.processedFCMMessages.delete(entry));
      }
      
      const messageData = data.messageData ? JSON.parse(data.messageData) : data;
      
      if (conversationId && messageData) {
        console.log(`[FirebaseChat] Processing FCM message for conversation ${conversationId}:`, messageData);
        
        // Check if this is a reaction event
        if (messageData.eventType === 'REACTION_ADDED' || messageData.eventType === 'REACTION_REMOVED') {
          this.handleReactionEvent(messageData);
        } else {
          // Handle regular message - just trigger refresh, let Firebase listener handle the data
          console.log(`[FirebaseChat] FCM message received, Firebase listener will handle the data update`);
          
          // Handle receipt updates for incoming messages (not from current user)
          if (messageData.senderId !== this.currentUserId) {
            await this.handleIncomingMessageReceipts(conversationId, [messageData.messageId || messageData.id]);
          }
        }
      }
    } catch (error) {
      console.error('[FirebaseChat] Error handling foreground message:', error);
    }
  }

  /**
   * FIXED: Conversation subscription with proper real-time updates (no aggressive deduplication)
   */
  subscribeToConversationMessages(
    conversationId: string, 
    onMessagesUpdate: (messages: FirebaseMessage[]) => void
  ): () => void {
    if (!this.database) {
      console.warn('[FirebaseChat] Database not initialized');
      return () => {};
    }

    console.log(`[FirebaseChat] Subscribing to conversation events: ${conversationId}`);
    
    // Mark conversation as active when subscribing
    this.setConversationActive(conversationId, true);

    // Store callback for this conversation
    this.messageCallbacks.set(conversationId, onMessagesUpdate);

    const eventsRef = ref(this.database, `conversations/${conversationId}/events`);

    // FIXED: Remove aggressive event deduplication - let Firebase handle real-time updates
    const listener = onValue(eventsRef, async (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const messages: FirebaseMessage[] = [];

      console.log(`[FirebaseChat] Firebase onValue fired for ${conversationId}. exists=${snapshot.exists()}`,
        { key: snapshot.key, eventsCount: data ? Object.keys(data).length : 0 });

      if (data) {
        const incomingMessageIds: string[] = [];
        
        // Process all events - let Firebase handle the real-time nature
        Object.entries(data).forEach(([eventKey, eventData]: [string, any]) => {
          if (eventData && typeof eventData === 'object') {
            
            // Handle reaction events separately
            if (eventData.eventType === 'REACTION_ADDED' || eventData.eventType === 'REACTION_REMOVED') {
              console.log(`[FirebaseChat] Processing reaction event:`, eventData);
              this.handleReactionEvent(eventData);
              return;
            }
            
            // Handle message events
           if (eventData.eventType === 'MESSAGE_SENT' || 
    eventData.eventType === 'MESSAGE_REPLIED' || // Add MESSAGE_REPLIED explicitly
    eventData.eventType === 'MESSAGE_EDITED' ||
    !eventData.eventType) {
               const isReply = eventData.parentMessageId || eventData.parentId;
  if (isReply) {
    console.log(`[FirebaseChat] Processing REPLY message event:`, {
      eventType: eventData.eventType,
      messageId: eventData.messageId,
      parentMessageId: eventData.parentMessageId,
      parentId: eventData.parentId,
      senderId: eventData.senderId,
      conversationId: conversationId
    });
  }
              const firebaseMessage = this.transformMessageEventToFirebaseMessage(eventData);
                if (isReply && !firebaseMessage.parentId) {
    console.warn(`[FirebaseChat] Reply message lost parentId during transformation:`, {
      originalParentMessageId: eventData.parentMessageId,
      originalParentId: eventData.parentId,
      transformedMessage: firebaseMessage
    });
  }
  
              // Collect message IDs from other users for receipt updates
              if (firebaseMessage.senderId !== this.currentUserId) {
                incomingMessageIds.push(firebaseMessage.id);
              }
              
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

        // Handle receipt updates for incoming messages
        if (incomingMessageIds.length > 0) {
          console.log(`[FirebaseChat] Processing ${incomingMessageIds.length} incoming messages for receipt updates`);
          await this.handleIncomingMessageReceipts(conversationId, incomingMessageIds);
        }
      }

      // ALWAYS call the callback with current messages (Firebase handles real-time)
      onMessagesUpdate(messages);

      // Auto-mark conversation as read when active
      if (this.isConversationActive(conversationId)) {
        this.markConversationAsRead(conversationId);
      }
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
   * Enhanced unsubscribe with proper cleanup
   */
  unsubscribeFromConversationMessages(conversationId: string): void {
    if (!this.database) return;

    console.log(`[FirebaseChat] Unsubscribing from conversation ${conversationId}`);

    // Mark conversation as inactive
    this.setConversationActive(conversationId, false);

    const listener = this.conversationListeners.get(conversationId);
    if (listener) {
      const eventsRef = ref(this.database, `conversations/${conversationId}/events`);
      off(eventsRef, 'value', listener);
      this.conversationListeners.delete(conversationId);
      this.messageCallbacks.delete(conversationId);
      
      console.log(`[FirebaseChat] Successfully unsubscribed from conversation ${conversationId}`);
    }

    this.unsubscribeFromReactionEvents(conversationId);
  }

  /**
   * FIXED: User notifications with smart deduplication (only for notifications, not messages)
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

    this.notificationCallbacks.add(onNotificationsUpdate);

    const notifPath = `user-notifications/${userId}`;
    const notificationsRef = ref(this.database, notifPath);

    this.notificationListener = onValue(notificationsRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      
      console.log(`[FirebaseChat] Notifications onValue fired for ${userId}. exists=${snapshot.exists()}`,
        { key: snapshot.key, convCount: data ? Object.keys(data).length : 0 });

      // FIXED: Smart notification processing with time-based deduplication
      if (data) {
        const currentTime = Date.now();
        
        Object.entries(data).forEach(([conversationId, conversationData]: [string, any]) => {
          // Only process notifications that are newer than last processed time
          const lastProcessed = this.lastNotificationProcessTime.get(conversationId) || 0;
          const notificationTime = conversationData.timestamp ? new Date(conversationData.timestamp).getTime() : currentTime;
          
          if (notificationTime > lastProcessed) {
            this.lastNotificationProcessTime.set(conversationId, notificationTime);
            
            if (conversationData?.events) {
              Object.entries(conversationData.events).forEach(([eventKey, eventData]: [string, any]) => {
                if (eventData && (eventData.eventType === 'REACTION_ADDED' || eventData.eventType === 'REACTION_REMOVED')) {
                  console.log(`[FirebaseChat] Processing reaction event from user notifications:`, eventData);
                  this.handleReactionEvent(eventData);
                }
              });
            }
          }
        });
      }

      const notifications = this.processNotificationData(data);
      const totalUnread = this.getTotalUnreadCount(notifications);
      console.log(`[FirebaseChat] Total unread count for user ${userId}: ${totalUnread}`);

      this.notificationCallbacks.forEach(callback => {
        callback(notifications);
      });
    }, (error) => {
      console.error(`[FirebaseChat] Error listening to notifications for user ${userId}:`, error);
    });

    return () => this.unsubscribeFromUserNotifications(userId);
  }

  /**
   * FIXED: Enhanced cleanup with proper state management
   */
  cleanup(): void {
    console.log('[FirebaseChat] Starting cleanup...');

    // Clean up all listeners
    this.conversationListeners.forEach((listener, conversationId) => {
      this.unsubscribeFromConversationMessages(conversationId);
    });

    if (this.notificationListener && this.currentUserId) {
      this.unsubscribeFromUserNotifications(this.currentUserId);
    }

    if (this.foregroundMessageListener) {
      this.foregroundMessageListener = null;
    }

    // Clear all state
    this.conversationListeners.clear();
    this.messageCallbacks.clear();
    this.reactionCallbacks.clear();
    this.activeConversations.clear();
    this.pendingReceiptUpdates.clear();
    this.processedFCMMessages.clear();
    this.lastNotificationProcessTime.clear();
    this.currentUserId = null;

    console.log('[FirebaseChat] Cleanup completed');
  }

  /**
   * Set up foreground message listener to handle real-time FCM messages
   */
  private setupForegroundMessageListener(): void {
    if (typeof window === 'undefined') return;

    import('firebase/messaging').then(({ getMessaging, onMessage }) => {
      import('@/app/firebase').then(({ getMessagingInstance }) => {
        const messaging = getMessagingInstance();
        if (!messaging) {
          console.warn('[FirebaseChat] Messaging not available for foreground listener');
          return;
        }

        this.foregroundMessageListener = onMessage(messaging, (payload) => {
          console.log('[FirebaseChat] Foreground FCM message received:', payload);
          
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

    const reactionCallback = this.reactionCallbacks.get(conversationId);
    if (reactionCallback) {
      reactionCallback(reactionEvent);
    }
  }

  /**
   * Transform Java MessageEvent structure to FirebaseMessage format
   */
private transformMessageEventToFirebaseMessage(messageData: any): FirebaseMessage {
  // DEBUG: Log the incoming message data to see what fields are available
  console.log('[FirebaseChat] Raw message data for transformation:', {
    messageId: messageData.messageId,
    parentMessageId: messageData.parentMessageId,
    parentId: messageData.parentId,
    replyTo: messageData.replyTo,
    content: messageData.content,
    eventType: messageData.eventType,
    // Add metadata check
    metadata: messageData.metadata
  });

  // Enhanced parent message ID extraction with proper fallbacks
  let parentId: string | undefined;
  
  // Priority 1: Check metadata first (most reliable for cross-user delivery)
  if (messageData.metadata?.parentId) {
    parentId = messageData.metadata.parentId.toString();
    console.log(`[FirebaseChat] Using metadata.parentId: ${parentId}`);
  }
  // Priority 2: Check parentMessageId (from Java backend)
  else if (messageData.parentMessageId !== null && messageData.parentMessageId !== undefined && messageData.parentMessageId !== '') {
    parentId = messageData.parentMessageId.toString();
    console.log(`[FirebaseChat] Using parentMessageId: ${parentId}`);
  }
  // Priority 3: Check parentId (alternative field)
  else if (messageData.parentId !== null && messageData.parentId !== undefined && messageData.parentId !== '') {
    parentId = messageData.parentId.toString();
    console.log(`[FirebaseChat] Using parentId: ${parentId}`);
  }
  // Priority 4: Check replyTo (another alternative)
  else if (messageData.replyTo !== null && messageData.replyTo !== undefined && messageData.replyTo !== '') {
    parentId = messageData.replyTo.toString();
    console.log(`[FirebaseChat] Using replyTo: ${parentId}`);
  }

  // Log if this is a reply message
  if (parentId) {
    console.log(`[FirebaseChat] Identified as REPLY message:`, {
      messageId: messageData.messageId,
      parentId: parentId,
      content: messageData.content?.substring(0, 50) + '...',
      source: 'metadata' // Track where we found the parentId
    });
  } else {
    console.log(`[FirebaseChat] Identified as REGULAR message (no parentId found):`, {
      messageId: messageData.messageId,
      availableFields: {
        metadata: messageData.metadata,
        parentMessageId: messageData.parentMessageId,
        parentId: messageData.parentId,
        replyTo: messageData.replyTo
      }
    });
  }

  const firebaseMessage: FirebaseMessage = {
    id: messageData.messageId?.toString() || messageData.id?.toString() || Date.now().toString(),
    content: messageData.content || '',
    senderId: messageData.senderId || messageData.sender?.id || '',
    senderName: messageData.senderName || messageData.sender?.name || '',
    timestamp: messageData.timestamp || messageData.createdAt || new Date().toISOString(),
    createdAt: messageData.timestamp || messageData.createdAt || new Date().toISOString(),
    type: 'received',
    parentId: parentId, // This is the key fix
    parentMessageId: parentId, // Set both fields for consistency
    mentions: messageData.mentions || [],
    reactions: messageData.reactions || [],
    attachments: messageData.attachments || [],
    conversationType: messageData.conversationType,
    conversationName: messageData.conversationName,
    hasMentions: messageData.hasMentions || false,
    hasAttachments: messageData.hasAttachments || false,
    eventType: messageData.eventType,
    metadata: {
      ...messageData.metadata,
      // Ensure parentId is preserved in metadata for cross-user delivery
      parentId: parentId || messageData.metadata?.parentId
    }
  };

  // Additional debug logging
  if (parentId) {
    console.log(`[FirebaseChat] Final transformed REPLY message:`, {
      id: firebaseMessage.id,
      parentId: firebaseMessage.parentId,
      parentMessageId: firebaseMessage.parentMessageId,
      content: firebaseMessage.content?.substring(0, 30) + '...',
      preservedInMetadata: !!firebaseMessage.metadata?.parentId
    });
  }

  return firebaseMessage;
}

  // Keep all existing methods unchanged
  subscribeToReactionEvents(
    conversationId: string,
    onReactionUpdate: (reactionEvent: FirebaseReactionEvent) => void
  ): () => void {
    console.log(`[FirebaseChat] Setting up reaction callback for conversation: ${conversationId}`);
    
    this.reactionCallbacks.set(conversationId, onReactionUpdate);

    return () => this.unsubscribeFromReactionEvents(conversationId);
  }

  unsubscribeFromReactionEvents(conversationId: string): void {
    console.log(`[FirebaseChat] Unsubscribing from reaction events for conversation ${conversationId}`);
    this.reactionCallbacks.delete(conversationId);
  }

async addMessageToFirebase(conversationId: string, messageData: any): Promise<void> {
  if (!this.database) {
    console.warn('[FirebaseChat] Database not initialized');
    return;
  }

  try {
    const eventsRef = ref(this.database, `conversations/${conversationId}/events`);
    const newEventRef = push(eventsRef);
    
    // DEBUG: Log the message data before transformation
    console.log('[FirebaseChat] Raw message data before Firebase transformation:', {
      messageId: messageData.id,
      parentMessageId: messageData.parentMessageId,
      parentId: messageData.parentId,
      content: messageData.content,
      eventType: messageData.eventType
    });

    // Ensure parentId is preserved in metadata for cross-user delivery
    const enhancedMessageData = {
      ...messageData,
      id: messageData.id?.toString() || newEventRef.key,
      metadata: {
        ...messageData.metadata,
        parentId: messageData.parentId || messageData.parentMessageId
      }
    };

    const firebaseMessage = this.transformMessageEventToFirebaseMessage(enhancedMessageData);

    // DEBUG: Log the transformed Firebase message
    console.log('[FirebaseChat] Transformed Firebase message for reply:', {
      id: firebaseMessage.id,
      parentId: firebaseMessage.parentId,
      parentMessageId: firebaseMessage.parentMessageId,
      content: firebaseMessage.content,
      metadata: firebaseMessage.metadata
    });

    await set(newEventRef, firebaseMessage);
    console.log(`[FirebaseChat] Reply message added to Firebase for conversation ${conversationId}:`, firebaseMessage);
  } catch (error) {
    console.error(`[FirebaseChat] Error adding reply message to Firebase:`, error);
  }
}

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

  handleMessageEvent(messageEvent: any): void {
    try {
      console.log('[FirebaseChat] Handling message event:', messageEvent);
      
      const conversationId = messageEvent.conversationId;
      if (!conversationId) {
        console.warn('[FirebaseChat] No conversationId in message event');
        return;
      }

      if (messageEvent.eventType === 'REACTION_ADDED' || messageEvent.eventType === 'REACTION_REMOVED') {
        this.handleReactionEvent(messageEvent);
        return;
      }

      // For message events, let the Firebase listeners handle the updates
      console.log(`[FirebaseChat] Message event handled, Firebase listeners will process the update`);
      
    } catch (error) {
      console.error('[FirebaseChat] Error handling message event:', error);
    }
  }

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

  isMessageReply(message: FirebaseMessage): boolean {
    return !!(message.parentId || message.parentMessageId);
  }

  getMessageEventType(message: FirebaseMessage): string {
    return message.eventType || 'MESSAGE';
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
    
    this.setConversationActive(conversationId, isActive);
    
    if (isActive) {
      this.markConversationAsRead(conversationId);
    }
  }

  getConversationActivity(conversationId: string): boolean {
    return this.conversationListeners.has(conversationId);
  }

  debugState(): void {
    console.log('[FirebaseChat] Current State:', {
      currentUserId: this.currentUserId,
      activeConversations: Array.from(this.activeConversations),
      subscribedConversations: Array.from(this.conversationListeners.keys()),
      hasNotificationListener: !!this.notificationListener,
      messageCallbacks: this.messageCallbacks.size,
      reactionCallbacks: this.reactionCallbacks.size,
      notificationCallbacks: this.notificationCallbacks.size,
      hasForegroundListener: !!this.foregroundMessageListener,
      pendingReceipts: this.pendingReceiptUpdates.size,
      processedFCMMessages: this.processedFCMMessages.size,
      lastNotificationProcessTime: this.lastNotificationProcessTime.size
    });
  }
}

// Export singleton instance
export const firebaseChatService = new FirebaseChatService();