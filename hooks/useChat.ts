import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiMessage, User } from '@/lib/data';
import { ChatParticipant, MessageAttachment, AddMessageResponse, ReplyToMessageResponse } from '@/app/services/chatService';
import { getAssignDropdown, getChatList } from '@/app/services/data.service';
import { 
  addMessage, 
  addParticipants, 
  addReaction, 
  deleteMessage, 
  deleteParticipants, 
  editMessage, 
  filterMessages, 
  removeReaction, 
  softDeleteConversation, 
  startConversation,
  changeParticipantRole,
  replyToMessage as replyToMessageService,
  getMessage,
  getMessageReceipts,
  updateMessageReceipt,
  Chat,
  MessageFileInfo,
  getConversation // Add this import
} from '@/app/services/chatService';
import { firebaseChatService, FirebaseMessage, ChatNotifications, ConversationEvent, FirebaseReactionEvent } from '@/app/services/FirebaseChatService';

export interface Message {
  id: string;
  content: string;
  sender: {
    id: string;
    label: string;
  };
  createdAt: string;
  senderId: string;
  timestamp: string;
  type: "sent" | "received";
  reactions?: { 
    id?: string;
    messageId?: string;
    emoji: string;
    count: number;
    users: string[];
    reaction?: string;
    createdAt?: string;
    senderId?: string;
    senderName?: string;
  }[];
  replyTo?: string;
  parentId?: string;
  mentions?: string[];
  deletable?: boolean;
  updatable?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read'| 'failed';
  hasAttachments?: boolean|null;
  attachments?: MessageAttachment[];
  error?: string;
  tempMessageKey?: string; 
  isProcessedLocally?: boolean;
}

// Add this interface for the lastMessage object structure
export interface LastMessage {
  content: string;
  timestamp: string | Date;
  senderId: string;
  id?: string; // Make id optional since it might not always be present
  createdAt?: string; // Make createdAt optional
}

// NEW: Enhanced Synchronization Manager
interface SyncState {
  lastApiSync: number;
  pendingApiSyncs: Set<string>;
  unreadCountCache: Map<string, { api: number; firebase: number; lastSync: number }>;
  eventProcessingTimestamp: number;
  conversationStateCache: Map<string, { lastMessageId: string; timestamp: number }>;
}

export const useChat = () => {
  // Core state
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<ChatParticipant[]>([]);
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userConversationIds, setUserConversationIds] = useState<string[]>([]);
  
  // User and conversation state
  const userid = (typeof window !== 'undefined') ? localStorage.getItem('userId') : null;
  const [currentUserId, setCurrentUserId] = useState<string>(userid || '');
  const [currentUserName] = useState('You');
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const userConversationsUnsubscriber = useRef<(() => void) | null>(null);
  const conversationDetailUnsubscribers = useRef<Map<string, () => void>>(new Map());
  
  // Notification state
  const [notifications, setNotifications] = useState<ChatNotifications>({});
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  
  // Loading states
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState<Set<string>>(new Set());
  
  // Subscription management
  const userNotificationUnsubscriber = useRef<(() => void) | null>(null);
  const conversationUnsubscribers = useRef<Map<string, () => void>>(new Map());
  const initializationRef = useRef<{ initialized: boolean; initializing: boolean }>({
    initialized: false,
    initializing: false
  });
  
  // FIXED: Track loaded conversations to prevent duplicate API calls
  const loadedConversationsRef = useRef<Set<string>>(new Set());

  // NEW: Enhanced Synchronization State Management
  const syncStateRef = useRef<SyncState>({
    lastApiSync: 0,
    pendingApiSyncs: new Set(),
    unreadCountCache: new Map(),
    eventProcessingTimestamp: Date.now(),
    conversationStateCache: new Map()
  });

  // NEW: API-Firebase Synchronization Manager
  const synchronizeWithBackend = useCallback(async (conversationId?: string, forceSync = false) => {
    const now = Date.now();
    const syncKey = conversationId || 'all-conversations';
    
    // Prevent rapid successive syncs
    if (!forceSync && syncStateRef.current.pendingApiSyncs.has(syncKey)) {
      console.log(`[Sync] Skipping duplicate sync request for: ${syncKey}`);
      return;
    }
    
    if (!forceSync && (now - syncStateRef.current.lastApiSync) < 2000) {
      console.log(`[Sync] Rate limiting sync requests - last sync was ${now - syncStateRef.current.lastApiSync}ms ago`);
      return;
    }
    
    syncStateRef.current.pendingApiSyncs.add(syncKey);
    
    try {
      console.log(`[Sync] 🔄 Starting backend synchronization for: ${syncKey}`);
      
      if (conversationId) {
        // Sync specific conversation
        await syncSingleConversation(conversationId);
      } else {
        // Sync all conversations
        await syncAllConversations();
      }
      
      syncStateRef.current.lastApiSync = now;
      console.log(`[Sync] ✅ Backend synchronization completed for: ${syncKey}`);
      
    } catch (error) {
      console.error(`[Sync] ❌ Backend synchronization failed for: ${syncKey}`, error);
    } finally {
      syncStateRef.current.pendingApiSyncs.delete(syncKey);
    }
  }, []);

  // NEW: Sync single conversation with backend
  const syncSingleConversation = useCallback(async (conversationId: string) => {
    try {
      // Get latest conversation data from backend
      const conversationResponse = await getConversation(conversationId);
      
      if (conversationResponse.isSuccess) {
        const backendChat = conversationResponse.data;
        
        console.log(`[Sync] Backend conversation data for ${conversationId}:`, {
          unreadCount: backendChat.unReadMessageCount,
          lastMessageId: (backendChat.lastMessage as any).id?.toString(),
          lastMessageContent: backendChat.lastMessage?.content
        });
        
        // Update unread count cache with backend truth
        const cacheEntry = syncStateRef.current.unreadCountCache.get(conversationId) || 
                          { api: 0, firebase: 0, lastSync: 0 };
        
        cacheEntry.api = backendChat.unReadMessageCount || 0;
        cacheEntry.lastSync = Date.now();
        syncStateRef.current.unreadCountCache.set(conversationId, cacheEntry);
        
        // Update conversation state cache
        if (backendChat.lastMessage) {
          syncStateRef.current.conversationStateCache.set(conversationId, {
           lastMessageId: (backendChat.lastMessage as any).id?.toString(),

            timestamp: new Date((backendChat.lastMessage as any).createdAt).getTime()
          });
        }
        
const getLastMessageTimestamp = (lastMessage: any): number => {
  return new Date(lastMessage?.createdAt || Date.now()).getTime();
};

const getLastMessageSenderId = (lastMessage: any): string => {
  return lastMessage?.sender?.id || '';
};

        // Update local chat state with backend truth
       setChats(prev => {
  return prev.map(chat => {
    if (chat.id.toString() === conversationId) {
      return {
        ...chat,
        unReadMessageCount: backendChat.unReadMessageCount || 0,
        lastMessage: backendChat.lastMessage ? {
          content: backendChat.lastMessage.content,
          timestamp: (backendChat.lastMessage as any).createdAt, // Fix here
          senderId: (backendChat.lastMessage as any).sender?.id || '' // Fix here
        } : chat.lastMessage
      };
    }
    return chat;
  });
});
        
        console.log(`[Sync] ✅ Updated conversation ${conversationId} with backend data`);
        
      } else {
        console.warn(`[Sync] Failed to get conversation data from backend: ${conversationResponse.message}`);
      }
      
    } catch (error) {
      console.error(`[Sync] Error syncing conversation ${conversationId}:`, error);
    }
  }, []);

  // NEW: Sync all conversations with backend
  const syncAllConversations = useCallback(async () => {
    try {
      const chatResponse = await getChatList();
      
      if (chatResponse.isSuccess) {
        console.log(`[Sync] Backend chat list data:`, chatResponse.data.map((chat: any) => ({
          id: chat.id,
          name: chat.name,
          unreadCount: chat.unReadMessageCount,
          lastMessageId: chat.lastMessage?.id
        })));
        
        // Update all unread count caches with backend truth
        chatResponse.data.forEach((backendChat: any) => {
          const conversationId = backendChat.id.toString();
          const cacheEntry = syncStateRef.current.unreadCountCache.get(conversationId) || 
                            { api: 0, firebase: 0, lastSync: 0 };
          
          cacheEntry.api = backendChat.unReadMessageCount || 0;
          cacheEntry.lastSync = Date.now();
          syncStateRef.current.unreadCountCache.set(conversationId, cacheEntry);
          
          // Update conversation state cache
          if (backendChat.lastMessage) {
            syncStateRef.current.conversationStateCache.set(conversationId, {
              lastMessageId: backendChat.lastMessage.id.toString(),
              timestamp: new Date(backendChat.lastMessage.createdAt).getTime()
            });
          }
        });
        
        // Update local state with backend truth - transform backend data
        const transformedChats = chatResponse.data.map((apiChat: any) => {
          const participants = apiChat.participants || [];
          const isPrivate = String(apiChat.conversationType).toUpperCase() === 'PRIVATE';
          const other = participants.find((p: any) => p.id !== currentUserId);
          const displayName = isPrivate ? (other?.label || apiChat.name) : apiChat.name;

          return {
            id: apiChat.id,
            name: displayName,
            description: apiChat.description || '',
            conversationType: apiChat.conversationType,
            participants: participants.map((participant: any) => ({
              id: participant.id,
              name: participant.label,
              label: participant.label,
              status: 'offline' as const,
              conversationRole: participant.conversationRole === 'ADMIN' ? 'ADMIN' : 'MEMBER'
            })),
            unReadMessageCount: apiChat.unReadMessageCount || 0, // Use backend truth
            messageResponses: apiChat.messageResponses || [],
            lastMessage: apiChat.lastMessage
              ? {
                  content: apiChat.lastMessage.content,
                  timestamp: apiChat.lastMessage.createdAt,
                  senderId: apiChat.lastMessage.sender?.id || ''
                }
              : undefined
          };
        });
        
        setChats(transformedChats.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
          const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
          return timeB - timeA;
        }));
        
        console.log(`[Sync] ✅ Updated all conversations with backend truth`);
        
      } else {
        console.warn(`[Sync] Failed to get chat list from backend: ${chatResponse.message}`);
      }
      
    } catch (error) {
      console.error(`[Sync] Error syncing all conversations:`, error);
    }
  }, [currentUserId]);

  // NEW: Enhanced Event Filtering with Timestamp Validation
  const shouldProcessFirebaseEvent = useCallback((eventData: any, eventKey: string, conversationId: string) => {
    if (!eventData || !eventData.timestamp) {
      console.log(`[EventFilter] ❌ Event missing timestamp, skipping: ${eventKey}`);
      return false;
    }
    
    const eventTimestamp = new Date(eventData.timestamp).getTime();
    const processingThreshold = syncStateRef.current.eventProcessingTimestamp;
    
    // CRITICAL: Only process events that happened after our processing threshold
    if (eventTimestamp < processingThreshold) {
      console.log(`[EventFilter] ❌ Event is too old - Event: ${new Date(eventTimestamp).toISOString()}, Threshold: ${new Date(processingThreshold).toISOString()}`, {
        eventKey,
        conversationId,
        eventType: eventData.eventType,
        age: processingThreshold - eventTimestamp
      });
      return false;
    }
    
    // Check against conversation state cache for duplicate prevention
    const stateCache = syncStateRef.current.conversationStateCache.get(conversationId);
    if (stateCache && eventData.messageId) {
      if (eventData.messageId === stateCache.lastMessageId && eventTimestamp <= stateCache.timestamp) {
        console.log(`[EventFilter] ❌ Duplicate message event detected, skipping: ${eventKey}`);
        return false;
      }
    }
    
    console.log(`[EventFilter] ✅ Event passes validation - processing: ${eventKey}`, {
      eventType: eventData.eventType,
      conversationId,
      eventTimestamp: new Date(eventTimestamp).toISOString(),
      thresholdTimestamp: new Date(processingThreshold).toISOString()
    });
    
    return true;
  }, []);

  // NEW: Enhanced Notification Reconciliation with Backend Validation
  const reconcileNotificationsWithBackend = useCallback(async (firebaseNotifications: ChatNotifications) => {
    console.log(`[NotificationReconcile] 🔄 Starting notification reconciliation...`);
    
    const reconciledNotifications = { ...firebaseNotifications };
    let hasChanges = false;
    
    // Check each conversation's unread count against backend cache
    for (const [conversationId, firebaseNotif] of Object.entries(firebaseNotifications)) {
      const cacheEntry = syncStateRef.current.unreadCountCache.get(conversationId);
      
      if (cacheEntry) {
        // Update cache with Firebase data
        cacheEntry.firebase = firebaseNotif.unreadCount || 0;
        
        // If there's a significant discrepancy, use backend truth
        const apiCount = cacheEntry.api;
        const firebaseCount = cacheEntry.firebase;
        const discrepancy = Math.abs(apiCount - firebaseCount);
        
        if (discrepancy > 0) {
          console.log(`[NotificationReconcile] 🔍 Discrepancy detected for conversation ${conversationId}:`, {
            api: apiCount,
            firebase: firebaseCount,
            discrepancy,
            usingApiTruth: true
          });
          
          // Use API truth as source of authority
          reconciledNotifications[conversationId] = {
            ...firebaseNotif,
            unreadCount: apiCount
          };
          hasChanges = true;
          
          // Trigger backend sync to get latest data
          setTimeout(() => synchronizeWithBackend(conversationId), 100);
        }
      } else {
        // No cache entry, trigger sync to get backend data
        console.log(`[NotificationReconcile] 📋 No cache for conversation ${conversationId}, triggering sync`);
        setTimeout(() => synchronizeWithBackend(conversationId), 50);
      }
    }
    
    if (hasChanges) {
      console.log(`[NotificationReconcile] ✅ Applied reconciliation changes`);
      return reconciledNotifications;
    }
    
    console.log(`[NotificationReconcile] ℹ️ No reconciliation needed`);
    return firebaseNotifications;
  }, [synchronizeWithBackend]);

  // Initialize Firebase service
  useEffect(() => {
    if (currentUserId && !initializationRef.current.initialized) {
      console.log(`[useChat] Initializing Firebase service for user: ${currentUserId}`);
      firebaseChatService.initialize(currentUserId);
      initializationRef.current.initialized = true;
      
      // Set event processing timestamp to now to filter old events
      syncStateRef.current.eventProcessingTimestamp = Date.now();
      
      // Trigger initial backend sync
      setTimeout(() => synchronizeWithBackend(), 1000);
    }
  }, [currentUserId, synchronizeWithBackend]);

  // Update user ID from storage
  useEffect(() => {
    try {
      const id = (typeof window !== 'undefined') ? localStorage.getItem('userId') : null;
      if (id && id !== currentUserId) {
        console.log(`[useChat] User ID changed from ${currentUserId} to ${id}`);
        setCurrentUserId(id);
        // Reset initialization when user changes
        initializationRef.current.initialized = false;
        initializationRef.current.initializing = false;
        // Reset sync state for new user
        syncStateRef.current = {
          lastApiSync: 0,
          pendingApiSyncs: new Set(),
          unreadCountCache: new Map(),
          eventProcessingTimestamp: Date.now(),
          conversationStateCache: new Map()
        };
      }
    } catch (error) {
      console.error('[useChat] Error reading user ID from storage:', error);
    }
  }, [currentUserId]);
  const loadMyConversations = useCallback(async () => {
    if (isLoadingChats) return;
    
    console.log('[useChat] Loading my conversations...');
    try {
      setIsLoadingChats(true);
      setLoading(true);
      setError(null);
      
      const chatResponse = await getChatList();
      if (chatResponse.isSuccess) {
        console.log(`[useChat] Loaded ${chatResponse.data.length} conversations from API`);
        
        // Update sync cache with API data (source of truth)
        chatResponse.data.forEach((apiChat: any) => {
          const conversationId = apiChat.id.toString();
          const cacheEntry = syncStateRef.current.unreadCountCache.get(conversationId) || 
                            { api: 0, firebase: 0, lastSync: 0 };
          
          cacheEntry.api = apiChat.unReadMessageCount || 0;
          cacheEntry.lastSync = Date.now();
          syncStateRef.current.unreadCountCache.set(conversationId, cacheEntry);
          
          // Update conversation state cache
          if (apiChat.lastMessage) {
            syncStateRef.current.conversationStateCache.set(conversationId, {
              lastMessageId: apiChat.lastMessage.id.toString(),
              timestamp: new Date(apiChat.lastMessage.createdAt).getTime()
            });
          }
        });
        
        const transformedChats = chatResponse.data.map((apiChat: any) => {
          const participants = apiChat.participants || [];
          const isPrivate = String(apiChat.conversationType).toUpperCase() === 'PRIVATE';
          const other = participants.find((p: any) => p.id !== currentUserId);
          const displayName = isPrivate ? (other?.label || apiChat.name) : apiChat.name;

          return {
            id: apiChat.id,
            name: displayName,
            description: apiChat.description || '',
            conversationType: apiChat.conversationType,
            participants: participants.map((participant: any) => ({
              id: participant.id,
              name: participant.label,
              label: participant.label,
              status: 'offline' as const,
              conversationRole: participant.conversationRole === 'ADMIN' ? 'ADMIN' : 'MEMBER'
            })),
            unReadMessageCount: apiChat.unReadMessageCount, // Use API truth
            messageResponses: apiChat.messageResponses || [],
            lastMessage: apiChat.lastMessage
              ? {
                  content: apiChat.lastMessage.content,
                  timestamp: apiChat.lastMessage.createdAt,
                  senderId: apiChat.lastMessage.sender?.id || ''
                }
              : undefined
          };
        });
        
        setChats(transformedChats.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
          const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
          return timeB - timeA;
        }));
        
        console.log(`[useChat] ✅ Conversations loaded and sync cache updated`);
        
      } else {
        throw new Error(chatResponse.message || 'Failed to load conversations');
      }
    } catch (err) {
      console.error('[useChat] Error loading conversations:', err);
      setError('Failed to load conversations. Please try again.');
    } finally {
      setIsLoadingChats(false);
      setLoading(false);
    }
  }, [currentUserId, isLoadingChats]);
  // NEW: Handle conversation events (CONVERSATION_CREATED, PARTICIPANT_ADDED) with enhanced validation
  const handleConversationEvent = useCallback(async (event: ConversationEvent) => {
    console.log('[ChatLayout] Processing conversation event:', event);
    
    // Apply enhanced event filtering
    if (!shouldProcessFirebaseEvent(event, event.eventKey, event.conversationId)) {
      console.log('[ChatLayout] Event filtered out, skipping processing');
      return;
    }
    
    // CRITICAL: Check if conversation already exists before creating
    const existingChat = chats.find(chat => 
        chat.id.toString() === event.conversationId.toString()
    );
    
    if (existingChat) {
        console.log('[ChatLayout] Conversation already exists, triggering sync instead of creation:', event.conversationId);
        
        // Sync with backend to get latest state
        await synchronizeWithBackend(event.conversationId, true);
        return;
    }
    
    // Only create new conversation if it doesn't exist
    if (event.eventType === 'CONVERSATION_CREATED' || event.eventType === 'PARTICIPANT_ADDED') {
        try {
            console.log('[ChatLayout] Creating new conversation from event:', event.conversationId);
            
            // Refresh conversations to get the newly created conversation from backend
            await loadMyConversations();
            
            // Sync specific conversation data
            setTimeout(() => synchronizeWithBackend(event.conversationId), 500);
            
            console.log('[ChatLayout] Conversation creation handling completed');
        } catch (error) {
            console.error('[ChatLayout] Error handling conversation event:', error);
        }
    }
  }, [chats, loadMyConversations, shouldProcessFirebaseEvent, synchronizeWithBackend]);

  // Load users from API
  const loadUsers = useCallback(async () => {
    if (isLoadingUsers) return;
    
    console.log('[useChat] Loading users...');
    try {
      setIsLoadingUsers(true);
      setError(null);
      
      const userResponse = await getAssignDropdown();
      if (userResponse.isSuccess) {
        console.log(`[useChat] Loaded ${userResponse.data.length} users`);
        const transformedUsers: ChatParticipant[] = userResponse.data
          .filter(apiUser => apiUser.id !== currentUserId)
          .map(apiUser => ({
            id: apiUser.id,
            label: apiUser.label,
            conversationRole: 'MEMBER' as const,
            status: 'offline' as const,
            avatar: undefined
          }));
        setUsers(transformedUsers);
      } else {
        throw new Error(userResponse.message || 'Failed to load users');
      }
    } catch (err) {
      console.error('[useChat] Error loading users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUserId, isLoadingUsers]);

  // Load my conversations from API


  // ENHANCED: Initialize user-level Firebase subscriptions with enhanced notification reconciliation
  const initializeUserNotifications = useCallback(() => {
    if (!currentUserId || userNotificationUnsubscriber.current) {
      return;
    }

    console.log('[useChat] Initializing user-level notifications...');
    
    const unsubscribe = firebaseChatService.subscribeToUserNotifications(
      currentUserId,
      async (firebaseNotifications: ChatNotifications) => {
        console.log('[useChat] User notifications update received:', firebaseNotifications);
        
        // NEW: Apply notification reconciliation with backend
        const reconciledNotifications = await reconcileNotificationsWithBackend(firebaseNotifications);
        
        setNotifications(prevNotifications => {
          // Check if notifications actually changed to prevent unnecessary re-renders
          const prevKeys = Object.keys(prevNotifications);
          const newKeys = Object.keys(reconciledNotifications);
          
          if (prevKeys.length !== newKeys.length) {
            return reconciledNotifications;
          }
          
          // Deep comparison for actual changes
          for (const key of newKeys) {
            const prevNotif = prevNotifications[key];
            const newNotif = reconciledNotifications[key];
            
            if (!prevNotif || 
                prevNotif.unreadCount !== newNotif.unreadCount ||
                prevNotif.timestamp !== newNotif.timestamp ||
                (prevNotif.lastMessage?.content !== newNotif.lastMessage?.content)) {
              return reconciledNotifications;
            }
          }
          
          // No changes detected
          return prevNotifications;
        });
        
        // Calculate total unread count from reconciled data
        const total = Object.values(reconciledNotifications).reduce((sum, notification) => {
          return sum + (notification.unreadCount || 0);
        }, 0);
        setTotalUnreadCount(total);
        
        // ENHANCED: Update chat list with reconciled notification data
        setChats(prevChats => {
          let hasChanges = false;
          const updatedChats = prevChats.map(chat => {
            const chatId = String(chat.id);
            const notificationData = reconciledNotifications[chatId];
            
            if (notificationData) {
              const updatedChat = { ...chat };
              
              // Get cached API truth for unread count
              const cacheEntry = syncStateRef.current.unreadCountCache.get(chatId);
              const apiUnreadCount = cacheEntry ? cacheEntry.api : notificationData.unreadCount;
              
              // Don't show unread for active conversation
              const newUnreadCount = activeConversationId === chatId ? 0 : apiUnreadCount || 0;
              
              if (newUnreadCount !== chat.unReadMessageCount) {
                updatedChat.unReadMessageCount = newUnreadCount;
                hasChanges = true;
                console.log(`[NotificationUpdate] Updated unread count for ${chatId}: ${chat.unReadMessageCount} → ${newUnreadCount}`);
              }
              
              // Update last message if newer and different
              if (notificationData.lastMessage && 
                  notificationData.lastMessage.content && 
                  notificationData.lastMessage.content.trim()) {
                const currentTime = chat.lastMessage?.timestamp 
                  ? new Date(chat.lastMessage.timestamp).getTime() 
                  : 0;
                const newTime = new Date(notificationData.timestamp).getTime();
                
                if (newTime > currentTime && 
                    chat.lastMessage?.content !== notificationData.lastMessage.content) {
                  updatedChat.lastMessage = {
                    content: notificationData.lastMessage.content,
                    timestamp: notificationData.lastMessage.timestamp || notificationData.timestamp,
                    senderId: notificationData.lastMessage.senderId || ''
                  };
                  hasChanges = true;
                }
              }
              
              return updatedChat;
            }
            
            return chat;
          });
          
          if (!hasChanges) {
            return prevChats; // Return same reference if no changes
          }
          
          return updatedChats.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
          });
        });
      },
      // Pass conversation event handler to Firebase service
      handleConversationEvent
    );
    
    userNotificationUnsubscriber.current = unsubscribe;
  }, [currentUserId, activeConversationId, handleConversationEvent, reconcileNotificationsWithBackend]);

  // FIXED: Load conversation messages with proper deduplication and sync awareness
  const loadConversationMessages = useCallback(async (conversationId: string, forceReload = false) => {
    const convKey = `${conversationId}-${forceReload ? 'force' : 'normal'}`;
    
    // Prevent multiple loads for the same conversation
    if (!forceReload && loadedConversationsRef.current.has(conversationId)) {
      console.log(`[useChat] Messages already loaded for conversation: ${conversationId}`);
      return;
    }
    
    if (isLoadingMessages.has(conversationId)) {
      console.log(`[useChat] Already loading messages for conversation: ${conversationId}`);
      return;
    }
    
    console.log(`[useChat] Loading messages for conversation: ${conversationId}`, { forceReload });
    
    if (!forceReload) {
      loadedConversationsRef.current.add(conversationId);
    }
    setIsLoadingMessages(prev => new Set(prev).add(conversationId));
    
    try {
      const response = await filterMessages({ 
        conversationId: parseInt(conversationId),
      });
      
      if (response.isSuccess) {
        console.log(`[useChat] Successfully loaded ${response.data.content.length} messages for conversation ${conversationId}`);
        
        const currentChat = chats.find(chat => chat.id.toString() === conversationId);
        
        const transformedMessages: Message[] = response.data.content.map((apiMsg: ApiMessage) => {
          const senderParticipant = currentChat?.participants.find(p => p.id === apiMsg.sender.id);
          const senderLabel = senderParticipant?.label || 
                             (apiMsg.sender.id === currentUserId ? 'You' : apiMsg.sender.label);

          const transformedReactions = apiMsg.reactions?.map(apiReaction => ({
            id: apiReaction.id?.toString(),
            messageId: apiReaction.messageId?.toString(),
            emoji: apiReaction.reaction || apiReaction.emoji,
            count: 1,
            users: [apiReaction.createdBy || ''],
            reaction: apiReaction.reaction,
            createdAt: apiReaction.createdAt,
            senderId: apiReaction.createdBy,
            senderName: apiReaction.createdBy === currentUserId ? 'You' : 
                       (users.find(u => u.id === apiReaction.createdBy)?.label || 'Unknown')
          })) || [];

          return {
            id: apiMsg.id.toString(),
            content: apiMsg.content,
            sender: {
              id: apiMsg.sender.id,
              label: senderLabel
            },
            senderId: apiMsg.sender.id,
            createdAt: apiMsg.createdAt,
            timestamp: new Date(apiMsg.createdAt).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            type: apiMsg.sender.id === currentUserId ? 'sent' : 'received',
            reactions: transformedReactions,
            parentId: apiMsg.parentId?.toString(),
            mentions: apiMsg.mentions,
            deletable: apiMsg.deletable,
            updatable: apiMsg.updatable,
            status: apiMsg.sender.id === currentUserId ? 'sent' : undefined,
            hasAttachments: apiMsg.attachments && apiMsg.attachments.length > 0,
            attachments: apiMsg.attachments || []
          };
        });
        
        // Always update the messages state
        setMessages(prev => ({ 
          ...prev, 
          [conversationId]: transformedMessages 
        }));
        
        console.log(`[useChat] Updated messages state for conversation ${conversationId} with ${transformedMessages.length} messages`);
        
        // NEW: Update conversation state cache with latest message info
        if (transformedMessages.length > 0) {
          const latestMessage = transformedMessages[transformedMessages.length - 1];
          syncStateRef.current.conversationStateCache.set(conversationId, {
            lastMessageId: latestMessage.id,
            timestamp: new Date(latestMessage.createdAt).getTime()
          });
        }
        
      } else {
        console.error(`[useChat] Failed to load messages: ${response.message}`);
        throw new Error(response.message || 'Failed to load messages');
      }
    } catch (err) {
      console.error(`[useChat] Error loading messages for conversation ${conversationId}:`, err);
      if (!forceReload) {
        loadedConversationsRef.current.delete(conversationId);
      }
    } finally {
      setIsLoadingMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(conversationId);
        return newSet;
      });
    }
  }, [chats, currentUserId, users, isLoadingMessages]);

  // Transform Firebase message to local message format
  const transformFirebaseMessage = useCallback((fm: FirebaseMessage, conversationId: string): Message => {
    // NEW: Additional validation for event processing
    if (!shouldProcessFirebaseEvent(fm, fm.id, conversationId)) {
      console.log(`[useChat] Firebase message filtered out: ${fm.id}`);
      return null as any; // Return null for filtered messages
    }
    
    // COMPREHENSIVE DEBUG LOGGING FOR FIREBASE TO MESSAGE TRANSFORMATION
    console.log('🔍 [useChat] FULL Firebase Message for transformation:', JSON.stringify(fm, null, 2));
    
    console.log('🔍 [useChat] Reply Field Analysis:', {
      parentId: {
        value: fm.parentId,
        type: typeof fm.parentId,
        isNull: fm.parentId === null,
        isUndefined: fm.parentId === undefined,
        isEmpty: fm.parentId === '',
        stringified: JSON.stringify(fm.parentId)
      },
      parentMessageId: {
        value: fm.parentMessageId,
        type: typeof fm.parentMessageId,
        isNull: fm.parentMessageId === null,
        isUndefined: fm.parentMessageId === undefined,
        isEmpty: fm.parentMessageId === '',
        stringified: JSON.stringify(fm.parentMessageId)
      },
      replyTo: {
        value: fm.replyTo,
        type: typeof fm.replyTo,
        isNull: fm.replyTo === null,
        isUndefined: fm.replyTo === undefined,
        isEmpty: fm.replyTo === '',
        stringified: JSON.stringify(fm.replyTo)
      }
    });

    let senderLabel = 'Unknown User';
    
    // First try to find the chat and participant
    const currentChat = chats.find(chat => 
      chat.id.toString() === conversationId || 
      chat.id === Number(conversationId)
    );
    
    if (currentChat) {
      const senderParticipant = currentChat.participants.find(p => 
        p.id === fm.senderId || 
        p.id.toString() === fm.senderId
      );
      if (senderParticipant) {
        senderLabel = senderParticipant.label || 'Unknown User';
      }
    }
    
    // If still unknown, check if it's the current user
    if (senderLabel === 'Unknown User' && fm.senderId === currentUserId) {
      senderLabel = 'You';
    }
    
    // If still unknown, try to find in users list
    if (senderLabel === 'Unknown User') {
      const user = users.find(u => 
        u.id === fm.senderId || 
        u.id.toString() === fm.senderId
      );
      if (user) {
        senderLabel = user.label || (user as any).name || 'Unknown User';
      }
    }

    // If user not found in current state, but we have sender info in the message
    if (senderLabel === 'Unknown User' && fm.senderName) {
      senderLabel = fm.senderName;
    }

    // Final fallback - use senderId if label is still unknown
    if (senderLabel === 'Unknown User' && fm.senderId) {
      senderLabel = `User ${fm.senderId.substring(0, 8)}`;
    }

    // Enhanced reply detection
    const isReplyMessage = !!(fm.parentId || fm.parentMessageId || fm.replyTo);
    
    if (isReplyMessage) {
      console.log('✅ [useChat] REPLY MESSAGE DETECTED:', {
        messageId: fm.id,
        parentId: fm.parentId,
        parentMessageId: fm.parentMessageId,
        replyTo: fm.replyTo,
        content: fm.content?.substring(0, 30) + '...',
        conversationId: conversationId,
        eventType: fm.eventType
      });
    } else {
      console.log('📝 [useChat] REGULAR MESSAGE (no reply fields found):', {
        messageId: fm.id,
        content: fm.content?.substring(0, 30) + '...',
        conversationId: conversationId,
        availableFields: {
          parentId: fm.parentId,
          parentMessageId: fm.parentMessageId,
          replyTo: fm.replyTo
        }
      });
    }

    const transformedReactions = (fm.reactions || []).map((r: any) => ({
      emoji: r.reaction || r.emoji,
      count: 1,
      users: [r.senderId || ''],
      senderId: r.senderId,
      senderName: r.senderId === currentUserId ? 'You' : (r.senderName || ''),
      createdAt: r.timestamp || r.createdAt,
      reaction: r.reaction || r.emoji
    }));

    // Use the first non-empty parent ID we find
    const finalParentId = fm.parentId || fm.parentMessageId || fm.replyTo;
    
    const transformedMessage: Message = {
      id: fm.id?.toString(),
      content: fm.content?.trim() || '',
      sender: {
        id: fm.senderId || '',
        label: senderLabel
      },
      createdAt: fm.createdAt || fm.timestamp,
      senderId: fm.senderId || '',
      timestamp: new Date(fm.createdAt || fm.timestamp || Date.now()).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      type: (fm.senderId === currentUserId ? 'sent' : 'received'),
      reactions: transformedReactions,
      parentId: finalParentId, // This is crucial for reply display
      replyTo: finalParentId,  // Also set replyTo for consistency
      mentions: fm.mentions,
      deletable: false,
      updatable: false,
      status: fm.senderId === currentUserId ? 'sent' : 'delivered',
      hasAttachments: fm.attachments && fm.attachments.length > 0,
      attachments: fm.attachments || []
    };

    // FINAL VERIFICATION
    console.log('🎯 [useChat] FINAL Transformed Message:', {
      id: transformedMessage.id,
      content: transformedMessage.content?.substring(0, 30) + '...',
      parentId: transformedMessage.parentId,
      replyTo: transformedMessage.replyTo,
      isReply: !!(transformedMessage.parentId || transformedMessage.replyTo),
      senderId: transformedMessage.senderId,
      senderName: transformedMessage.sender.label,
      type: transformedMessage.type
    });

    return transformedMessage;
  }, [currentUserId, chats, users, shouldProcessFirebaseEvent]);

  // Fetch full message from backend when hasAttachments or hasMentions is true
  const fetchFullMessage = useCallback(async (messageId: string): Promise<Message | null> => {
    try {
      console.log(`[useChat] Fetching full message from backend: ${messageId}`);
      const response = await getMessage(messageId);
      
      if (response.isSuccess && response.data) {
        const apiMsg = response.data;
        const currentChat = chats.find(chat => 
          chat.participants.some(p => p.id === apiMsg.sender.id)
        );
        
        const senderParticipant = currentChat?.participants.find(p => p.id === apiMsg.sender.id);
        const senderLabel = senderParticipant?.label || 
                           (apiMsg.sender.id === currentUserId ? 'You' : apiMsg.sender.label);

        const transformedReactions = apiMsg.reactions?.map(apiReaction => ({
          id: apiReaction.id?.toString(),
          messageId: apiReaction.messageId?.toString(),
          emoji: apiReaction.reaction || apiReaction.emoji,
          count: 1,
          users: [apiReaction.createdBy || ''],
          reaction: apiReaction.reaction,
          createdAt: apiReaction.createdAt,
          senderId: apiReaction.createdBy,
          senderName: apiReaction.createdBy === currentUserId ? 'You' : 
                     (users.find(u => u.id === apiReaction.createdBy)?.label || 'Unknown')
        })) || [];

        return {
          id: apiMsg.id.toString(),
          content: apiMsg.content,
          sender: {
            id: apiMsg.sender.id,
            label: senderLabel
          },
          senderId: apiMsg.sender.id,
          createdAt: apiMsg.createdAt,
          timestamp: new Date(apiMsg.createdAt).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          type: apiMsg.sender.id === currentUserId ? 'sent' : 'received',
          reactions: transformedReactions,
          parentId: apiMsg.parentId?.toString(),
          mentions: apiMsg.mentions,
          deletable: apiMsg.deletable,
          updatable: apiMsg.updatable,
          status: apiMsg.sender.id === currentUserId ? 'sent' : undefined,
          hasAttachments: apiMsg.attachments && apiMsg.attachments.length > 0,
          attachments: apiMsg.attachments || []
        };
      }
      return null;
    } catch (error) {
      console.error(`[useChat] Error fetching full message ${messageId}:`, error);
      return null;
    }
  }, [chats, currentUserId, users]);
   let processedMessage: Message;
  // ENHANCED: Initialize conversation-level Firebase subscription with sync-aware message handling
  const initializeConversationSubscription = useCallback((conversationId: string) => {
    if (conversationUnsubscribers.current.has(conversationId)) {
      console.log(`[useChat] Already subscribed to conversation: ${conversationId}`);
      return;
    }
    
    console.log(`[useChat] Initializing conversation subscription: ${conversationId}`);
    
    // MAIN MESSAGE SUBSCRIPTION
    const messageUnsubscribe = firebaseChatService.subscribeToConversationMessages(
      conversationId,
      async (firebaseMessages: FirebaseMessage[]) => {
        console.log(`[useChat] Received ${firebaseMessages.length} Firebase messages for conversation ${conversationId}`);
        
        if (firebaseMessages.length === 0) return;
        
        const processedMessages: Message[] = [];
        
        for (const fm of firebaseMessages) {
          // Validate message
          if (!fm.id || !fm.senderId) {
            console.warn(`[useChat] Invalid Firebase message:`, fm);
            continue;
          }
          
          // NEW: Apply enhanced event filtering
          if (!shouldProcessFirebaseEvent(fm, fm.id, conversationId)) {
            console.log(`[useChat] Message filtered out by event validation: ${fm.id}`);
            continue;
          }
          
       
          
          // Always fetch from backend if message has mentions, attachments, or is missing content
          if (fm.hasMentions || fm.hasAttachments || !fm.content?.trim()) {
            console.log(`[useChat] Message ${fm.id} needs backend fetch`);
            
            try {
              const fullMessage = await fetchFullMessage(fm.id);
              if (fullMessage && fullMessage.content?.trim()) {
                processedMessage = fullMessage;
                console.log(`[useChat] Successfully fetched full message from backend:`, fullMessage.id);
              } else {
                console.warn(`[useChat] Backend fetch failed, using Firebase fallback`);
                const transformedMessage = transformFirebaseMessage(fm, conversationId);
                if (transformedMessage) processedMessage = transformedMessage;
              }
            } catch (backendError) {
              console.error(`[useChat] Error fetching full message from backend:`, backendError);
              const transformedMessage = transformFirebaseMessage(fm, conversationId);
              if (transformedMessage) processedMessage = transformedMessage;
            }
          } else {
            // Use Firebase message directly for simple text messages
            const transformedMessage = transformFirebaseMessage(fm, conversationId);
            if (transformedMessage) processedMessage = transformedMessage;
          }
          
          // Only add valid messages
          if (processedMessage?.id) {
            processedMessages.push(processedMessage);
            
            // NEW: Update conversation state cache with processed message
            const messageTimestamp = new Date(processedMessage.createdAt).getTime();
            const currentCache = syncStateRef.current.conversationStateCache.get(conversationId);
            if (!currentCache || messageTimestamp > currentCache.timestamp) {
              syncStateRef.current.conversationStateCache.set(conversationId, {
                lastMessageId: processedMessage.id,
                timestamp: messageTimestamp
              });
            }
          }
        }
        
        if (processedMessages.length > 0) {
          console.log(`[useChat] Processing ${processedMessages.length} validated messages`);
          
          // ENHANCED: Message state update with sync awareness
          setMessages(prev => {
            const existingMessages = prev[conversationId] || [];
            const existingIds = new Set(existingMessages.map(msg => msg.id));
            
            // Filter out messages that already exist
            const newMessages = processedMessages.filter(msg => !existingIds.has(msg.id));
            
            if (newMessages.length === 0) {
              console.log(`[useChat] No new messages to add (all already exist)`);
              return prev;
            }
            
            console.log(`[useChat] Adding ${newMessages.length} new messages to conversation ${conversationId}`);
            
            // Remove temp messages that match real messages
            const cleanedExistingMessages = existingMessages.filter(existingMsg => {
              if (existingMsg.id.startsWith('temp-') && existingMsg.senderId === currentUserId) {
                const matchingRealMessage = newMessages.find(newMsg => 
                  newMsg.senderId === currentUserId &&
                  Math.abs(new Date(newMsg.createdAt).getTime() - new Date(existingMsg.createdAt).getTime()) < 30000
                );
                return !matchingRealMessage;
              }
              return true;
            });
            
            const finalMessages = [...cleanedExistingMessages, ...newMessages];
            finalMessages.sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
            
            return {
              ...prev,
              [conversationId]: finalMessages
            };
          });
          
          // ENHANCED: Update chat list with sync-aware validation
          const latestMessage = processedMessages[processedMessages.length - 1];
          setChats(prevChats => {
            const updatedChats = prevChats.map(chat => {
              if (chat.id.toString() === conversationId) {
                const currentTime = chat.lastMessage?.timestamp 
                  ? new Date(chat.lastMessage.timestamp).getTime() 
                  : 0;
                const newTime = new Date(latestMessage.createdAt).getTime();
                
                if (newTime > currentTime) {
                  const updatedChat = {
                    ...chat,
                    lastMessage: {
                      content: latestMessage.content || (latestMessage.hasAttachments ? '📎 Attachment' : ''),
                      timestamp: latestMessage.createdAt,
                      senderId: latestMessage.senderId
                    }
                  };
                  
                  // NEW: Use cached API truth for unread count instead of incrementing
                  const cacheEntry = syncStateRef.current.unreadCountCache.get(conversationId);
                  if (cacheEntry && latestMessage.senderId !== currentUserId && activeConversationId !== conversationId) {
                    // Only update if we have recent cache data
                    const cacheAge = Date.now() - cacheEntry.lastSync;
                    if (cacheAge < 30000) { // Cache is less than 30 seconds old
                      updatedChat.unReadMessageCount = cacheEntry.api;
                    } else {
                      // Cache is stale, trigger sync
                      setTimeout(() => synchronizeWithBackend(conversationId), 100);
                    }
                  }
                  
                  return updatedChat;
                }
              }
              return chat;
            });
            
            const hasChanges = updatedChats.some((chat, index) => chat !== prevChats[index]);
            if (!hasChanges) {
              return prevChats; // Return same reference if no changes
            }
            
            return updatedChats.sort((a, b) => {
              const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
              const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
              return timeB - timeA;
            });
          });
        }
      }
    );
    
    // ADD REACTION SUBSCRIPTION
    const reactionUnsubscribe = firebaseChatService.subscribeToReactionEvents(
      conversationId,
      (reactionEvent: FirebaseReactionEvent) => {
        console.log(`[useChat] Received reaction event for conversation ${conversationId}:`, reactionEvent);
        
        // NEW: Apply event filtering to reactions too
        if (!shouldProcessFirebaseEvent(reactionEvent, reactionEvent.messageId, conversationId)) {
          console.log(`[useChat] Reaction event filtered out: ${reactionEvent.messageId}`);
          return;
        }
        
        // Update the specific message with the reaction
        setMessages(prev => {
          const conversationMessages = prev[conversationId] || [];
          
          const updatedMessages = conversationMessages.map(msg => {
            if (msg.id === reactionEvent.messageId) {
              console.log(`[useChat] Updating message ${msg.id} with reaction:`, reactionEvent);
              
              const currentReactions = msg.reactions || [];
              
              if (reactionEvent.eventType === 'REACTION_ADDED') {
                // Check if this user already has this reaction
                const existingReactionIndex = currentReactions.findIndex(
                  r => r.emoji === reactionEvent.reaction && 
                       r.users?.includes(reactionEvent.senderId)
                );
                
                if (existingReactionIndex === -1) {
                  // Check if reaction emoji already exists from other users
                  const existingEmojiIndex = currentReactions.findIndex(
                    r => r.emoji === reactionEvent.reaction
                  );
                  
                  if (existingEmojiIndex !== -1) {
                    // Add user to existing reaction
                    const updatedReactions = [...currentReactions];
                    updatedReactions[existingEmojiIndex] = {
                      ...updatedReactions[existingEmojiIndex],
                      count: updatedReactions[existingEmojiIndex].count + 1,
                      users: [...updatedReactions[existingEmojiIndex].users, reactionEvent.senderId]
                    };
                    
                    return { ...msg, reactions: updatedReactions };
                  } else {
                    // Create new reaction
                    const newReaction = {
                      emoji: reactionEvent.reaction,
                      count: 1,
                      users: [reactionEvent.senderId],
                      senderId: reactionEvent.senderId,
                      senderName: reactionEvent.senderName,
                      createdAt: reactionEvent.timestamp,
                      reaction: reactionEvent.reaction
                    };
                    
                    return { ...msg, reactions: [...currentReactions, newReaction] };
                  }
                }
              } else if (reactionEvent.eventType === 'REACTION_REMOVED') {
                // Remove reaction
                const updatedReactions = currentReactions.map(r => {
                  if (r.emoji === reactionEvent.reaction && r.users?.includes(reactionEvent.senderId)) {
                    const newUsers = r.users.filter(userId => userId !== reactionEvent.senderId);
                    return {
                      ...r,
                      count: Math.max(0, r.count - 1),
                      users: newUsers
                    };
                  }
                  return r;
                }).filter(r => r.count > 0); // Remove reactions with 0 count
                
                return { ...msg, reactions: updatedReactions };
              }
            }
            return msg;
          });
          
          return {
            ...prev,
            [conversationId]: updatedMessages
          };
        });
      }
    );
    
    // Store both unsubscribers
    conversationUnsubscribers.current.set(conversationId, () => {
      messageUnsubscribe();
      reactionUnsubscribe();
    });
    
  }, [activeConversationId, currentUserId, fetchFullMessage, transformFirebaseMessage, shouldProcessFirebaseEvent, synchronizeWithBackend]);

  // ENHANCED: Set active conversation with sync-aware receipt management
  const setActiveConversation = useCallback((conversationId: string | null) => {
    if (activeConversationId === conversationId) {
      return;
    }
    
    console.log(`[useChat] Setting active conversation: ${conversationId}`);
    
    // Mark previous conversation as inactive
    if (activeConversationId) {
      firebaseChatService.setConversationActive(activeConversationId, false);
    }
    
    setActiveConversationId(conversationId);
    
    if (conversationId) {
      // Mark new conversation as active - this will trigger automatic receipt updates
      firebaseChatService.setConversationActive(conversationId, true);
      
      // Load messages using the separate function
      loadConversationMessages(conversationId, true);
      
      // Initialize conversation subscription
      initializeConversationSubscription(conversationId);
      
      // Mark as read in Firebase
      firebaseChatService.markConversationAsRead(conversationId);
      
      // NEW: Update unread cache to reflect read status
      const cacheEntry = syncStateRef.current.unreadCountCache.get(conversationId);
      if (cacheEntry) {
        cacheEntry.api = 0;
        cacheEntry.firebase = 0;
        cacheEntry.lastSync = Date.now();
      }
      
      // Update chat list unread count
      setChats(prev => prev.map(chat => 
        chat.id.toString() === conversationId 
          ? { ...chat, unReadMessageCount: 0 }
          : chat
      ));
      
      // Trigger sync to ensure backend is also updated
      setTimeout(() => synchronizeWithBackend(conversationId), 500);
    }
  }, [activeConversationId, loadConversationMessages, initializeConversationSubscription, synchronizeWithBackend]);

  // Clean up conversation subscription
  const cleanupConversationSubscription = useCallback((conversationId: string) => {
    const unsubscriber = conversationUnsubscribers.current.get(conversationId);
    if (unsubscriber) {
      console.log(`[useChat] Cleaning up subscription for conversation: ${conversationId}`);
      unsubscriber();
      conversationUnsubscribers.current.delete(conversationId);
      
      // Mark conversation as inactive when cleaning up
      firebaseChatService.setConversationActive(conversationId, false);
    }
  }, []);

  // FIXED: Send message with proper optimistic updates
  const sendMessage = useCallback(async (
    chatId: string, 
    content: string, 
    mentions?: string[], 
    parentId?: string,
    fileInfo?: MessageFileInfo[]
  ) => {
    const trimmedContent = content.trim();
    
    if (!trimmedContent && (!fileInfo || fileInfo.length === 0)) {
      console.warn('[useChat] Cannot send message with empty content and no files');
      return;
    }

    // Enhanced debug logging for replies
    if (parentId) {
      console.log(`[useChat] Sending REPLY message - Detailed info:`, {
        chatId,
        parentId,
        content: trimmedContent,
        hasFiles: !!fileInfo?.length,
        mentionsCount: mentions?.length || 0
      });
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const tempMessage: Message = {
      id: tempId,
      content: trimmedContent,
      sender: {
        id: currentUserId,  
        label: currentUserName
      },
      createdAt: now,
      senderId: currentUserId,
      timestamp: new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: 'sent',
      mentions,
      parentId, // This should be set for optimistic update
      replyTo: parentId, // Also set replyTo for consistency
      status: 'sending',
      hasAttachments: fileInfo && fileInfo.length > 0,
      attachments: fileInfo ? fileInfo.map((file, index) => ({
        attachmentId: index,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: 0
      })) : []
    };

    // Add optimistic message only for text messages or messages without attachments
    if (!fileInfo || fileInfo.length === 0) {
      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), tempMessage]
      }));
    }

    try {
      let response;
      
      if (parentId) {
        console.log(`[useChat] Calling replyToMessageService with parentId: ${parentId}`);
        response = await replyToMessageService(parentId, {
          conversationId: parseInt(chatId),
          content: trimmedContent,
          mentions,
          fileInfo
        });
      } else {
        response = await addMessage({
          conversationId: parseInt(chatId),
          content: trimmedContent,
          mentions,
          fileInfo
        });
      }

      if (response.isSuccess) {
        console.log(`[useChat] ${parentId ? 'Reply' : 'Message'} sent successfully:`, {
          messageId: response.data.id,
          parentId: response.data.parentId,
          content: response.data.content
        });
        
        // NEW: Update conversation state cache with new message
        syncStateRef.current.conversationStateCache.set(chatId, {
          lastMessageId: response.data.id.toString(),
          timestamp: new Date(response.data.createdAt).getTime()
        });
        
        // For messages with attachments, we'll rely on the Firebase listener + backend fetch
        // For text-only messages, replace the temp message
        if (!fileInfo || fileInfo.length === 0) {
          const realMessage: Message = {
            id: response.data.id.toString(),
            content: response.data.content,
            createdAt: response.data.createdAt,
            sender: {
              id: currentUserId,
              label: currentUserName
            },
            senderId: currentUserId,
            timestamp: new Date(response.data.createdAt).toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            type: 'sent',
            reactions: [],
            parentId: parentId || response.data.parentId?.toString(),
            replyTo: parentId || response.data.parentId?.toString(), // Ensure replyTo is set
            mentions: response.data.mentions,
            deletable: response.data.deletable,
            updatable: response.data.updatable,
            status: 'sent',
            hasAttachments: response.data.attachments && response.data.attachments.length > 0,
            attachments: response.data.attachments || []
          };

          setMessages(prev => ({
            ...prev,
            [chatId]: prev[chatId].map(msg => 
              msg.id === tempId ? realMessage : msg
            )
          }));
        } else {
          // Remove temp message for attachment messages since we'll get the real one via Firebase
          setMessages(prev => ({
            ...prev,
            [chatId]: prev[chatId].filter(msg => msg.id !== tempId)
          }));
        }

        // Update chat list
        setChats(prev => {
          const updatedChats = prev.map(chat => 
            chat.id.toString() === chatId 
              ? { 
                  ...chat, 
                  lastMessage: { 
                    content: trimmedContent || (fileInfo?.length ? `📎 ${fileInfo.length} file(s)` : ''), 
                    timestamp: new Date().toISOString(), 
                    senderId: currentUserId 
                  },
                  unReadMessageCount: 0
                }
              : chat
          );
          
          return updatedChats.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
          });
        });

        // NEW: Trigger sync to update backend state
        setTimeout(() => synchronizeWithBackend(chatId), 1000);

      } else {
        throw new Error(response.message || `Failed to send ${parentId ? 'reply' : 'message'}`);
      }

    } catch (err) {
      console.error(`[useChat] Error sending ${parentId ? 'reply' : 'message'}:`, err);
      
      // Mark message as failed only if we added a temp message
      if (!fileInfo || fileInfo.length === 0) {
        setMessages(prev => ({
          ...prev,
          [chatId]: prev[chatId].map(msg => 
            msg.id === tempId 
              ? { ...msg, status: 'failed' as const, error: err instanceof Error ? err.message : 'Unknown error' }
              : msg
          )
        }));
      }

      throw err;
    }
  }, [currentUserId, currentUserName, synchronizeWithBackend]);

  // Create chat
  const createChat = useCallback(async (name: string, participants: string[], isGroup: boolean) => {
    console.log(`🎯 [useChat] Creating ${isGroup ? 'group' : 'private'} chat:`, { 
      name, 
      participants,
      currentUserId,
      totalParticipants: participants.length + 1 // +1 for current user
    });
    
    try {
      const response = await startConversation({
        name,
        description: isGroup ? `Group chat with ${participants.length + 1} members` : '',
        conversationType: isGroup ? 'GROUP' : 'PRIVATE',
        participants
      });

      if (response.isSuccess) {
        console.log('✅ [useChat] Chat created successfully - Backend Response:', {
          conversationId: response.data.id,
          conversationType: response.data.conversationType,
          name: response.data.name,
          participants: response.data.participants?.map((p: any) => ({
            id: p.id,
            name: p.label,
            role: p.conversationRole
          })),
          rawResponse: response.data
        });
        
        const newChat: Chat = {
          id: response.data.id,
          name: (response.data.conversationType?.toString().toUpperCase() === 'GROUP')
            ? response.data.name
            : (response.data.participants.find((p: any) => p.id !== currentUserId)?.label || response.data.name),
          description: response.data.description || '',
          conversationType: isGroup ? 'group' : 'private',
          participants: response.data.participants
            .filter((p: any) => p.id !== currentUserId)
            .map((p: any) => ({
              id: p.id,
              name: p.label,
              label: p.label,
              status: 'offline' as const,
              conversationRole: p.conversationRole
            })),
          lastMessage: undefined,
          unReadMessageCount: 0,
          messageResponses: response.data.messageResponses || []
        };

        setChats(prev => [newChat, ...prev]);
        
        // NEW: Initialize sync cache for new conversation
        const conversationId = response.data.id.toString();
        syncStateRef.current.unreadCountCache.set(conversationId, {
          api: 0,
          firebase: 0,
          lastSync: Date.now()
        });
        
        // Check if Firebase events are triggered
        console.log('🔍 [useChat] Waiting for Firebase events...');
        
        // Set up a temporary listener to catch the creation event
        if (response.data.id) {
          setTimeout(() => {
            console.log(`📢 [useChat] Checking Firebase for conversation ${conversationId} events...`);
            initializeConversationSubscription(conversationId);
          }, 1000);
        }
        
        return newChat;
      } else {
        throw new Error(response.message || 'Failed to create chat');
      }
    } catch (err) {
      console.error('❌ [useChat] Error creating chat:', err);
      throw err;
    }
  }, [currentUserId, initializeConversationSubscription]);

  // Reaction management (with optimistic updates that sync with backend)
  const addMessageReaction = useCallback(async (messageId: string, emoji: string) => {
    console.log(`[useChat] Adding reaction ${emoji} to message ${messageId}`);
    
    try {
      // Optimistic update
      setMessages(prev => {
        const newMessages = { ...prev };
        Object.keys(newMessages).forEach(chatId => {
          newMessages[chatId] = newMessages[chatId].map(msg => {
            if (msg.id === messageId) {
              const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
              if (existingReaction && !existingReaction.users.includes(currentUserId)) {
                return {
                  ...msg,
                  reactions: msg.reactions?.map(r => 
                    r.emoji === emoji 
                      ? { 
                          ...r, 
                          count: r.count + 1, 
                          users: [...r.users, currentUserId],
                          senderId: currentUserId,
                          senderName: 'You'
                        }
                      : r
                  )
                };
              } else if (!existingReaction) {
                return {
                  ...msg,
                  reactions: [
                    ...(msg.reactions || []),
                    { 
                      emoji, 
                      count: 1, 
                      users: [currentUserId],
                      senderId: currentUserId,
                      senderName: 'You',
                      reaction: emoji,
                      createdAt: new Date().toISOString()
                    }
                  ]
                };
              }
            }
            return msg;
          });
        });
        return newMessages;
      });

      const response = await addReaction(messageId, { reaction: emoji });
      if (!response.isSuccess) {
        // Revert optimistic update on failure
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(chatId => {
            newMessages[chatId] = newMessages[chatId].map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  reactions: msg.reactions?.map(r => 
                    r.emoji === emoji && r.users.includes(currentUserId)
                      ? { 
                          ...r, 
                          count: Math.max(0, r.count - 1), 
                          users: r.users.filter(u => u !== currentUserId) 
                        }
                      : r
                  ).filter(r => r.count > 0)
                };
              }
              return msg;
            });
          });
          return newMessages;
        });
        throw new Error(response.message || 'Failed to add reaction');
      }
    } catch (err) {
      console.error(`[useChat] Error adding reaction to message ${messageId}:`, err);
      throw err;
    }
  }, [currentUserId]);

  const removeMessageReaction = useCallback(async (messageId: string, emoji: string) => {
    console.log(`[useChat] Removing reaction ${emoji} from message ${messageId}`);
    
    try {
      // Optimistic update
      setMessages(prev => {
        const newMessages = { ...prev };
        Object.keys(newMessages).forEach(chatId => {
          newMessages[chatId] = newMessages[chatId].map(msg => {
            if (msg.id === messageId) {
              return {
                ...msg,
                reactions: msg.reactions?.map(r => 
                  r.emoji === emoji && r.users.includes(currentUserId)
                    ? { 
                        ...r, 
                        count: Math.max(0, r.count - 1), 
                        users: r.users.filter(u => u !== currentUserId) 
                      }
                    : r
                ).filter(r => r.count > 0)
              };
            }
            return msg;
          });
        });
        return newMessages;
      });

      const response = await removeReaction(messageId);
      if (!response.isSuccess) {
        // Revert on failure
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(chatId => {
            newMessages[chatId] = newMessages[chatId].map(msg => {
              if (msg.id === messageId) {
                const existingReaction = msg.reactions?.find(r => r.emoji === emoji);
                if (!existingReaction) {
                  return {
                    ...msg,
                    reactions: [
                      ...(msg.reactions || []),
                      { 
                        emoji, 
                        count: 1, 
                        users: [currentUserId],
                        senderId: currentUserId,
                        senderName: 'You',
                        reaction: emoji
                      }
                    ]
                  };
                } else if (!existingReaction.users.includes(currentUserId)) {
                  return {
                    ...msg,
                    reactions: msg.reactions?.map(r => 
                      r.emoji === emoji 
                        ? { ...r, count: r.count + 1, users: [...r.users, currentUserId] }
                        : r
                    )
                  };
                }
              }
              return msg;
            });
          });
          return newMessages;
        });
        throw new Error(response.message || 'Failed to remove reaction');
      }
    } catch (err) {
      console.error(`[useChat] Error removing reaction from message ${messageId}:`, err);
      throw err;
    }
  }, [currentUserId]);

  // Additional functions (edit, delete, etc.)
  const editMessageContent = useCallback(async (messageId: string, newContent: string) => {
    try {
      const response = await editMessage(messageId, { content: newContent });
      if (response.isSuccess) {
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(chatId => {
            newMessages[chatId] = newMessages[chatId].map(msg => 
              msg.id === messageId ? { ...msg, content: newContent } : msg
            );
          });
          return newMessages;
        });
        
        // NEW: Trigger sync after edit
        const conversationId = Object.keys(messages).find(chatId => 
          messages[chatId].some(msg => msg.id === messageId)
        );
        if (conversationId) {
          setTimeout(() => synchronizeWithBackend(conversationId), 500);
        }
      } else {
        throw new Error(response.message || 'Failed to edit message');
      }
    } catch (err) {
      console.error(`[useChat] Error editing message ${messageId}:`, err);
      throw err;
    }
  }, [messages, synchronizeWithBackend]);

  const deleteMessageById = useCallback(async (messageId: string) => {
    try {
      const response = await deleteMessage(messageId);
      if (response.isSuccess) {
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(chatId => {
            newMessages[chatId] = newMessages[chatId].filter(msg => msg.id !== messageId);
          });
          return newMessages;
        });
        
        // NEW: Trigger sync after delete
        const conversationId = Object.keys(messages).find(chatId => 
          messages[chatId].some(msg => msg.id === messageId)
        );
        if (conversationId) {
          setTimeout(() => synchronizeWithBackend(conversationId), 500);
        }
      } else {
        throw new Error(response.message || 'Failed to delete message');
      }
    } catch (err) {
      console.error(`[useChat] Error deleting message ${messageId}:`, err);
      throw err;
    }
  }, [messages, synchronizeWithBackend]);

  const getMessageReceiptsById = useCallback(async (messageId: string) => {
    try {
      const response = await getMessageReceipts(messageId);
      return response.isSuccess ? response.data : [];
    } catch (err) {
      console.error(`[useChat] Error getting receipts for message ${messageId}:`, err);
      return [];
    }
  }, []);

  // Chat management functions
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await softDeleteConversation(chatId);
      if (response.isSuccess) {
        cleanupConversationSubscription(chatId);
        setChats(prev => prev.filter(chat => chat.id.toString() !== chatId));
        setMessages(prev => {
          const newMessages = { ...prev };
          delete newMessages[chatId];
          return newMessages;
        });
        
        // Clean up loaded conversations tracking
        loadedConversationsRef.current.delete(chatId);
        
        // NEW: Clean up sync cache
        syncStateRef.current.unreadCountCache.delete(chatId);
        syncStateRef.current.conversationStateCache.delete(chatId);
      } else {
        throw new Error(response.message || 'Failed to delete chat');
      }
    } catch (err) {
      console.error(`[useChat] Error deleting chat ${chatId}:`, err);
      throw err;
    }
  }, [cleanupConversationSubscription]);

  const addChatParticipants = useCallback(async (chatId: string, participantIds: string[]) => {
    try {
      const response = await addParticipants(chatId, { participants: participantIds });
      if (response.isSuccess) {
        await loadMyConversations();
        // NEW: Trigger sync after participant change
        setTimeout(() => synchronizeWithBackend(chatId), 1000);
      } else {
        throw new Error(response.message || 'Failed to add participants');
      }
    } catch (err) {
      console.error(`[useChat] Error adding participants to chat ${chatId}:`, err);
      throw err;
    }
  }, [loadMyConversations, synchronizeWithBackend]);

  const removeChatParticipants = useCallback(async (chatId: string, participantIds: string[]) => {
    try {
      const response = await deleteParticipants(chatId, { participants: participantIds });
      if (response.isSuccess) {
        await loadMyConversations();
        // NEW: Trigger sync after participant change
        setTimeout(() => synchronizeWithBackend(chatId), 1000);
      } else {
        throw new Error(response.message || 'Failed to remove participants');
      }
    } catch (err) {
      console.error(`[useChat] Error removing participants from chat ${chatId}:`, err);
      throw err;
    }
  }, [loadMyConversations, synchronizeWithBackend]);

  const changeParticipantRoleInGroup = useCallback(async (chatId: string, participantId: string, role: "ADMIN" | "MEMBER") => {
    try {
      const response = await changeParticipantRole(chatId, { role, participantId });
      if (response.isSuccess) {
        await loadMyConversations();
        // NEW: Trigger sync after role change
        setTimeout(() => synchronizeWithBackend(chatId), 1000);
      } else {
        throw new Error(response.message || 'Failed to change participant role');
      }
    } catch (err) {
      console.error(`[useChat] Error changing participant role in chat ${chatId}:`, err);
      throw err;
    }
  }, [loadMyConversations, synchronizeWithBackend]);

  // Search functionality
  const searchChats = useCallback((query: string) => {
    const activeChats = chats.filter(chat =>
      chat.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (activeChats.length === 0 && query.trim()) {
      const matchingUsers = users.filter(user =>
        user.label.toLowerCase().includes(query.toLowerCase())
      );
      
      return matchingUsers.map(user => ({
        id: `potential-${user.id}`,
        name: user.label,
        conversationType: 'private' as const,
        participants: [user],
        lastMessage: undefined,
        unReadMessageCount: 0,
        isPotential: true,
        description: '',
        messageResponses: []
      }));
    }
    
    return activeChats;
  }, [chats, users]);

  // NEW: Manual sync functions for debugging
  const forceSyncWithBackend = useCallback(async (conversationId?: string) => {
    console.log('[useChat] 🔄 Manual sync triggered');
    await synchronizeWithBackend(conversationId, true);
  }, [synchronizeWithBackend]);

  const debugSyncState = useCallback(() => {
    console.log('[useChat] 🐛 Current sync state:', {
      lastApiSync: new Date(syncStateRef.current.lastApiSync).toISOString(),
      pendingApiSyncs: Array.from(syncStateRef.current.pendingApiSyncs),
      unreadCountCache: Object.fromEntries(
        Array.from(syncStateRef.current.unreadCountCache.entries()).map(([k, v]) => [
          k, {
            ...v,
            lastSync: new Date(v.lastSync).toISOString()
          }
        ])
      ),
      eventProcessingTimestamp: new Date(syncStateRef.current.eventProcessingTimestamp).toISOString(),
      conversationStateCache: Object.fromEntries(
        Array.from(syncStateRef.current.conversationStateCache.entries()).map(([k, v]) => [
          k, {
            ...v,
            timestamp: new Date(v.timestamp).toISOString()
          }
        ])
      )
    });
  }, []);

  // ENHANCED: Cleanup with sync state clearing
  useEffect(() => {
    return () => {
      console.log('[useChat] Cleaning up all subscriptions...');
      
      // Clean up user notifications
      if (userNotificationUnsubscriber.current) {
        userNotificationUnsubscriber.current();
        userNotificationUnsubscriber.current = null;
      }
      
      // Clean up conversation subscriptions
      conversationUnsubscribers.current.forEach((unsubscribe, conversationId) => {
        console.log(`[useChat] Cleaning up conversation subscription: ${conversationId}`);
        unsubscribe();
        firebaseChatService.setConversationActive(conversationId, false);
      });
      conversationUnsubscribers.current.clear();
      
      // Clean up Firebase service
      firebaseChatService.cleanup();
      
      // Reset initialization state
      initializationRef.current.initialized = false;
      initializationRef.current.initializing = false;
      
      // Clear loaded conversations tracking
      loadedConversationsRef.current.clear();
      
      // NEW: Clear sync state
      syncStateRef.current = {
        lastApiSync: 0,
        pendingApiSyncs: new Set(),
        unreadCountCache: new Map(),
        eventProcessingTimestamp: Date.now(),
        conversationStateCache: new Map()
      };
    };
  }, []);

  return {
    // Data
    chats,
    users,
    messages,
    loading,
    error,
    currentUserId,
    currentUserName,
    notifications,
    activeConversationId,
    totalUnreadCount,
    isLoadingChats,
    isLoadingUsers,
    
    // Core functions
    loadUsers,
    loadMyConversations,
    initializeUserNotifications,
    loadConversationMessages,
    initializeConversationSubscription,
    cleanupConversationSubscription,
    setActiveConversation,
    
    // Message functions
    sendMessage,
    addMessageReaction,
    removeMessageReaction,
    editMessageContent,
    deleteMessageById,
    getMessageReceiptsById,
    
    // Chat management
    createChat,
    deleteChat,
    searchChats,
    addChatParticipants,
    removeChatParticipants,
    changeParticipantRoleInGroup,
    
    // NEW: Sync functions
    synchronizeWithBackend,
    forceSyncWithBackend,
    debugSyncState,
    
    // Utility
    getTotalUnreadCount: () => totalUnreadCount,
    getConversationUnreadCount: (conversationId: string) => 
      firebaseChatService.getConversationUnreadCount(notifications, conversationId)
  };
};