"use client";
import React from 'react';
import { User } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  alt: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12'
};

const statusClasses = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  away: 'bg-yellow-500'
};

const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt,
  size,
  status = 'offline',
  showStatus = false,
  className = ''
}) => {
  const sizeClass = sizeClasses[size];
  const statusClass = statusClasses[status];

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`relative ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizeClass} rounded-full object-cover border-2 border-gray-300`}
        />
      ) : (
        <div className={`${sizeClass} bg-gray-400 rounded-full flex items-center justify-center border-2 border-gray-300`}>
          {alt ? (
            <span className="text-white font-medium text-xs">
              {getInitials(alt)}
            </span>
          ) : (
            <User size={size === 'sm' ? 12 : size === 'md' ? 16 : 20} className="text-gray-200" />
          )}
        </div>
      )}
      
      {showStatus && (
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${statusClass} rounded-full border-2 border-white`} />
      )}
    </div>
  );
};

export default UserAvatar;