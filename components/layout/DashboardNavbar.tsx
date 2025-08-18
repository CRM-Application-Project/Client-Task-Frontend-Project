"use client";

import { Bell, Moon, Menu } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

interface UserData {
  firstName: string;
  lastName: string;
  userRole: string;
}

export function DashboardNavbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    // Get user data from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse user data', error);
      }
    }
  }, []);

  if (!user) {
    return null; // or a loading state
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-8">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          className="lg:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="text-lg font-semibold text-gray-900">
          CRM Dashboard
        </span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none">
          <Bell className="h-5 w-5" />
        </button>

        {/* Dark/Light Mode */}
        <button className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none">
          <Moon className="h-5 w-5" />
        </button>

        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {user.firstName} {user.lastName}
            </div>
           <div className="text-xs text-gray-500 capitalize">
  {user.userRole.replace(/_/g, " ").toLowerCase()}
</div>

          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {user.firstName.charAt(0).toUpperCase()}
              {user.lastName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}