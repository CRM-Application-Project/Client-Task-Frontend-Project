"use client";
import { Bell, Menu, X, RefreshCw, Trash2, Archive, AlertCircle, CheckCircle, Info, Star, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCallback, useEffect, useState, useRef } from "react"; // Added useRef
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";
import { logoutUser } from "@/app/services/data.service";
import { useNotifications } from "@/hooks/useNotificationsGlobal";

interface UserData {
  firstName: string;
  lastName: string;
  userRole: string;
  userId?: string;
}

// Function to get page title from pathname
const getPageTitle = (pathname: string): string => {
  const pathSegments = pathname.split("/").filter(Boolean);

  if (pathSegments.length === 0) return "Dashboard";

  const lastSegment = pathSegments[pathSegments.length - 1];

  const pageTitles: Record<string, string> = {
    leads: "Leads",
    tasks: "Tasks",
    employees: "Employees",
    staff: "Staff",
    department: "Departments",
    profile: "Profile",
    settings: "Settings",
    chat: "Chat", // Added chat
  };

  return (
    pageTitles[lastSegment] ||
    lastSegment.charAt(0).toUpperCase() +
      lastSegment.slice(1).replace(/-/g, " ")
  );
};

// Helper function to format notification time
const formatNotificationTime = (timestamp: number) => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

// Enhanced module styling with icons and better colors
const getModuleStyle = (module: string) => {
  const moduleStyles: Record<string, { 
    color: string; 
    bgColor: string; 
    icon: React.ReactNode;
    borderColor: string;
    gradientFrom: string;
    gradientTo: string;
  }> = {
    'TASK': { 
      color: 'text-blue-700', 
      bgColor: 'bg-gradient-to-br from-blue-50 to-blue-100', 
      icon: <CheckCircle className="h-4 w-4" />,
      borderColor: 'border-blue-200',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600'
    },
    'LEAD': { 
      color: 'text-emerald-700', 
      bgColor: 'bg-gradient-to-br from-emerald-50 to-emerald-100', 
      icon: <Star className="h-4 w-4" />,
      borderColor: 'border-emerald-200',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-emerald-600'
    },
    'EMPLOYEE': { 
      color: 'text-purple-700', 
      bgColor: 'bg-gradient-to-br from-purple-50 to-purple-100', 
      icon: <Info className="h-4 w-4" />,
      borderColor: 'border-purple-200',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-600'
    },
    'SYSTEM': { 
      color: 'text-orange-700', 
      bgColor: 'bg-gradient-to-br from-orange-50 to-orange-100', 
      icon: <AlertCircle className="h-4 w-4" />,
      borderColor: 'border-orange-200',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-orange-600'
    },
    'DEPARTMENT': { 
      color: 'text-indigo-700', 
      bgColor: 'bg-gradient-to-br from-indigo-50 to-indigo-100', 
      icon: <Archive className="h-4 w-4" />,
      borderColor: 'border-indigo-200',
      gradientFrom: 'from-indigo-500',
      gradientTo: 'to-indigo-600'
    },
    'CHAT': { 
      color: 'text-teal-700', 
      bgColor: 'bg-gradient-to-br from-teal-50 to-teal-100', 
      icon: <MessageCircle className="h-4 w-4" />,
      borderColor: 'border-teal-200',
      gradientFrom: 'from-teal-500',
      gradientTo: 'to-teal-600'
    },
    'DEFAULT': { 
      color: 'text-gray-700', 
      bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100', 
      icon: <Info className="h-4 w-4" />,
      borderColor: 'border-gray-200',
      gradientFrom: 'from-gray-500',
      gradientTo: 'to-gray-600'
    }
  };
  
  return moduleStyles[module?.toUpperCase()] || moduleStyles.DEFAULT;
};

export function DashboardNavbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isEnablingNotifications, setIsEnablingNotifications] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingNotifications, setIsFetchingNotifications] = useState(false); // New state for fetch
  const [persistedNotifications, setPersistedNotifications] = useState<any[]>([]); // For localStorage notifications
  
  const router = useRouter();
  const pathname = usePathname();
  const notificationDropdownRef = useRef<HTMLDivElement>(null); // Added ref for dropdown

  // CRITICAL: Use only ONE instance of the hook - removed markAsRead, markAllAsRead
  const {
    notifications,
    unreadCount,
    permission,
    isLoading: isNotificationsLoading,
    enableNotifications,
    clearAll,
    removeNotification,
    fetchNotifications
  } = useNotifications();

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('notifications');
    if (stored) {
      try {
        setPersistedNotifications(JSON.parse(stored));
      } catch (e) {
        setPersistedNotifications([]);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
      setPersistedNotifications(notifications);
    } else if (notifications && notifications.length === 0) {
      localStorage.removeItem('notifications');
      setPersistedNotifications([]);
    }
  }, [notifications]);

  useEffect(()=>{
    console.log("Notifications updated:", notifications);
  })
  
  // Get the current page title
  const pageTitle = getPageTitle(pathname);

  // Display notifications from state or localStorage
  const displayedNotifications = notifications && notifications.length > 0 ? notifications : persistedNotifications;

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse user data", e);
      }
    }
    setIsUserLoading(false);
  }, []);

  const userId=localStorage.getItem("userId")
   
  const handleEnableNotifications = async () => {
    if (!userId) {
      return;
    }

    // Simple cooldown check
    const lastEnabledTime = localStorage.getItem('lastNotificationEnabled');
    if (lastEnabledTime) {
      const timeSinceLastEnabled = Date.now() - parseInt(lastEnabledTime);
      if (timeSinceLastEnabled < 30000) { // 30 seconds cooldown
        await Swal.fire({
          title: "Please Wait",
          text: "Notifications were recently enabled. Please wait a moment before trying again.",
          icon: "info",
          customClass: { popup: "rounded-lg shadow-xl" },
        });
        return;
      }
    }

    setIsEnablingNotifications(true);
    
    try {
      const result = await enableNotifications(userId);
      
      if (result.success) {
        localStorage.setItem('lastNotificationEnabled', Date.now().toString());
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const handleRefreshNotifications = async () => {
    // Simple cooldown to prevent spam
    const lastRefreshTime = localStorage.getItem('lastNotificationRefresh');
    if (lastRefreshTime) {
      const timeSinceLastRefresh = Date.now() - parseInt(lastRefreshTime);
      if (timeSinceLastRefresh < 5000) { // 5 seconds cooldown
        return;
      }
    }

    setIsRefreshing(true);
    setIsFetchingNotifications(true);
    try {
      localStorage.setItem('lastNotificationRefresh', Date.now().toString());
      await fetchNotifications();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setIsFetchingNotifications(false);
      }, 500);
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Handle notification action based on module
    if (notification.module) {
      switch (notification.module.toLowerCase()) {
        case 'task':
        case 'tasks':
          router.push('/tasks');
          break;
        case 'lead':
        case 'leads':
          router.push('/leads');
          break;
        case 'employee':
        case 'employees':
          router.push('/employees');
          break;
        case 'department':
        case 'departments':
          router.push('/department');
          break;
        case 'chat': // ADDED CHAT CASE
        case 'chats':
          router.push('/chat-module'); // Navigate to chat module
          break;
        default:
          console.log("Unknown notification module:", notification.module);
      }
    }

    // Handle notification action based on data
    if (notification.data?.action) {
      switch (notification.data.action) {
        case 'navigate':
          if (notification.data.path) {
            router.push(notification.data.path);
          }
          break;
        case 'open_task':
          if (notification.data.taskId) {
            router.push(`/tasks/${notification.data.taskId}`);
          }
          break;
        case 'open_lead':
          if (notification.data.leadId) {
            router.push(`/leads/${notification.data.leadId}`);
          }
          break;
        case 'open_chat': // ADDED CHAT ACTION
          if (notification.data.chatId) {
            router.push(`/chat-module/${notification.data.chatId}`);
          } else {
            router.push('/chat-module');
          }
          break;
        default:
          console.log("Unknown notification action:", notification.data.action);
      }
    }

    setIsNotificationDropdownOpen(false);
  };

  // FIX: Prevent scroll propagation
  const handleDropdownScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const handleCloseNotificationDropdown = () => {
    setIsNotificationDropdownOpen(false);
  };

  const handleLogout = useCallback(async () => {
    setIsDropdownOpen(false);

    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out from the system",
      icon: "warning",
      width: "400px",
      showCancelButton: true,
      confirmButtonColor: "var(--brand-primary)",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, logout!",
      background: "#fff",
      customClass: {
        container: "bg-opacity-80",
        popup: "rounded-lg shadow-xl",
        title: "text-gray-800",
        confirmButton:
          "bg-brand-primary hover:bg-brand-primary/90 text-text-white px-4 py-2 rounded-md",
        cancelButton:
          "bg-brand-primary hover:bg-brand-primary/90 text-text-white px-4 py-2 rounded-md",
      },
    });

    if (!result.isConfirmed) return;

    try {
      const response = await logoutUser();
      
      if (response.isSuccess) {
        ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl", "user", "notifications"].forEach((k) =>
          localStorage.removeItem(k)
        );
        
        window.dispatchEvent(new CustomEvent('user-logout'));
        
        router.push("/");
      } else {
        console.error("Logout API failed:", response.message);
        ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl", "user", "notifications"].forEach((k) =>
          localStorage.removeItem(k)
        );
        
        window.dispatchEvent(new CustomEvent('user-logout'));
        
        router.push("/");
      }
    } catch (error) {
      console.error("Error during logout:", error);
      ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl", "user", "notifications"].forEach((k) =>
        localStorage.removeItem(k)
      );
      
      window.dispatchEvent(new CustomEvent('user-logout'));
      
      router.push("/");
    }
  }, [router]);

  const handleProfileClick = () => {
    router.push("/profile");
    setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm sm:px-6 lg:px-6">
      {/* Left */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Mobile: open sheet */}
        <button
          className="lg:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* Desktop: Title */}
        <h1 className="hidden lg:block text-[22px] font-bold text-text-primary">
          {user
            ? `Welcome back, ${user.firstName} ${user.lastName}!`
            : pageTitle}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <div className="relative">
          <button 
            onClick={() => {
              if (permission === 'granted') {
                setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
              } else {
                handleEnableNotifications();
              }
            }}
            className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none transition-all duration-200 hover:scale-105"
            style={{ cursor: (isEnablingNotifications || isNotificationsLoading) ? 'not-allowed' : 'pointer' }}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-xs text-white flex items-center justify-center font-bold shadow-lg animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Enhanced Notification Dropdown */}
          {isNotificationDropdownOpen && permission === 'granted' && (
            <div 
              ref={notificationDropdownRef} // Added ref
              className="absolute right-0 mt-3 w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-[600px] overflow-hidden backdrop-blur-sm"
              onWheel={handleDropdownScroll} // FIX: Prevent scroll propagation
            >
              {/* Enhanced Header with Gradient */}
              <div className="sticky top-0 bg-gradient-to-r from-gray-50 via-white to-gray-50 border-b border-gray-100 px-6 py-4 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">Notifications</h3>
                      <p className="text-xs text-gray-500 font-medium">
                        {notifications.length === 0 ? 'All caught up!' : `${notifications.length} notification${notifications.length === 1 ? '' : 's'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleRefreshNotifications}
                      disabled={isRefreshing}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50"
                      title="Refresh notifications"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="Clear all notifications"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={handleCloseNotificationDropdown}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200"
                      title="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Loading State (show if loading or refreshing) */}
              {(isNotificationsLoading || isFetchingNotifications) && (
                <div className="p-8 text-center">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-500 mx-auto"></div>
                    <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-t-purple-500 mx-auto animate-spin" style={{animationDelay: '-0.15s'}}></div>
                  </div>
                  <p className="text-gray-600 text-sm mt-4 font-medium">Refreshing notifications...</p>
                </div>
              )}
              
              {/* Enhanced Notifications List */}
              {!isNotificationsLoading && !isFetchingNotifications && (
                <div 
                  className="max-h-[300px] overflow-y-auto"
                  onWheel={handleDropdownScroll}
                >
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="relative mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                          <Bell className="h-10 w-10 text-gray-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <h4 className="text-gray-900 text-lg font-bold mb-2">All caught up!</h4>
                      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                        No new notifications right now. We&apos;ll let you know when something important happens.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {displayedNotifications.map((notification, index) => {
                        const moduleStyle = getModuleStyle(notification.module || 'DEFAULT');
                        return (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`relative px-4 py-3 cursor-pointer hover:bg-gray-50 transition-all duration-200 group hover:shadow-sm ${moduleStyle.bgColor}`}
                          >
                            {/* Notification Card */}
                            <div className="flex items-start gap-3">
                              {/* Icon */}
                              <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${moduleStyle.gradientFrom} ${moduleStyle.gradientTo} flex items-center justify-center text-white shadow-md`}>
                                {moduleStyle.icon}
                              </div>
                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3 mb-1">
                                  <h4 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">
                                    {notification.title}
                                  </h4>
                                  {notification.module && (
                                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-md font-medium ${moduleStyle.color} bg-white/80 ${moduleStyle.borderColor} border`}>
                                      {notification.module.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-2">
                                  {notification.body}
                                </p>
                                <div className="flex items-center justify-between">
                                  <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                                    <svg className="w-1 h-1 fill-current" viewBox="0 0 4 4">
                                      <circle cx="2" cy="2" r="2"/>
                                    </svg>
                                    {formatNotificationTime(notification.timestamp)}
                                  </span>
                                  {/* Remove button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeNotification(notification.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all duration-200"
                                    title="Remove notification"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Enhanced Permission Request */}
          {isNotificationDropdownOpen && permission !== 'granted' && (
            <div 
              className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
              onWheel={handleDropdownScroll} // FIX: Also prevent scroll on permission dropdown
            >
              <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8 text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                    <Bell className="h-8 w-8 text-white" />
                  </div>
                  {permission === 'denied' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                
                <h3 className="font-bold text-gray-900 text-xl mb-3">
                  {permission === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}
                </h3>
                
                <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                  {permission === 'denied' 
                    ? 'Notifications are currently blocked in your browser. Please enable them in your browser settings and refresh the page to receive important updates.'
                    : 'Stay in the loop! Get instant notifications for new tasks, messages, and important updates. Never miss what matters most to your work.'
                  }
                </p>
                
                {permission !== 'denied' && (
                  <button
                    onClick={handleEnableNotifications}
                    disabled={isEnablingNotifications}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-4 rounded-xl text-sm font-bold hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {isEnablingNotifications ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Setting up notifications...
                      </>
                    ) : (
                      <>
                        <Bell className="h-5 w-5" />
                        Enable Notifications
                      </>
                    )}
                  </button>
                )}
                
                <button
                  onClick={handleCloseNotificationDropdown}
                  className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-all duration-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User */}
        {isUserLoading ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-3 bg-gray-200 rounded animate-pulse mt-1"></div>
            </div>
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        ) : user ? (
          <div className="relative flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {user.userRole.replace(/_/g, " ").toLowerCase()}
              </div>
            </div>
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="focus:outline-none group"
              >
                <Avatar className="h-8 w-8 cursor-pointer group-hover:bg-brand-primary transition-colors duration-200">
                  <AvatarFallback className="transition-colors duration-200 group-hover:bg-brand-primary group-hover:text-text-white">
                    {user.firstName.charAt(0).toUpperCase()}
                    {user.lastName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                  <button
                    onClick={handleProfileClick}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    My Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">Guest User</div>
              <div className="text-xs text-gray-500">Not logged in</div>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarFallback>GU</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Click-away for dropdowns */}
      {(isDropdownOpen || isNotificationDropdownOpen) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setIsDropdownOpen(false);
            setIsNotificationDropdownOpen(false);
          }}
        />
      )}
    </header>
  );
}