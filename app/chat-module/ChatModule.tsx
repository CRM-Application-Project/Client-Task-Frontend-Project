"use client"
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../../components/chat/Sidebar';
import { Chat } from '../services/chatService';
import { ChatArea } from '@/components/chat/ChatArea';

const SELECTED_CHAT_KEY = 'selectedChatId';

const ChatModule: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatsLoaded, setChatsLoaded] = useState(false);

  // Function to restore selected chat from localStorage
  const restoreSelectedChat = useCallback((chatsArray: Chat[]) => {
    const savedChatId = localStorage.getItem(SELECTED_CHAT_KEY);
    console.log('Attempting to restore chat ID:', savedChatId);
    console.log('Available chats:', chatsArray.map(c => ({ id: c.id, name: c.name })));
    
    if (savedChatId && chatsArray.length > 0) {
      const chat = chatsArray.find(c => String(c.id) === String(savedChatId));
      if (chat) {
        console.log('Successfully restored chat:', chat.name);
        setSelectedChat(chat);
        return true;
      } else {
        console.log('Saved chat not found, clearing localStorage');
        localStorage.removeItem(SELECTED_CHAT_KEY);
      }
    }
    return false;
  }, []);

  // Save selected chat to localStorage
  const saveSelectedChat = useCallback((chat: Chat | null) => {
    if (chat) {
      localStorage.setItem(SELECTED_CHAT_KEY, String(chat.id));
    } else {
      localStorage.removeItem(SELECTED_CHAT_KEY);
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
    
    // Mark chats as loaded
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
        localStorage.removeItem(SELECTED_CHAT_KEY);
      }
    } else if (!chatsLoaded) {
      // Try to restore selected chat on first load
      restoreSelectedChat(updatedChats);
    }
  }, [selectedChat, chatsLoaded, restoreSelectedChat]);

  // Additional effect to handle restoration after chats are loaded
  useEffect(() => {
    if (chatsLoaded && chats.length > 0 && !selectedChat) {
      const savedChatId = localStorage.getItem(SELECTED_CHAT_KEY);
      if (savedChatId) {
        console.log('Late restoration attempt for chat ID:', savedChatId);
        restoreSelectedChat(chats);
      }
    }
  }, [chatsLoaded, chats, selectedChat, restoreSelectedChat]);

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