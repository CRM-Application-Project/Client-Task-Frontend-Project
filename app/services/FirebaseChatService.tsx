// Enhanced FirebaseChatService with proper event filtering and deduplication
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
  replyTo?: string;
}

export interface ConversationEvent {
  eventType: 'CONVERSATION_CREATED' | 'PARTICIPANT_ADDED' | 'PARTICIPANT_REMOVED' | 'ROLE_CHANGED';
  conversationId: string;
  conversationName: string;
  conversationType: 'PRIVATE' | 'GROUP';
  triggeredByUserId: string;
  targetUserId?: string;
  targetUserName?: string;
  newRole?: 'ADMIN' | 'MEMBER';
  timestamp: string;
  eventKey: string; // Add unique event key for tracking
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

class FirebaseChatService {
  private database = getDatabaseInstance();
  private conversationListeners: Map<string, any> = new Map();
  private notificationListener: any = null;
  private messageCallbacks: Map<string, (messages: FirebaseMessage[]) => void> = new Map();
  private reactionCallbacks: Map<string, (reaction: FirebaseReactionEvent) => void> = new Map();
  private notificationCallbacks: Set<(notifications: ChatNotifications) => void> = new Set();
  private conversationEventCallbacks: Set<(event: ConversationEvent) => void> = new Set();
  private currentUserId: string | null = null;
  private foregroundMessageListener: any = null;
  
  // Enhanced conversation state management
  private activeConversations: Set<string> = new Set();
  private pendingReceiptUpdates: Map<string, { messageIds: string[], conversationId: string }> = new Map();
  
  // FIXED: Enhanced deduplication with proper event tracking
  private processedFCMMessages: Set<string> = new Set();
  private processedConversationEvents: Map<string, Set<string>> = new Map(); // conversationId -> Set of eventKeys
  private lastNotificationProcessTime: Map<string, number> = new Map();
  private userInitializationTime: number = 0; // Track when user was initialized

  /**
   * Initialize service with current user ID
   */
  initialize(userId: string): void {
    this.currentUserId = userId;
    this.userInitializationTime = Date.now(); // Track initialization time
    console.log(`[FirebaseChat] Service initialized for user: ${userId} at ${this.userInitializationTime}`);
    
    this.setupForegroundMessageListener();
    
    // Clear previous processing state for new user
    this.processedFCMMessages.clear();
    this.processedConversationEvents.clear();
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
// Complete fix for FirebaseChatService.handleReactionEvent method

private handleReactionEvent(reactionData: any): void {
  console.log('[FirebaseChat] Handling reaction event:', reactionData);
  
  const conversationId = reactionData.conversationId?.toString();
  if (!conversationId) {
    console.warn('[FirebaseChat] No conversationId in reaction event');
    return;
  }

  // CRITICAL: Validate required fields
  if (!reactionData.messageId || !reactionData.reaction || !reactionData.senderId) {
    console.warn('[FirebaseChat] Invalid reaction event - missing required fields:', {
      messageId: reactionData.messageId,
      reaction: reactionData.reaction,
      senderId: reactionData.senderId
    });
    return;
  }

  const reactionEvent: FirebaseReactionEvent = {
    eventType: reactionData.eventType,
    messageId: reactionData.messageId?.toString(),
    content: reactionData.content || '',
    senderId: reactionData.senderId,
    senderName: reactionData.senderName || 'Unknown User',
    reaction: reactionData.reaction,
    conversationId: conversationId,
    conversationType: reactionData.conversationType || 'DIRECT',
    conversationName: reactionData.conversationName || '',
    timestamp: reactionData.timestamp || new Date().toISOString(),
    metadata: reactionData.metadata || {}
  };

  console.log(`[FirebaseChat] Dispatching reaction event to conversation ${conversationId}:`, reactionEvent);
  
  // Get the reaction callback for this conversation
  const reactionCallback = this.reactionCallbacks.get(conversationId);
  if (reactionCallback) {
    console.log(`[FirebaseChat] Found reaction callback for conversation ${conversationId}, calling it...`);
    try {
      reactionCallback(reactionEvent);
      console.log(`[FirebaseChat] Successfully called reaction callback`);
    } catch (error) {
      console.error(`[FirebaseChat] Error in reaction callback:`, error);
    }
  } else {
    console.warn(`[FirebaseChat] No reaction callback found for conversation ${conversationId}`);
    console.log(`[FirebaseChat] Available reaction callbacks:`, Array.from(this.reactionCallbacks.keys()));
  }
}

// Also make sure your subscribeToReactionEvents method properly sets up the callback
subscribeToReactionEvents(
  conversationId: string,
  onReactionUpdate: (reactionEvent: FirebaseReactionEvent) => void
): () => void {
  console.log(`[FirebaseChat] Setting up reaction callback for conversation: ${conversationId}`);
  
  // Store the callback
  this.reactionCallbacks.set(conversationId, onReactionUpdate);
  
  console.log(`[FirebaseChat] Reaction callback registered for conversation ${conversationId}`);
  console.log(`[FirebaseChat] Total reaction callbacks:`, this.reactionCallbacks.size);

  return () => this.unsubscribeFromReactionEvents(conversationId);
}

unsubscribeFromReactionEvents(conversationId: string): void {
  console.log(`[FirebaseChat] Unsubscribing from reaction events for conversation ${conversationId}`);
  const hadCallback = this.reactionCallbacks.has(conversationId);
  this.reactionCallbacks.delete(conversationId);
  console.log(`[FirebaseChat] Reaction callback removed: ${hadCallback}, remaining callbacks: ${this.reactionCallbacks.size}`);
}
  /**
   * Mark conversation as active (chat is open)
   */
  setConversationActive(conversationId: string, isActive: boolean): void {
    console.log(`[FirebaseChat] Setting conversation ${conversationId} as ${isActive ? 'active' : 'inactive'}`);
    
    if (isActive) {
      this.activeConversations.add(conversationId);
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
    
    const filteredMessageIds = messageIds.filter(id => {
      return true; // For now, process all message IDs
    });

    if (filteredMessageIds.length === 0) return;

    const isActive = this.isConversationActive(conversationId);
    
    console.log(`[FirebaseChat] Handling receipts for ${filteredMessageIds.length} messages in conversation ${conversationId}`, {
      isActive,
      messageIds: filteredMessageIds
    });

    if (isActive) {
      try {
        await this.updateMessageReceipts(filteredMessageIds, 'READ');
      } catch (error) {
        console.error(`[FirebaseChat] Error marking messages as read:`, error);
      }
    } else {
      try {
        await this.updateMessageReceipts(filteredMessageIds, 'DELIVERED');
        
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
   * Check if conversation event should be processed (filter old events)
   */
/**
 * Check if conversation event should be processed (filter old events)
 */
/**
 * Check if conversation event should be processed (filter old events)
 */
/**
 * Enhanced conversation event filtering with duplicate prevention
 */
private shouldProcessConversationEvent(eventData: any, eventKey: string, conversationId: string): boolean {
    if (!eventData || !eventData.timestamp) {
        console.log(`[FirebaseChat] Event has no timestamp, skipping:`, eventKey);
        return false;
    }

    // FILTER 1: Only process events that happened after user initialization
    const eventTimestamp = new Date(eventData.timestamp).getTime();
    const timeSinceInit = eventTimestamp - this.userInitializationTime;
    
    if (timeSinceInit < -5000) {
        console.log(`[FirebaseChat] Event is too old, skipping:`, eventKey);
        return false;
    }

    // FILTER 2: Check if we've already processed this specific event
    const processedEvents = this.processedConversationEvents.get(conversationId) || new Set();
    if (processedEvents.has(eventKey)) {
        console.log(`[FirebaseChat] Event ${eventKey} already processed`);
        return false;
    }

    // FILTER 3: CRITICAL FIX - Skip CONVERSATION_CREATED for creator entirely
    if (eventData.eventType === 'CONVERSATION_CREATED') {
        const currentUserId = this.currentUserId || localStorage.getItem('userId') || '';
        const currentUserName = localStorage.getItem('userName') || '';
        
        // Enhanced creator check with multiple field comparisons
        const isCreator = 
            eventData.triggeredByUserId === currentUserId || 
            eventData.triggeredByUserId === currentUserName ||
            eventData.triggeredByUserName === currentUserId ||
            eventData.triggeredByUserName === currentUserName ||
            eventData.triggeredBy === currentUserId ||
            eventData.triggeredBy === currentUserName;
        
        if (isCreator) {
            console.log(`[FirebaseChat] 🚫 BLOCKED: CONVERSATION_CREATED for creator`, {
                eventKey,
                triggeredByUserId: eventData.triggeredByUserId,
                triggeredByUserName: eventData.triggeredByUserName,
                currentUserId: currentUserId,
                currentUserName: currentUserName,
                conversationId
            });
            
            // Mark as processed to prevent any further handling
            this.markConversationEventAsProcessed(conversationId, eventKey);
            return false;
        }
        
        console.log(`[FirebaseChat] ✅ Processing CONVERSATION_CREATED for participant:`, {
            eventKey,
            triggeredByUserId: eventData.triggeredByUserId,
            triggeredByUserName: eventData.triggeredByUserName,
            currentUserId: currentUserId,
            currentUserName: currentUserName
        });
        return true;
    }

    // FILTER 4: For PARTICIPANT_ADDED, only process if current user is the target
    if (eventData.eventType === 'PARTICIPANT_ADDED') {
        const currentUserId = this.currentUserId || localStorage.getItem('userId') || '';
        const currentUserName = localStorage.getItem('userName') || '';
        
        const isForCurrentUser = 
            eventData.targetUserId === currentUserId || 
            eventData.targetUserId === currentUserName ||
            eventData.targetUserName === currentUserId ||
            eventData.targetUserName === currentUserName ||
            eventData.targetUser === currentUserId ||
            eventData.targetUser === currentUserName;
        
        if (!isForCurrentUser) {
            console.log(`[FirebaseChat] PARTICIPANT_ADDED not for current user, skipping:`, {
                eventKey,
                targetUserId: eventData.targetUserId,
                targetUserName: eventData.targetUserName,
                currentUserId: currentUserId,
                currentUserName: currentUserName
            });
            return false;
        }
        
        console.log(`[FirebaseChat] ✅ Processing PARTICIPANT_ADDED for current user:`, {
            eventKey,
            targetUserId: eventData.targetUserId,
            targetUserName: eventData.targetUserName
        });
        return true;
    }

    // For other event types, process normally
    return true;
}

/**
 * Check if current user is a participant in the conversation
 * This method should be implemented based on your application's data structure
 */
private isUserParticipantInConversation(conversationId: string): boolean {
    // Since we don't have immediate access to participant list here,
    // we'll rely on the backend to only send events to actual participants
    // For now, return true and add proper implementation later
    console.log(`[FirebaseChat] Assuming user is participant in ${conversationId} - implement proper check`);
    return true;
}

  /**
   * Mark conversation event as processed
   */
  private markConversationEventAsProcessed(conversationId: string, eventKey: string): void {
    if (!this.processedConversationEvents.has(conversationId)) {
      this.processedConversationEvents.set(conversationId, new Set());
    }
    
    const processedEvents = this.processedConversationEvents.get(conversationId)!;
    processedEvents.add(eventKey);
    
    // Keep only last 50 events per conversation to prevent memory bloat
    if (processedEvents.size > 50) {
      const eventsArray = Array.from(processedEvents);
      const oldestEvents = eventsArray.slice(0, 25);
      oldestEvents.forEach(eventKey => processedEvents.delete(eventKey));
    }
    
    console.log(`[FirebaseChat] Marked event ${eventKey} as processed for conversation ${conversationId}`);
  }

  /**
   * FCM foreground message handler with minimal deduplication
   */
  private async handleForegroundMessage(data: any): Promise<void> {
    try {
      console.log('[FirebaseChat] Processing foreground FCM message:', data);
      
      const conversationId = data.conversationId;
      if (!conversationId) {
        console.warn('[FirebaseChat] No conversationId in foreground message');
        return;
      }

      const fcmEventId = `fcm-${conversationId}-${data.messageId || data.timestamp || Date.now()}`;
      if (this.processedFCMMessages.has(fcmEventId)) {
        console.log(`[FirebaseChat] FCM event ${fcmEventId} already processed, skipping`);
        return;
      }
      
      this.processedFCMMessages.add(fcmEventId);
      
      if (this.processedFCMMessages.size > 100) {
        const oldestEntries = Array.from(this.processedFCMMessages).slice(0, 50);
        oldestEntries.forEach(entry => this.processedFCMMessages.delete(entry));
      }
      
      const messageData = data.messageData ? JSON.parse(data.messageData) : data;
      
      if (conversationId && messageData) {
        console.log(`[FirebaseChat] Processing FCM message for conversation ${conversationId}:`, messageData);
        
        if (messageData.eventType === 'REACTION_ADDED' || messageData.eventType === 'REACTION_REMOVED') {
          this.handleReactionEvent(messageData);
        } else {
          console.log(`[FirebaseChat] FCM message received, Firebase listener will handle the data update`);
          
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
   * Conversation subscription with proper real-time updates
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
    
    this.setConversationActive(conversationId, true);
    this.messageCallbacks.set(conversationId, onMessagesUpdate);

    const eventsRef = ref(this.database, `conversations/${conversationId}/events`);

    const listener = onValue(eventsRef, async (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      const messages: FirebaseMessage[] = [];

      console.log(`[Firebase] Raw Firebase events data for ${conversationId}:`, JSON.stringify(data, null, 2));

      if (data) {
        const incomingMessageIds: string[] = [];
        
        Object.entries(data).forEach(([eventKey, eventData]: [string, any]) => {
  if (eventData && typeof eventData === 'object') {
    console.log(`[Firebase] Event ${eventKey}:`, {
      type: eventData.eventType,
      messageId: eventData.messageId,
      parentId: eventData.parentId,
      content: eventData.content?.substring(0, 50) + '...'
    });
    
    // Handle reaction events separately
    if (eventData.eventType === 'REACTION_ADDED' || eventData.eventType === 'REACTION_REMOVED') {
      console.log(`[Firebase] Processing reaction event:`, eventData);
      this.handleReactionEvent(eventData);
      return; // Skip message processing for reaction events
    }
    
            
            if (eventData.eventType === 'MESSAGE_SENT' || 
                eventData.eventType === 'MESSAGE_REPLIED' ||
                eventData.eventType === 'MESSAGE_EDITED' ||
                !eventData.eventType) {
              
              const hasParentId = !!(
                eventData.parentMessageId || 
                eventData.parentId || 
                eventData.replyTo ||
                eventData.metadata?.parentId
              );
              
              console.log(`[Firebase] Message Event Analysis:`, {
                eventKey,
                eventType: eventData.eventType,
                messageId: eventData.messageId,
                hasParentId: hasParentId,
                parentFields: {
                  parentMessageId: eventData.parentMessageId,
                  parentId: eventData.parentId,
                  replyTo: eventData.replyTo,
                  metadataParentId: eventData.metadata?.parentId
                },
                isReply: hasParentId,
                content: eventData.content?.substring(0, 50) + '...'
              });

              const firebaseMessage = this.transformMessageEventToFirebaseMessage(eventData);
              
              if (hasParentId && !firebaseMessage.parentId) {
                console.error(`[Firebase] CRITICAL: Reply message lost parentId during transformation!`, {
                  originalEvent: {
                    parentMessageId: eventData.parentMessageId,
                    parentId: eventData.parentId,
                    replyTo: eventData.replyTo,
                    metadataParentId: eventData.metadata?.parentId
                  },
                  transformedMessage: {
                    parentId: firebaseMessage.parentId,
                    parentMessageId: firebaseMessage.parentMessageId
                  }
                });
              } else if (hasParentId && firebaseMessage.parentId) {
                console.log(`[Firebase] Reply parentId preserved:`, {
                  messageId: firebaseMessage.id,
                  parentId: firebaseMessage.parentId,
                  content: firebaseMessage.content?.substring(0, 30) + '...'
                });
              }
              
              if (firebaseMessage.senderId !== this.currentUserId) {
                incomingMessageIds.push(firebaseMessage.id);
              }
              
              const messageId = firebaseMessage.id;
              const relatedReactions: any[] = [];
              
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
              
              console.log(`[Firebase] Added message to processing queue:`, {
                id: firebaseMessage.id,
                isReply: !!(firebaseMessage.parentId || firebaseMessage.parentMessageId),
                parentId: firebaseMessage.parentId,
                content: firebaseMessage.content?.substring(0, 30) + '...'
              });
            }
          }
        });

        messages.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.timestamp).getTime();
          const timeB = new Date(b.createdAt || b.timestamp).getTime();
          return timeA - timeB;
        });

        console.log(`[Firebase] Final processed messages for callback:`, {
          totalMessages: messages.length,
          replyMessages: messages.filter(m => !!(m.parentId || m.parentMessageId)).length,
          regularMessages: messages.filter(m => !(m.parentId || m.parentMessageId)).length,
          messageDetails: messages.map(m => ({
            id: m.id,
            isReply: !!(m.parentId || m.parentMessageId),
            parentId: m.parentId,
            content: m.content?.substring(0, 20) + '...'
          }))
        });

        if (incomingMessageIds.length > 0) {
          console.log(`[Firebase] Processing ${incomingMessageIds.length} incoming messages for receipt updates`);
          await this.handleIncomingMessageReceipts(conversationId, incomingMessageIds);
        }
      }

      console.log(`[Firebase] Calling onMessagesUpdate callback with ${messages.length} messages`);
      onMessagesUpdate(messages);

      if (this.isConversationActive(conversationId)) {
        this.markConversationAsRead(conversationId);
      }
    }, (error) => {
      console.error(`[FirebaseChat] Error listening to conversation ${conversationId}:`, error);
    });

    this.conversationListeners.set(conversationId, listener);

    console.log(`[FirebaseChat] Successfully subscribed to conversation ${conversationId}`);

    return () => this.unsubscribeFromConversationMessages(conversationId);
  }

  /**
   * Enhanced unsubscribe with proper cleanup
   */
  unsubscribeFromConversationMessages(conversationId: string): void {
    if (!this.database) return;

    console.log(`[FirebaseChat] Unsubscribing from conversation ${conversationId}`);

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
   * FIXED: User notifications with enhanced conversation event filtering
   */
  subscribeToUserNotifications(
    userId: string,
    onNotificationsUpdate: (notifications: ChatNotifications) => void,
    onConversationEvent?: (event: ConversationEvent) => void
  ): () => void {
    if (!this.database) {
      console.warn('[FirebaseChat] Database not initialized for notifications');
      return () => {};
    }

    console.log(`[FirebaseChat] Subscribing to notifications for user: ${userId}`);
    this.currentUserId = userId;

    this.notificationCallbacks.add(onNotificationsUpdate);
    
    if (onConversationEvent) {
      this.conversationEventCallbacks.add(onConversationEvent);
    }

    const notifPath = `user-notifications/${userId}`;
    const notificationsRef = ref(this.database, notifPath);

    this.notificationListener = onValue(notificationsRef, (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      
      console.log(`[FirebaseChat] User notifications onValue fired for ${userId}. exists=${snapshot.exists()}`,
        { key: snapshot.key, convCount: data ? Object.keys(data).length : 0 });

      // ENHANCED: Process conversation events with proper filtering
      if (data && onConversationEvent) {
        Object.entries(data).forEach(([conversationId, conversationData]: [string, any]) => {
          if (conversationData?.events) {
            Object.entries(conversationData.events).forEach(([eventKey, eventData]: [string, any]) => {
              if (eventData && typeof eventData === 'object') {
                // Check for conversation creation and participant events
                if (eventData.eventType === 'CONVERSATION_CREATED' || eventData.eventType === 'PARTICIPANT_ADDED') {
                  
                  // APPLY ENHANCED FILTERING
                  if (!this.shouldProcessConversationEvent(eventData, eventKey, conversationId)) {
                    return; // Skip this event
                  }
                  
                  console.log(`[FirebaseChat] Processing valid conversation event:`, {
                    type: eventData.eventType,
                    conversationId: eventData.conversationId || conversationId,
                    triggeredBy: eventData.triggeredByUserId,
                    targetUser: eventData.targetUserId,
                    timestamp: eventData.timestamp,
                    eventKey
                  });
                  
                  // Mark event as processed before handling
                  this.markConversationEventAsProcessed(conversationId, eventKey);
                  
                  // Create conversation event object
                  const conversationEvent: ConversationEvent = {
                    eventType: eventData.eventType,
                    conversationId: eventData.conversationId || conversationId,
                    conversationName: eventData.conversationName || '',
                    conversationType: eventData.conversationType || 'PRIVATE',
                    triggeredByUserId: eventData.triggeredByUserId || '',
                    targetUserId: eventData.targetUserId,
                    targetUserName: eventData.targetUserName,
                    newRole: eventData.newRole,
                    timestamp: eventData.timestamp || new Date().toISOString(),
                    eventKey: eventKey,
                    ...eventData
                  };
                  
                  console.log(`[FirebaseChat] Calling conversation event handler:`, conversationEvent);
                  
                  try {
                    onConversationEvent(conversationEvent);
                  } catch (error) {
                    console.error(`[FirebaseChat] Error in conversation event handler:`, error);
                  }
                }
                
                // Handle other event types for reactions etc.
                if (eventData.eventType === 'REACTION_ADDED' || eventData.eventType === 'REACTION_REMOVED') {
                  console.log(`[FirebaseChat] Processing reaction event from user notifications:`, eventData);
                  this.handleReactionEvent(eventData);
                }
              }
            });
          }
        });
      }

      // Process regular notifications (unchanged)
      if (data) {
        const currentTime = Date.now();
        
        Object.entries(data).forEach(([conversationId, conversationData]: [string, any]) => {
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
   * Enhanced cleanup with proper state management
   */
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

    // Clear all state
    this.conversationListeners.clear();
    this.messageCallbacks.clear();
    this.reactionCallbacks.clear();
    this.conversationEventCallbacks.clear();
    this.activeConversations.clear();
    this.pendingReceiptUpdates.clear();
    this.processedFCMMessages.clear();
    this.processedConversationEvents.clear();
    this.lastNotificationProcessTime.clear();
    this.currentUserId = null;
    this.userInitializationTime = 0;

    console.log('[FirebaseChat] Cleanup completed');
  }

  // [Rest of the methods remain unchanged - including all the existing methods]
  // setupForegroundMessageListener, handleReactionEvent, transformMessageEventToFirebaseMessage,
  // subscribeToReactionEvents, unsubscribeFromReactionEvents, addMessageToFirebase, etc.

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
   * Transform Java MessageEvent structure to FirebaseMessage format
   */
  private transformMessageEventToFirebaseMessage(messageData: any): FirebaseMessage {
    console.log('🔍 [DEBUG] FULL Backend Message Event Response:', JSON.stringify(messageData, null, 2));
    
    console.log('🔍 [DEBUG] Parent ID Field Analysis:', {
      parentMessageId: {
        value: messageData.parentMessageId,
        type: typeof messageData.parentMessageId,
        isNull: messageData.parentMessageId === null,
        isUndefined: messageData.parentMessageId === undefined,
        isEmpty: messageData.parentMessageId === '',
        stringified: JSON.stringify(messageData.parentMessageId)
      },
      parentId: {
        value: messageData.parentId,
        type: typeof messageData.parentId,
        isNull: messageData.parentId === null,
        isUndefined: messageData.parentId === undefined,
        isEmpty: messageData.parentId === '',
        stringified: JSON.stringify(messageData.parentId)
      },
      replyTo: {
        value: messageData.replyTo,
        type: typeof messageData.replyTo,
        isNull: messageData.replyTo === null,
        isUndefined: messageData.replyTo === undefined,
        isEmpty: messageData.replyTo === '',
        stringified: JSON.stringify(messageData.replyTo)
      },
      metadata: messageData.metadata ? JSON.stringify(messageData.metadata) : 'NO METADATA'
    });

    let parentId: string | undefined;
    
    if (messageData.parentMessageId !== null && 
        messageData.parentMessageId !== undefined && 
        messageData.parentMessageId !== '' && 
        messageData.parentMessageId !== 0) {
      parentId = messageData.parentMessageId.toString();
      console.log('✅ [DEBUG] Found parentMessageId from backend:', parentId);
    }
    else if (messageData.parentId !== null && 
             messageData.parentId !== undefined && 
             messageData.parentId !== '' && 
             messageData.parentId !== 0) {
      parentId = messageData.parentId.toString();
      console.log('✅ [DEBUG] Found parentId from backend:', parentId);
    }
    else if (messageData.metadata?.parentId) {
      parentId = messageData.metadata.parentId.toString();
      console.log('✅ [DEBUG] Found parentId from metadata:', parentId);
    }
    else {
      console.log('❌ [DEBUG] NO PARENT ID FOUND - This should be a regular message');
    }

    console.log('🔍 [DEBUG] Event Type Analysis:', {
      eventType: messageData.eventType,
      isReply: !!(parentId),
      shouldShowAsReply: !!(parentId && messageData.eventType !== 'MESSAGE_SENT')
    });

    const firebaseMessage: FirebaseMessage = {
      id: messageData.messageId?.toString() || messageData.id?.toString() || Date.now().toString(),
      content: messageData.content || '',
      senderId: messageData.senderId || messageData.sender?.id || '',
      senderName: messageData.senderName || messageData.sender?.name || '',
      timestamp: messageData.timestamp || messageData.createdAt || new Date().toISOString(),
      createdAt: messageData.timestamp || messageData.createdAt || new Date().toISOString(),
      type: 'received',
      parentId: parentId,
      parentMessageId: parentId,
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
        parentId: parentId || messageData.metadata?.parentId
      }
    };

    console.log('🎯 [DEBUG] TRANSFORMED Firebase Message:', {
      id: firebaseMessage.id,
      content: firebaseMessage.content?.substring(0, 50) + '...',
      parentId: firebaseMessage.parentId,
      parentMessageId: firebaseMessage.parentMessageId,
      isReply: !!(firebaseMessage.parentId || firebaseMessage.parentMessageId),
      eventType: firebaseMessage.eventType,
      senderId: firebaseMessage.senderId,
      senderName: firebaseMessage.senderName
    });

    return firebaseMessage;
  }





  async addMessageToFirebase(conversationId: string, messageData: any): Promise<void> {
    if (!this.database) {
      console.warn('[FirebaseChat] Database not initialized');
      return;
    }

    try {
      const eventsRef = ref(this.database, `conversations/${conversationId}/events`);
      const newEventRef = push(eventsRef);
      
      console.log('[FirebaseChat] Raw message data before Firebase transformation:', {
        messageId: messageData.id,
        parentMessageId: messageData.parentMessageId,
        parentId: messageData.parentId,
        content: messageData.content,
        eventType: messageData.eventType
      });

      const enhancedMessageData = {
        ...messageData,
        id: messageData.id?.toString() || newEventRef.key,
        metadata: {
          ...messageData.metadata,
          parentId: messageData.parentId || messageData.parentMessageId
        }
      };

      const firebaseMessage = this.transformMessageEventToFirebaseMessage(enhancedMessageData);

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
    this.conversationEventCallbacks.clear();

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
      conversationEventCallbacks: this.conversationEventCallbacks.size,
      hasForegroundListener: !!this.foregroundMessageListener,
      pendingReceipts: this.pendingReceiptUpdates.size,
      processedFCMMessages: this.processedFCMMessages.size,
      processedConversationEvents: this.processedConversationEvents.size,
      lastNotificationProcessTime: this.lastNotificationProcessTime.size,
      userInitializationTime: new Date(this.userInitializationTime).toISOString()
    });
  }
}

// Export singleton instance
export const firebaseChatService = new FirebaseChatService();