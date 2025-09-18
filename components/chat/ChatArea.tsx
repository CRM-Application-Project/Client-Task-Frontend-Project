"use client";
import { useState } from "react";
import { Send, Paperclip, Smile, MoreVertical, Hash, MessageCircle, Users, Phone, Video, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Chat } from "@/lib/data";
import { MessageList } from "./MessageList";


interface ChatAreaProps {
  chat: Chat;
}

export interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  type: "sent" | "received";
  reactions?: { emoji: string; count: number }[];
  replyTo?: string;
}

const mockMessages: Message[] = [
  {
    id: "1",
    content: "Hey everyone! How's the progress on the new chat module?",
    sender: "Alice Johnson",
    timestamp: "10:30 AM",
    type: "received",
  },
  {
    id: "2", 
    content: "It's looking great! We've implemented most of the core features. The gray theme is really clean.",
    sender: "You",
    timestamp: "10:32 AM", 
    type: "sent",
  },
  {
    id: "3",
    content: "Awesome! Can't wait to see the mention feature in action. @Carol what do you think about the current design?",
    sender: "Bob Smith",
    timestamp: "10:35 AM",
    type: "received",
    reactions: [{ emoji: "👍", count: 2 }],
  },
  {
    id: "4",
    content: "The design looks very polished! Love the Figma-inspired aesthetic. The gray palette gives it a professional feel.",
    sender: "Carol White",
    timestamp: "10:40 AM",
    type: "received",
  }
];

export const ChatArea = ({ chat }: ChatAreaProps) => {
  const [message, setMessage] = useState("");
  const [messages] = useState<Message[]>(mockMessages);

  const handleSendMessage = () => {
    if (message.trim()) {
      // Here you would typically send the message to your backend
      console.log("Sending message:", message);
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Header */}
     <div className="bg-gray-200 border-b border-gray-300 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {chat.type === 'private' ? (
            <img
              src={chat.participants[0]?.avatar}
              alt={chat.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-400"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
              <Users size={18} className="text-gray-200" />
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-800">{chat.name}</h2>
            {chat.type === 'private' ? (
              <p className="text-sm text-gray-600 capitalize">
                {chat.participants[0]?.status || 'offline'}
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                {chat.participants.length} participants
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-300 rounded-lg transition-colors">
            <Phone size={18} />
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-300 rounded-lg transition-colors">
            <Video size={18} />
          </button>
          <button className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-300 rounded-lg transition-colors">
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} />

      {/* Message Input */}
      <div className="bg-card border-t border-chat-border p-4">
        <div className="flex items-end gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Textarea
              placeholder={`Message ${chat.name}...`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[40px] max-h-32 resize-none bg-input border-chat-border"
            />
          </div>
          
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            <Smile className="h-4 w-4" />
          </Button>
          
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
};