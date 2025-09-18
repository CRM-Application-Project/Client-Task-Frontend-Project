"use client";
import React, { useState } from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'away';
  showStatus?: boolean;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  alt,
  size = 'md',
  status = 'offline',
  showStatus = false,
  className = ''
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 24
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    offline: 'bg-gray-500'
  };

  const statusSizes = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  const initials = alt
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gray-400 bg-gray-300 flex items-center justify-center`}>
        {!imageError && src ? (
          <img
            src={src}
            alt={alt}
            className={`${sizeClasses[size]} object-cover`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
        ) : null}
        
        {(imageError || !src || imageLoading) && (
          <div className={`${sizeClasses[size]} bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-medium`}>
            {initials ? (
              <span className={`${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}`}>
                {initials}
              </span>
            ) : (
              <UserIcon size={iconSizes[size]} className="text-gray-200" />
            )}
          </div>
        )}
      </div>
      
      {showStatus && (
        <div className={`absolute bottom-0 right-0 ${statusSizes[size]} rounded-full border-2 border-gray-100 ${statusColors[status]}`} />
      )}
    </div>
  );
};

export default UserAvatar;
