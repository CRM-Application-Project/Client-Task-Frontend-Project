"use client";
import { useState } from "react";
import { MessageCircle, Lock, Search, Users, Settings, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChatArea } from "./ChatArea";
import Sidebar from "./Sidebar";
import { User } from "@/lib/data";
import { Chat } from "@/app/services/chatService";

const mockChats: Chat[] = [
  {
    id: 1,
    name: "Alice Johnson",
    description: "Private chat with Alice Johnson",
    unReadMessageCount: 2,
    conversationType: "PRIVATE",
    participants: [{
      id: "user1",
      label: "Alice Johnson",
      conversationRole: "MEMBER",
      status: "online",
      avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    }],
    messageResponses: [],
    lastMessage: {
      content: "Hey, how's the new design coming along?",
      timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      senderId: "user1"
    }
  },
  {
    id: 2, 
    name: "Design Team",
    description: "Group chat for design team discussions",
    unReadMessageCount: 0,
    conversationType: "GROUP",
    participants: [
      {
        id: "user2",
        label: "Bob Smith",
        conversationRole: "MEMBER",
        status: "offline",
        avatar: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
      },
      {
        id: "user1",
        label: "Alice Johnson",
        conversationRole: "MEMBER",
        status: "online",
        avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
      },
      {
        id: "user3",
        label: "Carol White",
        conversationRole: "ADMIN",
        status: "online",
        avatar: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
      },
      {
        id: "user4",
        label: "David Brown",
        conversationRole: "MEMBER",
        status: "away",
        avatar: "https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
      }
    ],
    messageResponses: [],
    lastMessage: {
      content: "Let's review the wireframes tomorrow",
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      senderId: "user2"
    }
  },
  {
    id: 3,
    name: "Project Alpha",
    description: "Group chat for Project Alpha discussions",
    unReadMessageCount: 1,
    conversationType: "GROUP", 
    participants: [
      {
        id: "user3",
        label: "Carol White",
        conversationRole: "ADMIN",
        status: "online",
        avatar: "https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
      },
      {
        id: "user5",
        label: "Emma Wilson",
        conversationRole: "MEMBER",
        status: "online",
        avatar: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
      },
      {
        id: "user6",
        label: "John Smith",
        conversationRole: "MEMBER",
        status: "away",
        avatar: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
      }
    ],
    messageResponses: [],
    lastMessage: {
      content: "Updated the requirements doc",
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      senderId: "user3"
    }
  },
  {
    id: 4,
    name: "Emma Wilson",
    description: "Private chat with Emma Wilson",
    unReadMessageCount: 0,
    conversationType: "PRIVATE",
    participants: [{
      id: "user5",
      label: "Emma Wilson",
      conversationRole: "MEMBER",
      status: "online",
      avatar: "https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop"
    }],
    messageResponses: [],
    lastMessage: {
      content: "Thanks for the feedback!",
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      senderId: "user5"
    }
  },
];

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
  const [chats, setChats] = useState<Chat[]>(mockChats);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-80 bg-chat-sidebar border-r border-chat-border flex flex-col">
        {/* Chat List */}
        <Sidebar 
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
          <WelcomeScreen />
        )}
      </div>
    </div>
  );
};