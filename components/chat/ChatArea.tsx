"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Smile, MoreVertical, Users, Phone, Video, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { MessageList } from "./MessageList";
import { useChat, Message } from "@/hooks/useChat";
import UserAvatar from "./UserAvatar";
import EmojiPicker from "./EmojiPicker";
import { MessageInfoPopup } from "./MessageInfoPopup";
import GroupInfoModal from "./GroupInfoModal";
import { Chat } from "@/app/services/chatService";

interface ChatAreaProps {
  chat: Chat;
}

export const ChatArea = ({ chat }: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [currentChat, setCurrentChat] = useState<Chat>(chat);
  const [isTyping, setIsTyping] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    messages, 
    sendMessage, 
    loadMessages,
    subscribeToConversation,
    addMessageReaction,
    removeMessageReaction,
    editMessageContent,
    deleteMessageById,
    currentUserId,
    getMessageReceiptsById,
    users,
    chats,
    addChatParticipants,
    removeChatParticipants,
    changeParticipantRoleInGroup
  } = useChat();

  const chatMessages = messages[currentChat.id] || [];

  // Keep local currentChat in sync with prop
  useEffect(() => {
    setCurrentChat(chat);
  }, [chat]);

  // Also sync with global chats if they update (ensures latest server state)
  useEffect(() => {
    const updated = chats.find(c => String(c.id) === String(currentChat.id));
    if (updated) {
      setCurrentChat(updated);
    }
  }, [chats, currentChat.id]);

  // Load messages when chat changes
  useEffect(() => {
    if (currentChat.id) {
      loadMessages(String(currentChat.id));
    }
  }, [currentChat.id, loadMessages]);

  // Realtime subscription via Firebase for this conversation
  useEffect(() => {
    if (!currentChat.id) return;
    const unsubscribe = subscribeToConversation(String(currentChat.id));
    return () => {
      try { unsubscribe && unsubscribe(); } catch {}
    };
  }, [currentChat.id, subscribeToConversation]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      const content = message.trim();
      const mentions = extractMentions(content);
      
      try {
        await sendMessage(String(chat.id), content, mentions, replyTo?.id);
        setMessage("");
        setReplyTo(null);
        
        // Auto-resize textarea
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (err) {
        console.error('Error sending message:', err);
      }
    }
  };
  

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    
    // Typing indicator (simplified)
    setIsTyping(e.target.value.length > 0);
  };

  const extractMentions = (text: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(text)) !== null) {
      const user = currentChat.participants.find((p) =>
        p.label.toLowerCase().includes(match![1].toLowerCase())
      );
      if (user) {
        mentions.push(user.id);
      }
    }
    return mentions;
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const message = chatMessages.find(m => m.id === messageId);
      if (!message) return;
      
      // Check if the current user already has any reaction on this message
      const userReaction = message.reactions?.find(reaction => 
        reaction.users && reaction.users.includes(currentUserId)
      );
      
      if (userReaction) {
        // If user is clicking the same emoji they already reacted with, remove it (toggle off)
        if (userReaction.emoji === emoji) {
          await removeMessageReaction(messageId, userReaction.emoji);
          return;
        } else {
          // If user is clicking a different emoji, remove the old one first
          await removeMessageReaction(messageId, userReaction.emoji);
        }
      }
      
      // Add the new reaction
      await addMessageReaction(messageId, emoji);
      
    } catch (err) {
      console.error('Error handling reaction:', err);
    }
  };


  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessageContent(messageId, newContent);
    } catch (err) {
      console.error('Error editing message:', err);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessageById(messageId);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    textareaRef.current?.focus();
  };

  const handleMessageInfo = (messageId: string) => {
    const message = chatMessages.find(m => m.id === messageId);
    if (message) {
      setSelectedMessage(message);
      setShowMessageInfo(true);
    }
  };

  const closeMessageInfo = () => {
    setShowMessageInfo(false);
    setSelectedMessage(null);
  };

  // Participant management functions
  const handleAddMembers = async (chatId: string, userIds: string[]) => {
    try {
      await addChatParticipants(chatId, userIds);
      console.log(`Successfully added ${userIds.length} members to chat ${chatId}`);
    } catch (err) {
      console.error('Error adding members:', err);
      throw err;
    }
  };

  const handleRemoveMember = async (chatId: string, userId: string) => {
    try {
      await removeChatParticipants(chatId, [userId]);
      console.log(`Successfully removed member ${userId} from chat ${chatId}`);
    } catch (err) {
      console.error('Error removing member:', err);
      throw err;
    }
  };

  const handleChangeRole = async (chatId: string, userId: string, role: 'ADMIN' | 'MEMBER') => {
    try {
      await changeParticipantRoleInGroup(chatId, userId, role);
      console.log(`Successfully changed role of user ${userId} to ${role} in chat ${chatId}`);
    } catch (err) {
      console.error('Error changing participant role:', err);
      throw err;
    }
  };

  const handleInfoClick = () => {
console.log(chat.conversationType.toLowerCase());
    if (chat.conversationType.toLowerCase() === 'group') {
      setShowGroupInfo(true);
    }
    
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const getLastSeenText = () => {
    if (currentChat.conversationType === 'private') {
      const participant = currentChat.participants[0];
      // If 'status' does not exist, you may need to remove or replace this check.
      // For now, just return a placeholder or use another property if available.
      return 'last seen recently';
    }
    return `${currentChat.participants.length} participants`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Chat Header - Fixed */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          {currentChat.conversationType === 'private' ? (
            <UserAvatar
              src={currentChat.participants[0]?.avatar}
              alt={currentChat.name}
              size="lg"
              status={currentChat.participants[0]?.status}
              showStatus={true}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-800">{currentChat.name}</h2>
            <p className="text-sm text-gray-600">
              {isTyping ? 'typing...' : getLastSeenText()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors">
            <Phone size={18} />
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors">
            <Video size={18} />
          </button>
          <button 
            onClick={handleInfoClick}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-full transition-colors"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={chatMessages}
          currentUserId={currentUserId}
          onReaction={(messageId: string, emoji: string) => {
            handleReaction(messageId, emoji);
          }}
          onReply={handleReply}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onMessageInfo={handleMessageInfo}
        />
      </div>

      {/* Reply Preview - Fixed above input */}
      {replyTo && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-12 bg-gray-500 rounded"></div>
              <div className="flex-1">
                <p className="text-xs text-gray-600 font-medium">
                  Replying to {replyTo.sender.label}
                </p>
                <p className="text-sm text-gray-800 truncate max-w-xs">{replyTo.content}</p>
              </div>
            </div>
            <button
              onClick={cancelReply}
              className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Message Input - Fixed at bottom */}
     <div className="w-full max-w-[80vw] mx-auto bg-gray-50">
      {/* Chat messages area placeholder */}
   

      {/* Message Input - Exact replica */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 shadow-sm rounded-b-lg">
        <div className="flex items-center gap-3">
          {/* Attachment Button */}
          <button className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2.5 rounded-full flex-shrink-0 transition-colors">
            <Paperclip className="h-5 w-5" />
          </button>
         
          {/* Text Input Container */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              placeholder="Type a message..."
              value={message}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              className="min-h-[44px] max-h-[80px] resize-none bg-gray-50 border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 text-gray-900 placeholder-gray-400 rounded-2xl px-4 py-3 pr-12 w-full outline-none transition-all duration-200 text-sm leading-5"
              style={{ 
                paddingRight: '48px'
              }}
              rows={1}
            />
            {/* Emoji Button */}
            <button
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-4 w-4" />
            </button>
          </div>
         
          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed p-3 rounded-full min-w-[44px] min-h-[44px] flex-shrink-0 transition-colors duration-200 flex items-center justify-center shadow-sm"
          >
            <Send className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
      </div>

      {/* Emoji Picker - Absolute positioning */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4 z-50">
          <EmojiPicker
            onEmojiSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        </div>
      )}

      {/* Message Info Popup */}
      {showMessageInfo && selectedMessage && (
        <MessageInfoPopup
          messageId={selectedMessage.id}
          messageContent={selectedMessage.content}
          timestamp={selectedMessage.timestamp}
          isOpen={showMessageInfo}
          onClose={closeMessageInfo}
          onGetReceipts={getMessageReceiptsById}
        />
      )}

      {/* Group Info Modal - Now includes all participant management functions */}
      {showGroupInfo && (currentChat.conversationType?.toString().toLowerCase() === 'group') && (
        <GroupInfoModal
          chat={currentChat}
          users={users}
          currentUserId={currentUserId}
          onAddMembers={handleAddMembers}
          onRemoveMember={handleRemoveMember}
          onChangeRole={handleChangeRole}
          onClose={() => setShowGroupInfo(false)}
          onConversationRefetched={(updated) => {
            setCurrentChat(prev => ({
              ...prev,
              name: updated.name ?? prev.name,
              description: updated.description ?? prev.description,
              conversationType: updated.conversationType ?? prev.conversationType,
              participants: (updated.participants || []).map((p: any) => ({
                id: p.id,
                label: p.label,
                conversationRole: p.conversationRole,
                status: (p as any).status || 'offline',
                avatar: (p as any).avatar
              })),
              unReadMessageCount: (updated as any).unReadMessageCount ?? prev.unReadMessageCount,
              messageResponses: (updated as any).messageResponses ?? prev.messageResponses,
              lastMessage: prev.lastMessage
            }));
          }}
        />
      )}
    </div>
  );
};