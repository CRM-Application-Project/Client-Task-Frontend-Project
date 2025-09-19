"use client";
import React, { useState, useEffect } from 'react';
import { X, Search, UserPlus, UserMinus, Crown, Users, MoreVertical } from 'lucide-react';

// Mock types based on your code structure
interface User {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away';
}

interface Chat {
  id: string;
  name: string;
  type: 'private' | 'group';
  participants: (User & { role?: 'ADMIN' | 'MEMBER' })[];
}

interface GroupInfoModalProps {
  chat: Chat;
  users: User[];
  currentUserId: string;
  onAddMembers: (chatId: string, userIds: string[]) => Promise<void>;
  onRemoveMember: (chatId: string, userId: string) => Promise<void>;
  onChangeRole: (chatId: string, userId: string, role: 'ADMIN' | 'MEMBER') => Promise<void>;
  onClose: () => void;
}

const UserAvatar = ({ src, alt, size, status, showStatus = false }: {
  src?: string;
  alt: string;
  size: 'sm' | 'md' | 'lg';
  status?: string;
  showStatus?: boolean;
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-400'
  };

  return (
    <div className="relative flex-shrink-0">
      <div className={`${sizeClasses[size]} bg-blue-500 rounded-full flex items-center justify-center text-white font-medium`}>
        {alt.charAt(0).toUpperCase()}
      </div>
      {showStatus && status && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusColors[status as keyof typeof statusColors]} rounded-full border-2 border-white`} />
      )}
    </div>
  );
};

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ 
  chat, 
  users, 
  currentUserId, 
  onAddMembers, 
  onRemoveMember, 
  onChangeRole,
  onClose 
}) => {
  // Get current user ID from localStorage if available
  const getCurrentUserId = () => {
    try {
      return localStorage.getItem('userId') || currentUserId;
    } catch {
      return currentUserId;
    }
  };
  
  const actualCurrentUserId = getCurrentUserId();

  const [activeTab, setActiveTab] = useState<'members' | 'add'>('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null);
  const [isChangingRole, setIsChangingRole] = useState<string | null>(null);

  // Filter users for adding (exclude current participants)
  useEffect(() => {
    const participantIds = chat.participants.map(p => p.id);
    const availableUsers = users.filter(user => !participantIds.includes(user.id));
    
    const filtered = availableUsers.filter(user =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, users, chat.participants]);

  // Helper function to get display name
  const getDisplayName = (participant: any) => {
    return participant.id === actualCurrentUserId ? 'You' : participant.name;
  };

  const handleUserSelect = (user: User) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;
    
    setIsAddingMembers(true);
    try {
      const userIds = selectedUsers.map(user => user.id);
      await onAddMembers(chat.id, userIds);
      setSelectedUsers([]);
      setSearchQuery('');
      setActiveTab('members');
    } catch (error) {
      console.error('Error adding members:', error);
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === actualCurrentUserId) return; // Can't remove yourself
    
    try {
      await onRemoveMember(chat.id, userId);
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'ADMIN' | 'MEMBER') => {
    if (userId === actualCurrentUserId) return; // Can't change your own role
    
    setIsChangingRole(userId);
    try {
      await onChangeRole(chat.id, userId, newRole);
      setShowRoleMenu(null);
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      setIsChangingRole(null);
    }
  };

  const isCurrentUserAdmin = () => {
    const currentUser = chat.participants.find(p => p.id === actualCurrentUserId);
    return currentUser?.role === 'ADMIN' || chat.participants[0]?.id === actualCurrentUserId;
  };

  const canRemoveMember = (userId: string) => {
    return isCurrentUserAdmin() && userId !== actualCurrentUserId;
  };

  const canChangeRole = (userId: string) => {
    return isCurrentUserAdmin() && userId !== actualCurrentUserId;
  };

  const getParticipantRole = (participant: any) => {
    // If role is explicitly set, use it; otherwise, assume first participant is admin
    if (participant.role) {
      return participant.role;
    }
    return chat.participants[0]?.id === participant.id ? 'ADMIN' : 'MEMBER';
  };

  // Sort participants: Admins first, then members
  const sortedParticipants = [...chat.participants].sort((a, b) => {
    const roleA = getParticipantRole(a);
    const roleB = getParticipantRole(b);
    
    if (roleA === 'ADMIN' && roleB !== 'ADMIN') return -1;
    if (roleB === 'ADMIN' && roleA !== 'ADMIN') return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-50 rounded-lg w-full max-w-md mx-4 shadow-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
              <Users size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{chat.name}</h2>
              <p className="text-sm text-gray-600">{chat.participants.length} participants</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'members' 
                ? 'text-gray-800 border-b-2 border-gray-600 bg-gray-50' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            Members
          </button>
          {isCurrentUserAdmin() && (
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'add' 
                  ? 'text-gray-800 border-b-2 border-gray-600 bg-gray-50' 
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              Add Members
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'members' ? (
            /* Members List */
            <div className="p-4 space-y-2 overflow-y-auto h-full bg-gray-50">
              {sortedParticipants.map((participant) => {
                const participantRole = getParticipantRole(participant);
                const isAdmin = participantRole === 'ADMIN';
                
                return (
                  <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white bg-white border border-gray-100 shadow-sm">
                    <UserAvatar
                      src={participant.avatar}
                      alt={participant.name}
                      size="md"
                      status={participant.status}
                      showStatus={true}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-800">{getDisplayName(participant)}</h4>
                        {isAdmin && (
                          <div title="Admin">
                            <Crown size={14} className="text-yellow-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-600 capitalize">{participant.status}</p>
                        <span className="text-xs text-gray-500">•</span>
                        <p className="text-xs text-gray-500">{isAdmin ? 'Admin' : 'Member'}</p>
                      </div>
                    </div>
                    
                    {/* Action Menu */}
                    {canChangeRole(participant.id) && (
                      <div className="relative">
                        <button
                          onClick={() => setShowRoleMenu(showRoleMenu === participant.id ? null : participant.id)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
                          disabled={isChangingRole === participant.id}
                        >
                          {isChangingRole === participant.id ? (
                            <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                          ) : (
                            <MoreVertical size={16} />
                          )}
                        </button>
                        
                        {/* Role Change Menu */}
                        {showRoleMenu === participant.id && (
                          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
                            {!isAdmin && (
                              <button
                                onClick={() => handleChangeRole(participant.id, 'ADMIN')}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Crown size={14} className="text-yellow-500" />
                                Make Admin
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => handleChangeRole(participant.id, 'MEMBER')}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                              >
                                <Users size={14} />
                                Make Member
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${getDisplayName(participant)} from the group?`)) {
                                  handleRemoveMember(participant.id);
                                }
                                setShowRoleMenu(null);
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <UserMinus size={14} />
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Simple remove button for non-admins */}
                    {canRemoveMember(participant.id) && !canChangeRole(participant.id) && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove ${getDisplayName(participant)} from the group?`)) {
                            handleRemoveMember(participant.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                        title="Remove member"
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Add Members */
            <div className="p-4 flex flex-col h-full bg-gray-50">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search people..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent text-sm"
                />
              </div>

              {/* Selected users preview */}
              {selectedUsers.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">Selected ({selectedUsers.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedUsers.map(user => (
                      <span
                        key={user.id}
                        className="inline-flex items-center gap-1 bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full"
                      >
                        {user.name}
                        <button
                          onClick={() => handleUserSelect(user)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Available users list */}
              <div className="flex-1 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <Users size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">
                      {searchQuery ? 'No users found' : 'No users available to add'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map(user => {
                      const isSelected = selectedUsers.some(u => u.id === user.id);
                      return (
                        <button
                          key={user.id}
                          onClick={() => handleUserSelect(user)}
                          className={`w-full p-3 rounded-lg flex items-center gap-3 transition-colors ${
                            isSelected 
                              ? 'bg-gray-200 border border-gray-300' 
                              : 'hover:bg-white bg-white border border-gray-100 shadow-sm'
                          }`}
                        >
                          <UserAvatar
                            src={user.avatar}
                            alt={user.name}
                            size="sm"
                            status={user.status}
                            showStatus={true}
                          />
                          <div className="flex-1 text-left">
                            <h4 className="text-sm font-medium text-gray-800">{user.name}</h4>
                            <p className="text-xs text-gray-600 capitalize">{user.status}</p>
                          </div>
                          {isSelected ? (
                            <div className="w-5 h-5 bg-gray-600 rounded-full flex items-center justify-center">
                              <X size={12} className="text-white" />
                            </div>
                          ) : (
                            <UserPlus size={16} className="text-gray-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add button */}
              {selectedUsers.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleAddMembers}
                    disabled={isAddingMembers}
                    className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                  >
                    {isAddingMembers 
                      ? 'Adding...' 
                      : `Add ${selectedUsers.length} member${selectedUsers.length > 1 ? 's' : ''}`
                    }
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Click outside to close role menu */}
      {showRoleMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowRoleMenu(null)}
        />
      )}
    </div>
  );
};

export default GroupInfoModal;