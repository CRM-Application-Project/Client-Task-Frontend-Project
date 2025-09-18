import { useState, useEffect, useCallback } from 'react';
import { ApiMessage, Chat, User } from '@/lib/data';
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
  updateMessageReceipt
} from '@/app/services/chatService';

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
  const [currentUserId] = useState('UR-ID239604'); // Get from auth context in real app
  const [currentUserName] = useState('John Doe'); // Get from auth context in real app

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
          id: apiChat.id.toString(),
          name: apiChat.name,
          type: apiChat.conversationType.toLowerCase() === 'group' ? 'group' : 'private',
          participants: apiChat.participants.map(participant => ({
            id: participant.id,
            name: participant.label,
            status: 'offline' as const
          })),
          lastMessage: {
            content: apiChat.description || '',
            timestamp: new Date(),
            senderId: ''
          },
          unreadCount: apiChat.unReadMessageCount
        }));
        setChats(transformedChats);
      }

      if (userResponse.isSuccess) {
        const transformedUsers: User[] = userResponse.data
          .filter(apiUser => apiUser.id !== currentUserId) // Exclude current user
          .map(apiUser => ({
            id: apiUser.id,
            name: apiUser.label,
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
        
      if (messageIds.length > 0) {
        await updateMessageReceipt({
          messageIds,
          status: 'READ'
        });
      }
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
      status: 'sending'
      
    };

    // Optimistically add message
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), tempMessage]
    }));

    try {
      const response = await addMessage({
        conversationId: parseInt(chatId),
        content,
        mentions,
        parentId: parentId ? parseInt(parentId) : undefined
      });

      if (response.isSuccess) {
        const realMessage: Message = {
          id: response.data.id.toString(),
          content: response.data.content,
            createdAt: new Date().toISOString(),
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
          chat.id === chatId 
            ? { ...chat, lastMessage: { content, timestamp: new Date(), senderId: currentUserId } }
            : chat
        ));

        // Update receipt to delivered after a short delay
        setTimeout(async () => {
          try {
            await updateMessageReceipt({
              messageIds: [response.data.id],
              status: 'DELIVERED'
            });
            
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

  // Reply to a message
// In your useChat hook, replace the replyToMessage function:
const replyToMessage = useCallback(async (messageId: string, chatId: string, content: string, mentions?: string[]) => {
  try {
    const response = await replyToMessageService(messageId, { // Renamed to avoid conflict
      conversationId: parseInt(chatId),
      content,
      mentions
    });

    if (response.isSuccess) {
      const newMessage: Message = {
        id: response.data.id.toString(),
        content: response.data.content,
        sender: {
            id: currentUserId,
            label: currentUserName
        },
        createdAt: response.data.createdAt,
        senderId: currentUserId,
        timestamp: new Date(response.data.createdAt).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        type: 'sent',
        reactions: [],
        parentId: messageId,
        mentions: response.data.mentions,
        deletable: response.data.deletable,
        updatable: response.data.updatable,
        status: 'sent'
      };

      setMessages(prev => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), newMessage]
      }));
    }
  } catch (err) {
    console.error('Error replying to message:', err);
    throw err;
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
          id: response.data.id.toString(),
          name: response.data.name,
          type: isGroup ? 'group' : 'private',
          participants: response.data.participants
            .filter(p => p.id !== currentUserId) // Exclude current user from display
            .map(p => ({
              id: p.id,
              name: p.label,
              status: 'offline' as const
            })),
          lastMessage: {
            content: '',
            timestamp: new Date(),
            senderId: ''
          },
          unreadCount: 0
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

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    try {
      const response = await softDeleteConversation(chatId);
      if (response.isSuccess) {
        setChats(prev => prev.filter(chat => chat.id !== chatId));
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
                if (existingReaction) {
                  return {
                    ...msg,
                    reactions: msg.reactions?.map(r => 
                      r.emoji === emoji 
                        ? { ...r, count: r.count + 1, users: [...r.users, currentUserId] }
                        : r
                    )
                  };
                } else {
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
    loadChats,
    loadMessages,
    sendMessage,
    replyToMessage,
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
  };
};