"use client";
import { useEffect, useState, useCallback } from "react";
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
  
  // Use the useChat hook to get global chat state and functions
  const { 
    chats, 
    subscribeToConversation,
    unsubscribeFromConversation,
    setActiveConversation,
    loadMessages,
    messages,
    currentUserId,
    activeConversationId,
    loading,
    error,
    loadChats
  } = useChat();

  // FIXED: Initialize chats only once on component mount
  useEffect(() => {
    if (!isInitialized && currentUserId) {
      console.log('[ChatLayout] Initializing chat layout for user:', currentUserId);
      loadChats().finally(() => {
        setIsInitialized(true);
      });
    }
  }, [loadChats, currentUserId, isInitialized]);

  // FIXED: Subscribe to real-time updates for ALL chats with proper cleanup
  useEffect(() => {
    if (!isInitialized || chats.length === 0) {
      return;
    }
    
    console.log(`[ChatLayout] Setting up real-time subscriptions for ${chats.length} chats`);
    
    const activeSubscriptions = new Set<string>();
    
    const subscribeToAllChats = () => {
      chats.forEach(chat => {
        const chatId = String(chat.id);
        
        if (activeSubscriptions.has(chatId)) {
          return;
        }
        
        try {
          console.log(`[ChatLayout] Subscribing to chat: ${chatId}`);
          subscribeToConversation(chatId);
          activeSubscriptions.add(chatId);
        } catch (error) {
          console.error(`[ChatLayout] Error subscribing to chat ${chatId}:`, error);
        }
      });
    };
    
    subscribeToAllChats();
    
    return () => {
      console.log('[ChatLayout] Cleaning up chat subscriptions');
      activeSubscriptions.forEach(chatId => {
        try {
          unsubscribeFromConversation(chatId);
        } catch (error) {
          console.error(`[ChatLayout] Error unsubscribing from chat ${chatId}:`, error);
        }
      });
      activeSubscriptions.clear();
    };
  }, [chats, subscribeToConversation, unsubscribeFromConversation, isInitialized]);

  // FIXED: Handle active conversation management with proper cleanup
  useEffect(() => {
    const chatId = selectedChat ? String(selectedChat.id) : null;
    
    if (chatId && chatId !== activeConversationId) {
      console.log(`[ChatLayout] Setting active conversation: ${chatId}`);
      
      try {
        setActiveConversation(chatId);
        
        // Load messages if not already loaded
        const existingMessages = messages[chatId];
        if (!existingMessages || existingMessages.length === 0) {
          console.log(`[ChatLayout] Loading messages for conversation: ${chatId}`);
          loadMessages(chatId);
        }
      } catch (error) {
        console.error(`[ChatLayout] Error setting active conversation ${chatId}:`, error);
      }
    } else if (!chatId && activeConversationId) {
      console.log('[ChatLayout] Clearing active conversation');
      setActiveConversation(null);
    }
  }, [selectedChat, setActiveConversation, loadMessages, messages, activeConversationId]);

  // Handle chat selection from sidebar
  const handleChatSelect = useCallback((chat: Chat | null) => {
    console.log('[ChatLayout] Chat selected:', chat?.id || 'none');
    setSelectedChat(chat);
  }, []);

  // FIXED: Remove the manual chat update handler - let useChat manage all state
  const handleChatsUpdate = useCallback((updatedChats: Chat[]) => {
    console.log('[ChatLayout] Chats update notification received (handled by useChat hook)');
    // This is now a no-op since useChat handles all state management
  }, []);

  // FIXED: Handle search query changes with debouncing
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Show loading state while initializing
  if (!isInitialized && loading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing chat...</p>
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
              loadChats();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
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
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          onChatsUpdate={handleChatsUpdate}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatArea chat={selectedChat} />
        ) : ( 
          <WelcomeScreen />
        )}
      </div>
    </div>
  );
};