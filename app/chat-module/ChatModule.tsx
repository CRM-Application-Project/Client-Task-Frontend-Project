"use client"
import React, { useState } from 'react';
import { ChatArea } from '../../components/chat/ChatArea';
import { Chat, User } from '@/lib/data';
import Sidebar from '../../components/chat/Sidebar';

const ChatModule: React.FC = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
    // Mark chat as read
    setChats(prev => prev.map(c => 
      c.id === chat.id ? { ...c, unreadCount: 0 } : c
    ));
  };

  // Mock current user for ChatArea (you may want to get this from auth context)
  const mockCurrentUser: User = { 
    id: '1', 
    name: 'Current User', 
    avatar: '/api/placeholder/40/40?text=CU', 
    status: 'online' 
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        selectedChat={selectedChat}
        onChatSelect={handleChatSelect}
        onChatsUpdate={setChats}
      />
      {selectedChat ? (
        <ChatArea
          chat={selectedChat}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">Select a chat to start messaging</div>
        </div>
      )}
    </div>
  );
};

export default ChatModule;