"use client";
import { useState } from "react";
import { Search, Users, MessageCircle, Hash, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChatArea } from "./ChatArea";
import Sidebar from "./Sidebar";
import { Chat, User } from "@/lib/data";

const mockUsers: User[] = [
  {
    id: "user1",
    name: "Alice Johnson",
    avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
    status: "online"
  },
  {
    id: "user2", 
    name: "Bob Smith",
    avatar: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
    status: "offline"
  },
  {
    id: "user3",
    name: "Carol White",
    avatar: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
    status: "online"
  },
  {
    id: "user4",
    name: "David Brown",
    avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
    status: "away"
  },
  {
    id: "user5",
    name: "Emma Wilson",
    avatar: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
    status: "online"
  },
  {
    id: "user6",
    name: "John Smith",
    avatar: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop",
    status: "away"
  }
];

const mockChats: Chat[] = [
  {
    id: "1",
    name: "Alice Johnson",
    type: "private",
    lastMessage: {
      content: "Hey, how's the new design coming along?",
      timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      senderId: "user1"
    },
    unreadCount: 2,
    participants: [mockUsers[0]]
  },
  {
    id: "2", 
    name: "Design Team",
    type: "group",
    lastMessage: {
      content: "Let's review the wireframes tomorrow",
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      senderId: "user2"
    },
    unreadCount: 0,
    participants: [mockUsers[1], mockUsers[0], mockUsers[2], mockUsers[3]]
  },
  {
    id: "3",
    name: "Project Alpha",
    type: "group", 
    lastMessage: {
      content: "Updated the requirements doc",
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      senderId: "user3"
    },
    unreadCount: 1,
    participants: [mockUsers[2], mockUsers[4], mockUsers[5]]
  },
  {
    id: "4",
    name: "Emma Wilson",
    type: "private",
    lastMessage: {
      content: "Thanks for the feedback!",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      senderId: "user5"
    },
    unreadCount: 0,
    participants: [mockUsers[4]]
  },
];

export const ChatLayout = () => {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(mockChats[0]);
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState<Chat[]>(mockChats);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 bg-chat-sidebar border-r border-chat-border flex flex-col">
        {/* Header */}
      
        {/* Chat List */}
        <Sidebar 
          chats={filteredChats}
          users={mockUsers}
          selectedChat={selectedChat}
          onChatSelect={setSelectedChat}
          onChatsUpdate={setChats}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatArea chat={selectedChat} />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-background">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-medium text-foreground mb-2">Welcome to Chat</h2>
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};