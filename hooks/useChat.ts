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
import { useDebounce } from './useDebounce';

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

export const useChat = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<ChatParticipant[]>([]);
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<ChatNotifications>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const [locallyCreatedChats, setLocallyCreatedChats] = useState<Set<string>>(new Set());
  const [locallyDeletedChats, setLocallyDeletedChats] = useState<Set<string>>(new Set());
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState<Set<string>>(new Set());
  
  const userid = (typeof window !== 'undefined') ? localStorage.getItem('userId') : null;
  const [currentUserId, setCurrentUserId] = useState<string>(userid || '');
  const [currentUserName] = useState('You');

  const conversationUnsubscribers = useRef<Map<string, () => void>>(new Map());
  const notificationUnsubscriber = useRef<(() => void) | null>(null);
const [loadingMessagesForChat, setLoadingMessagesForChat] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (currentUserId) {
      console.log(`[useChat] Initializing Firebase service for user: ${currentUserId}`);
      firebaseChatService.initialize(currentUserId);
    }
  }, [currentUserId]);

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

  const loadChats = useCallback(async () => {
    if (isLoadingChats) {
      console.log('[useChat] LoadChats already in progress, skipping...');
      return;
    }
    
    console.log('[useChat] Loading chats and users...');
    try {
      setIsLoadingChats(true);
      setLoading(true);
      setError(null);
      
      const [chatResponse, userResponse] = await Promise.all([
        getChatList(),
        getAssignDropdown()
      ]);

      if (chatResponse.isSuccess) {
        console.log(`[useChat] Loaded ${chatResponse.data.length} chats`);
        
        const transformedChats = chatResponse.data
          .filter((apiChat: any) => !locallyDeletedChats.has(apiChat.id.toString()))
          .map((apiChat: any) => {
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
        
        setChats(prevChats => {
          const prevChatMap = new Map(prevChats.map(chat => [chat.id.toString(), chat]));
          const newChatMap = new Map(transformedChats.map((chat: any) => [chat.id.toString(), chat]));
          
          const localChats = prevChats.filter(chat => 
            locallyCreatedChats.has(chat.id.toString()) && !newChatMap.has(chat.id.toString())
          );
          
          const mergedChats = transformedChats.map((newChat: any) => {
            const existingChat = prevChatMap.get(newChat.id.toString());
            if (existingChat) {
              const existingTime = existingChat.lastMessage?.timestamp 
                ? new Date(existingChat.lastMessage.timestamp).getTime() 
                : 0;
              const newTime = newChat.lastMessage 
                ? new Date(newChat.lastMessage.timestamp).getTime() 
                : 0;
              
              return {
                ...newChat,
                lastMessage: existingTime > newTime ? existingChat.lastMessage : newChat.lastMessage,
                unReadMessageCount: activeConversationId === newChat.id.toString() 
                  ? 0 
                  : Math.max(existingChat.unReadMessageCount || 0, newChat.unReadMessageCount || 0)
              };
            }
            return newChat;
          });
          
          const finalChats = [...localChats, ...mergedChats];
          
          return finalChats.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0;
            const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0;
            return timeB - timeA;
          });
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
      setIsLoadingChats(false);
      setLoading(false);
    }
  }, [currentUserId, locallyDeletedChats, locallyCreatedChats, activeConversationId]);

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!currentUserId) {
      return;
    }
    
    console.log(`[useChat] Marking conversation ${conversationId} as read`);
    
    try {
      await firebaseChatService.markConversationAsRead(conversationId);
      
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

  const loadMessages = useCallback(async (chatId: string) => {
  // Add this guard at the very beginning
  if (!chatId || chatId === 'undefined' || chatId === 'null') {
    return;
  }
 if (loadingMessagesForChat.has(chatId)) {
    return;
  }
  
  setLoadingMessagesForChat(prev => new Set(prev).add(chatId));
  console.log(`[useChat] Loading messages for chat: ${chatId}`);
  
  // Improved loading state check
  const loadingKey = `loading-messages-${chatId}`;
  if ((window as any)[loadingKey] || (messages[chatId] && messages[chatId].length > 0)) {
    console.log(`[useChat] Messages already loaded or loading for chat ${chatId}, skipping...`);
    return;
  }
  
  try {
    (window as any)[loadingKey] = true;
    setLoading(true);
    
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
        
        setMessages(prev => ({ 
          ...prev, 
          [chatId]: transformedMessages 
        }));
        
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
  } finally {
    setLoadingMessagesForChat(prev => {
      const newSet = new Set(prev);
      newSet.delete(chatId);
      return newSet;
    });
  }
}, [currentUserId, chats, messages, users,loadingMessagesForChat]);
 const transformFirebaseMessage = useCallback((fm: FirebaseMessage, conversationId: string): Message => {
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

    const transformedReactions = (fm.reactions || []).map((r: any) => {
      const reactionSenderId = r.senderId || r.userId || '';
      let reactionSenderName = 'Unknown User';
      
      if (reactionSenderId === currentUserId) {
        reactionSenderName = 'You';
      } else if (currentChat) {
        const reactionSender = currentChat.participants.find(p => p.id === reactionSenderId);
        if (reactionSender) {
          reactionSenderName = reactionSender.label;
        }
      }
      
      if (reactionSenderName === 'Unknown User') {
        const user = users.find(u => u.id === reactionSenderId);
        if (user) {
          reactionSenderName = user.label;
        }
      }
      
      return { 
        emoji: r.reaction || r.emoji, 
        count: 1, 
        users: [reactionSenderId],
        senderId: reactionSenderId,
        senderName: reactionSenderName,
        createdAt: r.timestamp || r.createdAt,
        reaction: r.reaction || r.emoji
      };
    });

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
      reactions: transformedReactions,
      parentId: fm.parentId,
      mentions: fm.mentions,
      deletable: false,
      updatable: false,
      status: fm.senderId === currentUserId ? 'sent' : 'delivered',
      hasAttachments: fm.attachments && fm.attachments.length > 0,
      attachments: fm.attachments || []
    };
  }, [currentUserId, chats, users]);
    const unsubscribeFromConversation = useCallback((conversationId: string) => {
    const unsubscriber = conversationUnsubscribers.current.get(conversationId);
    if (unsubscriber) {
      console.log(`[useChat] Unsubscribing from conversation: ${conversationId}`);
      unsubscriber();
      conversationUnsubscribers.current.delete(conversationId);
    }
  }, []);
 const subscribeToConversation = useCallback((conversationId: string) => {
  // FIX: Check if already subscribed and return early
  if (conversationUnsubscribers.current.has(conversationId)) {
    console.log(`[useChat] Already subscribed to conversation: ${conversationId}`);
    return conversationUnsubscribers.current.get(conversationId)!;
  }
  
  console.log(`[useChat] Subscribing to Firebase messages for conversation: ${conversationId}`);
  
 const unsubscribe = firebaseChatService.subscribeToConversationMessages(
  conversationId, 
  (firebaseMessages: FirebaseMessage[]) => {
    console.log(`[useChat] Received ${firebaseMessages.length} Firebase messages for conversation ${conversationId}`);
    
    // FIX: Add early return if no valid messages to prevent unnecessary state updates
    const validFirebaseMessages = firebaseMessages.filter(fm => {
      return fm.id && fm.senderId && fm.content && fm.content.trim().length > 0 &&
             !fm.id?.toString().startsWith('temp-') && (fm.createdAt || fm.timestamp);
    });

    if (validFirebaseMessages.length === 0) {
      return;
    }

    // ⬇️⬇️⬇️ UPDATED CODE ⬇️⬇️⬇️
    if (validFirebaseMessages.length > 0) {
      const latestMessage = validFirebaseMessages[validFirebaseMessages.length - 1];
      
      // ADD THIS VALIDATION CHECK
      const isValidLastMessage = latestMessage.content && latestMessage.content.trim().length > 0;
      
      setChats(prevChats => {
        return prevChats.map(chat => {
          if (chat.id.toString() === conversationId) {
            const currentTime = chat.lastMessage?.timestamp 
              ? new Date(chat.lastMessage.timestamp).getTime() 
              : 0;
            const newTime = latestMessage.createdAt 
              ? new Date(latestMessage.createdAt).getTime() 
              : new Date(latestMessage.timestamp || Date.now()).getTime();
            
            // ONLY UPDATE IF WE HAVE VALID CONTENT AND NEWER TIMESTAMP
            if (isValidLastMessage && newTime > currentTime) {
              const updatedChat = {
                ...chat,
                lastMessage: {
                  content: latestMessage.content,
                  timestamp: latestMessage.createdAt || latestMessage.timestamp || new Date().toISOString(),
                  senderId: latestMessage.senderId
                }
              };
              
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

        const transformed: Message[] = validFirebaseMessages.map((fm) => 
          transformFirebaseMessage(fm, conversationId)
        );

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
          
          if (newMessages.length === 0) {
            // Check for reaction updates on existing messages
            const updatedMessages = existingMessages.map(existingMsg => {
              const firebaseMsg = validFirebaseMessages.find(fm => fm.id?.toString() === existingMsg.id);
              if (firebaseMsg && firebaseMsg.reactions) {
                const updatedReactions = (firebaseMsg.reactions || []).map((r: any) => {
                  const reactionSenderId = r.senderId || r.userId || '';
                  let reactionSenderName = 'Unknown User';
                  
                  if (reactionSenderId === currentUserId) {
                    reactionSenderName = 'You';
                  } else {
                    const currentChat = chats.find(chat => chat.id.toString() === conversationId);
                    if (currentChat) {
                      const reactionSender = currentChat.participants.find(p => p.id === reactionSenderId);
                      if (reactionSender) {
                        reactionSenderName = reactionSender.label;
                      }
                    }
                  }
                  
                  return { 
                    emoji: r.reaction || r.emoji, 
                    count: 1, 
                    users: [reactionSenderId],
                    senderId: reactionSenderId,
                    senderName: reactionSenderName,
                    createdAt: r.timestamp || r.createdAt,
                    reaction: r.reaction || r.emoji
                  };
                });
                
                return {
                  ...existingMsg,
                  reactions: updatedReactions
                };
              }
              return existingMsg;
            });
            
            const hasReactionUpdates = updatedMessages.some((msg, index) => {
              const originalReactions = existingMessages[index]?.reactions || [];
              const updatedReactions = msg.reactions || [];
              return JSON.stringify(originalReactions) !== JSON.stringify(updatedReactions);
            });
            
            if (hasReactionUpdates) {
              return {
                ...prev,
                [conversationId]: updatedMessages
              };
            }
            
            return prev;
          }
          
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
        
        if (activeConversationId === conversationId) {
          markConversationAsRead(conversationId);
        }
      }
    );
    
    conversationUnsubscribers.current.set(conversationId, unsubscribe);
    return unsubscribe;
  }, [currentUserId, activeConversationId, markConversationAsRead, chats, users, transformFirebaseMessage]);

const debouncedLoadMessages = useCallback(
  useDebounce(async (chatId: string) => {
    await loadMessages(chatId);
  }, 300),
  [loadMessages]
);

 const setActiveConversation = useCallback((conversationId: string | null) => {
  if (activeConversationId === conversationId) {
    return; // Already active, no need to change
  }
  
  console.log(`[useChat] Setting active conversation: ${conversationId}`);
  
  if (activeConversationId && activeConversationId !== conversationId) {
    firebaseChatService.setUserActiveInConversation(activeConversationId, false);
    unsubscribeFromConversation(activeConversationId);
  }
  
  setActiveConversationId(conversationId);
  
  if (conversationId) {
    // Delay message loading to ensure subscription is set up
    setTimeout(() => {
      firebaseChatService.setUserActiveInConversation(conversationId, true);
      markConversationAsRead(conversationId);
      
      // Only load messages if we don't have them already
      if (!messages[conversationId] || messages[conversationId].length === 0) {
        debouncedLoadMessages(conversationId);
      }
      
      subscribeToConversation(conversationId);
    }, 100);
  }
}, [activeConversationId, markConversationAsRead, messages, debouncedLoadMessages, subscribeToConversation, unsubscribeFromConversation]);

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
              
              const updatedChat = { ...chat };
              
              if (activeConversationId === chatId) {
                updatedChat.unReadMessageCount = 0;
              } else {
                updatedChat.unReadMessageCount = Math.max(chat.unReadMessageCount || 0, unreadCount);
              }
              
             // ADD VALIDATION CHECK FOR NOTIFICATION LAST MESSAGE
const isValidNotificationLastMessage = notificationData.lastMessage && 
                                      notificationData.lastMessage.content && 
                                      notificationData.lastMessage.content.trim().length > 0;

if (isValidNotificationLastMessage) {
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

    const messageKey = `${currentUserId}-${trimmedContent}-${chatId}-${parentId || 'no-parent'}`;
    const sendingKey = `sending-${messageKey}`;
    
    if ((window as any)[sendingKey]) {
      console.log('[useChat] Message already being sent, skipping duplicate...');
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
      tempMessageKey: messageKey
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
      (window as any)[sendingKey] = true;
      
      let response;
      
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
          tempMessageKey: messageKey
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
    } finally {
      delete (window as any)[sendingKey];
    }
  }, [currentUserId, currentUserName, isUploadingFiles]);

  // Reaction handling with real-time updates
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
      if (response.isSuccess) {
        console.log(`[useChat] Successfully added reaction to message ${messageId}`);
      } else {
        console.error(`[useChat] Failed to add reaction: ${response.message}`);
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
      if (response.isSuccess) {
        console.log(`[useChat] Successfully removed reaction from message ${messageId}`);
      } else {
        console.error(`[useChat] Failed to remove reaction: ${response.message}`);
        // Revert optimistic update on failure
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

const createChat = useCallback(async (name: string, participants: string[], isGroup: boolean) => {
  if (isCreatingChat) {
    console.log('[useChat] CreateChat already in progress, skipping...');
    return;
  }
  
  console.log(`[useChat] Creating ${isGroup ? 'group' : 'private'} chat:`, { name, participants });
  
  try {
    setIsCreatingChat(true);
    
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

      const chatId = response.data.id.toString();
      
      setLocallyCreatedChats(prev => {
        const newSet = new Set(prev);
        newSet.add(chatId);
        return newSet;
      });

      setChats(prev => {
        const exists = prev.find(c => c.id.toString() === chatId);
        if (exists) {
          return prev;
        }
        return [newChat, ...prev];
      });
      
      // FIX: Only subscribe if not already subscribed
      if (!conversationUnsubscribers.current.has(chatId)) {
        setTimeout(() => {
          subscribeToConversation(chatId);
        }, 100);
      }
      
      setTimeout(() => {
        setLocallyCreatedChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(chatId);
          return newSet;
        });
      }, 10000);
      
      return newChat;
    } else {
      throw new Error(response.message || 'Failed to create chat');
    }
  } catch (err) {
    console.error('[useChat] Error creating chat:', err);
    throw err;
  } finally {
    setIsCreatingChat(false);
  }
}, [currentUserId, subscribeToConversation, isCreatingChat]);

  const deleteChat = useCallback(async (chatId: string) => {
    if (isDeletingChat.has(chatId)) {
      console.log(`[useChat] DeleteChat already in progress for ${chatId}, skipping...`);
      return;
    }
    
    console.log(`[useChat] Deleting chat: ${chatId}`);
    
    try {
      setIsDeletingChat(prev => {
        const newSet = new Set(prev);
        newSet.add(chatId);
        return newSet;
      });
      
      setLocallyDeletedChats(prev => {
        const newSet = new Set(prev);
        newSet.add(chatId);
        return newSet;
      });
      
      unsubscribeFromConversation(chatId);
      
      setChats(prev => prev.filter(chat => chat.id.toString() !== chatId));
      setMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[chatId];
        return newMessages;
      });
      
      const response = await softDeleteConversation(chatId);
      if (response.isSuccess) {
        console.log(`[useChat] Chat ${chatId} deleted successfully`);
        
        setTimeout(() => {
          setLocallyDeletedChats(prev => {
            const newSet = new Set(prev);
            newSet.delete(chatId);
            return newSet;
          });
        }, 5000);
      } else {
        console.error(`[useChat] Failed to delete chat ${chatId}, restoring...`);
        setLocallyDeletedChats(prev => {
          const newSet = new Set(prev);
          newSet.delete(chatId);
          return newSet;
        });
        await loadChats();
        throw new Error(response.message || 'Failed to delete chat');
      }
    } catch (err) {
      console.error(`[useChat] Error deleting chat ${chatId}:`, err);
      setLocallyDeletedChats(prev => {
        const newSet = new Set(prev);
        newSet.delete(chatId);
        return newSet;
      });
      await loadChats();
      throw err;
    } finally {
      setIsDeletingChat(prev => {
        const newSet = new Set(prev);
        newSet.delete(chatId);
        return newSet;
      });
    }
  }, [unsubscribeFromConversation, loadChats]);

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

  const addChatParticipants = useCallback(async (chatId: string, participantIds: string[]) => {
    console.log(`[useChat] Adding participants to chat ${chatId}:`, participantIds);
    
    try {
      const response = await addParticipants(chatId, { participants: participantIds });
      if (response.isSuccess) {
        console.log(`[useChat] Successfully added participants to chat ${chatId}`);
        await loadChats();
      } else {
        throw new Error(response.message || 'Failed to add participants');
      }
    } catch (err) {
      console.error(`[useChat] Error adding participants to chat ${chatId}:`, err);
      throw err;
    }
  }, [loadChats]);

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

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const debugChatState = useCallback(() => {
    console.log('[useChat] Current State Debug:', {
      chatsCount: chats.length,
      usersCount: users.length,
      activeConversation: activeConversationId,
      totalMessages: Object.keys(messages).reduce((total, chatId) => total + messages[chatId].length, 0),
      totalUnreadCount: firebaseChatService.getTotalUnreadCount(notifications),
      currentUserId,
      loading,
      error,
      locallyCreatedChats: Array.from(locallyCreatedChats),
      locallyDeletedChats: Array.from(locallyDeletedChats)
    });
    
    firebaseChatService.debugState();
  }, [chats, users, activeConversationId, messages, notifications, currentUserId, loading, error, locallyCreatedChats, locallyDeletedChats]);

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