import { MoreVertical, Reply, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message } from "./ChatArea";

interface MessageListProps {
  messages: Message[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "group flex gap-3",
              message.type === "sent" ? "justify-end" : "justify-start"
            )}
          >
            {message.type === "received" && (
              <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-medium text-secondary-foreground">
                  {message.sender.split(" ").map(n => n[0]).join("")}
                </span>
              </div>
            )}
            
            <div className={cn(
              "max-w-[70%] space-y-1",
              message.type === "sent" ? "items-end" : "items-start"
            )}>
              {message.type === "received" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {message.sender}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp}
                  </span>
                </div>
              )}
              
              <div className={cn(
                "relative rounded-lg px-3 py-2 shadow-soft",
                message.type === "sent" 
                  ? "bg-chat-message-sent text-foreground"
                  : "bg-chat-message-received text-foreground"
              )}>
                <p className="text-sm whitespace-pre-wrap">
                  {message.content}
                </p>
                
                {/* Message Actions */}
                <div className="absolute -top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-chat-border rounded-md shadow-medium">
                  <div className="flex items-center">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Smile className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Reply className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex gap-1">
                  {message.reactions.map((reaction, index) => (
                    <button
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-accent rounded-full text-xs hover:bg-accent/80 transition-colors"
                    >
                      <span>{reaction.emoji}</span>
                      <span className="text-muted-foreground">{reaction.count}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {message.type === "sent" && (
                <div className="text-right">
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};