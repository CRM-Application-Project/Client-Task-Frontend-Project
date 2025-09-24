"use client";
import { useEffect, useState } from "react";
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
  
  // Use the useChat hook to get global chat state and functions
  const { 
    chats, 
    subscribeToConversation,
    setActiveConversation,
    loadMessages,
    messages,
    currentUserId,
    activeConversationId,
    loading,
    error,
    loadChats
  } = useChat();

  // Load chats on component mount
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // FIXED: Subscribe to real-time updates for ALL chats when they change
  useEffect(() => {
    if (chats.length === 0) return;
    
    console.log('[ChatLayout] Subscribing to all conversations for real-time updates');
    
    const unsubscribeCallbacks: (() => void)[] = [];
    const subscribedChatIds = new Set<string>();
    
    chats.forEach(chat => {
      const chatId = String(chat.id);
      
      if (subscribedChatIds.has(chatId)) {
        return;
      }
      
      subscribedChatIds.add(chatId);
      
      try {
        const unsubscribe = subscribeToConversation(chatId);
        if (unsubscribe) {
          unsubscribeCallbacks.push(unsubscribe);
        }
      } catch (error) {
        console.error(`[ChatLayout] Error subscribing to chat ${chatId}:`, error);
      }
    });
    
    return () => {
      console.log('[ChatLayout] Unsubscribing from all conversations');
      unsubscribeCallbacks.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('[ChatLayout] Error unsubscribing:', error);
        }
      });
    };
  }, [chats, subscribeToConversation]);

  // FIXED: Set active conversation when a chat is selected
  useEffect(() => {
    if (selectedChat) {
      console.log('[ChatLayout] Setting active conversation:', selectedChat.id);
      try {
        setActiveConversation(String(selectedChat.id));
        // Only load messages if we don't already have them or they're empty
        const existingMessages = messages[String(selectedChat.id)];
        if (!existingMessages || existingMessages.length === 0) {
          loadMessages(String(selectedChat.id));
        }
      } catch (error) {
        console.error('[ChatLayout] Error setting active conversation:', error);
      }
    } else {
      console.log('[ChatLayout] No chat selected, clearing active conversation');
      try {
        setActiveConversation(null);
      } catch (error) {
        console.error('[ChatLayout] Error clearing active conversation:', error);
      }
    }
  }, [selectedChat, setActiveConversation, loadMessages, messages]);

  // Handle chat selection from sidebar
  const handleChatSelect = (chat: Chat) => {
    console.log('[ChatLayout] Chat selected:', chat);
    setSelectedChat(chat);
  };

  // FIXED: Remove the manual chat update handler - let useChat manage state
  const handleChatsUpdate = (updatedChats: Chat[]) => {
    // This is now a no-op - useChat handles all state management
    console.log('[ChatLayout] Chats update notification received (handled by useChat)');
  };

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
          onSearchChange={setSearchQuery}
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