"use client"
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/chat/Sidebar';
import { Chat } from '../services/chatService';
import { ChatArea } from '@/components/chat/ChatArea';

// In-memory storage for selected chat (Claude.ai artifacts compatible)
let persistedChatId: string | null = null;

const ChatModule: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [restorationAttempted, setRestorationAttempted] = useState(false);

  // Function to restore selected chat from memory
  const restoreSelectedChat = useCallback((chatsArray: Chat[]) => {
    if (restorationAttempted || chatsArray.length === 0) return false;
    
    console.log('Attempting to restore chat ID:', persistedChatId);
    console.log('Available chats:', chatsArray.map(c => ({ id: c.id, name: c.name })));
    
    if (persistedChatId) {
      const chat = chatsArray.find(c => String(c.id) === String(persistedChatId));
      if (chat) {
        console.log('Successfully restored chat:', chat.name);
        setSelectedChat(chat);
        setRestorationAttempted(true);
        return true;
      } else {
        console.log('Saved chat not found, clearing persisted data');
        persistedChatId = null;
      }
    }
    
    setRestorationAttempted(true);
    return false;
  }, [restorationAttempted]);

  // Save selected chat to memory
  const saveSelectedChat = useCallback((chat: Chat | null) => {
    if (chat) {
      persistedChatId = String(chat.id);
      console.log('Saved chat to memory:', chat.id);
    } else {
      persistedChatId = null;
      console.log('Cleared chat from memory');
    }
  }, []);

  const handleChatSelect = (chat: Chat) => {
    console.log('Selecting chat:', chat.name);
    setSelectedChat(chat);
    saveSelectedChat(chat);
    
    // Mark chat as read - this could be enhanced with an API call
    setChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unreadCount: 0 } : c
    ));
  };

  const handleChatsUpdate = useCallback((updatedChats: Chat[]) => {
    console.log('Chats updated, count:', updatedChats.length);
    setChats(updatedChats);
    
    // Mark chats as loaded only once
    if (!chatsLoaded) {
      setChatsLoaded(true);
    }
    
    // If we have a selected chat, update it with the latest data
    if (selectedChat) {
      const updatedSelectedChat = updatedChats.find(c => String(c.id) === String(selectedChat.id));
      if (updatedSelectedChat) {
        setSelectedChat(updatedSelectedChat);
      } else {
        // Selected chat was deleted, clear selection
        console.log('Selected chat was deleted, clearing selection');
        setSelectedChat(null);
        persistedChatId = null;
        setRestorationAttempted(true);
      }
    }
  }, [selectedChat, chatsLoaded]);

  // Single effect to handle chat restoration after chats are loaded
  useEffect(() => {
    if (chatsLoaded && chats.length > 0 && !selectedChat && !restorationAttempted) {
      console.log('Attempting chat restoration after chats loaded');
      restoreSelectedChat(chats);
    }
  }, [chatsLoaded, chats, selectedChat, restorationAttempted, restoreSelectedChat]);

  // Reset restoration flag when chats are cleared (e.g., logout/login)
  useEffect(() => {
    if (chats.length === 0 && restorationAttempted) {
      setRestorationAttempted(false);
    }
  }, [chats.length, restorationAttempted]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Fixed Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          onChatsUpdate={handleChatsUpdate}
        />
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChat ? (
          <ChatArea chat={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              {!chatsLoaded ? (
                // Loading state while chats are being loaded
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading chats...</p>
                </>
              ) : (
                // Welcome screen after chats are loaded
                <>
                  <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">Welcome to Chat</h3>
                  <p className="text-gray-600">Select a conversation to start messaging</p>
                  {restorationAttempted && (
                    <p className="text-sm text-gray-500 mt-2">No previous chat to restore</p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatModule;