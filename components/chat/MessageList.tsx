import { useState, useEffect, useRef } from "react";
import { MoreVertical, Reply, Smile, Edit3, Trash2, Check, CheckCheck, Clock, Plus, Minus, Info, Download, File, FileText, Image, Video, Music, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Message } from "@/hooks/useChat";
import { MessageAttachment } from "@/app/services/chatService";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onMessageInfo?: (messageId: string) => void;
  onDownloadFiles?: (messageId: string) => void;
  isGroupChat?: boolean;
}

// Simple UserAvatar component for demo
const UserAvatar = ({ src, alt, size }: { src?: string; alt: string; size: string }) => (
  <div className={`${size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'} bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
    {alt.charAt(0).toUpperCase()}
  </div>
);

// Helper function to get file icon based on file type
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <Image size={16} />;
  if (fileType.startsWith('video/')) return <Video size={16} />;
  if (fileType.startsWith('audio/')) return <Music size={16} />;
  if (fileType.includes('pdf')) return <FileText size={16} />;
  return <File size={16} />;
};

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to parse mentions in message content
const parseMessageContent = (content: string) => {
  if (!content) return null;

  const mentionRegex = /@\w+(?:\s+\w+)?/g;
  const matches = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    matches.push(match);
  }

  if (matches.length === 0) {
    return content;
  }

  const elements: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  matches.forEach((match, index) => {
    const mention = match[0];
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      elements.push(content.slice(lastIndex, startIndex));
    }

    elements.push(
      <span key={`mention-${index}`} className="text-blue-300 px-1 rounded">
        {mention}
      </span>
    );

    lastIndex = startIndex + mention.length;
  });

  if (lastIndex < content.length) {
    elements.push(content.slice(lastIndex));
  }

  return elements;
};

// Attachment component to display individual attachments
const AttachmentDisplay = ({ 
  attachment, 
  isOwn, 
  onDownload 
}: { 
  attachment: MessageAttachment; 
  isOwn: boolean;
  onDownload?: () => void;
}) => (
  <div className={cn(
    "flex items-center gap-3 p-3 rounded-lg border border-opacity-50 bg-opacity-50 hover:bg-opacity-70 transition-colors cursor-pointer group",
    isOwn 
      ? "border-gray-300 bg-gray-200 hover:bg-gray-300"
      : "border-gray-200 bg-gray-50 hover:bg-gray-100"
  )}
  onClick={onDownload}
  >
    <div className={cn(
      "flex-shrink-0 p-2 rounded-lg",
      isOwn ? "bg-gray-300 text-gray-600" : "bg-gray-100 text-gray-500"
    )}>
      {getFileIcon(attachment.fileType)}
    </div>
    
    <div className="flex-1 min-w-0">
      <p className={cn(
        "text-sm font-medium truncate",
        isOwn ? "text-gray-700" : "text-gray-800"
      )}>
        {attachment.fileName}
      </p>
      <div className="flex items-center gap-2 text-xs">
        <span className={cn(isOwn ? "text-gray-500" : "text-gray-600")}>
          {attachment.fileType}
        </span>
        {attachment.fileSize > 0 && (
          <>
            <span className={cn(isOwn ? "text-gray-400" : "text-gray-500")}>•</span>
            <span className={cn(isOwn ? "text-gray-500" : "text-gray-600")}>
              {formatFileSize(attachment.fileSize)}
            </span>
          </>
        )}
      </div>
    </div>
    
    <div className={cn(
      "flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
      isOwn ? "text-gray-500" : "text-gray-600"
    )}>
      <Download size={14} />
    </div>
  </div>
);

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '😍', '😊', '👏', '💯', '🚀', '🎉'];
const INITIAL_EMOJI_COUNT = 5;

export const MessageList = ({ 
  messages, 
  currentUserId, 
  onReaction, 
  onReply, 
  onEdit, 
  onDelete,
  onMessageInfo,
  onDownloadFiles,
  isGroupChat = false // Default to false for private chats
}: MessageListProps) => {
  const [showActions, setShowActions] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showAllEmojis, setShowAllEmojis] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [expandedReactions, setExpandedReactions] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Helper function to determine if avatar should be shown (GROUP CHATS ONLY)
  const shouldShowAvatar = (
    currentMessage: Message,
    allMessages: Message[],
    currentIndex: number
  ): boolean => {
    // Never show avatar in private chat
    if (!isGroupChat) return false;

    const isOwn = currentMessage.sender.id === effectiveCurrentUserId || 
                   currentMessage.sender.id === userId || 
                   currentMessage.type === 'sent';
    
    // Never show avatar for own messages
    if (isOwn) return false;

    // For the first message overall, show avatar
    if (currentIndex === 0) return true;

    // Get the previous message chronologically
    const previousMessage = allMessages[currentIndex - 1];
    
    // Show avatar if previous message is from a different sender
    return previousMessage.sender.id !== currentMessage.sender.id;
  };

  // Helper function to determine if sender name should be shown (GROUP CHATS ONLY)
  const shouldShowSenderName = (
    currentMessage: Message,
    allMessages: Message[],
    currentIndex: number
  ): boolean => {
    // Never show name in private chat
    if (!isGroupChat) return false;

    const isOwn = currentMessage.sender.id === effectiveCurrentUserId || 
                   currentMessage.sender.id === userId || 
                   currentMessage.type === 'sent';
    
    // Never show name for own messages
    if (isOwn) return false;
    
    // For the first message overall, show name
    if (currentIndex === 0) return true;

    // Get the previous message chronologically
    const previousMessage = allMessages[currentIndex - 1];
    
    // Show name if previous message is from a different sender
    return previousMessage.sender.id !== currentMessage.sender.id;
  };

  const handleEditStart = (message: Message) => {
    setEditingMessage(message.id);
    setEditContent(message.content);
    setShowActions(null);
  };

  const handleEditSave = async (messageId: string) => {
    if (editContent.trim() && editContent !== messages.find(m => m.id === messageId)?.content) {
      await onEdit(messageId, editContent.trim());
    }
    setEditingMessage(null);
    setEditContent("");
  };

  const handleEditCancel = () => {
    setEditingMessage(null);
    setEditContent("");
  };

  const handleReactionClick = (messageId: string, emoji: string) => {
    onReaction(messageId, emoji);
    setShowEmojiPicker(null);
    setShowAllEmojis(null);
  };

  const toggleExpandedReactions = (messageId: string) => {
    const newSet = new Set(expandedReactions);
    if (newSet.has(messageId)) {
      newSet.delete(messageId);
    } else {
      newSet.add(messageId);
    }
    setExpandedReactions(newSet);
  };

  const formatTime = (timestamp: string) => {
    return timestamp;
  };

  const getDeliveryIcon = (status?: string, isOwn?: boolean) => {
    if (!isOwn) return null;
    
    const normalizedStatus = status?.toUpperCase();
    
    switch (normalizedStatus) {
      case 'SENDING':
        return <Clock size={12} className="text-gray-400" />;
      case 'SENT':
        return <Check size={12} className="text-gray-400" />;
      case 'DELIVERED':
        return <CheckCheck size={12} className="text-gray-400" />;
      case 'READ':
        return <CheckCheck size={12} className="text-blue-500" />;
      case 'FAILED':
        return <span className="text-xs text-gray-100">!</span>;
      default:
        return <Check size={12} className="text-gray-400" />;
    }
  };

  const findRepliedMessage = (parentId: string) => {
    return messages.find(m => m.id === parentId);
  };

  // Check if menu should appear above for this message
  const shouldMenuAppearAbove = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    const containerElement = messagesContainerRef.current;
    
    if (!messageElement || !containerElement) return false;
    
    const messageRect = messageElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    
    const containerHeight = containerRect.height;
    const messagePositionFromTop = messageRect.top - containerRect.top;
    const relativePosition = messagePositionFromTop / containerHeight;
    
    return relativePosition > 0.6;
  };

  // If no messages, show empty state
  if (messages.length === 0) {
    return (
      <div 
        ref={messagesContainerRef}
        className="h-full flex items-center justify-center bg-gray-50"
        style={{ 
          backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"25\" cy=\"25\" r=\"1\" fill=\"%23e5e7eb\" opacity=\"0.5\"/><circle cx=\"75\" cy=\"75\" r=\"1\" fill=\"%23e5e7eb\" opacity=\"0.3\"/><circle cx=\"50\" cy=\"10\" r=\"0.5\" fill=\"%23e5e7eb\" opacity=\"0.4\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>')"
        }}
      >
        <div className="text-center text-gray-500 max-w-xs px-8">
          <div className="mb-4">
            <div className="w-20 h-20 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                <path d="M12 3C17.5 3 22 6.58 22 11C22 15.42 17.5 19 12 19C10.76 19 9.57 18.82 8.47 18.5L5 20L6.5 16.53C4.42 15.11 3 13.14 3 11C3 6.58 7.5 3 12 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-400">
            No messages here yet...
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Send a message to start the conversation
          </p>
        </div>
        <div ref={messagesEndRef} />
      </div>
    );
  }

  // Sort all messages chronologically first
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Group messages by date
  const groupedMessages = sortedMessages.reduce((groups, message) => {
    const messageDate = new Date(message.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDateOnly = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    let dateKey: string;
    
    if (messageDateOnly.getTime() === todayOnly.getTime()) {
      dateKey = 'Today';
    } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
      dateKey = 'Yesterday';
    } else {
      dateKey = messageDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  // Sort date groups chronologically
  const sortedDateGroups = Object.entries(groupedMessages).sort(([, messagesA], [, messagesB]) => {
    const oldestA = messagesA.reduce((oldest, msg) => 
      new Date(msg.createdAt) < new Date(oldest.createdAt) ? msg : oldest
    );
    const oldestB = messagesB.reduce((oldest, msg) => 
      new Date(msg.createdAt) < new Date(oldest.createdAt) ? msg : oldest
    );
    
    return new Date(oldestA.createdAt).getTime() - new Date(oldestB.createdAt).getTime();
  });

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const effectiveCurrentUserId = currentUserId || 'current';

  return (
    <div 
      ref={messagesContainerRef}
      className="h-full overflow-y-auto bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
      style={{ 
        backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"25\" cy=\"25\" r=\"1\" fill=\"%23e5e7eb\" opacity=\"0.5\"/><circle cx=\"75\" cy=\"75\" r=\"1\" fill=\"%23e5e7eb\" opacity=\"0.3\"/><circle cx=\"50\" cy=\"10\" r=\"0.5\" fill=\"%23e5e7eb\" opacity=\"0.4\"/></circle></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>')"
      }}
    >
      <div className="p-4 space-y-1 min-h-full">
        {sortedDateGroups.map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-white shadow-sm rounded-lg px-3 py-1">
                <span className="text-xs text-gray-600">{date}</span>
              </div>
            </div>
             
            {dateMessages.map((message) => {
              const isOwn = message.sender.id === effectiveCurrentUserId || message.sender.id === userId || message.type === 'sent';
              const repliedMessage = message.parentId ? findRepliedMessage(message.parentId) : null;
              
              // Find the global index of this message in sortedMessages
              const globalIndex = sortedMessages.findIndex(m => m.id === message.id);
              
              // Determine if avatar and name should be shown (GROUP CHATS ONLY)
              const showAvatar = isGroupChat ? shouldShowAvatar(message, sortedMessages, globalIndex) : false;
              const showName = isGroupChat ? shouldShowSenderName(message, sortedMessages, globalIndex) : false;
              
              const isExpanded = expandedReactions.has(message.id);
              const visibleReactions = message.reactions?.slice(0, isExpanded ? undefined : 3) || [];
              const hiddenReactionsCount = message.reactions ? Math.max(0, message.reactions.length - 3) : 0;

              const isShowingAllEmojis = showAllEmojis === message.id;
              const emojisToShow = isShowingAllEmojis ? EMOJI_REACTIONS : EMOJI_REACTIONS.slice(0, INITIAL_EMOJI_COUNT);
              const hasMoreEmojis = EMOJI_REACTIONS.length > INITIAL_EMOJI_COUNT;

              const menuAbove = shouldMenuAppearAbove(message.id);
              const hasAttachments = message.attachments && message.attachments.length > 0;

              // Parse message content for mentions
              const parsedContent = parseMessageContent(message.content);

              return (
                <div
                  key={message.id}
                  ref={(el) => (messageRefs.current[message.id] = el)}
                  className={cn(
                    "group flex gap-2 mb-1 relative",
                    isOwn ? "justify-end" : "justify-start",
                    // For private chats, we don't need the avatar space at all
                    !isGroupChat && "gap-0"
                  )}
                >
                  {/* Avatar for received messages in GROUP CHATS ONLY */}
                  {isGroupChat && !isOwn && (
                    <div className="w-8 h-8 flex-shrink-0">
                      {showAvatar ? (
                        <UserAvatar
                          src={undefined}
                          alt={message.sender.label || message.sender.id}
                          size="sm"
                        />
                      ) : (
                        <div className="w-8 h-8" /> // Empty space for alignment in group chats
                      )}
                    </div>
                  )}
                  
                  <div className={cn(
                    "max-w-[70%] space-y-1",
                    isOwn ? "items-end" : "items-start",
                    // For private chats, adjust max width since we don't have avatars
                    !isGroupChat && "max-w-[75%]"
                  )}>
                    {/* Sender name for GROUP CHATS ONLY */}
                    {showName && (
                      <div className="flex items-center gap-2 ml-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {message.sender.label || message.sender.id}
                        </span>
                      </div>
                    )}

                    {/* Replied Message Preview */}
                    {repliedMessage && (
                      <div className={cn(
                        "mx-2 px-3 py-2 border-l-4 bg-gray-100 rounded-r-lg text-xs shadow-sm max-w-full",
                        isOwn 
                          ? "border-gray-400 bg-gray-50" 
                          : "border-blue-400 bg-blue-50"
                      )}>
                        <p className={cn(
                          "font-medium text-xs mb-1",
                          isOwn ? "text-gray-600" : "text-blue-600"
                        )}>
                          {repliedMessage.sender.id === effectiveCurrentUserId ? 'You' : repliedMessage.sender.label}
                        </p>
                        <p className="text-gray-700 text-xs leading-tight line-clamp-2 break-words">
                          {parseMessageContent(repliedMessage.content)}
                        </p>
                        {repliedMessage.hasAttachments && (
                          <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                            <File size={10} />
                            <span>📎 {repliedMessage.attachments?.length || 0} file(s)</span>
                          </p>
                        )}
                      </div>
                    )}
                    
                    <div className="relative">
                      {editingMessage === message.id ? (
                        // Edit Mode
                        <div className="bg-white rounded-lg p-3 shadow-sm border">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-transparent text-sm resize-none border-none outline-none min-w-[200px]"
                            rows={Math.min(editContent.split('\n').length + 1, 5)}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => handleEditSave(message.id)}
                              className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleEditCancel}
                              className="px-3 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Normal Message Display
                        <div className={cn(
                          "relative rounded-lg px-3 py-2 shadow-sm max-w-sm group",
                          isOwn 
                            ? "bg-gray-500 text-white rounded-br-sm"
                            : "bg-white text-gray-800 rounded-bl-sm",
                          // Adjust border radius for consecutive messages in group chats
                          isGroupChat && !isOwn && !showAvatar && "rounded-tl-none",
                          // For private chats, use standard rounded corners
                          !isGroupChat && isOwn && "rounded-br-md rounded-bl-md rounded-tl-md",
                          !isGroupChat && !isOwn && "rounded-bl-md rounded-br-md rounded-tr-md"
                        )}>
                          <div className="space-y-2">
                            {/* Message content with mentions */}
                            {message.content && (
                              <p className="text-sm whitespace-pre-wrap break-words leading-5">
                                {parsedContent}
                              </p>
                            )}
                            
                            {/* Attachments Display */}
                            {hasAttachments && (
                              <div className="space-y-2 mt-2">
                                {message.attachments!.map((attachment, attachIndex) => (
                                  <AttachmentDisplay
                                    key={`${message.id}-attachment-${attachIndex}`}
                                    attachment={attachment}
                                    isOwn={isOwn}
                                    onDownload={() => onDownloadFiles && onDownloadFiles(message.id)}
                                  />
                                ))}
                              </div>
                            )}
                            
                            {/* Legacy file attachment indicator */}
                            {message.hasAttachments && (!message.attachments || message.attachments.length === 0) && (
                              <div className={cn(
                                "flex items-center gap-2 p-2 rounded border-t mt-2",
                                isOwn 
                                  ? "border-gray-400 bg-gray-600"
                                  : "border-gray-200 bg-gray-50"
                              )}>
                                <File size={16} className={cn(
                                  isOwn ? "text-gray-200" : "text-gray-500"
                                )} />
                                <span className={cn(
                                  "text-xs font-medium",
                                  isOwn ? "text-gray-200" : "text-gray-600"
                                )}>
                                  📎 Files attached
                                </span>
                                {onDownloadFiles && (
                                  <button
                                    onClick={() => onDownloadFiles(message.id)}
                                    className={cn(
                                      "ml-auto p-1 rounded hover:bg-opacity-70 transition-colors",
                                      isOwn 
                                        ? "text-gray-200 hover:bg-gray-700"
                                        : "text-gray-600 hover:bg-gray-200"
                                    )}
                                    title="Download files"
                                  >
                                    <Download size={14} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          
                          {/* Message time and status */}
                          <div className={cn(
                            "flex items-center justify-end gap-1 mt-1",
                            isOwn ? "text-gray-100" : "text-gray-500"
                          )}>
                            <span className="text-xs">
                              {formatTime(message.timestamp)}
                            </span>
                            {getDeliveryIcon(message.status, isOwn)}
                          </div>
                          
                          {/* WhatsApp-style Dropdown Button - Only appears on hover */}
                          <button
                            className={cn(
                              "absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 rounded-full",
                              isOwn 
                                ? "text-gray-500 hover:bg-gray-200 -left-6 top-1/2 transform -translate-y-1/2" 
                                : "text-gray-500 hover:bg-gray-200 -right-6 top-1/2 transform -translate-y-1/2",
                              showActions === message.id && "opacity-100"
                            )}
                            onClick={() => setShowActions(showActions === message.id ? null : message.id)}
                          >
                            <ChevronDown size={16} />
                          </button>

                          {/* Action Menu - WhatsApp Style */}
                          {showActions === message.id && (
                            <div className={cn(
                              "absolute bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[180px]",
                              menuAbove ? "bottom-full mb-2" : "top-0 mt-1",
                              isOwn ? "right-0" : "left-0"
                            )}>
                              {/* Emoji Reactions */}
                              <div className="px-3 py-2 border-b border-gray-100">
                                <div className="flex items-center gap-1">
                                  {emojisToShow.map((emoji) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReactionClick(message.id, emoji)}
                                      className="p-2 hover:bg-gray-100 rounded text-base transition-colors flex-shrink-0"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                  {hasMoreEmojis && !isShowingAllEmojis && (
                                    <button
                                      onClick={() => setShowAllEmojis(message.id)}
                                      className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-600 flex-shrink-0"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  )}
                                  {isShowingAllEmojis && (
                                    <button
                                      onClick={() => setShowAllEmojis(null)}
                                      className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-600 flex-shrink-0"
                                    >
                                      <Minus size={14} />
                                    </button>
                                  )}
                                </div>
                                {isShowingAllEmojis && EMOJI_REACTIONS.length > INITIAL_EMOJI_COUNT && (
                                  <div className="flex items-center gap-1 mt-1">
                                    {EMOJI_REACTIONS.slice(INITIAL_EMOJI_COUNT).map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReactionClick(message.id, emoji)}
                                        className="p-2 hover:bg-gray-100 rounded text-base transition-colors flex-shrink-0"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Reply Option */}
                              <button
                                onClick={() => {
                                  onReply(message);
                                  setShowActions(null);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Reply size={14} />
                                Reply
                              </button>

                              {/* Download Option for attachments */}
                              {message.hasAttachments && onDownloadFiles && (
                                <button
                                  onClick={() => {
                                    onDownloadFiles(message.id);
                                    setShowActions(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Download size={14} />
                                  Download Files
                                </button>
                              )}

                              {/* Edit Option (only for own messages) */}
                              {isOwn && (message.updatable !== false) && (
                                <button
                                  onClick={() => handleEditStart(message)}
                                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Edit3 size={14} />
                                  Edit
                                </button>
                              )}

                              {/* Delete Option (only for own messages) */}
                              {isOwn && (message.deletable !== false) && (
                                <button
                                  onClick={() => {
                                    if (confirm('Delete this message?')) {
                                      onDelete(message.id);
                                    }
                                    setShowActions(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              )}

                              {/* Message Info Option */}
                             {/* Message Info Option - Only show for own messages */}
{isOwn && (
  <button
    onClick={() => {
      if (onMessageInfo) {
        onMessageInfo(message.id);
      }
      setShowActions(null);
    }}
    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
  >
    <Info size={14} />
    Message Info
  </button>
)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Reactions */}
                    {visibleReactions.length > 0 && (
                      <div className={cn(
                        "flex gap-1 flex-wrap mt-1",
                        isOwn ? "justify-end" : "justify-start"
                      )}>
                        {visibleReactions.map((reaction, index) => (
                          <button
                            key={index}
                            onClick={() => handleReactionClick(message.id, reaction.emoji)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors bg-white border shadow-sm",
                              reaction.users?.includes(effectiveCurrentUserId)
                                ? "border-gray-500 text-gray-700"
                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            <span>{reaction.emoji}</span>
                            <span>{reaction.count}</span>
                          </button>
                        ))}
                        
                        {!isExpanded && hiddenReactionsCount > 0 && (
                          <button
                            onClick={() => toggleExpandedReactions(message.id)}
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border border-gray-200 text-xs hover:bg-gray-200"
                          >
                            <Plus size={12} />
                          </button>
                        )}
                        
                        {isExpanded && (
                          <button
                            onClick={() => toggleExpandedReactions(message.id)}
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border border-gray-200 text-xs hover:bg-gray-200"
                          >
                            <Minus size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Click outside to close menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setShowActions(null);
            setShowEmojiPicker(null);
            setShowAllEmojis(null);
          }}
        />
      )}
    </div>
  );
};