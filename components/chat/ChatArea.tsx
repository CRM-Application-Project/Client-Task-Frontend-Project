"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Smile, MoreVertical, Users, Phone, Video, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Chat } from "@/lib/data";
import { MessageList } from "./MessageList";
import { useChat, Message } from "@/hooks/useChat";
import UserAvatar from "./UserAvatar";
import EmojiPicker from "./EmojiPicker";
import { MessageInfoPopup } from "./MessageInfoPopup";
import GroupInfoModal from "./GroupInfoModal";

interface ChatAreaProps {
  chat: Chat;
}

export const ChatArea = ({ chat }: ChatAreaProps) => {
  const [message, setMessage] = useState("");
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
    addMessageReaction,
    removeMessageReaction,
    editMessageContent,
    deleteMessageById,
    currentUserId,
    getMessageReceiptsById,
    users,
    addChatParticipants,
    removeChatParticipants
  } = useChat();

  const chatMessages = messages[chat.id] || [];

  // Load messages when chat changes
  useEffect(() => {
    if (chat.id) {
      loadMessages(chat.id);
    }
  }, [chat.id, loadMessages]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      const content = message.trim();
      const mentions = extractMentions(content);
      
      try {
        await sendMessage(chat.id, content, mentions, replyTo?.id);
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
      const user = chat.participants.find((p) =>
        p.name.toLowerCase().includes(match![1].toLowerCase())
      );
      if (user) {
        mentions.push(user.id);
      }
    }
    return mentions;
  };

  const handleReaction = async (messageId: string, emoji: string, action: 'add' | 'remove') => {
    try {
      if (action === 'add') {
        await addMessageReaction(messageId, emoji);
      } else {
        await removeMessageReaction(messageId, emoji);
      }
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

  const handleAddMembers = async (chatId: string, userIds: string[]) => {
    try {
      await addChatParticipants(chatId, userIds);
    } catch (err) {
      console.error('Error adding members:', err);
      throw err;
    }
  };

  const handleRemoveMember = async (chatId: string, userId: string) => {
    try {
      await removeChatParticipants(chatId, [userId]);
    } catch (err) {
      console.error('Error removing member:', err);
      throw err;
    }
  };

  const handleInfoClick = () => {
    if (chat.type === 'group') {
      setShowGroupInfo(true);
    }
    // For private chats, you could show user profile or other info
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
    if (chat.type === 'private') {
      const participant = chat.participants[0];
      if (participant?.status === 'online') {
        return 'online';
      }
      return 'last seen recently';
    }
    return `${chat.participants.length} participants`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Chat Header - Fixed */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          {chat.type === 'private' ? (
            <UserAvatar
              src={chat.participants[0]?.avatar}
              alt={chat.name}
              size="lg"
              status={chat.participants[0]?.status}
              showStatus={true}
            />
          ) : (
            <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-800">{chat.name}</h2>
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
          onReaction={handleReaction}
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
              <div className="w-1 h-12 bg-green-500 rounded"></div>
              <div className="flex-1">
                <p className="text-xs text-green-600 font-medium">
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
      <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 shadow-sm">
        <div className="flex items-end gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-full flex-shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder={`Type a message`}
              value={message}
              onChange={handleTextareaChange}
              onKeyPress={handleKeyPress}
              className="min-h-[24px] max-h-[80px] resize-none bg-gray-100 border-gray-200 focus:border-gray-500 focus:ring-1 focus:ring-gray-500 text-gray-800 placeholder-gray-500 rounded-full px-4 py-3 pr-12"
              style={{ paddingRight: '48px' }}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 p-2 rounded-full"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="h-5 w-5" />
            </Button>
          </div>
          
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed p-3 rounded-full min-w-[48px] min-h-[48px] flex-shrink-0"
          >
            <Send className="h-5 w-5" />
          </Button>
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

      {/* Group Info Modal */}
      {showGroupInfo && chat.type === 'group' && (
        <GroupInfoModal
          chat={chat}
          users={users}
          currentUserId={currentUserId}
          onAddMembers={handleAddMembers}
          onRemoveMember={handleRemoveMember}
          onClose={() => setShowGroupInfo(false)}
        />
      )}
    </div>
  );
};