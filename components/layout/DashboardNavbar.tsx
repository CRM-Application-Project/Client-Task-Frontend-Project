"use client";
import { Bell, Menu, X, Check, RefreshCw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Swal from "sweetalert2";
import { logoutUser } from "@/app/services/data.service";
import { useNotifications } from "@/hooks/useNotificationsGlobal"; // Use the FIXED hook

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

// Helper function to get module icon/color
const getModuleStyle = (module: string) => {
  const moduleStyles: Record<string, { color: string; bgColor: string }> = {
    'TASK': { color: 'text-blue-600', bgColor: 'bg-blue-50' },
    'LEAD': { color: 'text-green-600', bgColor: 'bg-green-50' },
    'EMPLOYEE': { color: 'text-purple-600', bgColor: 'bg-purple-50' },
    'SYSTEM': { color: 'text-gray-600', bgColor: 'bg-gray-50' },
    'DEPARTMENT': { color: 'text-orange-600', bgColor: 'bg-orange-50' },
    'DEFAULT': { color: 'text-gray-600', bgColor: 'bg-gray-50' }
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
  
  const router = useRouter();
  const pathname = usePathname();

  // CRITICAL: Use only ONE instance of the hook
  const {
    notifications,
    unreadCount,
    permission,
    isLoading: isNotificationsLoading,
    enableNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    fetchNotifications
  } = useNotifications();
useEffect(()=>{
  console.log("Notifications updated:", notifications);
})
  // Get the current page title
  const pageTitle = getPageTitle(pathname);

  // Display only first 8 notifications in dropdown, rest will be scrollable
  const displayedNotifications = notifications.slice(0, 8);
  const hasMoreNotifications = notifications.length > 8;

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
      await Swal.fire({
        title: "Error",
        text: "User information not available. Please refresh and try again.",
        icon: "error",
        customClass: { popup: "rounded-lg shadow-xl" },
      });
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
        await Swal.fire({
          title: "Notifications Enabled!",
          text: "You will now receive push notifications for important updates.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          customClass: { popup: "rounded-lg shadow-xl" },
        });
      } else {
        await Swal.fire({
          title: "Notification Setup Failed",
          text: result.message,
          icon: "error",
          customClass: { popup: "rounded-lg shadow-xl" },
        });
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
      await Swal.fire({
        title: "Error",
        text: "An unexpected error occurred while enabling notifications.",
        icon: "error",
        customClass: { popup: "rounded-lg shadow-xl" },
      });
    } finally {
      setIsEnablingNotifications(false);
    }
  };

  const handleRefreshNotifications = async () => {
    // Simple cooldown to prevent spam
    const lastRefreshTime = localStorage.getItem('lastNotificationRefresh');
    if (lastRefreshTime) {
      const timeSinceLastRefresh = Date.now() - parseInt(lastRefreshTime);
      if (timeSinceLastRefresh < 10000) { // 10 seconds cooldown
        return;
      }
    }

    setIsRefreshing(true);
    try {
      localStorage.setItem('lastNotificationRefresh', Date.now().toString());
      await fetchNotifications();
    } catch (error) {
      console.error('Error refreshing notifications:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    markAsRead(notification.id);

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
        default:
          console.log("Unknown notification action:", notification.data.action);
      }
    }

    setIsNotificationDropdownOpen(false);
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
        
        // Dispatch logout event to cleanup notifications
        window.dispatchEvent(new CustomEvent('user-logout'));
        
        router.push("/");
      } else {
        console.error("Logout API failed:", response.message);
        ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl", "user", "notifications"].forEach((k) =>
          localStorage.removeItem(k)
        );
        
        // Dispatch logout event
        window.dispatchEvent(new CustomEvent('user-logout'));
        
        router.push("/");
      }
    } catch (error) {
      console.error("Error during logout:", error);
      ["currentUser", "userModules", "authToken", "refreshToken", "tenantToken", "logoUrl", "user", "notifications"].forEach((k) =>
        localStorage.removeItem(k)
      );
      
      // Dispatch logout event
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
            className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none disabled:opacity-50"
            disabled={isEnablingNotifications || isNotificationsLoading}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-gray-600 text-xs text-white flex items-center justify-center font-medium">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {isNotificationDropdownOpen && permission === 'granted' && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[500px] overflow-hidden">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-lg">Notifications</h3>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 text-xs">
                    <button
                      onClick={handleRefreshNotifications}
                      disabled={isRefreshing}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-green-600 hover:text-green-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 transition-colors"
                        title="Mark all read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        title="Clear all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {/* Close button */}
                  <button
                    onClick={handleCloseNotificationDropdown}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors ml-2"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Loading State */}
              {isNotificationsLoading && (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 text-sm mt-3">Loading notifications...</p>
                </div>
              )}
              
              {/* Notifications List */}
              {!isNotificationsLoading && (
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                      <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-base font-medium">No notifications yet</p>
                      <p className="text-gray-400 text-sm mt-2">
                        {`You'll see important updates here`}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {displayedNotifications.map((notification, index) => {
                        const moduleStyle = getModuleStyle(notification.module || 'DEFAULT');
                        
                        return (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`relative px-4 py-4 cursor-pointer hover:bg-gray-50 transition-colors group ${
                              !notification.read ? `${moduleStyle.bgColor} border-l-4 border-l-current ${moduleStyle.color}` : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <p className="font-semibold text-gray-900 text-sm leading-tight">
                                    {notification.title}
                                  </p>
                                  {notification.module && (
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${moduleStyle.color} ${moduleStyle.bgColor} border`}>
                                      {notification.module.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-600 text-sm leading-relaxed line-clamp-2 mb-3">
                                  {notification.body}
                                </p>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-gray-400 font-medium">
                                    {formatNotificationTime(notification.timestamp)}
                                  </p>
                                  {!notification.read && (
                                    <div className={`w-2 h-2 rounded-full ${moduleStyle.color.replace('text-', 'bg-')}`}></div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNotification(notification.id);
                                }}
                                className="ml-2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-50"
                                title="Remove notification"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show more indicator */}
                      {hasMoreNotifications && (
                        <div className="px-4 py-3 bg-gray-50 text-center border-t border-gray-100">
                          <p className="text-xs text-gray-500 font-medium">
                            +{notifications.length - 8} more notifications
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Scroll up to see older notifications
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Permission Request Tooltip */}
          {isNotificationDropdownOpen && permission !== 'granted' && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 p-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Bell className="h-6 w-6 text-gray-400" />
                  <p className="font-semibold text-gray-900 text-lg">Enable Notifications</p>
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {permission === 'denied' 
                    ? 'Notifications are blocked. Please enable them in your browser settings and refresh the page to get important updates.'
                    : 'Get notified about important updates, new tasks, and messages instantly. Stay connected with your team and never miss important information.'
                  }
                </p>
                {permission !== 'denied' && (
                  <button
                    onClick={handleEnableNotifications}
                    disabled={isEnablingNotifications}
                    className="w-full bg-brand-primary text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {isEnablingNotifications ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4" />
                        Enable Notifications
                      </>
                    )}
                  </button>
                )}
                <button
                  onClick={handleCloseNotificationDropdown}
                  className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
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