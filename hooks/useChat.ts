import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiMessage, User } from '@/lib/data';
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
  Chat
} from '@/app/services/chatService';
import { firebaseChatService, FirebaseMessage, ChatNotifications } from '@/app/services/FirebaseChatService';

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
  }[];
  replyTo?: string;
  parentId?: string;
  mentions?: string[];
  deletable?: boolean;
  updatable?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export const useChat = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ChatNotifications>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  // User state
  const userid = (typeof window !== 'undefined') ? localStorage.getItem('userId') : null;
  const [currentUserId, setCurrentUserId] = useState<string>(userid || '');
  const [currentUserName] = useState('You');

  // Refs for cleanup
  const conversationUnsubscribers = useRef<Map<string, () => void>>(new Map());
  const notificationUnsubscriber = useRef<(() => void) | null>(null);

  // Initialize Firebase service with current user
  useEffect(() => {
    if (currentUserId) {
      console.log(`[useChat] Initializing Firebase service for user: ${currentUserId}`);
      firebaseChatService.initialize(currentUserId);
    }
  }, [currentUserId]);

  // Update current user ID from storage
  useEffect(() => {
    try {
      const id = (typeof window !== 'undefined') ? localStorage.getItem('userId') : null;
      if (id && id !== currentUserId) {
        console.log(`[useChat] User ID changed from ${currentUserId} to ${id}`);
        setCurrentUserId(id);
      }
    } catch (error) {
      console.error('[useChat] Error reading user ID from storage:', error);
    }
  }, [currentUserId]);

  // Load initial data
  const loadChats = useCallback(async () => {
    console.log('[useChat] Loading chats and users...');
    try {
      setLoading(true);
      setError(null);
      
      const [chatResponse, userResponse] = await Promise.all([
        getChatList(),
        getAssignDropdown()
      ]);

      if (chatResponse.isSuccess) {
        console.log(`[useChat] Loaded ${chatResponse.data.length} chats`);
        
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
            unReadMessageCount: apiChat.unReadMessageCount,
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
        setChats(transformedChats as any);
      }

      if (userResponse.isSuccess) {
        console.log(`[useChat] Loaded ${userResponse.data.length} users`);
        const transformedUsers: User[] = userResponse.data
          .filter(apiUser => apiUser.id !== currentUserId)
          .map(apiUser => ({
            id: apiUser.id,
            label: apiUser.label,
            name: apiUser.label,
            conversationRole: 'MEMBER',
            status: 'offline' as const
          }));
        setUsers(transformedUsers);
      }
    } catch (err) {
      console.error('[useChat] Error loading chat data:', err);
      setError('Failed to load chat data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Load messages for a specific chat
  const loadMessages = useCallback(async (chatId: string) => {
    console.log(`[useChat] Loading messages for chat: ${chatId}`);
    
    try {
      const response = await filterMessages({ conversationId: parseInt(chatId) });
      if (response.isSuccess) {
        console.log(`[useChat] Loaded ${response.data.content.length} messages for chat ${chatId}`);
        
        const transformedMessages: Message[] = response.data.content.map((apiMsg: ApiMessage) => {
          const transformedReactions = apiMsg.reactions?.map(apiReaction => ({
            id: apiReaction.id?.toString(),
            messageId: apiReaction.messageId?.toString(),
            emoji: apiReaction.reaction || apiReaction.emoji,
            count: 1,
            users: [apiReaction.createdBy || ''],
            reaction: apiReaction.reaction,
            createdAt: apiReaction.createdAt
          })) || [];

          return {
            id: apiMsg.id.toString(),
            content: apiMsg.content,
            sender: {
              id: apiMsg.sender.id,
              label: apiMsg.sender.id === currentUserId ? 'You' : apiMsg.sender.label
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
            status: apiMsg.sender.id === currentUserId ? 'sent' : undefined
          };
        });
        
        setMessages(prev => ({ ...prev, [chatId]: transformedMessages }));
        
        // Mark conversation as read when loading messages
        markConversationAsRead(chatId);
        
        // Update message receipts for received messages
        const messageIds = response.data.content
          .filter((msg: ApiMessage) => msg.sender.id !== currentUserId)
          .map((msg: ApiMessage) => msg.id);
          
        if (messageIds.length > 0) {
          console.log(`[useChat] Updating receipts for ${messageIds.length} messages`);
          try {
            await updateMessageReceipt({
              messageIds,
              status: 'READ'
            });
          } catch (receiptError) {
            console.error('[useChat] Error updating message receipts:', receiptError);
          }
        }
      }
    } catch (err) {
      console.error(`[useChat] Error loading messages for chat ${chatId}:`, err);
    }
  }, [currentUserId]);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!currentUserId) return;
    
    console.log(`[useChat] Marking conversation ${conversationId} as read`);
    
    try {
      // Mark as read in Firebase
      await firebaseChatService.markConversationAsRead(conversationId);
      
      // Update local state to reflect zero unread count
      setChats(prev => prev.map(chat => 
        chat.id.toString() === conversationId 
          ? { ...chat, unReadMessageCount: 0 }
          : chat
      ));
      
      // Update notifications state
      setNotifications(prev => ({
        ...prev,
        [conversationId]: {
          ...prev[conversationId],
          unreadCount: 0,
          timestamp: new Date().toISOString()
        }
      }));
      
    } catch (error) {
      console.error(`[useChat] Error marking conversation ${conversationId} as read:`, error);
    }
  }, [currentUserId]);

  // Set active conversation (for auto-mark-as-read)
  const setActiveConversation = useCallback((conversationId: string | null) => {
    console.log(`[useChat] Setting active conversation: ${conversationId}`);
    
    // Mark previous conversation as inactive
    if (activeConversationId) {
      firebaseChatService.setUserActiveInConversation(activeConversationId, false);
    }
    
    setActiveConversationId(conversationId);
    
    // Mark new conversation as active and read
    if (conversationId) {
      firebaseChatService.setUserActiveInConversation(conversationId, true);
      markConversationAsRead(conversationId);
    }
  }, [activeConversationId, markConversationAsRead]);

  // Subscribe to Firebase notifications for realtime unread counts
  useEffect(() => {
    if (!currentUserId) return;
    
    console.log(`[useChat] Subscribing to notifications for user: ${currentUserId}`);
    
    const unsubscribe = firebaseChatService.subscribeToUserNotifications(
      currentUserId, 
      (updates) => {
        console.log(`[useChat] Received notification updates:`, updates);
        
        setNotifications(updates);
        
        // Merge unread counts into chats list
        setChats(prev => prev.map(chat => {
          const unread = firebaseChatService.getConversationUnreadCount(updates, String(chat.id));
          return { ...chat, unReadMessageCount: unread } as Chat;
        }));
        
        // Log total unread count
        const totalUnread = firebaseChatService.getTotalUnreadCount(updates);
        console.log(`[useChat] Total unread messages: ${totalUnread}`);
      }
    );
    
    notificationUnsubscriber.current = unsubscribe;
    
    return () => {
      console.log(`[useChat] Unsubscribing from notifications for user: ${currentUserId}`);
      unsubscribe?.();
    };
  }, [currentUserId]);

  // Subscribe to conversation messages via Firebase
  const subscribeToConversation = useCallback((conversationId: string) => {
    // Don't subscribe if already subscribed
    if (conversationUnsubscribers.current.has(conversationId)) {
      console.log(`[useChat] Already subscribed to conversation: ${conversationId}`);
      return conversationUnsubscribers.current.get(conversationId)!;
    }
    
    console.log(`[useChat] Subscribing to Firebase messages for conversation: ${conversationId}`);
    
    const unsubscribe = firebaseChatService.subscribeToConversationMessages(
      conversationId, 
      (firebaseMessages: FirebaseMessage[]) => {
        console.log(`[useChat] Received ${firebaseMessages.length} Firebase messages for conversation ${conversationId}`);
        
        // Map Firebase messages to UI Message model
        const transformed: Message[] = firebaseMessages.map((fm) => ({
          id: fm.id?.toString() || Math.random().toString(),
          content: fm.content || '',
          sender: {
            id: fm.senderId || '',
            label: fm.senderId === currentUserId ? 'You' : fm.senderId
          },
          createdAt: fm.createdAt || fm.timestamp,
          senderId: fm.senderId || '',
          timestamp: new Date(fm.createdAt || fm.timestamp || Date.now()).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          type: (fm.senderId === currentUserId ? 'sent' : 'received'),
          reactions: (fm.reactions || []).map((r: any) => ({ 
            emoji: r?.reaction || r?.emoji, 
            count: 1, 
            users: [] 
          })),
          parentId: fm.parentId,
          mentions: fm.mentions,
          deletable: false,
          updatable: false,
          status: fm.senderId === currentUserId ? 'sent' : undefined,
        }));

        setMessages(prev => ({ ...prev, [conversationId]: transformed }));
        
        // Auto-mark as read if this is the active conversation
        if (activeConversationId === conversationId) {
          markConversationAsRead(conversationId);
        }
      }
    );
    
    conversationUnsubscribers.current.set(conversationId, unsubscribe);
    return unsubscribe;
  }, [currentUserId, activeConversationId, markConversationAsRead]);

  // Unsubscribe from conversation
  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    const unsubscriber = conversationUnsubscribers.current.get(conversationId);
    if (unsubscriber) {
      console.log(`[useChat] Unsubscribing from conversation: ${conversationId}`);
      unsubscriber();
      conversationUnsubscribers.current.delete(conversationId);
    }
  }, []);

  // Send a new message
  const sendMessage = useCallback(async (chatId: string, content: string, mentions?: string[], parentId?: string) => {
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content,
      sender: {
        id: currentUserId,  
        label: currentUserName
      },
      createdAt: new Date().toISOString(),
      senderId: currentUserId,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: 'sent',
      mentions,
      parentId,
      status: 'sending'
    };

    console.log(`[useChat] Sending message to chat ${chatId}:`, { content, mentions, parentId });

    // Optimistically add message
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), tempMessage]
    }));

    try {
      let response;
      
      if (parentId) {
        response = await replyToMessageService(parentId, {
          conversationId: parseInt(chatId),
          content,
          mentions
        });
      } else {
        response = await addMessage({
          conversationId: parseInt(chatId),
          content,
          mentions
        });
      }

      if (response.isSuccess) {
        console.log(`[useChat] Message sent successfully:`, response.data);
        
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
          mentions: response.data.mentions,
          deletable: response.data.deletable,
          updatable: response.data.updatable,
          status: 'sent'
        };

        setMessages(prev => ({
          ...prev,
          [chatId]: prev[chatId].map(msg => msg.id === tempId ? realMessage : msg)
        }));

        // Update chat's last message
        setChats(prev => prev.map(chat => 
          chat.id.toString() === chatId 
            ? { ...chat, lastMessage: { content, timestamp: new Date(), senderId: currentUserId } }
            : chat
        ));

      } else {
        console.error('[useChat] Failed to send message:', response.message);
        throw new Error(response.message);
      }
    } catch (err) {
      console.error('[useChat] Error sending message:', err);
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId].map(msg => 
          msg.id === tempId ? { ...msg, status: 'failed' as any } : msg
        )
      }));
    }
  }, [currentUserId, currentUserName]);

  // Create a new chat/conversation
  const createChat = useCallback(async (name: string, participants: string[], isGroup: boolean) => {
    console.log(`[useChat] Creating ${isGroup ? 'group' : 'private'} chat:`, { name, participants });
    
    try {
      const response = await startConversation({
        name,
        description: isGroup ? `Group chat with ${participants.length + 1} members` : '',
        conversationType: isGroup ? 'GROUP' : 'PRIVATE',
        participants
      });

      if (response.isSuccess) {
        console.log('[useChat] Chat created successfully:', response.data);
        
        const newChat: Chat = {
          id: response.data.id,
          name: (response.data.conversationType?.toString().toUpperCase() === 'GROUP')
            ? response.data.name
            : (response.data.participants.find((p: any) => p.id !== currentUserId)?.label || response.data.name),
          description: response.data.description || '',
          conversationType: isGroup ? 'group' : 'private',
          participants: response.data.participants
            .filter(p => p.id !== currentUserId)
            .map(p => ({
              id: p.id,
              name: p.label,
              label: p.label,
              status: 'offline' as const,
              conversationRole: p.conversationRole
            })),
          lastMessage: {
            content: '',
            timestamp: new Date(),
            senderId: ''
          },
          unReadMessageCount: 0,
          messageResponses: response.data.messageResponses || []
        };

        setChats(prev => [newChat, ...prev]);
        return newChat;
      }
    } catch (err) {
      console.error('[useChat] Error creating chat:', err);
      throw err;
    }
  }, [currentUserId]);

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    console.log(`[useChat] Deleting chat: ${chatId}`);
    
    try {
      // Unsubscribe from Firebase first
      unsubscribeFromConversation(chatId);
      
      const response = await softDeleteConversation(chatId);
      if (response.isSuccess) {
        console.log(`[useChat] Chat ${chatId} deleted successfully`);
        
        setChats(prev => prev.filter(chat => chat.id.toString() !== chatId));
        setMessages(prev => {
          const newMessages = { ...prev };
          delete newMessages[chatId];
          return newMessages;
        });
      }
    } catch (err) {
      console.error(`[useChat] Error deleting chat ${chatId}:`, err);
      throw err;
    }
  }, [unsubscribeFromConversation]);

  // Search chats
  const searchChats = useCallback((query: string) => {
    console.log(`[useChat] Searching chats with query: "${query}"`);
    
    const activeChats = chats.filter(chat =>
      chat.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (activeChats.length === 0 && query.trim()) {
      const matchingUsers = users.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase())
      );
      
      console.log(`[useChat] Found ${matchingUsers.length} matching users for potential chats`);
      
      return matchingUsers.map(user => ({
        id: `potential-${user.id}`,
        name: user.name,
        type: 'private' as const,
        participants: [user],
        lastMessage: {
          content: 'No messages yet',
          timestamp: new Date(),
          senderId: ''
        },
        unreadCount: 0,
        isPotential: true
      }));
    }
    
    console.log(`[useChat] Found ${activeChats.length} matching chats`);
    return activeChats;
  }, [chats, users]);

  // Add participants to group
  const addChatParticipants = useCallback(async (chatId: string, participantIds: string[]) => {
    console.log(`[useChat] Adding participants to chat ${chatId}:`, participantIds);
    
    try {
      const response = await addParticipants(chatId, { participants: participantIds });
      if (response.isSuccess) {
        console.log(`[useChat] Successfully added participants to chat ${chatId}`);
        await loadChats();
      }
    } catch (err) {
      console.error(`[useChat] Error adding participants to chat ${chatId}:`, err);
      throw err;
    }
  }, [loadChats]);

  // Remove participants from group
  const removeChatParticipants = useCallback(async (chatId: string, participantIds: string[]) => {
    console.log(`[useChat] Removing participants from chat ${chatId}:`, participantIds);
    
    try {
      const response = await deleteParticipants(chatId, { participants: participantIds });
      if (response.isSuccess) {
        console.log(`[useChat] Successfully removed participants from chat ${chatId}`);
        await loadChats();
      }
    } catch (err) {
      console.error(`[useChat] Error removing participants from chat ${chatId}:`, err);
      throw err;
    }
  }, [loadChats]);

  // Change participant role
  const changeParticipantRoleInGroup = useCallback(async (chatId: string, participantId: string, role: "ADMIN" | "MEMBER") => {
    console.log(`[useChat] Changing role for participant ${participantId} in chat ${chatId} to ${role}`);
    
    try {
      const response = await changeParticipantRole(chatId, { role, participantId });
      if (response.isSuccess) {
        console.log(`[useChat] Successfully changed participant role in chat ${chatId}`);
        await loadChats();
      }
    } catch (err) {
      console.error(`[useChat] Error changing participant role in chat ${chatId}:`, err);
      throw err;
    }
  }, [loadChats]);

  // Add/remove reactions with logging
  const addMessageReaction = useCallback(async (messageId: string, emoji: string) => {
    console.log(`[useChat] Adding reaction ${emoji} to message ${messageId}`);
    
    try {
      const response = await addReaction(messageId, { reaction: emoji });
      if (response.isSuccess) {
        console.log(`[useChat] Successfully added reaction to message ${messageId}`);
        
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
                        ? { ...r, count: r.count + 1, users: [...r.users, currentUserId] }
                        : r
                    )
                  };
                } else if (!existingReaction) {
                  return {
                    ...msg,
                    reactions: [
                      ...(msg.reactions || []),
                      { emoji, count: 1, users: [currentUserId] }
                    ]
                  };
                }
              }
              return msg;
            });
          });
          return newMessages;
        });
      }
    } catch (err) {
      console.error(`[useChat] Error adding reaction to message ${messageId}:`, err);
    }
  }, [currentUserId]);

  const removeMessageReaction = useCallback(async (messageId: string, emoji: string) => {
    console.log(`[useChat] Removing reaction ${emoji} from message ${messageId}`);
    
    try {
      const response = await removeReaction(messageId);
      if (response.isSuccess) {
        console.log(`[useChat] Successfully removed reaction from message ${messageId}`);
        
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(chatId => {
            newMessages[chatId] = newMessages[chatId].map(msg => {
              if (msg.id === messageId) {
                return {
                  ...msg,
                  reactions: msg.reactions?.map(r => 
                    r.emoji === emoji 
                      ? { ...r, count: Math.max(0, r.count - 1), users: r.users.filter(u => u !== currentUserId) }
                      : r
                  ).filter(r => r.count > 0)
                };
              }
              return msg;
            });
          });
          return newMessages;
        });
      }
    } catch (err) {
      console.error(`[useChat] Error removing reaction from message ${messageId}:`, err);
    }
  }, [currentUserId]);

  // Edit/delete messages with logging
  const editMessageContent = useCallback(async (messageId: string, newContent: string) => {
    console.log(`[useChat] Editing message ${messageId}`);
    
    try {
      const response = await editMessage(messageId, { content: newContent });
      if (response.isSuccess) {
        console.log(`[useChat] Successfully edited message ${messageId}`);
        
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(chatId => {
            newMessages[chatId] = newMessages[chatId].map(msg => 
              msg.id === messageId ? { ...msg, content: newContent } : msg
            );
          });
          return newMessages;
        });
      }
    } catch (err) {
      console.error(`[useChat] Error editing message ${messageId}:`, err);
      throw err;
    }
  }, []);

  const deleteMessageById = useCallback(async (messageId: string) => {
    console.log(`[useChat] Deleting message ${messageId}`);
    
    try {
      const response = await deleteMessage(messageId);
      if (response.isSuccess) {
        console.log(`[useChat] Successfully deleted message ${messageId}`);
        
        setMessages(prev => {
          const newMessages = { ...prev };
          Object.keys(newMessages).forEach(chatId => {
            newMessages[chatId] = newMessages[chatId].filter(msg => msg.id !== messageId);
          });
          return newMessages;
        });
      }
    } catch (err) {
      console.error(`[useChat] Error deleting message ${messageId}:`, err);
      throw err;
    }
  }, []);

  // Get message receipts
  const getMessageReceiptsById = useCallback(async (messageId: string) => {
    console.log(`[useChat] Getting receipts for message ${messageId}`);
    
    try {
      const response = await getMessageReceipts(messageId);
      const receipts = response.isSuccess ? response.data : [];
      console.log(`[useChat] Found ${receipts.length} receipts for message ${messageId}`);
      return receipts;
    } catch (err) {
      console.error(`[useChat] Error getting receipts for message ${messageId}:`, err);
      return [];
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[useChat] Component unmounting, cleaning up Firebase listeners');
      
      // Unsubscribe from all conversations
      conversationUnsubscribers.current.forEach((unsubscriber, conversationId) => {
        console.log(`[useChat] Unsubscribing from conversation: ${conversationId}`);
        unsubscriber();
      });
      conversationUnsubscribers.current.clear();
      
      // Unsubscribe from notifications
      if (notificationUnsubscriber.current) {
        console.log('[useChat] Unsubscribing from notifications');
        notificationUnsubscriber.current();
      }
      
      // Clean up Firebase service
      firebaseChatService.cleanup();
    };
  }, []);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Debug method to log current state
  const debugChatState = useCallback(() => {
    console.log('[useChat] Current State Debug:', {
      chatsCount: chats.length,
      usersCount: users.length,
      activeConversation: activeConversationId,
      totalMessages: Object.keys(messages).reduce((total, chatId) => total + messages[chatId].length, 0),
      totalUnreadCount: firebaseChatService.getTotalUnreadCount(notifications),
      currentUserId,
      loading,
      error
    });
    
    firebaseChatService.debugState();
  }, [chats, users, activeConversationId, messages, notifications, currentUserId, loading, error]);

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
    
    // Actions
    loadChats,
    loadMessages,
    sendMessage,
    createChat,
    deleteChat,
    searchChats,
    
    // Participants
    addChatParticipants,
    removeChatParticipants,
    changeParticipantRoleInGroup,
    
    // Messages
    addMessageReaction,
    removeMessageReaction,
    editMessageContent,
    deleteMessageById,
    getMessageReceiptsById,
    
    // Firebase & Real-time
    subscribeToConversation,
    unsubscribeFromConversation,
    setActiveConversation,
    markConversationAsRead,
    
    // Debug
    debugChatState,
    
    // Utility
    getTotalUnreadCount: () => firebaseChatService.getTotalUnreadCount(notifications),
    getConversationUnreadCount: (conversationId: string) => 
      firebaseChatService.getConversationUnreadCount(notifications, conversationId)
  };
};