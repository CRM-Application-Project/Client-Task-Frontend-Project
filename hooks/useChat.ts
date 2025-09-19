import { useState, useEffect, useCallback } from 'react';
import { ApiMessage,  User } from '@/lib/data';
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
  sender:{
    id:string;
    label:string;
  } 
  createdAt: string; // ISO string from API
  senderId: string;
  timestamp: string;
  type: "sent" | "received";
  reactions?: { 
    id?: string;        // From API
    messageId?: string; // From API
    emoji: string;      // Component expects this
    count: number;      // Component expects this
    users: string[];    // Component expects this
    reaction?: string;  // From API (this contains the actual emoji)
    createdAt?: string; // From API
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
  const userid=localStorage.getItem('userId');
  const [currentUserId] = useState('UR-ID239604'); // Get from auth context in real app
  const [currentUserName] = useState('John Doe'); // Get from auth context in real app
  const [notifications, setNotifications] = useState<ChatNotifications>({});

  // Load initial data
  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [chatResponse, userResponse] = await Promise.all([
        getChatList(),
        getAssignDropdown()
      ]);

      if (chatResponse.isSuccess) {
         const transformedChats: Chat[] = chatResponse.data.map(apiChat => ({
          id: apiChat.id,
          name: apiChat.name,
          description: apiChat.description || '',
          conversationType: apiChat.conversationType,
          participants: apiChat.participants.map(participant => ({
            id: participant.id,
            name: participant.label,
            label: participant.label,
            status: 'offline' as const,
            conversationRole: participant.conversationRole === 'ADMIN' ? 'ADMIN' : 'MEMBER'
          })),
          unReadMessageCount: apiChat.unReadMessageCount,
          messageResponses: apiChat.messageResponses || [],
          lastMessage: {
            content: apiChat.description || '',
            timestamp: new Date(),
            senderId: ''
          }
        }));
        setChats(transformedChats);
      }

      if (userResponse.isSuccess) {
        const transformedUsers: User[] = userResponse.data
          .filter(apiUser => apiUser.id !== currentUserId) // Exclude current user
          .map(apiUser => ({
            id: apiUser.id,
            label: apiUser.label,
            name: apiUser.label, // Assuming label is the name, adjust if needed
            conversationRole: 'MEMBER', // Default to MEMBER as AssignDropdown does not have conversationRole
            status: 'offline' as const
          }));
        setUsers(transformedUsers);
      }
    } catch (err) {
      console.error('Error loading chat data:', err);
      setError('Failed to load chat data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Load messages for a specific chat
 const loadMessages = useCallback(async (chatId: string) => {
  try {
    const response = await filterMessages({ conversationId: parseInt(chatId) });
    if (response.isSuccess) {
      const transformedMessages: Message[] = response.data.content.map((apiMsg: ApiMessage) => {
          const transformedReactions = apiMsg.reactions?.map(apiReaction => ({
          id: apiReaction.id?.toString(),
          messageId: apiReaction.messageId?.toString(),
          emoji: apiReaction.reaction || apiReaction.emoji, // Use reaction field from API
          count: 1, // Default count, you might need to adjust this based on your API
          users: [apiReaction.createdBy || ''], // You'll need to get user info from your API
          reaction: apiReaction.reaction, // Keep original API data
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
          status: apiMsg.sender.id === currentUserId ? 'read' : undefined
        };
      });
      
      setMessages(prev => ({ ...prev, [chatId]: transformedMessages }));
      
      // Update message receipts for received messages
      const messageIds = response.data.content
        .filter((msg: ApiMessage) => msg.sender.id !== currentUserId)
        .map((msg: ApiMessage) => msg.id);
        
      
    }
  } catch (err) {
    console.error('Error loading messages:', err);
  }
}, [currentUserId]);

  // Send a new message
  const sendMessage = useCallback(async (chatId: string, content: string, mentions?: string[], parentId?: string) => {
    const tempId = `temp-${Date.now()}`;
    const tempMessage: Message = {
      id: tempId,
      content,
      sender:{
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

    // Optimistically add message
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), tempMessage]
    }));

    try {
      let response;
      
      // Use replyToMessage API if parentId is provided, otherwise use addMessage
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
        const realMessage: Message = {
          id: response.data.id.toString(),
          content: response.data.content,
          createdAt: response.data.createdAt,
          sender:{
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

        // Update receipt to delivered after a short delay
        setTimeout(async () => {
          try {
            setMessages(prevMessages => ({
              ...prevMessages,
              [chatId]: prevMessages[chatId].map(msg => 
                msg.id === response.data.id.toString() ? { ...msg, status: 'delivered' } : msg
              )
            }));
          } catch (err) {
            console.error('Error updating receipt:', err);
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId].map(msg => 
          msg.id === tempId ? { ...msg, status: 'failed' as any } : msg
        )
      }));
    }
  }, [currentUserId]);

  // Create a new chat/conversation
  const createChat = useCallback(async (name: string, participants: string[], isGroup: boolean) => {
    try {
      const response = await startConversation({
        name,
        description: isGroup ? `Group chat with ${participants.length + 1} members` : '',
        conversationType: isGroup ? 'GROUP' : 'PRIVATE',
        participants
      });

      if (response.isSuccess) {
        const newChat: Chat = {
          id: response.data.id,
          name: response.data.name,
          description: response.data.description || '',
          conversationType: isGroup ? 'group' : 'private',
          participants: response.data.participants
            .filter(p => p.id !== currentUserId) // Exclude current user from display
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
      console.error('Error creating chat:', err);
      throw err;
    }
  }, [currentUserId]);

  // Search chats (including deleted ones if no active conversations match)
  const searchChats = useCallback((query: string) => {
    const activeChats = chats.filter(chat =>
      chat.name.toLowerCase().includes(query.toLowerCase())
    );
    
    // If no active chats found, search in users to show potential conversations
    if (activeChats.length === 0 && query.trim()) {
      const matchingUsers = users.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase())
      );
      
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
    
    return activeChats;
  }, [chats, users]);

  // Subscribe to Firebase notifications for realtime unread counts
  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = firebaseChatService.subscribeToUserNotifications(currentUserId, (updates) => {
      setNotifications(updates);
      // Merge unread counts into chats list
      setChats(prev => prev.map(chat => {
        const unread = firebaseChatService.getConversationUnreadCount(updates, String(chat.id));
        return { ...chat, unReadMessageCount: unread } as Chat;
      }));
    });
    return () => {
      unsubscribe?.();
    };
  }, [currentUserId]);

  // Expose a subscription to conversation messages via Firebase
  const subscribeToConversation = useCallback((conversationId: string) => {
    const unsubscribe = firebaseChatService.subscribeToConversationMessages(conversationId, (firebaseMessages: FirebaseMessage[]) => {
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
        timestamp: new Date(fm.createdAt || fm.timestamp || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: (fm.senderId === currentUserId ? 'sent' : 'received'),
        reactions: (fm.reactions || []).map((r: any) => ({ emoji: r?.reaction || r?.emoji, count: 1, users: [] })),
        parentId: fm.parentId,
        mentions: fm.mentions,
        deletable: false,
        updatable: false,
        status: fm.senderId === currentUserId ? 'read' : undefined,
      }));

      setMessages(prev => ({ ...prev, [conversationId]: transformed }));
    });
    return unsubscribe;
  }, [currentUserId]);

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await softDeleteConversation(chatId);
      if (response.isSuccess) {
        setChats(prev => prev.filter(chat => chat.id.toString() !== chatId));
        setMessages(prev => {
          const newMessages = { ...prev };
          delete newMessages[chatId];
          return newMessages;
        });
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
      throw err;
    }
  }, []);

  // Add participants to group
  const addChatParticipants = useCallback(async (chatId: string, participantIds: string[]) => {
    try {
      const response = await addParticipants(chatId, { participants: participantIds });
      if (response.isSuccess) {
        await loadChats();
      }
    } catch (err) {
      console.error('Error adding participants:', err);
      throw err;
    }
  }, [loadChats]);

  // Remove participants from group
  const removeChatParticipants = useCallback(async (chatId: string, participantIds: string[]) => {
    try {
      const response = await deleteParticipants(chatId, { participants: participantIds });
      if (response.isSuccess) {
        await loadChats();
      }
    } catch (err) {
      console.error('Error removing participants:', err);
      throw err;
    }
  }, [loadChats]);

  // Change participant role
  const changeParticipantRoleInGroup = useCallback(async (chatId: string, participantId: string, role: "ADMIN" | "MEMBER") => {
    try {
      const response = await changeParticipantRole(chatId, { role, participantId });
      if (response.isSuccess) {
        await loadChats();
      }
    } catch (err) {
      console.error('Error changing participant role:', err);
      throw err;
    }
  }, [loadChats]);

  // Add reaction to message
  const addMessageReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await addReaction(messageId, { reaction: emoji });
      if (response.isSuccess) {
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
      console.error('Error adding reaction:', err);
    }
  }, [currentUserId]);

  // Remove reaction from message
  const removeMessageReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      const response = await removeReaction(messageId);
      if (response.isSuccess) {
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
      console.error('Error removing reaction:', err);
    }
  }, [currentUserId]);

  // Edit message
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
      }
    } catch (err) {
      console.error('Error editing message:', err);
      throw err;
    }
  }, []);

  // Delete message
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
      }
    } catch (err) {
      console.error('Error deleting message:', err);
      throw err;
    }
  }, []);

  // Get message receipts
  const getMessageReceiptsById = useCallback(async (messageId: string) => {
    try {
      const response = await getMessageReceipts(messageId);
      return response.isSuccess ? response.data : [];
    } catch (err) {
      console.error('Error getting message receipts:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  return {
    chats,
    users,
    messages,
    loading,
    error,
    currentUserId,
    currentUserName,
    notifications,
    loadChats,
    loadMessages,
    sendMessage,
    createChat,
    deleteChat,
    searchChats,
    addChatParticipants,
    removeChatParticipants,
    changeParticipantRoleInGroup,
    addMessageReaction,
    removeMessageReaction,
    editMessageContent,
    deleteMessageById,
    getMessageReceiptsById,
    subscribeToConversation,
  };
};