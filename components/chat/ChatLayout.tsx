"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { MessageCircle, Lock } from "lucide-react";
import { ChatArea } from "./ChatArea";
import Sidebar from "./Sidebar";
import { Chat, ChatParticipant } from "@/app/services/chatService";
import { useChat } from "@/hooks/useChat";

// Default welcome screen component
const WelcomeScreen = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 px-8">
      <div className="text-center max-w-md">
        {/* Chat illustration */}
        <div className="relative mb-6">
          <div className="w-40 h-40 mx-auto bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-xl">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md">
              <MessageCircle className="h-10 w-10 text-blue-500" />
            </div>
          </div>
          
          {/* Floating chat bubbles */}
          <div className="absolute top-4 left-6 w-12 h-8 bg-white rounded-2xl rounded-bl-sm shadow-md flex items-center justify-center transform -rotate-12">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-1"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-1"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
          </div>
          
          <div className="absolute top-10 right-4 w-16 h-8 bg-blue-500 rounded-2xl rounded-br-sm shadow-md flex items-center justify-center transform rotate-12">
            <div className="w-1.5 h-1.5 bg-white rounded-full mr-1"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full mr-1"></div>
            <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
          </div>
          
          <div className="absolute bottom-6 left-8 w-14 h-8 bg-white rounded-2xl rounded-bl-sm shadow-md flex items-center justify-center transform rotate-6">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full mr-1"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Welcome text */}
        <h1 className="text-4xl font-light text-gray-800 mb-4">
          Chat Module
        </h1>
        
        <div className="space-y-4 text-gray-600">
          <div className="flex items-center justify-center gap-2 text-sm">
            <Lock className="h-4 w-4 text-blue-600" />
            <span>Secure messaging</span>
          </div>
          
          <p className="text-sm leading-relaxed">
            Send and receive messages with your team and contacts.
          </p>
          
          <p className="text-sm leading-relaxed">
            Connect with multiple users through private and group conversations.
          </p>
        </div>

        {/* Call to action */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 bg-blue-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageCircle className="h-3 w-3 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm text-blue-800 font-medium mb-1">
                Start messaging
              </p>
              <p className="text-xs text-blue-700">
                Select a chat from the sidebar to start messaging, or create a new conversation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatLayout = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [initTimeout, setInitTimeout] = useState(false);
  const initializingRef = useRef(false);
  
  // Use the useChat hook to get global chat state and functions
  const { 
    chats,
    users,
    messages,
    currentUserId,
    activeConversationId,
    loading,
    error,
    isLoadingChats,
    isLoadingUsers,
    totalUnreadCount,
    
    // Core initialization functions
    loadUsers,
    loadMyConversations,
    initializeUserNotifications,
    loadConversationMessages,
    setActiveConversation,
    createChat,
    deleteChat,
    searchChats,
  } = useChat();

  // Initialize the chat module when component mounts
  useEffect(() => {
    const initializeChatModule = async () => {
      if (initializingRef.current) {
        console.log('[ChatLayout] Already initializing, skipping...');
        return;
      }

      if (isInitialized) {
        console.log('[ChatLayout] Already initialized, skipping...');
        return;
      }

      if (!currentUserId) {
        console.log('[ChatLayout] No currentUserId, skipping initialization');
        return;
      }

      console.log('[ChatLayout] Initializing chat module for user:', currentUserId);
      initializingRef.current = true;
      
      try {
        // Step 1: Load users
        console.log('[ChatLayout] Step 1: Loading users...');
        await loadUsers();
        
        // Step 2: Load my conversations
        console.log('[ChatLayout] Step 2: Loading conversations...');
        await loadMyConversations();
        
        // Step 3: Initialize notifications
        console.log('[ChatLayout] Step 3: Initializing user notifications...');
        initializeUserNotifications();
        
        // Mark as initialized only after all steps complete
        setIsInitialized(true);
        console.log('[ChatLayout] Chat module initialization complete');
        
      } catch (error) {
        console.error('[ChatLayout] Error initializing chat module:', error);
        setIsInitialized(false);
      } finally {
        initializingRef.current = false;
      }
    };

    initializeChatModule();
  }, [currentUserId, loadUsers, loadMyConversations, initializeUserNotifications]);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInitialized) {
        console.log('[ChatLayout] Initialization timeout reached, forcing display');
        setInitTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [isInitialized]);

  // Handle chat selection from sidebar
  const handleChatSelect = useCallback((chat: Chat | null) => {
    console.log('[ChatLayout] Chat selected:', chat?.id || 'none');
    
    if (!chat) {
      setSelectedChat(null);
      setActiveConversation(null);
      return;
    }

    const chatId = String(chat.id);
    
    // Update local state first
    setSelectedChat(chat);
    
    // Then set active conversation
    setActiveConversation(chatId);
    
    console.log(`[ChatLayout] Active conversation set to: ${chatId}`);
  }, [setActiveConversation]);

  // Handle creating a new chat
  const handleCreateChat = useCallback(async (user: ChatParticipant) => {
    // Check for existing private chat more reliably
    const existingChat = chats.find((chat: Chat) => 
      chat.conversationType === 'private' && 
      chat.participants.some((p: ChatParticipant) => p.id === user.id)
    );

    if (existingChat) {
      console.log('[ChatLayout] Existing chat found:', existingChat.id);
      handleChatSelect(existingChat);
      return existingChat;
    } else {
      try {
        console.log('[ChatLayout] Creating new chat with user:', user.id);
        const newChat = await createChat(user.label, [user.id], false);
        if (newChat) {
          console.log('[ChatLayout] New chat created:', newChat.id);
          // Refresh conversations to get the updated list
          await loadMyConversations();
          // Select the newly created chat after a brief delay to ensure state updates
          setTimeout(() => {
            handleChatSelect(newChat);
          }, 100);
        }
        return newChat;
      } catch (err) {
        console.error('[ChatLayout] Failed to create chat:', err);
        return null;
      }
    }
  }, [chats, createChat, handleChatSelect, loadMyConversations]);

  // Handle deleting a chat
  const handleDeleteChat = useCallback(async (chatId: string) => {
    try {
      console.log('[ChatLayout] Deleting chat:', chatId);
      await deleteChat(chatId);
      
      // Refresh conversations to get the updated list
      await loadMyConversations();
      
      // If the deleted chat was selected, clear selection
      if (String(selectedChat?.id) === String(chatId)) {
        const remainingChats = chats.filter(c => String(c.id) !== String(chatId));
        if (remainingChats.length > 0) {
          handleChatSelect(remainingChats[0]);
        } else {
          handleChatSelect(null);
        }
      }
      
      console.log('[ChatLayout] Chat deleted successfully');
    } catch (err) {
      console.error('[ChatLayout] Failed to delete chat:', err);
      throw err; // Re-throw to allow the sidebar to handle the error
    }
  }, [deleteChat, selectedChat, chats, handleChatSelect, loadMyConversations]);

  // Handle group save (create or edit)
  // In your ChatLayout component
const handleGroupSave = useCallback(async (
    groupData: { name: string; participants: ChatParticipant[] },
    mode: 'create' | 'edit',
    selectedChatForEdit?: Chat | null
) => {
    try {
        console.log(`[ChatLayout] ${mode === 'create' ? 'Creating' : 'Editing'} group:`, groupData.name);
        
        if (mode === 'create') {
            // Enhanced duplicate check before creating
            const participantIds = groupData.participants.map(p => p.id);
            const existingGroup = chats.find(chat => 
                chat.conversationType === 'group' &&
                chat.name === groupData.name &&
                chat.participants.length === participantIds.length &&
                chat.participants.every(p => participantIds.includes(p.id))
            );
            
            if (existingGroup) {
                console.log('[ChatLayout] Group already exists, selecting existing:', existingGroup.id);
                handleChatSelect(existingGroup);
                return;
            }
            
            const newGroup = await createChat(groupData.name, participantIds, true);
            if (newGroup) {
                // Small delay to ensure backend processing
                await new Promise(resolve => setTimeout(resolve, 200));
                // Refresh conversations to get the updated list
                await loadMyConversations();
                // Select the newly created group
                handleChatSelect(newGroup);
            }
        } else if (selectedChatForEdit) {
            // For editing, refresh conversations after edit
            await loadMyConversations();
            // Keep the same chat selected but with updated data
            const updatedChat = chats.find(c => c.id === selectedChatForEdit.id);
            if (updatedChat) {
                handleChatSelect(updatedChat);
            }
        }
        
        console.log('[ChatLayout] Group operation completed successfully');
    } catch (err) {
        console.error('[ChatLayout] Failed to save group:', err);
        throw err;
    }
}, [createChat, chats, handleChatSelect, loadMyConversations]);

  // Handle search query changes
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Update selected chat when chats change (to keep it in sync)
  useEffect(() => {
    if (selectedChat) {
      const updatedChat = chats.find(chat => chat.id.toString() === selectedChat.id.toString());
      if (updatedChat && updatedChat !== selectedChat) {
        console.log('[ChatLayout] Updating selected chat with fresh data');
        setSelectedChat(updatedChat);
      }
    }
  }, [chats, selectedChat]);

  useEffect(() => {
    return () => {
      console.log('[ChatLayout] Cleaning up...');
      setSelectedChat(null);
    };
  }, []);

  // Show loading state while initializing (with timeout fallback)
  if (!isInitialized && !initTimeout && (loading || isLoadingChats || isLoadingUsers || initializingRef.current)) {
    console.log('[ChatLayout] Showing loading state:', {
      isInitialized,
      loading,
      isLoadingChats,
      isLoadingUsers,
      initializing: initializingRef.current
    });
    
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing chat module...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          {/* Debug info - remove in production */}
          <div className="text-xs text-gray-400 mt-4 space-y-1">
            <div>Initialized: {isInitialized ? 'Yes' : 'No'}</div>
            <div>Loading: {loading ? 'Yes' : 'No'}</div>
            <div>Loading Chats: {isLoadingChats ? 'Yes' : 'No'}</div>
            <div>Loading Users: {isLoadingUsers ? 'Yes' : 'No'}</div>
            <div>Current User: {currentUserId || 'None'}</div>
            <button
              onClick={() => {
                console.log('[ChatLayout] Force proceeding...');
                setIsInitialized(true);
                setInitTimeout(true);
              }}
              className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              Force Proceed
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if initialization failed
  if (error && !isInitialized) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => {
              setIsInitialized(false);
              initializingRef.current = false;
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry Initialization
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 bg-chat-sidebar border-r border-chat-border flex flex-col">
        <Sidebar 
          chats={chats}
          users={users}
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          loading={isLoadingChats}
          error={error}
          totalUnreadCount={totalUnreadCount}
          activeConversationId={activeConversationId}
          onCreateChat={handleCreateChat}
          onDeleteChat={handleDeleteChat}
          onGroupSave={handleGroupSave}
          searchChats={searchChats}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatArea 
            chat={selectedChat} 
            chatId={selectedChat.id.toString()}
          />
        ) : ( 
          <WelcomeScreen />
        )}
      </div>
    </div>
  );
};