"use client";
import { User } from '@/lib/data';
import React, { useState, useRef, useEffect } from 'react';
import UserAvatar from './UserAvatar';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  users: User[];
  placeholder: string;
}

const MentionInput: React.FC<MentionInputProps> = ({
  value,
  onChange,
  onKeyPress,
  users,
  placeholder,
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  useEffect(() => {
    const cursorPos = inputRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setShowMentions(true);
      setMentionQuery(mentionMatch[1]);
      setMentionPosition(mentionMatch.index!);
      setSelectedMentionIndex(0);
    } else {
      setShowMentions(false);
    }
  }, [value]);

  const handleMentionSelect = (user: User) => {
    const beforeMention = value.substring(0, mentionPosition);
    const afterCursor = value.substring(inputRef.current?.selectionStart || 0);
    const newValue = `${beforeMention}@${user.name} ${afterCursor}`;
    
    onChange(newValue);
    setShowMentions(false);
    
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
      const newCursorPos = beforeMention.length + user.name.length + 2;
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredUsers.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev > 0 ? prev - 1 : filteredUsers.length - 1
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          prev < filteredUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        if (e.key === 'Tab') {
          e.preventDefault();
        }
        if (filteredUsers[selectedMentionIndex]) {
          handleMentionSelect(filteredUsers[selectedMentionIndex]);
          return;
        }
      } else if (e.key === 'Escape') {
        setShowMentions(false);
      }
    }
    
    onKeyPress(e);
  };

  return (
    <div className="relative">
      <textarea
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent text-sm text-gray-800 placeholder-gray-500 resize-none"
        style={{ minHeight: '40px', maxHeight: '120px' }}
      />

      {/* Mention dropdown */}
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 bg-gray-100 border border-gray-400 rounded-lg shadow-lg py-1 z-30 max-h-32 overflow-y-auto min-w-[200px]">
          {filteredUsers.map((user, index) => (
            <button
              key={user.id}
              onClick={() => handleMentionSelect(user)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-200 flex items-center gap-2 ${
                index === selectedMentionIndex ? 'bg-gray-300' : ''
              }`}
            >
              <UserAvatar
                src={user.avatar}
                alt={user.name}
                size="sm"
              />
              <span className="text-gray-800">{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MentionInput;