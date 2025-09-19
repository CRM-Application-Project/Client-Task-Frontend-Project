import { useState, useEffect, useRef } from "react";
import { MoreVertical, Reply, Smile, Edit3, Trash2, Check, CheckCheck, Clock, Plus, Minus, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Message } from "@/hooks/useChat";

// Message type definition


interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: Message) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onDelete: (messageId: string) => void;
  onMessageInfo?: (messageId: string) => void;
}

// Simple UserAvatar component for demo
const UserAvatar = ({ src, alt, size }: { src?: string; alt: string; size: string }) => (
  <div className={`${size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'} bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
    {alt.charAt(0).toUpperCase()}
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
  onMessageInfo
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
    // Simply call the parent handler - let ChatArea handle the WhatsApp-like logic
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
    
    switch (status) {
      case 'sending':
        return <Clock size={12} className="text-gray-400" />;
      case 'sent':
        return <Check size={12} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={12} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={12} className="text-blue-500" />;
      case 'failed':
        return <span className="text-xs text-red-500">!</span>;
      default:
        return <Check size={12} className="text-gray-400" />;
    }
  };

  const findRepliedMessage = (parentId: string) => {
    return messages.find(m => m.id === parentId);
  };

  // Improved positioning logic - check if message is in bottom half of container
  const shouldMenuAppearAbove = (messageId: string) => {
    const messageElement = messageRefs.current[messageId];
    const containerElement = messagesContainerRef.current;
    
    if (!messageElement || !containerElement) return false;
    
    const messageRect = messageElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    
    // Calculate if message is in the bottom 40% of the container
    const containerHeight = containerRect.height;
    const messagePositionFromTop = messageRect.top - containerRect.top;
    const relativePosition = messagePositionFromTop / containerHeight;
    
    // If message is in bottom 40% of container, show menu above
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

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date().toDateString(); // For simplicity, showing all as today
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
  const effectiveCurrentUserId = currentUserId || 'current';

  return (
    <div 
      ref={messagesContainerRef}
      className="h-full overflow-y-auto bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
      style={{ 
        backgroundImage: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"><defs><pattern id=\"grain\" width=\"100\" height=\"100\" patternUnits=\"userSpaceOnUse\"><circle cx=\"25\" cy=\"25\" r=\"1\" fill=\"%23e5e7eb\" opacity=\"0.5\"/><circle cx=\"75\" cy=\"75\" r=\"1\" fill=\"%23e5e7eb\" opacity=\"0.3\"/><circle cx=\"50\" cy=\"10\" r=\"0.5\" fill=\"%23e5e7eb\" opacity=\"0.4\"/></pattern></defs><rect width=\"100\" height=\"100\" fill=\"url(%23grain)\"/></svg>')"
      }}
    >
      <div className="p-4 space-y-1 min-h-full">
        {Object.entries(groupedMessages).map(([date, dateMessages]) => (
          <div key={date}>
            {/* Date separator */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-white shadow-sm rounded-lg px-3 py-1">
                <span className="text-xs text-gray-600">Today</span>
              </div>
            </div>
             
            {[...dateMessages]
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              .map((message, index) => {
                // Fix: Properly check if message is from current user
                const isOwn = message.sender.id === effectiveCurrentUserId || message.sender.id === userId || message.type === 'sent';
                const repliedMessage = message.parentId ? findRepliedMessage(message.parentId) : null;
                const showAvatar = !isOwn && (index === 0 || dateMessages[index - 1]?.sender.id !== message.sender.id);
                const showName = !isOwn && showAvatar;
                const isExpanded = expandedReactions.has(message.id);
                const visibleReactions = message.reactions?.slice(0, isExpanded ? undefined : 3) || [];
                const hiddenReactionsCount = message.reactions ? Math.max(0, message.reactions.length - 3) : 0;

                // Emoji picker logic
                const isShowingAllEmojis = showAllEmojis === message.id;
                const emojisToShow = isShowingAllEmojis ? EMOJI_REACTIONS : EMOJI_REACTIONS.slice(0, INITIAL_EMOJI_COUNT);
                const hasMoreEmojis = EMOJI_REACTIONS.length > INITIAL_EMOJI_COUNT;

                // Check if menu should appear above for this message
                const menuAbove = shouldMenuAppearAbove(message.id);

                return (
                  <div
                    key={message.id}
                    ref={(el) => (messageRefs.current[message.id] = el)}
                    className={cn(
                      "group flex gap-2 mb-2 relative",
                      isOwn ? "justify-end" : "justify-start"
                    )}
                  >
                    {/* Avatar for received messages */}
                    {!isOwn && (
                      <div className="w-8 h-8 flex-shrink-0">
                        {showAvatar ? (
                          <UserAvatar
                            src={undefined}
                            alt={message.sender.label}
                            size="sm"
                          />
                        ) : (
                          <div className="w-8 h-8" /> // Spacer
                        )}
                      </div>
                    )}
                    
                    <div className={cn(
                      "max-w-[70%] space-y-1",
                      isOwn ? "items-end" : "items-start"
                    )}>
                      {/* Sender name for group chats */}
                      {showName && (
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-sm font-medium text-gray-700">
                            {message.sender.label}
                          </span>
                        </div>
                      )}

                      {/* Replied Message Preview - WhatsApp style */}
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
                            {repliedMessage.content}
                          </p>
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
                            "relative rounded-lg px-3 py-2 shadow-sm max-w-sm",
                            isOwn 
                              ? "bg-gray-500 text-white rounded-br-sm"
                              : "bg-white text-gray-800 rounded-bl-sm"
                          )}>
                            <p className="text-sm whitespace-pre-wrap break-words leading-5">
                              {message.content}
                            </p>
                            
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
                            
                            {/* Message Actions - Show on hover with improved positioning */}
                            <div className={cn(
                              "absolute flex items-center bg-white border border-gray-200 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10",
                              isOwn ? "-left-20" : "-right-20",
                              menuAbove ? "bottom-full mb-2" : "top-0 -mt-4"
                            )}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                onClick={() => {
                                  setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id);
                                  setShowAllEmojis(null);
                                }}
                              >
                                <Smile className="h-3 w-3 text-gray-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                onClick={() => onReply(message)}
                              >
                                <Reply className="h-3 w-3 text-gray-600" />
                              </Button>
                              {isOwn && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                  onClick={() => setShowActions(showActions === message.id ? null : message.id)}
                                >
                                  <MoreVertical className="h-3 w-3 text-gray-600" />
                                </Button>
                              )}
                            </div>

                            {/* More Actions Menu with improved positioning */}
                            {showActions === message.id && isOwn && (
                              <div className={cn(
                                "absolute bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[150px]",
                                menuAbove ? "bottom-full mb-2" : "top-full mt-1",
                                isOwn ? "right-0" : "left-0"
                              )}>
                                {(message.updatable !== false) && (
                                  <button
                                    onClick={() => handleEditStart(message)}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                  >
                                    <Edit3 size={14} />
                                    Edit
                                  </button>
                                )}
                                {(message.deletable !== false) && (
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
                              </div>
                            )}

                            {/* Emoji Picker with improved positioning */}
                            {showEmojiPicker === message.id && (
                              <div className={cn(
                                "absolute bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 whitespace-nowrap",
                                menuAbove ? "bottom-full mb-2" : "top-full mt-1",
                                isOwn ? "right-0" : "left-0"
                              )}>
                                {!isShowingAllEmojis ? (
                                  // Show first 5 emojis in a single row with + button
                                  <div className="flex items-center gap-1 min-w-max">
                                    {emojisToShow.map((emoji) => (
                                      <button
                                        key={emoji}
                                        onClick={() => handleReactionClick(message.id, emoji)}
                                        className="p-2 hover:bg-gray-100 rounded text-base transition-colors w-9 h-9 flex items-center justify-center flex-shrink-0"
                                      >
                                        {emoji}
                                      </button>
                                    ))}
                                    
                                    {/* Plus button to show more emojis */}
                                    {hasMoreEmojis && (
                                      <button
                                        onClick={() => setShowAllEmojis(message.id)}
                                        className="p-2 hover:bg-gray-100 rounded transition-colors w-9 h-9 flex items-center justify-center border border-gray-300 text-gray-600 flex-shrink-0"
                                      >
                                        <Plus size={14} />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  // Show all emojis in horizontal rows
                                  <div className="space-y-1">
                                    {/* First row - 6 emojis */}
                                    <div className="flex items-center gap-1">
                                      {EMOJI_REACTIONS.slice(0, 6).map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReactionClick(message.id, emoji)}
                                          className="p-2 hover:bg-gray-100 rounded text-base transition-colors w-9 h-9 flex items-center justify-center flex-shrink-0"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                    
                                    {/* Second row - remaining emojis + minus button */}
                                    <div className="flex items-center gap-1">
                                      {EMOJI_REACTIONS.slice(6).map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReactionClick(message.id, emoji)}
                                          className="p-2 hover:bg-gray-100 rounded text-base transition-colors w-9 h-9 flex items-center justify-center flex-shrink-0"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                      
                                      {/* Minus button to show less emojis */}
                                      <button
                                        onClick={() => setShowAllEmojis(null)}
                                        className="p-2 hover:bg-gray-100 rounded transition-colors w-9 h-9 flex items-center justify-center border border-gray-300 text-gray-600 flex-shrink-0"
                                      >
                                        <Minus size={14} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Reactions - Fixed positioning */}
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
                          
                          {/* Show + button if there are hidden reactions */}
                          {!isExpanded && hiddenReactionsCount > 0 && (
                            <button
                              onClick={() => toggleExpandedReactions(message.id)}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 border border-gray-200 text-xs hover:bg-gray-200"
                            >
                              <Plus size={12} />
                            </button>
                          )}
                          
                          {/* Show - button if expanded to collapse */}
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
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Click outside to close menus */}
      {(showActions || showEmojiPicker) && (
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

// Demo component to show the MessageList in action
export default function MessageListDemo() {
  const [messages, setMessages] = useState<Message[]>([]);
  const currentUserId = 'current';

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        
        // Check if user already has any reaction on this message
        const userReactionIndex = reactions.findIndex(r => 
          r.users && r.users.includes(currentUserId)
        );
        
        if (userReactionIndex >= 0) {
          const userReaction = reactions[userReactionIndex];
          
          // If user is clicking the same emoji they already reacted with, remove it (toggle off)
          if (userReaction.emoji === emoji) {
            const newUsers = userReaction.users.filter(u => u !== currentUserId);
            const newCount = userReaction.count - 1;
            
            if (newCount === 0) {
              return {
                ...msg,
                reactions: reactions.filter((_, i) => i !== userReactionIndex)
              };
            } else {
              return {
                ...msg,
                reactions: reactions.map((r, i) => 
                  i === userReactionIndex 
                    ? { ...r, count: newCount, users: newUsers }
                    : r
                )
              };
            }
          } else {
            // User is clicking a different emoji, remove old reaction and add new one
            let updatedReactions = [...reactions];
            
            // Remove old reaction
            const oldReactionUsers = userReaction.users.filter(u => u !== currentUserId);
            const oldReactionCount = userReaction.count - 1;
            
            if (oldReactionCount === 0) {
              updatedReactions = updatedReactions.filter((_, i) => i !== userReactionIndex);
            } else {
              updatedReactions[userReactionIndex] = {
                ...userReaction,
                count: oldReactionCount,
                users: oldReactionUsers
              };
            }
            
            // Add new reaction
            const newReactionIndex = updatedReactions.findIndex(r => r.emoji === emoji);
            if (newReactionIndex >= 0) {
              // Emoji already exists, add user to it
              updatedReactions[newReactionIndex] = {
                ...updatedReactions[newReactionIndex],
                count: updatedReactions[newReactionIndex].count + 1,
                users: [...updatedReactions[newReactionIndex].users, currentUserId]
              };
            } else {
              // Create new reaction
              updatedReactions.push({ emoji, count: 1, users: [currentUserId] });
            }
            
            return { ...msg, reactions: updatedReactions };
          }
        } else {
          // User doesn't have any reaction, add new one
          const existingReactionIndex = reactions.findIndex(r => r.emoji === emoji);
          
          if (existingReactionIndex >= 0) {
            // Emoji already exists, add user to it
            return {
              ...msg,
              reactions: reactions.map((r, i) => 
                i === existingReactionIndex 
                  ? { ...r, count: r.count + 1, users: [...r.users, currentUserId] }
                  : r
              )
            };
          } else {
            // Create new reaction
            return {
              ...msg,
              reactions: [...reactions, { emoji, count: 1, users: [currentUserId] }]
            };
          }
        }
      }
      return msg;
    }));
  };

  const handleReply = (message: Message) => {
    const replyMessage: Message = {
      id: `reply-${Date.now()}`,
      content: `This is a reply to "${message.content.substring(0, 30)}..."`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, label: 'You' },
      senderId: currentUserId,
      type: 'sent',
      status: 'sent',
      parentId: message.id,
      updatable: true,
      deletable: true
    };
    
    setMessages(prev => [...prev, replyMessage]);
  };

  const handleEdit = (messageId: string, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, content: newContent } : msg
    ));
  };

  const handleDelete = (messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  const handleMessageInfo = (messageId: string) => {
    console.log('Message info for:', messageId);
  };

  // Add a test message function for demo purposes
  const addTestMessage = () => {
    const testMessage: Message = {
      id: `msg-${Date.now()}`,
      content: 'Hello! This is a test message.',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString(),
      sender: { id: currentUserId, label: 'You' },
      senderId: currentUserId,
      type: 'sent',
      status: 'sent',
      updatable: true,
      deletable: true
    };
    
    setMessages(prev => [...prev, testMessage]);
  };

  return (
    <div className="h-screen max-w-md mx-auto bg-white border border-gray-300 rounded-lg overflow-hidden">
      <div className="bg-gray-600 text-white p-4 text-center font-medium flex items-center justify-between">
        <span>Clean Chat Demo</span>
        <button
          onClick={addTestMessage}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-800 rounded text-xs transition-colors"
        >
          Add Test Message
        </button>
      </div>
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        onReaction={handleReaction}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onMessageInfo={handleMessageInfo}
      />
    </div>
  );
}