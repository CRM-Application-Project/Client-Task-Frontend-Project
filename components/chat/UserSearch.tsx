"use client";
import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { User } from '@/lib/data';
import UserAvatar from './UserAvatar';

interface UserSearchProps {
  users: User[];
  onUserSelect: (user: User) => void;
  onClose: () => void;
}

const UserSearch: React.FC<UserSearchProps> = ({ users, onUserSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-100 rounded-lg w-full max-w-md mx-4 shadow-lg">
        {/* Header */}
        <div className="p-4 border-b border-gray-300 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">New Chat</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm text-gray-800 placeholder-gray-500"
              autoFocus
            />
          </div>
        </div>

        {/* User List */}
        <div className="max-h-96 overflow-y-auto pb-4">
          {filteredUsers.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600">
              <p>No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => onUserSelect(user)}
                className="w-full px-4 py-3 hover:bg-gray-200 flex items-center gap-3 transition-colors"
              >
                <UserAvatar
                  src={user.avatar}
                  alt={user.name}
                  size="lg"
                  status={user.status}
                  showStatus={true}
                />
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-800">{user.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{user.status}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSearch;