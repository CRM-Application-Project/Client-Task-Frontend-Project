"use client"
import React, { useState } from 'react';
import { ChatArea } from '../../components/chat/ChatArea';
import { Chat } from '@/lib/data';
import Sidebar from '../../components/chat/Sidebar';

const ChatModule: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // Mark chat as read - this could be enhanced with an API call
    setChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unreadCount: 0 } : c
    ));
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Fixed Sidebar */}
      <div className="flex-shrink-0">
        <Sidebar
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          onChatsUpdate={setChats}
        />
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedChat ? (
          <ChatArea chat={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">Welcome to Chat</h3>
              <p className="text-gray-600">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatModule;