"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Paperclip, Smile, MoreVertical, Users, Phone, Video, Info, X, Download, File, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { MessageList } from "./MessageList";
import { useChat, Message } from "@/hooks/useChat";
import UserAvatar from "./UserAvatar";
import EmojiPicker from "./EmojiPicker";
import { MessageInfoPopup } from "./MessageInfoPopup";
import GroupInfoModal from "./GroupInfoModal";
import MentionInput from "./MentionInput";
import { Chat, uploadMessageUrls, getDownloadFiles, MessageFileInfo } from "@/app/services/chatService";

interface ChatAreaProps {
  chat: Chat;
}

interface FileUploadInfo {
  file: File;
  uploadUrl?: string;
  downloadUrl?: string;
  identifier: string;
  isUploading: boolean;
  uploadProgress: number;
  error?: string;
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
  const [selectedFiles, setSelectedFiles] = useState<FileUploadInfo[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    messages, 
    sendMessage, 
    loadMessages,
    subscribeToConversation,
    setActiveConversation,
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
    try { setActiveConversation(String(currentChat.id)); } catch {}
    console.log('[ChatArea] Subscribing to Firebase conversation', String(currentChat.id));
    const unsubscribe = subscribeToConversation(String(currentChat.id));
    return () => {
      console.log('[ChatArea] Unsubscribing from Firebase conversation', String(currentChat.id));
      try { unsubscribe && unsubscribe(); } catch {}
      try { setActiveConversation(null as any); } catch {}
    };
  }, [currentChat.id, subscribeToConversation]);

  // Also mark as read when window gains focus while this chat is open
  useEffect(() => {
    const onFocus = () => {
      console.log('[ChatArea] window focus, set active conversation', String(currentChat.id));
      try { setActiveConversation(String(currentChat.id)); } catch {}
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [currentChat.id, setActiveConversation]);

  // Upload files to get upload URLs
// Upload files to get upload URLs
const uploadFilesToServer = async (files: FileUploadInfo[]): Promise<MessageFileInfo[]> => {
  if (!files.length) return [];

  setIsUploadingFiles(true);
  const uploadedFiles: MessageFileInfo[] = [];

  try {
    // Step 1: Get upload URLs from API
    const uploadPayload = {
      conversationId: Number(currentChat.id),
      files: files.map(f => ({
        fileName: f.file.name,
        fileType: f.file.type || 'application/octet-stream',
        identifier: f.identifier
      }))
    };

    console.log('[ChatArea] Requesting upload URLs for files:', uploadPayload);
    const uploadUrlResponse = await uploadMessageUrls(uploadPayload);

    if (!uploadUrlResponse.isSuccess) {
      throw new Error(uploadUrlResponse.message || 'Failed to get upload URLs');
    }

    console.log('[ChatArea] Received upload URLs:', uploadUrlResponse.data);

    // Step 2: Upload each file to its respective upload URL
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadData = uploadUrlResponse.data.find(d => d.identifier === file.identifier);
      
      if (!uploadData) {
        console.error(`[ChatArea] No upload data found for file: ${file.identifier}`);
        continue;
      }

      // Update file status - use 'url' instead of 'uploadUrl'
      setSelectedFiles(prev => prev.map(f => 
        f.identifier === file.identifier 
          ? { ...f, isUploading: true, uploadUrl: uploadData.url, downloadUrl: uploadData.url } // Use url for both
          : f
      ));

      try {
        console.log(`[ChatArea] Uploading file ${file.file.name} to ${uploadData.url}`);
        
        // Upload file using PUT request to the signed URL
        const uploadResponse = await fetch(uploadData.url, {
          method: 'PUT',
          body: file.file,
          headers: {
            'Content-Type': file.file.type || 'application/octet-stream'
          }
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
        }

        console.log(`[ChatArea] Successfully uploaded file: ${file.file.name}`);

        // Add to uploaded files list - include all necessary data from response
        uploadedFiles.push({
          fileName: uploadData.fileName,
          fileType: file.file.type || 'application/octet-stream',
          // Include any additional fields that might be needed by the backend
          
        });

        // Update file status
        setSelectedFiles(prev => prev.map(f => 
          f.identifier === file.identifier 
            ? { ...f, isUploading: false, uploadProgress: 100 }
            : f
        ));

      }catch (uploadError) {
  console.error(`[ChatArea] Error uploading file ${file.file.name}:`, uploadError);
  
  // Handle unknown type properly
  const errorMessage = uploadError instanceof Error 
    ? uploadError.message 
    : 'Unknown upload error';
  
  setSelectedFiles(prev => prev.map(f => 
    f.identifier === file.identifier 
      ? { ...f, isUploading: false, error: errorMessage }
      : f
  ));
}
    }

  } catch (error) {
  console.error('[ChatArea] Error in file upload process:', error);
  
  // Handle unknown type properly
  const errorMessage = error instanceof Error 
    ? error.message 
    : 'Upload process failed';
  
  // Mark all files as failed
  setSelectedFiles(prev => prev.map(f => ({ 
    ...f, 
    isUploading: false, 
    error: errorMessage 
  })));
}finally {
    setIsUploadingFiles(false);
  }

  return uploadedFiles;
};

  const handleSendMessage = async () => {
    // Prevent sending if files are still uploading
    if (isUploadingFiles) {
      console.log('[ChatArea] Cannot send message while files are uploading');
      return;
    }

    if (message.trim() || selectedFiles.length > 0) {
      const content = message.trim();
      const mentions = extractMentions(content);
      
      try {
        let fileInfo: MessageFileInfo[] = [];
        
        // Upload files if any
        if (selectedFiles.length > 0) {
          console.log('[ChatArea] Uploading files before sending message...');
          fileInfo = await uploadFilesToServer(selectedFiles);
          
          // Check if any uploads failed
          const failedUploads = selectedFiles.filter(f => f.error);
          if (failedUploads.length > 0) {
            console.error('[ChatArea] Some files failed to upload:', failedUploads);
            alert(`Failed to upload ${failedUploads.length} file(s). Please try again.`);
            return;
          }
          
          console.log('[ChatArea] File info to pass to sendMessage:', fileInfo);
        }
        
        // Send message with file info if files were uploaded
        console.log('[ChatArea] Calling sendMessage with:', {
          chatId: String(chat.id),
          content,
          mentions,
          replyToId: replyTo?.id,
          fileInfo
        });
        
        await sendMessage(String(chat.id), content, mentions, replyTo?.id, fileInfo);
        
        setMessage("");
        setReplyTo(null);
        setSelectedFiles([]);
        
        // Auto-resize textarea
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      } catch (err) {
        console.error('[ChatArea] Error sending message:', err);
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
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const newFileInfos: FileUploadInfo[] = files.map(file => ({
        file,
        identifier: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        isUploading: false,
        uploadProgress: 0
      }));
      
      setSelectedFiles(prev => [...prev, ...newFileInfos]);
      console.log('[ChatArea] Selected files:', newFileInfos);
    }
    
    // Reset the input value so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (identifier: string) => {
    setSelectedFiles(prev => prev.filter(f => f.identifier !== identifier));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  // Download files for a message
  const handleDownloadFiles = async (messageId: string) => {
    try {
      console.log(`[ChatArea] Downloading files for message: ${messageId}`);
      const response = await getDownloadFiles(messageId);
      
      if (response.isSuccess && response.data.length > 0) {
        console.log(`[ChatArea] Found ${response.data.length} files to download`);
        
        // Download each file
        for (const file of response.data) {
          try {
            const link = document.createElement('a');
            link.href = file.downloadUrl;
            link.download = file.fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`[ChatArea] Downloaded file: ${file.fileName}`);
          } catch (downloadError) {
            console.error(`[ChatArea] Error downloading file ${file.fileName}:`, downloadError);
          }
        }
      } else {
        console.log(`[ChatArea] No files found for message: ${messageId}`);
      }
    } catch (error) {
      console.error(`[ChatArea] Error getting download files for message ${messageId}:`, error);
    }
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

  const fetchMessageReceipts = async (messageId: string) => {
    try {
      const receipts = await getMessageReceiptsById(messageId);
      return receipts || [];
    } catch (error) {
      console.error('Error fetching message receipts:', error);
      return [];
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const getLastSeenText = () => {
    if (currentChat.conversationType === 'private') {
      const participant = currentChat.participants[0];
      return 'last seen recently';
    }
    return `${currentChat.participants.length} participants`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 relative">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept="*/*"
      />

      {/* Chat Header - Fixed */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          {currentChat.conversationType.toLowerCase() === 'private' ? (
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
            <p className="text-sm text-gray-600">{getLastSeenText()}</p>
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
          onDownloadFiles={handleDownloadFiles}
        />
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-3">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-gray-600 font-medium">
              Selected Files ({selectedFiles.length})
              {isUploadingFiles && (
                <span className="ml-2 text-blue-600 font-normal">
                  - Uploading files...
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {selectedFiles.map((fileInfo) => (
                <div
                  key={fileInfo.identifier}
                  className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 text-sm relative"
                >
                  <File size={16} className="text-gray-500 flex-shrink-0" />
                  <span className="truncate max-w-xs">{fileInfo.file.name}</span>
                  <span className="text-gray-500">({formatFileSize(fileInfo.file.size)})</span>
                  
                  {/* Upload status indicators */}
                  {fileInfo.isUploading && (
                    <div className="absolute inset-0 bg-blue-100 bg-opacity-75 flex items-center justify-center rounded-lg">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className="text-blue-600 animate-pulse" />
                        <span className="text-xs text-blue-600">Uploading...</span>
                      </div>
                    </div>
                  )}
                  
                  {fileInfo.error && (
                    <div className="absolute inset-0 bg-red-100 bg-opacity-75 flex items-center justify-center rounded-lg">
                      <span className="text-xs text-red-600">Failed</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => removeFile(fileInfo.identifier)}
                    className="text-gray-500 hover:text-red-500 ml-1 flex-shrink-0"
                    disabled={fileInfo.isUploading}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
        {/* Message Input - Exact replica */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4 shadow-sm rounded-b-lg">
          <div className="flex items-center gap-3">
            {/* Attachment Button */}
            <button 
              onClick={handleFileSelect}
              disabled={isUploadingFiles}
              className={`p-2.5 rounded-full flex-shrink-0 transition-colors ${
                isUploadingFiles 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Paperclip className="h-5 w-5" />
            </button>
           
            {/* Text Input Container */}
            <div className="flex-1 relative">
              {currentChat.conversationType.toLowerCase() === 'group' ? (
                <MentionInput
                  value={message}
                  onChange={setMessage}
                  onKeyPress={handleKeyPress}
                  users={currentChat.participants.map(p => ({
                    id: p.id,
                    name: p.label,
                    avatar: p.avatar,
                    status: p.status || 'offline'
                  }))}
                  placeholder="Type a message..."
                  onEmojiClick={() => setShowEmojiPicker(!showEmojiPicker)}
                />
              ) : (
                <>
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
                </>
              )}
            </div>
           
            {/* Send Button */}
            <button
              onClick={handleSendMessage}
              disabled={(!message.trim() && selectedFiles.length === 0) || isUploadingFiles}
              className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed p-3 rounded-full min-w-[44px] min-h-[44px] flex-shrink-0 transition-colors duration-200 flex items-center justify-center shadow-sm"
            >
              {isUploadingFiles ? (
                <Clock className="h-4 w-4 text-white animate-pulse" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
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