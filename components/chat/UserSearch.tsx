"use client";
import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { ChatParticipant } from '@/app/services/chatService';

interface UserSearchProps {
  users: ChatParticipant[];
  onUserSelect: (user: ChatParticipant) => void;
  onClose: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ users, onUserSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<ChatParticipant[]>(users);

  // 🟢 get current user id from localStorage (or your auth context)
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    const filtered = users.filter(
      user =>
        user.id !== currentUserId && // 🚫 skip yourself
        user.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users, currentUserId]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Start New Chat</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white text-sm text-gray-800 placeholder-gray-500"
              autoFocus
            />
          </div>
        </div>

        {/* User List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No users found</p>
            </div>
          ) : (
            <div className="p-2">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => onUserSelect(user)}
                  className="w-full p-3 hover:bg-gray-50 flex items-center gap-3 rounded-lg transition-colors"
                >
                  <UserAvatar
                    src={user.avatar}
                    alt={user.label}
                    size="lg"
                    status={user.status}
                    showStatus={true}
                  />
                  <div className="flex-1 text-left">
                    <h4 className="font-medium text-gray-800">{user.label}</h4>
                    <p className="text-sm text-gray-600 capitalize">{user.status || 'offline'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;
