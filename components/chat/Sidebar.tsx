"use client";
import React, { useState, useEffect } from 'react';
import { Search, MessageCircle, Users, MoreVertical, Edit3, Trash2 } from 'lucide-react';
import GroupModal from './GroupModal';
import {  User } from '@/lib/data';
import UserSearch from './UserSearch';
import UserAvatar from './UserAvatar';
import { useChat } from '@/hooks/useChat';
import { Chat, ChatParticipant } from '@/app/services/chatService';

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
  
  const {
    chats,
    users,
    loading,
    error,
    createChat,
    deleteChat,
    searchChats,
    loadChats
  } = useChat();

  // Update parent component when chats change
  useEffect(() => {
    onChatsUpdate(chats);
  }, [chats, onChatsUpdate]);

  // Use searchChats function for filtering
  const filteredChats = searchQuery ? searchChats(searchQuery) : chats;

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
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

  const handleDeleteChat = async (chatId: string) => {
    try {
      await deleteChat(chatId);
      if (String(selectedChat?.id) === String(chatId)) {
        const remainingChats = chats.filter(c => String(c.id) !== String(chatId));
        onChatSelect(remainingChats[0] || null);
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
    setShowChatOptions(null);
  };

  const handleNewChat = async (user: ChatParticipant) => {
    const existingChat = chats.find((chat: Chat) => 
      chat.conversationType === 'private' && 
      chat.participants.some((p:ChatParticipant) => p.id === user.id)
    );

    if (existingChat) {
      onChatSelect(existingChat);
    } else {
      try {
        const newChat = await createChat(user.label, [user.id], false);
        if (newChat) {
          onChatSelect(newChat);
        }
      } catch (err) {
        console.error('Failed to create chat:', err);
      }
    }
    setShowUserSearch(false);
  };

  const handleChatSelect = (chat: Chat) => {
    // If it's a potential chat (search result), create it first
    if ('isPotential' in chat && chat.isPotential) {
      handleNewChat(chat.participants[0]);
    } else {
      onChatSelect(chat);
    }
  };

  const handleGroupSave = async (groupData: { name: string; participants: User[] }) => {
    try {
      if (groupModalMode === 'create') {
        const participantIds = groupData.participants.map(p => p.id);
        const newGroup = await createChat(groupData.name, participantIds, true);
        if (newGroup) {
          onChatSelect(newGroup);
        }
      } else if (selectedChatForEdit) {
        await loadChats();
      }
      setShowGroupModal(false);
    } catch (err) {
      console.error('Failed to save group:', err);
    }
  };

  return (
    <>
      <div className="w-80 bg-white border-r border-gray-300 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white text-sm text-gray-800 placeholder-gray-500"
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
                onClick={() => loadChats()}
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Chat List */}
        {!loading && !error && (
          <div className="flex-1 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-gray-500 text-center">
                  <p>No chats found</p>
                  <p className="text-sm mt-1">Start a new conversation below</p>
                </div>
              </div>
            ) : (
              filteredChats.map((chat: any) => (
                <div
                  key={chat.id}
                  className={`group p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors relative ${
                    selectedChat?.id === chat.id ? 'bg-gray-100' : 'bg-white'
                  } ${chat.isPotential ? 'border-l-4 border-l-green-500' : ''}`}
                  onClick={() => handleChatSelect(chat)}
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
                        <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                          <Users size={20} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">{chat.name}</h3>
                        <div className="flex items-center gap-2">
                          {chat.lastMessage?.timestamp && !chat.isPotential && (
                            <span className="text-xs text-gray-500">
                              {formatTime(chat.lastMessage.timestamp)}
                            </span>
                          )}
                          {!chat.isPotential && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowChatOptions(showChatOptions === chat.id ? null : chat.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVertical size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600 truncate mt-1 flex-1">
                          {chat.isPotential ? 'Tap to start chatting' : (chat.lastMessage?.content || 'No messages yet')}
                        </p>
                        {chat.unreadCount > 0 && (
                          <div className="bg-green-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                            {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                          </div>
                        )}
                      </div>
                      {chat.type === 'group' && !chat.isPotential && (
                        <p className="text-xs text-gray-500 mt-1">
                          {chat.participants.length} participants
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Chat Options Dropdown */}
                  {showChatOptions === chat.id && !chat.isPotential && (
                    <div className="absolute right-4 top-16 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      {chat.type === 'group' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditGroup(chat);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Edit3 size={14} />
                          Edit Group
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this chat?')) {
                            handleDeleteChat(chat.id);
                          }
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Trash2 size={14} />
                        Delete Chat
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <button
              onClick={() => setShowUserSearch(true)}
              className="flex-1 flex items-center justify-center gap-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <MessageCircle size={16} />
              <span className="text-sm font-medium">New Chat</span>
            </button>
            <button
              onClick={handleCreateGroup}
              className="flex-1 flex items-center justify-center gap-2 p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
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
          onSave={handleGroupSave}
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