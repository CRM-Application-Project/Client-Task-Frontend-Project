"use client";
import React, { useState, useEffect } from 'react';
import { Search, Plus, Users, MessageCircle, MoreVertical, Edit3, Trash2, UserPlus, UserMinus } from 'lucide-react';

import GroupModal from './GroupModal';
import { Chat, User } from '@/lib/data';
import UserSearch from './UserSearch';
import UserAvatar from './UserAvatar';
import { getAssignDropdown, getChatList, GetAssignDropdownResponse, GetChatListResponse } from '@/app/services/data.service';

interface SidebarProps {
  selectedChat: Chat | null;
  onChatSelect: (chat: Chat) => void;
  onChatsUpdate: (chats: Chat[]) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedChat, onChatSelect, onChatsUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupModalMode, setGroupModalMode] = useState<'create' | 'edit'>('create');
  const [selectedChatForEdit, setSelectedChatForEdit] = useState<Chat | null>(null);
  const [showChatOptions, setShowChatOptions] = useState<string | null>(null);
  
  // State for API data
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load both chats and users in parallel
        const [chatResponse, userResponse] = await Promise.all([
          getChatList(),
          getAssignDropdown()
        ]);

        // Transform chat data from API to component format
        const transformedChats: Chat[] = chatResponse.data.map(apiChat => ({
          id: apiChat.id.toString(),
          name: apiChat.name,
          type: apiChat.conversationType === 'GROUP' ? 'group' : 'private',
          participants: apiChat.participants.map(participant => ({
            id: participant.id,
            name: participant.label,
            // No avatar URL from API, UserAvatar will handle fallback
            status: 'offline' as const // Default status since API doesn't provide this
          })),
          lastMessage: {
            content: apiChat.description || '',
            timestamp: new Date(), // API doesn't provide timestamp, using current time
            senderId: ''
          },
          unreadCount: apiChat.unReadMessageCount
        }));

        // Transform user data from API to component format
        const transformedUsers: User[] = userResponse.data.map(apiUser => ({
          id: apiUser.id,
          name: apiUser.label,
          // No avatar URL from API, UserAvatar will handle fallback
          status: 'offline' as const // Default status since API doesn't provide this
        }));

        setChats(transformedChats);
        setUsers(transformedUsers);
        onChatsUpdate(transformedChats);
      } catch (err) {
        console.error('Error loading chat data:', err);
        setError('Failed to load chat data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [onChatsUpdate]);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const handleCreateGroup = () => {
    setGroupModalMode('create');
    setSelectedChatForEdit(null);
    setShowGroupModal(true);
  };

  const handleEditGroup = (chat: Chat) => {
    setGroupModalMode('edit');
    setSelectedChatForEdit(chat);
    setShowGroupModal(true);
    setShowChatOptions(null);
  };

  const handleDeleteChat = (chatId: string) => {
    const updatedChats = chats.filter((chat: Chat) => chat.id !== chatId);
    setChats(updatedChats);
    onChatsUpdate(updatedChats);
    if (selectedChat?.id === chatId) {
      onChatSelect(updatedChats[0] || null);
    }
    setShowChatOptions(null);
  };

  const handleNewChat = (user: User) => {
    const existingChat = chats.find((chat: Chat) => 
      chat.type === 'private' && 
      chat.participants.some((p: User) => p.id === user.id)
    );

    if (existingChat) {
      onChatSelect(existingChat);
    } else {
      const newChat: Chat = {
        id: Date.now().toString(),
        name: user.name,
        type: 'private',
        participants: [user],
        lastMessage: { content: '', timestamp: new Date(), senderId: '' },
        unreadCount: 0,
      };
      const updatedChats = [newChat, ...chats];
      setChats(updatedChats);
      onChatsUpdate(updatedChats);
      onChatSelect(newChat);
    }
    setShowUserSearch(false);
  };

  return (
    <>
      <div className="w-80 bg-gray-200 border-r border-gray-300 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 bg-gray-250 border-b border-gray-300">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-800">Messages</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm text-gray-800 placeholder-gray-500"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-600">Loading chats...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-red-600 text-center">
              <p>{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Chat List */}
        {!loading && !error && (
          <div className="flex-1 overflow-y-auto">
            {filteredChats.map((chat: Chat) => (
              <div
                key={chat.id}
                className={`group p-4 border-b border-gray-300 cursor-pointer hover:bg-gray-250 transition-colors relative ${
                  selectedChat?.id === chat.id ? 'bg-gray-300' : 'bg-gray-200'
                }`}
                onClick={() => onChatSelect(chat)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar or Group Icon */}
                  <div className="relative flex-shrink-0">
                    {chat.type === 'private' ? (
                      <UserAvatar
                        src={chat.participants[0]?.avatar}
                        alt={chat.name}
                        size="lg"
                        status={chat.participants[0]?.status}
                        showStatus={true}
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center border-2 border-gray-400">
                        <Users size={20} className="text-gray-200" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-800 truncate">{chat.name}</h3>
                      <div className="flex items-center gap-2">
                        {chat.lastMessage.timestamp && (
                          <span className="text-xs text-gray-600">
                            {formatTime(chat.lastMessage.timestamp)}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowChatOptions(showChatOptions === chat.id ? null : chat.id);
                          }}
                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-1">
                      {chat.lastMessage.content || 'No messages yet'}
                    </p>
                    {chat.type === 'group' && (
                      <p className="text-xs text-gray-500 mt-1">
                        {chat.participants.length} participants
                      </p>
                    )}
                  </div>

                  {chat.unreadCount > 0 && (
                    <div className="bg-gray-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>

                {/* Chat Options Dropdown */}
                {showChatOptions === chat.id && (
                  <div className="absolute right-4 top-16 bg-gray-100 border border-gray-400 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                    {chat.type === 'group' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditGroup(chat);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                      >
                        <Edit3 size={14} />
                        Edit Group
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.id);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-200 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      Delete Chat
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}        {/* Quick Actions - New Chat and New Group */}
        <div className="p-4 border-t border-gray-300">
          <div className="flex gap-2">
            <button
              onClick={() => setShowUserSearch(true)}
              className="flex-1 flex items-center justify-center gap-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-300 rounded-lg transition-colors"
            >
              <MessageCircle size={16} />
              <span className="text-sm font-medium">New Chat</span>
            </button>
            <button
              onClick={handleCreateGroup}
              className="flex-1 flex items-center justify-center gap-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-300 rounded-lg transition-colors"
            >
              <Users size={16} />
              <span className="text-sm font-medium">New Group</span>
            </button>
          </div>
        </div>
      </div>

      {/* User Search Modal */}
      {showUserSearch && (
        <UserSearch
          users={users}
          onUserSelect={handleNewChat}
          onClose={() => setShowUserSearch(false)}
        />
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <GroupModal
          mode={groupModalMode}
          chat={selectedChatForEdit}
          users={users}
          onSave={(groupData) => {
            if (groupModalMode === 'create') {
              const newGroup: Chat = {
                id: Date.now().toString(),
                name: groupData.name,
                type: 'group',
                participants: groupData.participants,
                lastMessage: { content: '', timestamp: new Date(), senderId: '' },
                unreadCount: 0,
              };
              const updatedChats = [newGroup, ...chats];
              setChats(updatedChats);
              onChatsUpdate(updatedChats);
              onChatSelect(newGroup);
            } else if (selectedChatForEdit) {
              const updatedChats = chats.map((chat: Chat) =>
                chat.id === selectedChatForEdit.id
                  ? { ...chat, name: groupData.name, participants: groupData.participants }
                  : chat
              );
              setChats(updatedChats);
              onChatsUpdate(updatedChats);
            }
            setShowGroupModal(false);
          }}
          onClose={() => setShowGroupModal(false)}
        />
      )}

      {/* Click outside to close options */}
      {showChatOptions && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowChatOptions(null)}
        />
      )}
    </>
  );
};

export default Sidebar;