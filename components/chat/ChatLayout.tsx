"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { MessageCircle, Lock } from "lucide-react";
import { ChatArea } from "./ChatArea";
import Sidebar from "./Sidebar";
import { Chat } from "@/app/services/chatService";
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
  } = useChat();

  // Initialize the chat module when component mounts
  useEffect(() => {
    const initializeChatModule = async () => {
      if (isInitialized || !currentUserId || initializingRef.current) {
        return;
      }

      console.log('[ChatLayout] Initializing chat module for user:', currentUserId);
      initializingRef.current = true;
      
      try {
        setIsInitialized(true);
        
        // Step 1: Load users
        console.log('[ChatLayout] Step 1: Loading users...');
        await loadUsers();
        
        // Step 2: Load my conversations
        console.log('[ChatLayout] Step 2: Loading conversations...');
        await loadMyConversations();
        
        // Step 3: Initialize notifications
        console.log('[ChatLayout] Step 3: Initializing user notifications...');
        initializeUserNotifications();
        
        console.log('[ChatLayout] Chat module initialization complete');
        
      } catch (error) {
        console.error('[ChatLayout] Error initializing chat module:', error);
        setIsInitialized(false);
        initializingRef.current = false;
      } finally {
        initializingRef.current = false;
      }
    };

    initializeChatModule();
  }, [currentUserId, isInitialized, loadUsers, loadMyConversations, initializeUserNotifications]);

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


  // Handle search query changes
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Update selected chat when chats change (to keep it in sync)
 useEffect(() => {
    if (selectedChat) {
      const updatedChat = chats.find(chat => chat.id.toString() === selectedChat.id.toString());
      if (updatedChat && updatedChat.id !== selectedChat.id) {
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

  // Show loading state while initializing
 if (!isInitialized && (loading || isLoadingChats || isLoadingUsers)) {
  return (
    <div className="flex h-screen bg-background items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Initializing chat module...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
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