import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiMessage, User } from '@/lib/data';
import { ChatParticipant, MessageAttachment } from '@/app/services/chatService';
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
  MessageFileInfo
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
  status?: 'sending' | 'sent' | 'delivered' | 'read'| 'failed';
  hasAttachments?: boolean|null;
  attachments?: MessageAttachment[];
   error?: string;
   tempMessageKey?: string; 
  isProcessedLocally?: boolean;
}

export const useChat = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<ChatParticipant[]>([]);
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

  // FIXED: Load initial data without clearing messages
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
        
        // FIXED: Preserve existing real-time data while updating API data
        setChats(prevChats => {
          if (prevChats.length === 0) {
            return transformedChats as any;
          }
          
          const updatedChats = transformedChats.map((newChat: any) => {
            const existingChat = prevChats.find(existing => existing.id.toString() === newChat.id.toString());
            if (existingChat) {
              // Keep real-time updates for last message and unread count
              const existingTime = existingChat.lastMessage?.timestamp 
                ? new Date(existingChat.lastMessage.timestamp).getTime() 
                : 0;
              const newTime = newChat.lastMessage 
                ? new Date(newChat.lastMessage.timestamp).getTime() 
                : 0;
              
              return {
                ...newChat,
                // Keep newer last message
                lastMessage: existingTime > newTime ? existingChat.lastMessage : newChat.lastMessage,
                // Keep real-time unread count if it's higher
                unReadMessageCount: Math.max(existingChat.unReadMessageCount || 0, newChat.unReadMessageCount || 0)
              };
            }
            return newChat;
          });
          
          return updatedChats as any;
        });
      }

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
      }
    } catch (err) {
      console.error('[useChat] Error loading chat data:', err);
      setError('Failed to load chat data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // FIXED: Mark conversation as read only when it's active and viewed
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!currentUserId) {
      return;
    }
    
    console.log(`[useChat] Marking conversation ${conversationId} as read`);
    
    try {
      await firebaseChatService.markConversationAsRead(conversationId);
      
      // Update local state immediately
      setChats(prev => prev.map(chat => 
        chat.id.toString() === conversationId 
          ? { ...chat, unReadMessageCount: 0 }
          : chat
      ));
      
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

  // Load messages function
  const loadMessages = useCallback(async (chatId: string) => {
    console.log(`[useChat] Loading messages for chat: ${chatId}`);
    
    // Don't reload if we already have messages for this chat
    if (messages[chatId] && messages[chatId].length > 0) {
      console.log(`[useChat] Messages already loaded for chat ${chatId}`);
      return;
    }
    
    try {
      const response = await filterMessages({ conversationId: parseInt(chatId) });
      if (response.isSuccess) {
        console.log(`[useChat] Loaded ${response.data.content.length} messages for chat ${chatId}`);
        
        const currentChat = chats.find(chat => chat.id.toString() === chatId);
        
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
            createdAt: apiReaction.createdAt
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
        
        setMessages(prev => ({ 
          ...prev, 
          [chatId]: transformedMessages 
        }));
        
        // Update message receipts for received messages
        const receivedMessageIds = response.data.content
          .filter((msg: ApiMessage) => msg.sender.id !== currentUserId)
          .map((msg: ApiMessage) => msg.id);
          
        if (receivedMessageIds.length > 0) {
          try {
            const updateReceiptResponse = await updateMessageReceipt({
              messageIds: receivedMessageIds,
              status: "READ"
            });
            
            if (updateReceiptResponse.isSuccess) {
              console.log(`[useChat] Successfully updated receipt status to read for ${receivedMessageIds.length} messages`);
            }
          } catch (receiptError) {
            console.error('[useChat] Error updating message receipts:', receiptError);
          }
        }
      }
    } catch (err) {
      console.error(`[useChat] Error loading messages for chat ${chatId}:`, err);
    }
  }, [currentUserId, chats, messages]);

  // FIXED: Set active conversation with proper state management
  const setActiveConversation = useCallback((conversationId: string | null) => {
    console.log(`[useChat] Setting active conversation: ${conversationId}`);
    
    // Clear previous active conversation
    if (activeConversationId && activeConversationId !== conversationId) {
      firebaseChatService.setUserActiveInConversation(activeConversationId, false);
    }
    
    setActiveConversationId(conversationId);
    
    if (conversationId) {
      firebaseChatService.setUserActiveInConversation(conversationId, true);
      // Mark as read when setting as active
      markConversationAsRead(conversationId);
    }
  }, [activeConversationId, markConversationAsRead]);

  // FIXED: Improved notification subscription
  useEffect(() => {
    if (!currentUserId) return;
    
    console.log(`[useChat] Subscribing to notifications for user: ${currentUserId}`);
    
    const unsubscribe = firebaseChatService.subscribeToUserNotifications(
      currentUserId, 
      (updates) => {
        console.log(`[useChat] [Listener] Notifications update received:`, updates);
        
        setNotifications(updates);
        
        setChats(prev => {
          const updatedChats = prev.map(chat => {
            const chatId = String(chat.id);
            const notificationData = updates[chatId];
            
            if (notificationData) {
              const unreadCount = firebaseChatService.getConversationUnreadCount(updates, chatId);
              
              // Update chat with new notification data
              const updatedChat = { ...chat };
              
              // Update unread count - only clear if this is the active conversation
              if (activeConversationId === chatId) {
                updatedChat.unReadMessageCount = 0;
              } else {
                updatedChat.unReadMessageCount = Math.max(chat.unReadMessageCount || 0, unreadCount);
              }
              
              // Update last message if newer
              if (notificationData.lastMessage) {
                const currentTime = chat.lastMessage?.timestamp 
                  ? new Date(chat.lastMessage.timestamp).getTime() 
                  : 0;
                const newTime = new Date(notificationData.timestamp).getTime();
                
                if (newTime > currentTime) {
                  updatedChat.lastMessage = {
                    content: notificationData.lastMessage.content,
                    timestamp: notificationData.lastMessage.timestamp,
                    senderId: notificationData.lastMessage.senderId
                  };
                }
              }
              
              return updatedChat;
            }
            
            return chat;
          });
          
          // Sort by last message time
          return updatedChats.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
          });
        });
      }
    );
    
    notificationUnsubscriber.current = unsubscribe;
    
    return () => {
      console.log(`[useChat] Unsubscribing from notifications`);
      unsubscribe?.();
    };
  }, [currentUserId, activeConversationId]);

  // Subscribe to conversation messages
  const subscribeToConversation = useCallback((conversationId: string) => {
    if (conversationUnsubscribers.current.has(conversationId)) {
      return conversationUnsubscribers.current.get(conversationId)!;
    }
    
    console.log(`[useChat] Subscribing to Firebase messages for conversation: ${conversationId}`);
    
    const unsubscribe = firebaseChatService.subscribeToConversationMessages(
      conversationId, 
      (firebaseMessages: FirebaseMessage[]) => {
        console.log(`[useChat] Received ${firebaseMessages.length} Firebase messages for conversation ${conversationId}`);
        
        const validFirebaseMessages = firebaseMessages.filter(fm => {
          return fm.id && fm.senderId && fm.content && fm.content.trim().length > 0 &&
                 !fm.id?.toString().startsWith('temp-') && (fm.createdAt || fm.timestamp);
        });

        if (validFirebaseMessages.length > 0) {
          const latestMessage = validFirebaseMessages[validFirebaseMessages.length - 1];
          
          // Update chat list with new message
          setChats(prevChats => {
            return prevChats.map(chat => {
              if (chat.id.toString() === conversationId) {
                const currentTime = chat.lastMessage?.timestamp 
                  ? new Date(chat.lastMessage.timestamp).getTime() 
                  : 0;
                const newTime = latestMessage.createdAt 
                  ? new Date(latestMessage.createdAt).getTime() 
                  : new Date(latestMessage.timestamp || Date.now()).getTime();
                
                if (newTime > currentTime) {
                  const updatedChat = {
                    ...chat,
                    lastMessage: {
                      content: latestMessage.content,
                      timestamp: latestMessage.createdAt || latestMessage.timestamp || new Date().toISOString(),
                      senderId: latestMessage.senderId
                    }
                  };
                  
                  // FIXED: Only increment unread for messages from other users and when not actively viewing
                  if (latestMessage.senderId !== currentUserId && activeConversationId !== conversationId) {
                    updatedChat.unReadMessageCount = (chat.unReadMessageCount || 0) + 1;
                  }
                  
                  return updatedChat;
                }
              }
              return chat;
            }).sort((a, b) => {
              const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
              const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
              return timeB - timeA;
            });
          });
        }

        // Transform and add messages
        const transformed: Message[] = validFirebaseMessages.map((fm) => {
          let senderLabel = 'Unknown User';
          
          const currentChat = chats.find(chat => chat.id.toString() === conversationId);
          if (currentChat) {
            const senderParticipant = currentChat.participants.find(p => p.id === fm.senderId);
            if (senderParticipant) {
              senderLabel = senderParticipant.label;
            }
          }
          
          if (senderLabel === 'Unknown User') {
            for (const chat of chats) {
              const participant = chat.participants.find(p => p.id === fm.senderId);
              if (participant) {
                senderLabel = participant.label;
                break;
              }
            }
          }
          
          if (senderLabel === 'Unknown User') {
            const user = users.find(u => u.id === fm.senderId);
            if (user) {
              senderLabel = user.label;
            }
          }
          
          if (fm.senderId === currentUserId) {
            senderLabel = 'You';
          }
          
          if (senderLabel === 'Unknown User' && fm.senderId) {
            senderLabel = fm.senderId;
          }

          return {
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
            reactions: (fm.reactions || []).map((r: any) => ({ 
              emoji: r?.reaction || r?.emoji, 
              count: 1, 
              users: [] 
            })),
            parentId: fm.parentId,
            mentions: fm.mentions,
            deletable: false,
            updatable: false,
            status: fm.senderId === currentUserId ? 'sent' : 'delivered',
            hasAttachments: fm.attachments && fm.attachments.length > 0,
            attachments: fm.attachments || []
          };
        });

        setMessages(prev => {
          const existingMessages = prev[conversationId] || [];
          const existingIds = new Set(existingMessages.map(msg => msg.id));
          
          const newMessages = transformed.filter(newMsg => {
            if (existingIds.has(newMsg.id)) return false;
            if (!newMsg.content || newMsg.content.trim().length === 0) return false;
            
            if (newMsg.senderId === currentUserId) {
              const duplicateExists = existingMessages.some(existingMsg => 
                existingMsg.senderId === currentUserId &&
                existingMsg.content === newMsg.content &&
                Math.abs(new Date(existingMsg.createdAt).getTime() - new Date(newMsg.createdAt).getTime()) < 5000
              );
              if (duplicateExists) return false;
            }
            
            return true;
          });
          
          if (newMessages.length === 0) return prev;
          
          const cleanedExistingMessages = existingMessages.filter(existingMsg => {
            if (existingMsg.id.startsWith('temp-') && existingMsg.senderId === currentUserId) {
              const matchingRealMessage = newMessages.find(newMsg => 
                newMsg.senderId === currentUserId &&
                newMsg.content === existingMsg.content &&
                Math.abs(new Date(newMsg.createdAt).getTime() - new Date(existingMsg.createdAt).getTime()) < 10000
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
        
        // Auto-mark as read only if this is the active conversation
        if (activeConversationId === conversationId) {
          markConversationAsRead(conversationId);
        }
      }
    );
    
    conversationUnsubscribers.current.set(conversationId, unsubscribe);
    return unsubscribe;
  }, [currentUserId, activeConversationId, markConversationAsRead, chats, users]);

  // Unsubscribe from conversation
  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    const unsubscriber = conversationUnsubscribers.current.get(conversationId);
    if (unsubscriber) {
      console.log(`[useChat] Unsubscribing from conversation: ${conversationId}`);
      unsubscriber();
      conversationUnsubscribers.current.delete(conversationId);
    }
  }, []);

  // Cleanup temp messages
  const cleanupTempMessages = useCallback((conversationId: string) => {
    setMessages(prev => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).filter(msg => 
        !msg.id.startsWith('temp-')
      )
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      Object.keys(messages).forEach(chatId => {
        cleanupTempMessages(chatId);
      });
    }, 30000);

    return () => clearTimeout(timer);
  }, [messages, cleanupTempMessages]);

  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  
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

    if (isUploadingFiles) {
      console.log('[useChat] Cannot send message while files are uploading');
      return;
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
      parentId,
      status: 'sending',
      hasAttachments: fileInfo && fileInfo.length > 0,
      attachments: fileInfo ? fileInfo.map((file, index) => ({
        attachmentId: index,
        fileName: file.fileName,
        fileType: file.fileType,
        fileSize: 0
      })) : [],
      tempMessageKey: `${currentUserId}-${trimmedContent}-${Date.now()}-${Math.random()}`
    };

    setMessages(prev => {
      const existing = prev[chatId] || [];
      const alreadyExists = existing.some(msg => 
        msg.id === tempId || 
        (msg.senderId === currentUserId && 
         msg.content === trimmedContent && 
         Math.abs(new Date(msg.createdAt).getTime() - new Date(now).getTime()) < 1000)
      );
      
      if (alreadyExists) {
        console.warn('[useChat] Temp message already exists, skipping optimistic add');
        return prev;
      }
      
      return {
        ...prev,
        [chatId]: [...existing, tempMessage]
      };
    });

    const maxRetries = 3;
    const baseDelay = 1000;

    const executeWithRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
      let lastError: Error;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          console.warn(`[useChat] Attempt ${attempt} failed:`, error);
          
          if (attempt === maxRetries) {
            throw lastError;
          }
          
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 500;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError!;
    };

    try {
      let response: any;
      
      const sendOperation = async () => {
        if (parentId) {
          return await replyToMessageService(parentId, {
            conversationId: parseInt(chatId),
            content: trimmedContent,
            mentions,
            fileInfo
          });
        } else {
          return await addMessage({
            conversationId: parseInt(chatId),
            content: trimmedContent,
            mentions,
            fileInfo
          });
        }
      };

      response = await executeWithRetry(sendOperation);

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
          status: 'sent',
          hasAttachments: response.data.attachments && response.data.attachments.length > 0,
          attachments: response.data.attachments || [],
          tempMessageKey: `${currentUserId}-${trimmedContent}-${Date.now()}`
        };

        setMessages(prev => ({
          ...prev,
          [chatId]: prev[chatId].map(msg => 
            msg.id === tempId ? realMessage : msg
          )
        }));

        setTimeout(() => {
          setMessages(prev => ({
            ...prev,
            [chatId]: prev[chatId].map(msg => 
              msg.id === response.data.id.toString() 
                ? { ...msg, isProcessedLocally: true } 
                : msg
            )
          }));
        }, 100);

        // FIXED: Update chat's last message and ensure proper sorting
        setChats(prev => {
          const updatedChats = prev.map(chat => 
            chat.id.toString() === chatId 
              ? { 
                  ...chat, 
                  lastMessage: { 
                    content: trimmedContent, 
                    timestamp: new Date().toISOString(), 
                    senderId: currentUserId 
                  },
                  unReadMessageCount: 0
                }
              : chat
          );
          
          // Sort by last message time
          return updatedChats.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
          });
        });

      } else {
        throw new Error(response.message || 'Failed to send message');
      }

    } catch (err) {
      console.error('[useChat] Error sending message:', err);
      
      setMessages(prev => {
        const currentChatMessages = prev[chatId] || [];
        const messageIndex = currentChatMessages.findIndex(msg => msg.id === tempId);
        
        if (messageIndex === -1) return prev;
        
        const updatedMessages = [...currentChatMessages];
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          status: 'failed' as const,
          error: err instanceof Error ? err.message : 'Unknown error'
        };
        
        return {
          ...prev,
          [chatId]: updatedMessages
        };
      });

      throw err;
    }
  }, [currentUserId, currentUserName, isUploadingFiles]);

  // FIXED: Create chat with immediate UI update and proper subscription
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

        // FIXED: Add new chat immediately to UI
        setChats(prev => {
          // Check if chat already exists to prevent duplicates
          const exists = prev.find(c => c.id.toString() === newChat.id.toString());
          if (exists) {
            return prev;
          }
          return [newChat, ...prev];
        });
        
        // Subscribe to the new chat immediately
        setTimeout(() => {
          subscribeToConversation(response.data.id.toString());
        }, 100);
        
        return newChat;
      } else {
        throw new Error(response.message || 'Failed to create chat');
      }
    } catch (err) {
      console.error('[useChat] Error creating chat:', err);
      throw err;
    }
  }, [currentUserId, subscribeToConversation]);

  // FIXED: Delete chat with immediate UI update
  const deleteChat = useCallback(async (chatId: string) => {
    console.log(`[useChat] Deleting chat: ${chatId}`);
    
    try {
      // Unsubscribe from Firebase first
      unsubscribeFromConversation(chatId);
      
      // Remove from UI immediately for better UX
      setChats(prev => prev.filter(chat => chat.id.toString() !== chatId));
      setMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[chatId];
        return newMessages;
      });
      
      const response = await softDeleteConversation(chatId);
      if (response.isSuccess) {
        console.log(`[useChat] Chat ${chatId} deleted successfully`);
      } else {
        // If API call failed, restore the chat
        console.error(`[useChat] Failed to delete chat ${chatId}, restoring...`);
        await loadChats(); // Reload to restore state
        throw new Error(response.message || 'Failed to delete chat');
      }
    } catch (err) {
      console.error(`[useChat] Error deleting chat ${chatId}:`, err);
      // Reload chats to restore correct state
      await loadChats();
      throw err;
    }
  }, [unsubscribeFromConversation, loadChats]);

  // Search chats
  const searchChats = useCallback((query: string) => {
    console.log(`[useChat] Searching chats with query: "${query}"`);
    
    const activeChats = chats.filter(chat =>
      chat.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (activeChats.length === 0 && query.trim()) {
      const matchingUsers = users.filter(user =>
        user.label.toLowerCase().includes(query.toLowerCase())
      );
      
      console.log(`[useChat] Found ${matchingUsers.length} matching users for potential chats`);
      
      return matchingUsers.map(user => ({
        id: `potential-${user.id}`,
        name: user.label,
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
        // Reload chats to get updated participant list
        await loadChats();
      } else {
        throw new Error(response.message || 'Failed to add participants');
      }
    } catch (err) {
      console.error(`[useChat] Error adding participants to chat ${chatId}:`, err);
      throw err;
    }
  }, [loadChats]);

  const processPrivateChat = (chat: Chat, currentUserId: string) => {
    if (chat.conversationType === 'private') {
      // Find the other participant (not the current user)
      const otherParticipant = chat.participants.find(p => p.id !== currentUserId);
      
      if (otherParticipant) {
        // Set the chat name to the other participant's name
        chat.name = otherParticipant.label || `User ${otherParticipant.id}`;
      }
      
      // Ensure participant data is properly mapped
      chat.participants = chat.participants.map(p => ({
        id: p.id,
        label: p.label || `User ${p.id}`,
        avatar: p.avatar,
        status: p.status || 'offline',
        conversationRole: p.conversationRole
      }));
    }
    return chat;
  };

  // Remove participants from group
  const removeChatParticipants = useCallback(async (chatId: string, participantIds: string[]) => {
    console.log(`[useChat] Removing participants from chat ${chatId}:`, participantIds);
    
    try {
      const response = await deleteParticipants(chatId, { participants: participantIds });
      if (response.isSuccess) {
        console.log(`[useChat] Successfully removed participants from chat ${chatId}`);
        await loadChats();
      } else {
        throw new Error(response.message || 'Failed to remove participants');
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
      } else {
        throw new Error(response.message || 'Failed to change participant role');
      }
    } catch (err) {
      console.error(`[useChat] Error changing participant role in chat ${chatId}:`, err);
      throw err;
    }
  }, [loadChats]);

  // Add/remove reactions
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
      } else {
        throw new Error(response.message || 'Failed to add reaction');
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
      } else {
        throw new Error(response.message || 'Failed to remove reaction');
      }
    } catch (err) {
      console.error(`[useChat] Error removing reaction from message ${messageId}:`, err);
    }
  }, [currentUserId]);

  // Edit/delete messages
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
      } else {
        throw new Error(response.message || 'Failed to edit message');
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
      } else {
        throw new Error(response.message || 'Failed to delete message');
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

  // Enhanced cleanup
  useEffect(() => {
    return () => {
      console.log('[useChat] Cleaning up all listeners');
      
      conversationUnsubscribers.current.forEach((unsub, chatId) => {
        console.log(`[useChat] Unsubscribing from conversation: ${chatId}`);
        unsub();
      });
      conversationUnsubscribers.current.clear();
      
      if (notificationUnsubscriber.current) {
        notificationUnsubscriber.current();
        notificationUnsubscriber.current = null;
      }
      
      firebaseChatService.cleanup();
    };
  }, []);

  // Load chats on mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Debug method
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
    setChats,
    
    // Debug
    debugChatState,
    
    // Utility
    getTotalUnreadCount: () => firebaseChatService.getTotalUnreadCount(notifications),
    getConversationUnreadCount: (conversationId: string) => 
      firebaseChatService.getConversationUnreadCount(notifications, conversationId)
  };
};