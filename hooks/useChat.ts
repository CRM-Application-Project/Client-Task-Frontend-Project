import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiMessage, User } from '@/lib/data';
import { ChatParticipant, MessageAttachment, AddMessageResponse, ReplyToMessageResponse, updateUserStatus } from '@/app/services/chatService';
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
import { firebaseChatService, FirebaseMessage, ChatNotifications, ConversationEvent, FirebaseReactionEvent, FirebaseTypingEvent } from '@/app/services/FirebaseChatService';


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
interface TypingUser {
  userId: string;
  userName: string;
  timestamp: number;
}

interface TypingState {
  [conversationId: string]: TypingUser[];
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
 const [typingUsers, setTypingUsers] = useState<TypingState>({});
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  // Subscription management
  const userNotificationUnsubscriber = useRef<(() => void) | null>(null);
  const conversationUnsubscribers = useRef<Map<string, () => void>>(new Map());
  const initializationRef = useRef<{ initialized: boolean; initializing: boolean }>({
    initialized: false,
    initializing: false
  });
  
  // FIXED: Track loaded conversations to prevent duplicate API calls
  const loadedConversationsRef = useRef<Set<string>>(new Set());

  // Initialize Firebase service
  useEffect(() => {
    if (currentUserId && !initializationRef.current.initialized) {
      console.log(`[useChat] Initializing Firebase service for user: ${currentUserId}`);
      firebaseChatService.initialize(currentUserId);
      initializationRef.current.initialized = true;
    }
  }, [currentUserId]);
const updateUserStatusq = useCallback(async (conversationId: string, isTyping: boolean) => {
    if (!currentUserId || !currentUserName) {
      console.warn('[useChat] Cannot update typing status - user not authenticated');
      return;
    }

    try {
      console.log(`[useChat] Updating typing status for conversation ${conversationId}:`, { isTyping });
      
      // Call the API to update typing status
      const response = await updateUserStatus(conversationId, {
        isTyping: isTyping,
        status: 'online' // or whatever status you want to send
      });

      if (response.isSuccess) {
        console.log(`[useChat] Typing status updated successfully: ${isTyping}`);
      } else {
        console.warn(`[useChat] Failed to update typing status: ${response.message}`);
      }
    } catch (error) {
      console.error(`[useChat] Error updating typing status:`, error);
    }
  }, [currentUserId, currentUserName]);

 
const handleTypingEvent = useCallback((typingEvent: FirebaseTypingEvent) => {
  // Get current user ID from multiple sources
  const currentUserIdFromStorage = localStorage.getItem('userId');
  const currentUserNameFromStorage = localStorage.getItem('userName');
  
  // COMPREHENSIVE filtering to prevent own events
  const isOwnEvent = typingEvent.triggeredByUserId === currentUserId ||
                     typingEvent.triggeredByUserId === currentUserIdFromStorage ||
                     typingEvent.triggeredUserName === currentUserNameFromStorage ||
                     typingEvent.triggeredUserName === currentUserName;
  
  if (isOwnEvent) {
    console.log(`[useChat] 🚫 BLOCKED own typing event:`, {
      triggeredByUserId: typingEvent.triggeredByUserId,
      triggeredUserName: typingEvent.triggeredUserName,
      currentUserId,
      currentUserIdFromStorage,
      currentUserName,
      currentUserNameFromStorage
    });
    return; // Exit early
  }

  console.log(`[useChat] ✅ Processing typing from OTHER user:`, {
    triggeredByUserId: typingEvent.triggeredByUserId,
    triggeredUserName: typingEvent.triggeredUserName,
    isTyping: typingEvent.isTyping,
    conversationId: typingEvent.conversationId
  });

  const { conversationId, triggeredByUserId, triggeredUserName, isTyping } = typingEvent;
  
  setTypingUsers(prev => {
    const currentTypingUsers = prev[conversationId] || [];
    
    if (isTyping) {
      const existingUserIndex = currentTypingUsers.findIndex(user => user.userId === triggeredByUserId);
      const updatedUser = {
        userId: triggeredByUserId,
        userName: triggeredUserName,
        timestamp: Date.now()
      };

      let updatedTypingUsers;
      if (existingUserIndex !== -1) {
        updatedTypingUsers = [...currentTypingUsers];
        updatedTypingUsers[existingUserIndex] = updatedUser;
      } else {
        updatedTypingUsers = [...currentTypingUsers, updatedUser];
      }

      const timeoutKey = `${conversationId}-${triggeredByUserId}`;
      const existingTimeout = typingTimeoutsRef.current.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const newTimeout = setTimeout(() => {
        setTypingUsers(prev => {
          const currentUsers = prev[conversationId] || [];
          const filteredUsers = currentUsers.filter(user => user.userId !== triggeredByUserId);
          return {
            ...prev,
            [conversationId]: filteredUsers
          };
        });
        typingTimeoutsRef.current.delete(timeoutKey);
      }, 3000);

      typingTimeoutsRef.current.set(timeoutKey, newTimeout);
      return {
        ...prev,
        [conversationId]: updatedTypingUsers
      };
    } else {
      const filteredUsers = currentTypingUsers.filter(user => user.userId !== triggeredByUserId);
      const timeoutKey = `${conversationId}-${triggeredByUserId}`;
      const existingTimeout = typingTimeoutsRef.current.get(timeoutKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutsRef.current.delete(timeoutKey);
      }
      return {
        ...prev,
        [conversationId]: filteredUsers
      };
    }
  });
}, [currentUserId, currentUserName]);
  // NEW: Initialize typing subscription for conversation
  const initializeTypingSubscription = useCallback((conversationId: string) => {
    console.log(`[useChat] Initializing typing subscription for conversation: ${conversationId}`);
    
    const typingUnsubscribe = firebaseChatService.subscribeToTypingEvents(
      conversationId,
      handleTypingEvent
    );
    
    return typingUnsubscribe;
  }, [handleTypingEvent]);
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
      }
    } catch (error) {
      console.error('[useChat] Error reading user ID from storage:', error);
    }
  }, [currentUserId]);

  // NEW: Handle conversation events (CONVERSATION_CREATED, PARTICIPANT_ADDED)
 

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
  const loadMyConversations = useCallback(async () => {
  if (isLoadingChats) return;
  
  console.log('[useChat] Loading my conversations from API...');
  try {
    setIsLoadingChats(true);
    setLoading(true);
    setError(null);
    
    const chatResponse = await getChatList();
    if (chatResponse.isSuccess) {
      console.log(`[useChat] API returned ${chatResponse.data.length} conversations`);
      
      const transformedChats = chatResponse.data.map((apiChat: any) => {
        const participants = apiChat.participants || [];
        const isPrivate = String(apiChat.conversationType).toUpperCase() === 'PRIVATE';
        const other = participants.find((p: any) => p.id !== currentUserId);
        const displayName = isPrivate ? (other?.label || apiChat.name) : apiChat.name;

        // ENHANCED: Ensure last message data is properly structured
        let lastMessage = undefined;
        if (apiChat.lastMessage && apiChat.lastMessage.content && apiChat.lastMessage.content.trim()) {
          lastMessage = {
            content: apiChat.lastMessage.content.trim(),
            timestamp: apiChat.lastMessage.createdAt || apiChat.lastMessage.timestamp,
            senderId: apiChat.lastMessage.sender?.id || apiChat.lastMessage.senderId || ''
          };
        }

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
          unReadMessageCount: Math.max(0, parseInt(String(apiChat.unReadMessageCount)) || 0),
          messageResponses: apiChat.messageResponses || [],
          lastMessage: lastMessage
        };
      });
      
      // Sort by last message timestamp
      const sortedChats = transformedChats.sort((a, b) => {
        const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
        const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
        return timeB - timeA;
      });
      
      console.log('[useChat] Setting transformed and sorted chats:', sortedChats.length);
      setChats(sortedChats);
        
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
  // ENHANCED: Initialize user-level Firebase subscriptions with conversation event handling
 

  // FIXED: Load conversation messages with proper deduplication
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
// Add this enhanced debugging to your useChat hook's transformFirebaseMessage function

const transformFirebaseMessage = useCallback((fm: FirebaseMessage, conversationId: string): Message => {
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
}, [currentUserId, chats, users]);

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

  // FIXED: Initialize conversation-level Firebase subscription with proper message handling
// In your useChat hook, update the initializeConversationSubscription method

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
        
        let processedMessage: Message;
        
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
              processedMessage = transformFirebaseMessage(fm, conversationId);
            }
          } catch (backendError) {
            console.error(`[useChat] Error fetching full message from backend:`, backendError);
            processedMessage = transformFirebaseMessage(fm, conversationId);
          }
        } else {
          // Use Firebase message directly for simple text messages
          processedMessage = transformFirebaseMessage(fm, conversationId);
        }
        
        // Only add valid messages
        if (processedMessage?.id) {
          processedMessages.push(processedMessage);
        }
      }
      
      if (processedMessages.length > 0) {
        // FIXED: Proper message state update with deduplication
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
        
        // FIXED: Update chat list with latest message without duplicating notification updates
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
                
                // Only increment unread if not from current user and not active conversation
                if (latestMessage.senderId !== currentUserId && activeConversationId !== conversationId) {
                  updatedChat.unReadMessageCount = (chat.unReadMessageCount || 0) + 1;
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
   const typingUnsubscribe = initializeTypingSubscription(conversationId);
  // Store both unsubscribers
  conversationUnsubscribers.current.set(conversationId, () => {
    messageUnsubscribe();
    reactionUnsubscribe();
     typingUnsubscribe();
  });
  
}, [initializeTypingSubscription,activeConversationId, currentUserId, fetchFullMessage, transformFirebaseMessage, chats, users]);
 const debouncedTypingUpdate = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const handleUserTyping = useCallback((conversationId: string, isTyping: boolean) => {
    const debounceKey = `typing-${conversationId}`;
    
    // Clear existing timeout
    const existingTimeout = debouncedTypingUpdate.current.get(debounceKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    if (isTyping) {
      // Send typing start immediately
      updateUserStatusq(conversationId, true);
      
      // Set timeout to send typing stop if no further typing
      const timeout = setTimeout(() => {
        updateUserStatusq(conversationId, false);
        debouncedTypingUpdate.current.delete(debounceKey);
      }, 1000); // Stop typing after 1 second of inactivity
      
      debouncedTypingUpdate.current.set(debounceKey, timeout);
    } else {
      // Send typing stop immediately
      updateUserStatusq(conversationId, false);
      debouncedTypingUpdate.current.delete(debounceKey);
    }
  }, [updateUserStatus]);
 
   const getTypingUsers = useCallback((conversationId: string): TypingUser[] => {
    return typingUsers[conversationId] || [];

  }, [typingUsers]);

  // NEW: Clean up typing timeouts on unmount
  useEffect(() => {
    return () => {
      // Clear all typing timeouts
      typingTimeoutsRef.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      typingTimeoutsRef.current.clear();
      
      // Clear all debounced typing updates
      debouncedTypingUpdate.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      debouncedTypingUpdate.current.clear();
    };
  }, []);
// In your useChat hook or ChatLayout component
const handleConversationEvent = useCallback(async (event: ConversationEvent) => {
    console.log('[ChatLayout] Processing conversation event:', event);
    
    // CRITICAL: Check if conversation already exists before creating
    const existingChat = chats.find(chat => 
        chat.id.toString() === event.conversationId.toString()
    );
    
    if (existingChat) {
        console.log('[ChatLayout] Conversation already exists, skipping creation:', event.conversationId);
        
        // Just refresh the conversations list to get any updates
        await loadMyConversations();
        return;
    }
    
    // Only create new conversation if it doesn't exist
    if (event.eventType === 'CONVERSATION_CREATED' || event.eventType === 'PARTICIPANT_ADDED') {
        try {
            console.log('[ChatLayout] Creating new conversation from event:', event.conversationId);
            
            // Refresh conversations to get the newly created conversation from backend
            await loadMyConversations();
            
            console.log('[ChatLayout] Conversation creation handling completed');
        } catch (error) {
            console.error('[ChatLayout] Error handling conversation event:', error);
        }
    }
}, [chats, loadMyConversations]);
const initializeUserNotifications = useCallback(() => {
  if (!currentUserId || userNotificationUnsubscriber.current) {
    return;
  }

  console.log('[useChat] Initializing user-level notifications...');
  
  const unsubscribe = firebaseChatService.subscribeToUserNotifications(
    currentUserId,
    (notifications: ChatNotifications) => {
      console.log('[useChat] Raw Firebase notifications received:', notifications);
      
      // CRITICAL FIX: Validate notification data before processing
      const validNotifications: ChatNotifications = {};
      
      Object.entries(notifications).forEach(([conversationId, notification]) => {
        // Only process notifications with valid data
        if (notification && 
            typeof notification === 'object' && 
            notification.hasOwnProperty('unreadCount') &&
            notification.timestamp) {
          
          // Additional validation for lastMessage
          const hasValidLastMessage = notification.lastMessage && 
                                    notification.lastMessage.content && 
                                    notification.lastMessage.content.trim() !== '';
          
          validNotifications[conversationId] = {
            ...notification,
            unreadCount: Math.max(0, notification.unreadCount || 0),
            lastMessage: hasValidLastMessage ? notification.lastMessage : null
          };
          
          console.log(`[useChat] Valid notification for conversation ${conversationId}:`, {
            unreadCount: validNotifications[conversationId].unreadCount,
            hasLastMessage: !!validNotifications[conversationId].lastMessage,
            timestamp: validNotifications[conversationId].timestamp
          });
        } else {
          console.warn(`[useChat] Invalid notification data for conversation ${conversationId}:`, notification);
        }
      });
      
      setNotifications(prevNotifications => {
        // Deep comparison to prevent unnecessary re-renders
        const prevKeys = Object.keys(prevNotifications);
        const newKeys = Object.keys(validNotifications);
        
        // Check if there are actual changes
        let hasChanges = prevKeys.length !== newKeys.length;
        
        if (!hasChanges) {
          for (const key of newKeys) {
            const prevNotif = prevNotifications[key];
            const newNotif = validNotifications[key];
            
            if (!prevNotif || 
                prevNotif.unreadCount !== newNotif.unreadCount ||
                prevNotif.timestamp !== newNotif.timestamp ||
                JSON.stringify(prevNotif.lastMessage) !== JSON.stringify(newNotif.lastMessage)) {
              hasChanges = true;
              break;
            }
          }
        }
        
        if (!hasChanges) {
          console.log('[useChat] No notification changes detected, skipping update');
          return prevNotifications;
        }
        
        console.log('[useChat] Notification changes detected, updating state');
        return validNotifications;
      });
      
      // Calculate total unread count from valid notifications only
      const total = Object.values(validNotifications).reduce((sum, notification) => {
        return sum + (notification.unreadCount || 0);
      }, 0);
      
      console.log(`[useChat] Total unread count calculated: ${total}`);
      setTotalUnreadCount(total);
      
      // ENHANCED: Update chat list with Firebase notifications but preserve API data
      setChats(prevChats => {
        console.log('[useChat] Updating chat list with Firebase notifications...');
        
        let hasChanges = false;
        const updatedChats = prevChats.map(chat => {
          const chatId = String(chat.id);
          const firebaseNotification = validNotifications[chatId];
          
          if (firebaseNotification) {
            const updatedChat = { ...chat };
            
            // CRITICAL FIX: Only update unread count if Firebase has newer data
            const currentUnreadCount = chat.unReadMessageCount || 0;
            const firebaseUnreadCount = activeConversationId === chatId ? 0 : (firebaseNotification.unreadCount || 0);
            
            // Only update if Firebase count is different and seems valid
            if (firebaseUnreadCount !== currentUnreadCount) {
              console.log(`[useChat] Updating unread count for ${chatId}: ${currentUnreadCount} -> ${firebaseUnreadCount}`);
              updatedChat.unReadMessageCount = firebaseUnreadCount;
              hasChanges = true;
            }
            
            // ENHANCED: Only update last message if Firebase has newer and valid content
            if (firebaseNotification.lastMessage && 
                firebaseNotification.lastMessage.content && 
                firebaseNotification.lastMessage.content.trim()) {
              
              const currentLastMessageTime = chat.lastMessage?.timestamp 
                ? new Date(chat.lastMessage.timestamp).getTime() 
                : 0;
              const firebaseLastMessageTime = firebaseNotification.lastMessage.timestamp 
                ? new Date(firebaseNotification.lastMessage.timestamp).getTime()
                : new Date(firebaseNotification.timestamp).getTime();
              
              // Only update if Firebase message is newer
              if (firebaseLastMessageTime > currentLastMessageTime) {
                console.log(`[useChat] Updating last message for ${chatId}:`, {
                  old: chat.lastMessage?.content,
                  new: firebaseNotification.lastMessage.content,
                  oldTime: chat.lastMessage?.timestamp,
                  newTime: firebaseNotification.lastMessage.timestamp
                });
                
                updatedChat.lastMessage = {
                  content: firebaseNotification.lastMessage.content,
                  timestamp: firebaseNotification.lastMessage.timestamp || firebaseNotification.timestamp,
                  senderId: firebaseNotification.lastMessage.senderId || ''
                };
                hasChanges = true;
              }
            }
            
            return updatedChat;
          }
          
          return chat;
        });
        
        if (!hasChanges) {
          console.log('[useChat] No chat list changes needed');
          return prevChats;
        }
        
        console.log('[useChat] Chat list updated, re-sorting by last message time');
        return updatedChats.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
          const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
          return timeB - timeA;
        });
      });
    },
    handleConversationEvent
  );
  
  userNotificationUnsubscriber.current = unsubscribe;
}, [currentUserId, activeConversationId, handleConversationEvent]);
  // FIXED: Set active conversation with enhanced receipt management
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
      
      // Update chat list unread count
      setChats(prev => prev.map(chat => 
        chat.id.toString() === conversationId 
          ? { ...chat, unReadMessageCount: 0 }
          : chat
      ));
    }
  }, [activeConversationId, loadConversationMessages, initializeConversationSubscription]);

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
}, [currentUserId, currentUserName]);

  // Create chat
const createChat = useCallback(async (name: string, participants: string[], isGroup: boolean) => {
  console.log(`🎯 [useChat] Creating ${isGroup ? 'group' : 'private'} chat:`, { 
    name, 
    participants,
    currentUserId,
    totalParticipants: participants.length + 1
  });
  
  try {
    const response = await startConversation({
      name,
      description: isGroup ? `Group chat with ${participants.length + 1} members` : '',
      conversationType: isGroup ? 'GROUP' : 'PRIVATE',
      participants
    });

    if (response.isSuccess) {
      console.log('✅ [useChat] Chat created successfully:', {
        conversationId: response.data.id,
        conversationType: response.data.conversationType,
        name: response.data.name
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
      
      // ENHANCED: Wait for Firebase propagation with retry mechanism
      const conversationId = response.data.id.toString();
      await waitForFirebasePropagation(conversationId);
      
      return newChat;
    } else {
      throw new Error(response.message || 'Failed to create chat');
    }
  } catch (err) {
    console.error('❌ [useChat] Error creating chat:', err);
    throw err;
  }
}, [currentUserId, initializeConversationSubscription]);

// Add this helper function for Firebase propagation
const waitForFirebasePropagation = useCallback(async (conversationId: string, maxRetries = 5, delay = 1000) => {
  console.log(`⏳ [useChat] Waiting for Firebase propagation for conversation: ${conversationId}`);
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if conversation exists in Firebase by attempting to subscribe
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log(`✅ [useChat] Firebase propagation confirmed for ${conversationId} (attempt ${attempt})`);
          resolve(true);
        }, delay);
        
        // Try to initialize subscription - if it works, Firebase has propagated
        initializeConversationSubscription(conversationId);
        clearTimeout(timeout);
        resolve(true);
      });
      
      console.log(`✅ [useChat] Firebase propagation completed for ${conversationId}`);
      return;
      
    } catch (error) {
      console.warn(`⚠️ [useChat] Firebase propagation attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        console.error(`❌ [useChat] Firebase propagation failed after ${maxRetries} attempts`);
        throw new Error('Firebase propagation timeout');
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}, [initializeConversationSubscription]);

  // Reaction management
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
      } else {
        throw new Error(response.message || 'Failed to edit message');
      }
    } catch (err) {
      console.error(`[useChat] Error editing message ${messageId}:`, err);
      throw err;
    }
  }, []);

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
      } else {
        throw new Error(response.message || 'Failed to delete message');
      }
    } catch (err) {
      console.error(`[useChat] Error deleting message ${messageId}:`, err);
      throw err;
    }
  }, []);

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
      } else {
        throw new Error(response.message || 'Failed to add participants');
      }
    } catch (err) {
      console.error(`[useChat] Error adding participants to chat ${chatId}:`, err);
      throw err;
    }
  }, [loadMyConversations]);

  const removeChatParticipants = useCallback(async (chatId: string, participantIds: string[]) => {
    try {
      const response = await deleteParticipants(chatId, { participants: participantIds });
      if (response.isSuccess) {
        await loadMyConversations();
      } else {
        throw new Error(response.message || 'Failed to remove participants');
      }
    } catch (err) {
      console.error(`[useChat] Error removing participants from chat ${chatId}:`, err);
      throw err;
    }
  }, [loadMyConversations]);

  const changeParticipantRoleInGroup = useCallback(async (chatId: string, participantId: string, role: "ADMIN" | "MEMBER") => {
    try {
      const response = await changeParticipantRole(chatId, { role, participantId });
      if (response.isSuccess) {
        await loadMyConversations();
      } else {
        throw new Error(response.message || 'Failed to change participant role');
      }
    } catch (err) {
      console.error(`[useChat] Error changing participant role in chat ${chatId}:`, err);
      throw err;
    }
  }, [loadMyConversations]);

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

  // FIXED: Cleanup on unmount with proper state clearing
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
     handleUserTyping,
    getTypingUsers,
    typingUsers,
    
    // Utility
    getTotalUnreadCount: () => totalUnreadCount,
    getConversationUnreadCount: (conversationId: string) => 
      firebaseChatService.getConversationUnreadCount(notifications, conversationId)
  };
};