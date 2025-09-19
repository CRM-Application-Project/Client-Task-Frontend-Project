"use client";
import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, UserMinus } from 'lucide-react';
import {  User } from '@/lib/data';
import UserAvatar from './UserAvatar';
import { Chat } from '@/app/services/chatService';

interface GroupModalProps {
  mode: 'create' | 'edit';
  chat?: Chat | null;
  users: User[];
  onSave: (groupData: { name: string; participants: User[] }) => void;
  onClose: () => void;
}

const GroupModal: React.FC<GroupModalProps> = ({ mode, chat, users, onSave, onClose }) => {
  const [groupName, setGroupName] = useState(chat?.name || '');
const [selectedUsers, setSelectedUsers] = useState<User[]>(
  chat?.participants
    ? chat.participants.map(p => ({
        id: p.id,
        name: p.label, // label -> name
        label: p.label, // add label
        avatar: p.avatar,
        status: p.status,
        conversationRole: p.conversationRole || "MEMBER", // add conversationRole, default to "MEMBER"
      }))
    : []
);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);
const currentUserId =localStorage.getItem('userId');
 useEffect(() => {
  const filtered = users.filter(user =>
    user.id !== currentUserId &&                                  // ⬅️ skip yourself
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedUsers.some(selected => selected.id === user.id)
  );
  setFilteredUsers(filtered);
}, [searchQuery, users, selectedUsers, currentUserId]);


  const handleUserToggle = (user: User, action: 'add' | 'remove') => {
    if (action === 'add') {
      setSelectedUsers(prev => [...prev, user]);
    } else {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id));
    }
    setSearchQuery('');
  };

  const handleSave = () => {
    if (groupName.trim() && selectedUsers.length > 0) {
      onSave({
        name: groupName.trim(),
        participants: selectedUsers,
      });
    }
  };

  const canSave = groupName.trim() && selectedUsers.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-100 rounded-lg w-full max-w-lg mx-4 shadow-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-300 flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-800">
            {mode === 'create' ? 'Create Group' : 'Edit Group'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Group Name */}
          <div className="p-4 border-b border-gray-300 flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group Name
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="w-full px-3 py-2 bg-gray-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm text-gray-800 placeholder-gray-500"
            />
          </div>

          {/* Selected Participants */}
          {selectedUsers.length > 0 && (
            <div className="p-4 border-b border-gray-300 flex-shrink-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Participants ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                {selectedUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-2 bg-gray-300 rounded-full px-3 py-1">
                    <UserAvatar
                      src={user.avatar}
                      alt={user.name}
                      size="sm"
                    />
                    <span className="text-sm text-gray-800">{user.name}</span>
                    <button
                      onClick={() => handleUserToggle(user, 'remove')}
                      className="text-gray-500 hover:text-red-600 ml-1"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search and Add Participants */}
          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Participants
            </label>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-200 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm text-gray-800 placeholder-gray-500"
              />
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-gray-600">
                  <p className="text-sm">
                    {searchQuery ? 'No users found' : 'All users are already added'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleUserToggle(user, 'add')}
                      className="w-full px-3 py-2 hover:bg-gray-200 flex items-center gap-3 rounded-lg transition-colors"
                    >
                      <UserAvatar
                        src={user.avatar}
                        alt={user.name}
                        size="md"
                        status={user.status}
                        showStatus={true}
                      />
                      <div className="flex-1 text-left">
                        <h4 className="text-sm font-medium text-gray-800">{user.name}</h4>
                        <p className="text-xs text-gray-600 capitalize">{user.status}</p>
                      </div>
                      <UserPlus size={16} className="text-gray-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-300 flex gap-3 justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {mode === 'create' ? 'Create Group' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupModal;