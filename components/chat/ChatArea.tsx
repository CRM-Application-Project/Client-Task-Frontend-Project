"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Paperclip, Smile, MoreVertical, Users, Phone, Video, Info, X, Download, File, Clock, CheckCircle, AlertCircle } from "lucide-react";
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
  chatId: string; // Added explicit chatId prop from sidebar
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

export const ChatArea = ({ chat, chatId }: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [currentChat, setCurrentChat] = useState<Chat>(chat);
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
    loadConversationMessages,
    initializeConversationSubscription,
    cleanupConversationSubscription,
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
    changeParticipantRoleInGroup,
    activeConversationId,
  } = useChat();

  console.log('[ChatArea] Rendered with chat:', chat.id, 'chatId:', chatId, 'activeConversationId:', activeConversationId);

  // Get messages for current chat
  const chatMessages = messages[chatId] || [];
const debugMessageLoading = useCallback(() => {
  console.log('[DEBUG] Current chat messages:', chatMessages.length);
  console.log('[DEBUG] All messages state:', messages);
  console.log('[DEBUG] Active conversation ID:', activeConversationId);
  console.log('[DEBUG] Current chat ID:', chatId);
}, [chatMessages, messages, activeConversationId, chatId]);

  // Keep local currentChat in sync with prop
  useEffect(() => {
    setCurrentChat(chat);
  }, [chat]);

  // Sync with global chats if they update
  useEffect(() => {
    const updated = chats.find(c => String(c.id) === String(currentChat.id));
    if (updated) {
      setCurrentChat(updated);
    }
  }, [chats, currentChat.id]);

  // Initialize conversation when chatId changes
useEffect(() => {
  if (chatId) {
    console.log(`[ChatArea] Setting active conversation to: ${chatId}`);
    setActiveConversation(chatId);
  }
  
  return () => {
    // No cleanup needed here as it's handled in useChat
  };
}, [chatId, setActiveConversation]); 

  // Additional message loading if not already loaded
  useEffect(() => {
    if (chatId && (!chatMessages || chatMessages.length === 0)) {
      console.log(`[ChatArea] Loading messages for conversation: ${chatId}`);
      loadConversationMessages(chatId);
    }
  }, [chatId, chatMessages, loadConversationMessages]);

  // Upload files to server
 const uploadFilesToServer = async (files: FileUploadInfo[]): Promise<MessageFileInfo[]> => {
  if (!files.length) return [];

  console.log('[ChatArea] Starting file upload process for', files.length, 'files');
  const uploadedFiles: MessageFileInfo[] = [];

  try {
    const uploadPayload = {
      conversationId: Number(currentChat.id),
      files: files.map(f => ({
        fileName: f.file.name,
        fileType: f.file.type || 'application/octet-stream',
        identifier: f.identifier
      }))
    };

    console.log('[ChatArea] Requesting upload URLs:', uploadPayload);
    const uploadUrlResponse = await uploadMessageUrls(uploadPayload);

    if (!uploadUrlResponse.isSuccess) {
      console.error('[ChatArea] Failed to get upload URLs:', uploadUrlResponse.message);
      throw new Error(uploadUrlResponse.message || 'Failed to get upload URLs');
    }

    console.log('[ChatArea] Received upload URLs:', uploadUrlResponse.data);

    // Upload each file
    for (const file of files) {
      const uploadData = uploadUrlResponse.data.find(d => d.identifier === file.identifier);
      
      if (!uploadData) {
        console.error(`[ChatArea] No upload data found for file: ${file.identifier}`);
        setSelectedFiles(prev => prev.map(f => 
          f.identifier === file.identifier 
            ? { ...f, error: 'No upload URL provided' }
            : f
        ));
        continue;
      }

      try {
        console.log(`[ChatArea] Uploading file: ${file.file.name}`);
        
        // Update progress
        setSelectedFiles(prev => prev.map(f => 
          f.identifier === file.identifier 
            ? { ...f, isUploading: true, uploadProgress: 10, uploadUrl: uploadData.url }
            : f
        ));

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setSelectedFiles(prev => prev.map(f => 
            f.identifier === file.identifier 
              ? { ...f, uploadProgress: Math.min(f.uploadProgress + 15, 90) }
              : f
          ));
        }, 300);
        
        // Upload file
        const uploadResponse = await fetch(uploadData.url, {
          method: 'PUT',
          body: file.file,
          headers: {
            'Content-Type': file.file.type || 'application/octet-stream'
          }
        });

        clearInterval(progressInterval);

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }

        console.log(`[ChatArea] Successfully uploaded: ${file.file.name}`);

        // Add to successful uploads
        uploadedFiles.push({
          fileName: uploadData.fileName,
          fileType: file.file.type || 'application/octet-stream',
        });

        // Mark as complete
        setSelectedFiles(prev => prev.map(f => 
          f.identifier === file.identifier 
            ? { ...f, isUploading: false, uploadProgress: 100 }
            : f
        ));

      } catch (uploadError) {
        console.error(`[ChatArea] Error uploading ${file.file.name}:`, uploadError);
        
        setSelectedFiles(prev => prev.map(f => 
          f.identifier === file.identifier 
            ? { 
                ...f, 
                isUploading: false, 
                uploadProgress: 0, 
                error: uploadError instanceof Error ? uploadError.message : 'Upload failed' 
              }
            : f
        ));
      }
    }

    console.log('[ChatArea] File upload process completed. Successful uploads:', uploadedFiles.length);
    return uploadedFiles;

  } catch (error) {
    console.error('[ChatArea] Error in upload process:', error);
    
    // Mark all files as failed
    setSelectedFiles(prev => prev.map(f => ({ 
      ...f, 
      isUploading: false, 
      uploadProgress: 0,
      error: error instanceof Error ? error.message : 'Upload process failed'
    })));
    
    throw error;
  }
};

const handleSendMessage = async () => {
  if (isUploadingFiles) {
    console.log('[ChatArea] Cannot send message while files are uploading');
    return;
  }

  const content = message.trim();
  const hasFiles = selectedFiles.length > 0;
  
  if (!content && !hasFiles) {
    console.log('[ChatArea] No content or files to send');
    return;
  }

  const mentions = extractMentions(content);
  
  try {
    let fileInfo: MessageFileInfo[] = [];
    
    if (hasFiles) {
      console.log('[ChatArea] Uploading files before sending message...');
      setIsUploadingFiles(true);
      
      fileInfo = await uploadFilesToServer(selectedFiles);
      
      const failedUploads = selectedFiles.filter(f => f.error);
      if (failedUploads.length > 0) {
        console.error('[ChatArea] Some files failed to upload:', failedUploads);
        alert(`Failed to upload ${failedUploads.length} file(s). Please try again.`);
        return;
      }
      
      console.log('[ChatArea] All files uploaded successfully:', fileInfo);
    }
    
    console.log('[ChatArea] Sending message with data:', {
      chatId,
      content,
      mentions,
      replyToId: replyTo?.id,
      fileInfo,
      hasAttachments: fileInfo.length > 0
    });
    
    await sendMessage(chatId, content, mentions, replyTo?.id, fileInfo);
    
    // For messages with attachments, force reload after a delay
    if (hasFiles) {
      console.log('[ChatArea] Message with attachments sent, scheduling message reload...');
      setTimeout(async () => {
        console.log('[ChatArea] Reloading messages after file upload...');
        await loadConversationMessages(chatId, true); // Force reload
        debugMessageLoading(); // Debug current state
      }, 2000); // Increased delay to ensure backend processing
    }
    
    // Clear form
    setMessage("");
    setReplyTo(null);
    setSelectedFiles([]);
    setIsUploadingFiles(false);
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    console.log('[ChatArea] Message sent successfully, form cleared');
    
  } catch (err) {
    console.error('[ChatArea] Error sending message:', err);
    setIsUploadingFiles(false);
    
    // Show error to user
    alert(`Failed to send message: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
useEffect(() => {
  console.log('[ChatArea] Messages updated for chatId:', chatId, 'count:', chatMessages.length);
  if (chatMessages.length === 0 && chatId) {
    console.log('[ChatArea] No messages found, current state:', {
      chatId,
      activeConversationId,
      allMessages: Object.keys(messages),
      
    });
  }
}, [chatMessages, chatId, activeConversationId, messages]);
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
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

  const handleDownloadFiles = async (messageId: string) => {
    try {
      console.log(`[ChatArea] Downloading files for message: ${messageId}`);
      const response = await getDownloadFiles(messageId);
      
      if (response.isSuccess && response.data.length > 0) {
        console.log(`[ChatArea] Found ${response.data.length} files to download`);
        
        for (const file of response.data) {
          try {
            const fileResponse = await fetch(file.url);
            if (!fileResponse.ok) {
              throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
            }
            
            const blob = await fileResponse.blob();
            const link = document.createElement('a');
            const blobUrl = window.URL.createObjectURL(blob);
            
            link.href = blobUrl;
            link.download = file.fileName;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            
            console.log(`[ChatArea] Downloaded file: ${file.fileName}`);
          } catch (downloadError) {
            console.error(`[ChatArea] Error downloading file ${file.fileName}:`, downloadError);
            window.open(file.url, '_blank');
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
      
      const userReaction = message.reactions?.find(reaction => 
        reaction.users && reaction.users.includes(currentUserId)
      );
      
      if (userReaction) {
        if (userReaction.emoji === emoji) {
          await removeMessageReaction(messageId, userReaction.emoji);
          return;
        } else {
          await removeMessageReaction(messageId, userReaction.emoji);
        }
      }
      
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

  const getOverallProgress = () => {
    if (selectedFiles.length === 0) return 0;
    const totalProgress = selectedFiles.reduce((sum, file) => sum + file.uploadProgress, 0);
    return Math.round(totalProgress / selectedFiles.length);
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

      {/* Chat Header */}
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

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={chatMessages}
          currentUserId={currentUserId}
          onReaction={handleReaction}
          onReply={handleReply}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          onMessageInfo={handleMessageInfo}
          onDownloadFiles={handleDownloadFiles}
          isGroupChat={currentChat.conversationType?.toLowerCase() === 'group'}
        />
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 font-medium">
                Selected Files ({selectedFiles.length})
              </p>
              {isUploadingFiles && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-600 font-medium">
                    Uploading... {getOverallProgress()}%
                  </span>
                  <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${getOverallProgress()}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {selectedFiles.map((fileInfo) => (
                <div
                  key={fileInfo.identifier}
                  className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 text-sm border border-gray-200"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File size={16} className="text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{fileInfo.file.name}</span>
                        <span className="text-gray-500 text-xs flex-shrink-0">
                          ({formatFileSize(fileInfo.file.size)})
                        </span>
                      </div>
                      
                      {fileInfo.isUploading && (
                        <div className="mt-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${fileInfo.uploadProgress}%` }}
                              />
                            </div>
                            <span className="text-xs text-blue-600 font-medium w-8 text-right">
                              {fileInfo.uploadProgress}%
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {!fileInfo.isUploading && fileInfo.uploadProgress === 100 && !fileInfo.error && (
                        <div className="mt-1 flex items-center gap-1">
                          <CheckCircle size={12} className="text-green-600" />
                          <span className="text-xs text-green-600">Upload complete</span>
                        </div>
                      )}
                      
                      {fileInfo.error && (
                        <div className="mt-1 flex items-center gap-1">
                          <AlertCircle size={12} className="text-red-600" />
                          <span className="text-xs text-red-600">Upload failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeFile(fileInfo.identifier)}
                    className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors flex-shrink-0"
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

      {/* Reply Preview */}
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

      {/* Message Input */}
      <div className="w-full max-w-[80vw] mx-auto bg-gray-50">
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
                    style={{ paddingRight: '48px' }}
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

      {/* Emoji Picker */}
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