"use client";
import React from 'react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiSelect, onClose }) => {
  const emojiCategories = {
    'Smileys': ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘'],
    'Gestures': ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👏', '🙌'],
    'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖'],
    'Objects': ['🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '⚡', '💥', '✨', '🌟', '⭐', '🔥', '💯', '💢', '💦'],
  };

  return (
    <>
      <div className="absolute bottom-12 right-0 bg-gray-100 border border-gray-400 rounded-lg shadow-lg p-3 z-20 w-64 max-h-48 overflow-y-auto">
        {Object.entries(emojiCategories).map(([category, emojis]) => (
          <div key={category} className="mb-3">
            <p className="text-xs font-medium text-gray-600 mb-2">{category}</p>
            <div className="grid grid-cols-8 gap-1">
              {emojis.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => onEmojiSelect(emoji)}
                  className="p-1 hover:bg-gray-200 rounded text-lg leading-none"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* Overlay to close when clicking outside */}
      <div
        className="fixed inset-0 z-10"
        onClick={onClose}
      />
    </>
  );
};

export default EmojiPicker;